'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EVENT_CHANNEL, MIN_PROBLEM_SELECTIONS } from '@/lib/constants'

async function notifySelectionUpdate(teamId: string) {
  const adminClient = createAdminClient()
  const channel = adminClient.channel(EVENT_CHANNEL)
  await channel.send({
    type: 'broadcast',
    event: 'PROBLEM_SELECTION_UPDATE',
    payload: { teamId },
  })
}

export async function getTeamSelections() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // RLS ensures they only get their own team's selections
    const [
      { data: selections, error: selError },
      { data: state, error: stateError }
    ] = await Promise.all([
      supabase.from('team_problem_selections').select('problem_statement_id'),
      supabase.from('team_problem_selection_state').select('*').single()
    ])

    if (selError) return { success: false, error: selError.message }
    // Note: stateError might trigger if row doesn't exist, which is fine (default NOT_STARTED)
    
    return { 
      success: true, 
      data: {
        selections: selections.map(s => s.problem_statement_id),
        state: state || { status: 'NOT_STARTED' }
      } 
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function selectProblem(problemStatementId: string) {
  try {
    z.string().uuid().parse(problemStatementId)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // First check if finalized
    const { data: state } = await supabase.from('team_problem_selection_state').select('status').single()
    if (state?.status === 'FINALIZED') {
      return { success: false, error: 'Your team has already finalized its problem selection.' }
    }

    const { data: userData } = await supabase.from('users').select('team_id').eq('id', user.id).single()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    // Ensure the problem is actually published and belongs to their category
    const { data: problem } = await supabase.from('problem_statements').select('id').eq('id', problemStatementId).single()
    if (!problem) return { success: false, error: 'Problem statement is not available' }

    const { error } = await supabase.from('team_problem_selections').insert({
      team_id: userData.team_id,
      problem_statement_id: problemStatementId,
      selected_by: user.id
    })

    if (error) {
      if (error.code === '23505') return { success: true } // Already selected, silently succeed
      return { success: false, error: error.message }
    }

    // Update state to IN_PROGRESS if not already
    if (!state || state.status === 'NOT_STARTED') {
      await supabase.from('team_problem_selection_state').upsert({
        team_id: userData.team_id,
        status: 'IN_PROGRESS'
      })
    }

    await notifySelectionUpdate(userData.team_id)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deselectProblem(problemStatementId: string) {
  try {
    z.string().uuid().parse(problemStatementId)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // First check if finalized
    const { data: state } = await supabase.from('team_problem_selection_state').select('status').single()
    if (state?.status === 'FINALIZED') {
      return { success: false, error: 'Your team has already finalized its problem selection.' }
    }

    const { data: userData } = await supabase.from('users').select('team_id').eq('id', user.id).single()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    const { error } = await supabase.from('team_problem_selections')
      .delete()
      .eq('team_id', userData.team_id)
      .eq('problem_statement_id', problemStatementId)

    if (error) return { success: false, error: error.message }

    await notifySelectionUpdate(userData.team_id)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function finalizeSelection() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: userData } = await supabase.from('users').select('team_id').eq('id', user.id).single()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    // Check count
    const { count } = await supabase.from('team_problem_selections')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', userData.team_id)
      
    if (count === null || count < MIN_PROBLEM_SELECTIONS) {
      return { success: false, error: `You must select at least ${MIN_PROBLEM_SELECTIONS} problem statements.` }
    }

    const { error } = await supabase.from('team_problem_selection_state').upsert({
      team_id: userData.team_id,
      status: 'FINALIZED',
      finalized_at: new Date().toISOString(),
      finalized_by: user.id
    })

    if (error) return { success: false, error: error.message }

    await notifySelectionUpdate(userData.team_id)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function adminReopenSelection(teamId: string) {
  try {
    z.string().uuid().parse(teamId)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { error } = await adminClient.from('team_problem_selection_state').update({
      status: 'IN_PROGRESS',
      reopened_at: new Date().toISOString(),
      reopened_by: user.id
    }).eq('team_id', teamId)

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'PROBLEM_SELECTION_REOPENED', 'teams', teamId)
    await notifySelectionUpdate(teamId)
    revalidatePath('/admin/teams')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
