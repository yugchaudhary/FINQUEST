'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import * as xlsx from 'xlsx'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { DEFAULT_STARTING_BALANCE } from '@/lib/constants'

const roleSchema = z.enum(['INNOVATOR', 'INVESTOR'])
const teamSchema = z.object({
  category: z.string().min(1),
  team_name: z.string().min(1),
  role: roleSchema
})

export async function importTeams(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }
    
    const buffer = await file.arrayBuffer()
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[]

    const validTeams = data.map(row => ({
      category: row.category || row.Category,
      team_name: row.team_name || row['Team Name'] || row.teamName,
      role: (row.role || row.Role || 'INNOVATOR').toUpperCase()
    })).filter(t => t.team_name && t.category)

    const validated = z.array(teamSchema).parse(validTeams)

    return { success: true, data: validated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function confirmImport(teams: Array<{category: string, team_name: string, role: 'INNOVATOR'|'INVESTOR'}>) {
  try {
    const validated = z.array(teamSchema).parse(teams)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const results = []
    for (const team of validated) {
      const slug = team.team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const email = `${slug}@foundersgambit.com`
      const password = `gambit-${slug}-2024`

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (authError) {
        results.push({ team: team.team_name, error: authError.message })
        continue
      }

      const { data: teamData, error: teamError } = await adminClient.from('teams').insert({
        team_name: team.team_name,
        category: team.category,
        role: team.role,
        balance: DEFAULT_STARTING_BALANCE
      }).select().single()

      if (teamError) {
        results.push({ team: team.team_name, error: teamError.message })
        continue
      }

      await adminClient.from('users').insert({
        id: authData.user.id,
        email,
        auth_role: 'PARTICIPANT',
        team_id: teamData.id
      })
      results.push({ team: team.team_name, success: true })
    }

    await logAdminAction(user.id, 'IMPORT_TEAMS', 'teams', undefined, { count: teams.length })
    revalidatePath('/admin/teams')
    return { success: true, data: results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTeamRole(teamId: string, role: 'INNOVATOR'|'INVESTOR') {
  try {
    z.string().uuid().parse(teamId)
    roleSchema.parse(role)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { error } = await adminClient.from('teams').update({ role }).eq('id', teamId)
    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'UPDATE_TEAM_ROLE', 'team', teamId, { role })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateStartingBalance(teamId: string, balance: number) {
  try {
    z.string().uuid().parse(teamId)
    z.number().positive().parse(balance)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { error } = await adminClient.from('teams').update({ balance }).eq('id', teamId)
    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'UPDATE_TEAM_BALANCE', 'team', teamId, { balance })
    revalidatePath('/admin/teams')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTeams() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.from('teams').select('*').order('team_name')
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTeamsByCategory(category: string) {
  try {
    z.string().parse(category)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.from('teams').select('*').eq('category', category).order('team_name')
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
