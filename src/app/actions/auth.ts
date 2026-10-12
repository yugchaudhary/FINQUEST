'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const HARDCODED_PASSWORD = 'FinquestEvent2026!@#';

const signInSchema = z.object({
  registration_number: z.string().min(1)
})

const registerLeaderSchema = z.object({
  registration_number: z.string().min(1),
  team_name: z.string().min(2),
  leader_name: z.string().min(2)
})

const registerMemberSchema = z.object({
  registration_number: z.string().min(1),
  join_code: z.string().min(6),
  member_name: z.string().min(2)
})

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function verifyAndClaimRegistrationNumber(regNumber: string, userId: string) {
  const adminClient = createAdminClient()
  
  // Verify it exists and is not used
  const { data: allowedReg, error } = await adminClient
    .from('allowed_registrations')
    .select('*')
    .eq('registration_number', regNumber)
    .single()
    
  if (error || !allowedReg) throw new Error('Invalid Registration Number')
  if (allowedReg.is_used) throw new Error('Registration Number is already in use')

  // Claim it
  await adminClient
    .from('allowed_registrations')
    .update({ is_used: true, used_by_user_id: userId })
    .eq('registration_number', regNumber)
}

export async function registerLeader(data: any) {
  try {
    const validated = registerLeaderSchema.parse(data)
    const adminClient = createAdminClient()
    
    // Check if team name already exists
    const { data: existingTeam } = await adminClient.from('teams').select('id').eq('team_name', validated.team_name).single()
    if (existingTeam) return { success: false, error: 'Team name is already taken' }

    // Pre-verify registration number BEFORE doing anything
    const { data: allowedReg, error: regError } = await adminClient
      .from('allowed_registrations')
      .select('is_used')
      .eq('registration_number', validated.registration_number)
      .single()
      
    if (regError || !allowedReg) return { success: false, error: 'Invalid Registration Number' }
    if (allowedReg.is_used) return { success: false, error: 'Registration Number is already in use' }

    // Generate unique join code
    let join_code = generateJoinCode();
    let isUnique = false;
    while (!isUnique) {
      const { data: existingCode } = await adminClient.from('teams').select('id').eq('join_code', join_code).single()
      if (existingCode) join_code = generateJoinCode();
      else isUnique = true;
    }

    // 1. Create the team
    const { data: team, error: teamError } = await adminClient.from('teams').insert({
      team_name: validated.team_name,
      role: 'PENDING',
      starting_balance: 0,
      current_balance: 0,
      join_code
    }).select().single()

    if (teamError) return { success: false, error: teamError.message }

    const pseudoEmail = `${validated.registration_number}@finfest.com`;

    // 2. Create the auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: pseudoEmail,
      password: HARDCODED_PASSWORD,
      email_confirm: true
    })

    if (authError || !authData.user) {
      await adminClient.from('teams').delete().eq('id', team.id)
      return { success: false, error: authError?.message || 'Failed to create user' }
    }

    // Claim registration
    await verifyAndClaimRegistrationNumber(validated.registration_number, authData.user.id)

    // 3. Link user to team
    await adminClient.from('users').upsert({
      id: authData.user.id,
      email: pseudoEmail,
      name: validated.leader_name,
      auth_role: 'PARTICIPANT',
      team_id: team.id
    })

    // 4. Add leader to team_members
    await adminClient.from('team_members').insert({
      team_id: team.id,
      name: validated.leader_name,
      email: pseudoEmail
    })

    // Sign in the user automatically
    const supabase = await createClient()
    await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password: HARDCODED_PASSWORD,
    })

    return { success: true, join_code }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function registerMember(data: any) {
  try {
    const validated = registerMemberSchema.parse(data)
    const adminClient = createAdminClient()
    
    // Pre-verify registration number BEFORE doing anything
    const { data: allowedReg, error: regError } = await adminClient
      .from('allowed_registrations')
      .select('is_used')
      .eq('registration_number', validated.registration_number)
      .single()
      
    if (regError || !allowedReg) return { success: false, error: 'Invalid Registration Number' }
    if (allowedReg.is_used) return { success: false, error: 'Registration Number is already in use' }

    // 1. Find team by join code
    const { data: team, error: teamError } = await adminClient.from('teams').select('id').eq('join_code', validated.join_code.toUpperCase()).single()
    if (teamError || !team) return { success: false, error: 'Invalid join code' }

    // 2. Check if team is full
    const { count } = await adminClient.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', team.id)
    if (count !== null && count >= 4) return { success: false, error: 'Team is already full (max 4 members)' }

    const pseudoEmail = `${validated.registration_number}@finfest.com`;

    // 3. Create the auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: pseudoEmail,
      password: HARDCODED_PASSWORD,
      email_confirm: true
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create user account' }
    }

    // Claim registration
    await verifyAndClaimRegistrationNumber(validated.registration_number, authData.user.id)

    // 4. Link user to team
    await adminClient.from('users').upsert({
      id: authData.user.id,
      email: pseudoEmail,
      name: validated.member_name,
      auth_role: 'PARTICIPANT',
      team_id: team.id
    })

    // 5. Add member to team_members
    await adminClient.from('team_members').insert({
      team_id: team.id,
      name: validated.member_name,
      email: pseudoEmail
    })

    // Sign in the user automatically
    const supabase = await createClient()
    await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password: HARDCODED_PASSWORD,
    })

    return { success: true }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    return { success: false, error: error.message || 'Unknown error' }
  }
}

const signInAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export async function signIn(teamNameInput: string, passwordInput: string) {
  try {
    const teamName = (teamNameInput || '').trim()
    const password = (passwordInput || '').trim()

    if (!teamName || !password) {
      return { success: false, error: 'Please enter both Team Name and Password' }
    }

    const adminClient = createAdminClient()
    const supabase = await createClient()

    // 1. Locate team by Team Name (case-insensitive)
    let targetEmail: string | null = null
    let targetTeamId: string | null = null

    const { data: team } = await adminClient
      .from('teams')
      .select('id, team_name')
      .ilike('team_name', teamName)
      .maybeSingle()

    if (team) {
      targetTeamId = team.id
      const { data: userRec } = await adminClient
        .from('users')
        .select('id, email, auth_role')
        .eq('team_id', team.id)
        .maybeSingle()

      if (userRec) {
        targetEmail = userRec.email
      } else {
        const slug = team.team_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        targetEmail = `${slug}@finquest.com`
      }
    } else {
      // Also check if entered directly as email or user name
      const { data: userRec } = await adminClient
        .from('users')
        .select('id, email, team_id, auth_role')
        .or(`email.ilike.${teamName},name.ilike.${teamName}`)
        .maybeSingle()

      if (userRec) {
        targetEmail = userRec.email
        targetTeamId = userRec.team_id
      }
    }

    if (!targetEmail) {
      return { success: false, error: 'Team Name not found. Please verify your team name with organizers.' }
    }

    // 2. Sign in to Supabase Auth with target email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: password
    })

    if (error) {
      return { success: false, error: 'Invalid password. Please check your credentials and try again.' }
    }

    if (!data.user) {
      return { success: false, error: 'User account not found' }
    }

    const { data: userData } = await adminClient
      .from('users')
      .select('auth_role, team_id')
      .eq('id', data.user.id)
      .single()

    return { 
      success: true, 
      user: data.user, 
      role: userData?.auth_role || 'PARTICIPANT', 
      teamId: userData?.team_id || targetTeamId 
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown authentication error' }
  }
}

export async function signInAdmin(emailInput: string, passwordInput: string) {
  try {
    const { email, password } = signInAdminSchema.parse({ email: emailInput, password: passwordInput })
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: error.message }
    if (!data.user) return { success: false, error: 'User not found' }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.from('users').select('auth_role, team_id').eq('id', data.user.id).single()

    if (userData?.auth_role !== 'ADMIN') {
      // Not an admin — sign them back out immediately
      await supabase.auth.signOut()
      return { success: false, error: 'Access denied. This account does not have admin privileges.' }
    }

    return { 
      success: true, 
      user: data.user, 
      role: userData?.auth_role, 
      teamId: userData?.team_id 
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function getSession() {
  try {
    const supabase = await createClient()
    const now = Math.floor(Date.now() / 1000)
    let user = null

    const { data: sessData } = await supabase.auth.getSession()
    const session = sessData?.session
    if (session?.user && session.expires_at && session.expires_at > now) {
      user = session.user
    } else {
      const { data: authData } = await supabase.auth.getUser()
      user = authData?.user || null
    }

    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.from('users').select('*, teams(*)').eq('id', user.id).single()

    return { success: true, data: { user, userData } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' }
  }
}
