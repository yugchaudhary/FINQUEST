'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import * as xlsx from 'xlsx'
import { z } from 'zod'

const teamRosterRowSchema = z.object({
  team_no: z.string().default(''),
  team_name: z.string().min(1, 'Team Name is required'),
  password: z.string().min(1, 'Password is required')
})

export type TeamRosterRow = z.infer<typeof teamRosterRowSchema>

/**
 * Parses uploaded Excel file of format: Team No. | Team Name | Password
 */
export async function importTeamsFromExcel(formData: FormData) {
  try {
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }
    
    const buffer = await file.arrayBuffer()
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[]

    if (!data || data.length === 0) {
      return { success: false, error: 'Excel sheet appears to be empty.' }
    }

    const parsedTeams: TeamRosterRow[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const keys = Object.keys(row)

      // Find Team No. key
      const noKey = keys.find(k => {
        const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        return norm.includes('teamno') || norm.includes('teamnumber') || norm === 'no' || norm === 'id' || norm === 'number'
      })
      const teamNoVal = noKey ? row[noKey] : (row['Team No.'] || row['Team No'] || row['Team Number'] || row.team_no || row['No.'] || (i + 1))

      // Find Team Name key
      const nameKey = keys.find(k => {
        const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        return norm.includes('teamname') || norm === 'name' || norm === 'team'
      })
      const teamNameVal = nameKey ? row[nameKey] : (row['Team Name'] || row.TeamName || row.team_name || row.Name || row.team)

      // Find Password key
      const passKey = keys.find(k => {
        const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '')
        return norm.includes('password') || norm.includes('pass')
      })
      const passVal = passKey ? row[passKey] : (row.Password || row.password || row.Pass || row.pass)

      if (teamNameVal && passVal) {
        parsedTeams.push({
          team_no: String(teamNoVal ?? (i + 1)).trim(),
          team_name: String(teamNameVal).trim(),
          password: String(passVal).trim()
        })
      }
    }

    if (parsedTeams.length === 0) {
      return { 
        success: false, 
        error: 'No valid team entries found. Please ensure your Excel file includes columns: Team No. | Team Name | Password' 
      }
    }

    return { success: true, data: parsedTeams }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error processing Excel file' }
  }
}

/**
 * Commits the imported teams, creating their Team record and Supabase Auth credentials
 */
export async function confirmTeamExcelImport(teams: TeamRosterRow[]) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Authentication required' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const results = []
    let createdCount = 0

    for (const item of teams) {
      const cleanTeamName = item.team_name.trim()
      const slug = cleanTeamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const email = `${slug}@finquest.com`

      // 1. Create or update user in Supabase Auth
      let authUserId: string | null = null

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: item.password,
        email_confirm: true
      })

      if (authData?.user) {
        authUserId = authData.user.id
      } else if (authError) {
        // User might already exist in auth, let's update password
        const { data: userList } = await adminClient.auth.admin.listUsers()
        const existingAuthUser = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingAuthUser) {
          authUserId = existingAuthUser.id
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password: item.password
          })
        } else {
          results.push({ team: cleanTeamName, error: authError.message })
          continue
        }
      }

      if (!authUserId) continue

      // 2. Insert or update team in teams table
      const { data: existingTeam } = await adminClient
        .from('teams')
        .select('id')
        .eq('team_name', cleanTeamName)
        .maybeSingle()

      let teamId: string

      if (existingTeam) {
        teamId = existingTeam.id
        await adminClient.from('teams').update({
          join_code: String(item.team_no || ''),
          updated_at: new Date().toISOString()
        }).eq('id', teamId)
      } else {
        const { data: newTeam, error: teamInsertErr } = await adminClient.from('teams').insert({
          team_name: cleanTeamName,
          category: 'Unassigned',
          role: 'PENDING',
          join_code: String(item.team_no || ''),
          starting_balance: 1000000,
          current_balance: 1000000,
          is_active: true
        }).select().single()

        if (teamInsertErr) {
          results.push({ team: cleanTeamName, error: teamInsertErr.message })
          continue
        }
        teamId = newTeam.id
      }

      // 3. Upsert user in public.users table
      await adminClient.from('users').upsert({
        id: authUserId,
        email,
        name: cleanTeamName,
        auth_role: 'PARTICIPANT',
        team_id: teamId
      }, { onConflict: 'id' })

      createdCount++
      results.push({ team: cleanTeamName, success: true })
    }

    await logAdminAction(user.id, 'IMPORT_TEAMS_EXCEL', 'teams', undefined, { count: createdCount })

    revalidatePath('/admin/setup')
    revalidatePath('/admin/teams')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/reset')

    return { success: true, count: createdCount, results }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error importing teams' }
  }
}

/**
 * Returns current list of teams for the setup page
 */
export async function getExistingTeamsRoster() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('teams')
      .select('id, team_name, role, category, join_code, created_at')
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

// ----------------------------------------------------
// BACKWARD COMPATIBILITY ALIASES
// ----------------------------------------------------
export async function importRegistrations(formData: FormData) {
  return importTeamsFromExcel(formData)
}

export async function confirmRegistrationImport(registrations: any[]) {
  return confirmTeamExcelImport(registrations)
}

export async function getAllowedRegistrations() {
  return getExistingTeamsRoster()
}

export async function clearAllAllowedRegistrations() {
  try {
    const adminClient = createAdminClient()
    await adminClient.from('allowed_registrations').delete().neq('registration_number', '')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
