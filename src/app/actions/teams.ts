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
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
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
        starting_balance: 0,
        current_balance: 0
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
    
    let user = null
    const { data: sessData } = await supabase.auth.getSession()
    user = sessData?.session?.user || null
    if (!user) {
      try {
        const { data: authData } = await supabase.auth.getUser()
        user = authData?.user || null
      } catch {
        user = null
      }
    }

    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const updatePayload: any = { role }
    if (role === 'INVESTOR') {
      updatePayload.category_id = null
      updatePayload.category = 'N/A'
    } else if (role === 'INNOVATOR') {
      // Innovators have 0 balance
      updatePayload.starting_balance = 0
      updatePayload.current_balance = 0
      const { data: currentTeam } = await adminClient.from('teams').select('category, category_id').eq('id', teamId).single()
      if (!currentTeam?.category_id || currentTeam?.category === 'N/A') {
        updatePayload.category = 'Unassigned'
        updatePayload.category_id = null
      } else {
        updatePayload.category = currentTeam.category || 'Unassigned'
        updatePayload.category_id = currentTeam.category_id
      }
    }

    const { error } = await adminClient.from('teams').update(updatePayload).eq('id', teamId)
    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'UPDATE_TEAM_ROLE', 'team', teamId, { role, category: updatePayload.category })
    
    // Touch event_state singleton to trigger realtime updates
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    revalidatePath('/admin/teams')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/setup')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateStartingBalance(teamId: string, balance: number) {
  try {
    z.string().uuid().parse(teamId)
    z.number().nonnegative().parse(balance)
    const supabase = await createClient()
    let user = null
    const { data: sessData } = await supabase.auth.getSession()
    user = sessData?.session?.user || null
    if (!user) {
      try {
        const { data: authData } = await supabase.auth.getUser()
        user = authData?.user || null
      } catch {
        user = null
      }
    }
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Only investors can have balance assigned
    const { data: team } = await adminClient.from('teams').select('role').eq('id', teamId).single()
    if (team?.role !== 'INVESTOR') {
      return { success: false, error: 'Balance can only be assigned to Investor teams.' }
    }

    const { error } = await adminClient.from('teams').update({ 
      starting_balance: balance,
      current_balance: balance
    }).eq('id', teamId)
    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'UPDATE_TEAM_BALANCE', 'team', teamId, { balance })
    revalidatePath('/admin/teams')
    revalidatePath('/admin/investment-setup')
    revalidatePath('/dashboard')
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

export async function clearAllTeams() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // 1. Unclaim allowed registrations by setting used_by_user_id to null and is_used to false
    await adminClient.from('allowed_registrations').update({ is_used: false, used_by_user_id: null }).neq('registration_number', '')

    // 2. Find all participant auth users
    const { data: participantUsers } = await adminClient.from('users').select('id').eq('auth_role', 'PARTICIPANT')
    
    // 3. Delete participant auth users (which cascades to users table)
    if (participantUsers && participantUsers.length > 0) {
      for (const p of participantUsers) {
        await adminClient.auth.admin.deleteUser(p.id)
      }
    }

    // 4. Delete all teams (cascades to team_members)
    await adminClient.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all

    await logAdminAction(user.id, 'CLEAR_ALL_TEAMS', 'teams', undefined, {})
    revalidatePath('/admin/teams')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTeamMembers(teamId: string) {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.from('team_members').select('*').eq('team_id', teamId)
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTeamsWithDetails() {
  try {
    const adminClient = createAdminClient()
    // Fetch all teams with member count, category info, and selection state
    const { data, error } = await adminClient
      .from('teams')
      .select(`
        *,
        categories(name, slug),
        team_members(count),
        team_problem_selection_state(status),
        team_problem_selections(count)
      `)
      .order('team_name')

    if (error) return { success: false, error: error.message }

    const formattedData = data.map((team: any) => ({
      ...team,
      current_balance: team.role === 'INVESTOR' ? (team.current_balance || 0) : 0,
      starting_balance: team.role === 'INVESTOR' ? (team.starting_balance || 0) : 0,
      memberCount: team.team_members?.[0]?.count || 0,
      categoryName: team.categories?.name || null,
      selectionStatus: team.team_problem_selection_state?.status || 'NOT_STARTED',
      selectionsCount: team.team_problem_selections?.[0]?.count || 0
    }))

    return { success: true, data: formattedData }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTeamCategory(teamId: string, categoryId: string | null) {
  try {
    z.string().uuid().parse(teamId)
    if (categoryId) z.string().uuid().parse(categoryId)

    const supabase = await createClient()
    let user = null
    const { data: sessData } = await supabase.auth.getSession()
    user = sessData?.session?.user || null
    if (!user) {
      try {
        const { data: authData } = await supabase.auth.getUser()
        user = authData?.user || null
      } catch {
        user = null
      }
    }

    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Check team role: Investors cannot have a category assigned
    const { data: team } = await adminClient.from('teams').select('role, category, category_id').eq('id', teamId).single()
    if (!team) return { success: false, error: 'Team not found' }

    if (categoryId) {
      if (team.role === 'INVESTOR') {
        return { success: false, error: 'Investors cannot be assigned a category. Categories are only assigned to Innovators.' }
      }

      const { data: cat } = await adminClient.from('categories').select('name').eq('id', categoryId).single()
      if (!cat) return { success: false, error: 'Category not found' }

      const updateData: any = {
        category_id: categoryId,
        category: cat.name
      }
      // If team was PENDING, promote to INNOVATOR
      if (team.role === 'PENDING') {
        updateData.role = 'INNOVATOR'
      }

      const { error } = await adminClient.from('teams').update(updateData).eq('id', teamId)
      if (error) return { success: false, error: error.message }

      await logAdminAction(user.id, 'UPDATE_TEAM_CATEGORY', 'teams', teamId, { 
        categoryId, 
        categoryName: cat.name, 
        role: updateData.role || team.role 
      })
    } else {
      // Unassign category safely — category column in DB has NOT NULL constraint, so set to 'Unassigned'
      const { error } = await adminClient.from('teams').update({
        category_id: null,
        category: 'Unassigned'
      }).eq('id', teamId)
      if (error) return { success: false, error: error.message }

      await logAdminAction(user.id, 'UNASSIGN_TEAM_CATEGORY', 'teams', teamId, { categoryId: null })
    }

    // Touch event_state singleton to trigger realtime updates for participant screens
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    revalidatePath('/admin/teams')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/setup')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
