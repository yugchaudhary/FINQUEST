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
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, error: 'The uploaded file contains no sheets.' }
    }

    let parsedTeams: TeamRosterRow[] = []
    let detectedSheet = ''

    // Loop through sheets to find the one with team data
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) continue

      // Strategy 1: Raw 2D grid scanning (resilient to title banners & merged rows)
      const rawGrid = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
      if (rawGrid && rawGrid.length > 0) {
        let headerRowIdx = -1
        let colMap = { teamNo: -1, teamName: -1, password: -1 }

        for (let r = 0; r < Math.min(rawGrid.length, 10); r++) {
          const rowVals = rawGrid[r].map(c => String(c || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
          const nameIdx = rowVals.findIndex(c => c.includes('teamname') || c === 'name' || c === 'team')
          const passIdx = rowVals.findIndex(c => c.includes('password') || c.includes('pass') || c.includes('pwd'))
          const noIdx = rowVals.findIndex(c => c.includes('teamno') || c.includes('teamnumber') || c.includes('sno') || c.includes('srno') || c === 'no' || c === 'number' || c === 'id')

          if (nameIdx !== -1 && passIdx !== -1) {
            headerRowIdx = r
            colMap.teamName = nameIdx
            colMap.password = passIdx
            colMap.teamNo = noIdx !== -1 ? noIdx : (nameIdx === 1 ? 0 : -1)
            break
          }
        }

        // If header row found in raw grid
        if (headerRowIdx !== -1 && colMap.teamName !== -1 && colMap.password !== -1) {
          const sheetTeams: TeamRosterRow[] = []
          for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
            const row = rawGrid[r]
            if (!row || row.length === 0) continue

            const teamNo = colMap.teamNo !== -1 ? String(row[colMap.teamNo] || '').trim() : String(sheetTeams.length + 1)
            const teamName = String(row[colMap.teamName] || '').trim()
            const password = String(row[colMap.password] || '').trim()

            if (teamName && password) {
              sheetTeams.push({
                team_no: teamNo || String(sheetTeams.length + 1),
                team_name: teamName,
                password: password
              })
            }
          }

          if (sheetTeams.length > 0) {
            parsedTeams = sheetTeams
            detectedSheet = sheetName
            break
          }
        }
      }

      // Strategy 2: Standard JSON object mapping
      const objData = xlsx.utils.sheet_to_json(sheet) as any[]
      if (objData && objData.length > 0) {
        const sheetTeams: TeamRosterRow[] = []

        for (let i = 0; i < objData.length; i++) {
          const row = objData[i]
          const keys = Object.keys(row)

          const noKey = keys.find(k => {
            const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '')
            return norm.includes('teamno') || norm.includes('teamnumber') || norm === 'no' || norm === 'id' || norm === 'number'
          })
          const teamNoVal = noKey ? row[noKey] : (row['Team No.'] || row['Team No'] || row['Team Number'] || row.team_no || (i + 1))

          const nameKey = keys.find(k => {
            const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '')
            return norm.includes('teamname') || norm === 'name' || norm === 'team'
          })
          const teamNameVal = nameKey ? row[nameKey] : (row['Team Name'] || row.TeamName || row.team_name || row.Name || row.team)

          const passKey = keys.find(k => {
            const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '')
            return norm.includes('password') || norm.includes('pass')
          })
          const passVal = passKey ? row[passKey] : (row.Password || row.password || row.Pass || row.pass)

          if (teamNameVal && passVal) {
            sheetTeams.push({
              team_no: String(teamNoVal ?? (i + 1)).trim(),
              team_name: String(teamNameVal).trim(),
              password: String(passVal).trim()
            })
          }
        }

        if (sheetTeams.length > 0) {
          parsedTeams = sheetTeams
          detectedSheet = sheetName
          break
        }
      }
    }

    if (parsedTeams.length === 0) {
      return { 
        success: false, 
        error: 'No valid team rows extracted. Please ensure the Excel file contains columns: Team No. | Team Name | Password' 
      }
    }

    return { 
      success: true, 
      data: parsedTeams,
      count: parsedTeams.length,
      sheetName: detectedSheet
    }
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
          category: 'N/A',
          role: 'INVESTOR',
          join_code: String(item.team_no || ''),
          starting_balance: 0,
          current_balance: 0,
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

export interface ManualTeamData {
  team_no?: string
  team_name: string
  password: string
  role?: 'INNOVATOR' | 'INVESTOR' | 'PENDING'
}

/**
 * Creates one or more team accounts manually with login credentials
 */
export async function createManualTeams(teams: ManualTeamData[]) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Authentication required' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized: Admin privileges required' }

    if (!teams || teams.length === 0) {
      return { success: false, error: 'No team data provided' }
    }

    // Validate inputs upfront
    for (const item of teams) {
      const cleanTeamName = (item.team_name || '').trim()
      if (!cleanTeamName) {
        return { success: false, error: 'Team Name is required for every team entry' }
      }
      const pass = (item.password || '').trim()
      if (!pass || pass.length < 6) {
        return { success: false, error: `Password for "${cleanTeamName}" must be at least 6 characters long` }
      }
    }

    const results = []
    let createdCount = 0

    for (const item of teams) {
      const cleanTeamName = item.team_name.trim()
      const slug = cleanTeamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const email = `${slug}@finquest.com`
      const password = item.password.trim()
      const role = item.role || 'INVESTOR'
      const category = role === 'INVESTOR' ? 'N/A' : 'Unassigned'

      // 1. Create or update user in Supabase Auth
      let authUserId: string | null = null

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authData?.user) {
        authUserId = authData.user.id
      } else if (authError) {
        // User might already exist in auth, update password
        const { data: userList } = await adminClient.auth.admin.listUsers()
        const existingAuthUser = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingAuthUser) {
          authUserId = existingAuthUser.id
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password
          })
        } else {
          return { success: false, error: `Auth error for ${cleanTeamName}: ${authError.message}` }
        }
      }

      if (!authUserId) {
        return { success: false, error: `Failed to create auth record for ${cleanTeamName}` }
      }

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
          role,
          category,
          updated_at: new Date().toISOString()
        }).eq('id', teamId)
      } else {
        const { data: newTeam, error: teamInsertErr } = await adminClient.from('teams').insert({
          team_name: cleanTeamName,
          category,
          role,
          join_code: String(item.team_no || ''),
          starting_balance: 0,
          current_balance: 0,
          is_active: true
        }).select().single()

        if (teamInsertErr) {
          return { success: false, error: `Database error for ${cleanTeamName}: ${teamInsertErr.message}` }
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

    await logAdminAction(user.id, 'CREATE_MANUAL_TEAMS', 'teams', undefined, { count: createdCount })

    revalidatePath('/admin/setup')
    revalidatePath('/admin/teams')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/reset')

    return { success: true, count: createdCount, results }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error creating team manually' }
  }
}

export async function createManualTeam(data: ManualTeamData) {
  return createManualTeams([data])
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
