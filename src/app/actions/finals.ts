'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { EVENT_CHANNEL } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function getTeamsForTransition() {
  try {
    const adminClient = createAdminClient()
    const { data: teams, error } = await adminClient
      .from('teams')
      .select('id, team_name, category, role, is_active, current_balance')
      .eq('is_active', true)
      .order('current_balance', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data: teams }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function changeTeamStatus(teamId: string, newRole: 'INNOVATOR' | 'INVESTOR') {
  try {
    z.string().uuid().parse(teamId)
    z.enum(['INNOVATOR', 'INVESTOR']).parse(newRole)

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    await adminClient.from('teams').update({ role: newRole }).eq('id', teamId)
    await logAdminAction(user.id, 'CHANGE_TEAM_STATUS', 'team', teamId, { newRole })

    revalidatePath('/admin/finals-transition')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function initializeFinals(finalistTeamIds: string[]) {
  try {
    z.array(z.string().uuid()).min(1).parse(finalistTeamIds)

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Check not already initialized
    const { data: state } = await adminClient.from('event_state').select('finals_initialized').eq('id', 1).single()
    if (state?.finals_initialized) {
      return { success: false, error: 'Finals have already been initialized' }
    }

    // Mark selected teams as finalists
    for (const id of finalistTeamIds) {
      await adminClient.from('teams').update({ is_finalist: true }).eq('id', id)
    }

    // Update event state
    await adminClient.from('event_state').update({
      current_phase: 'PHASE_2',
      current_screen_state: 'FINALS_READY',
      finals_initialized: true,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)

    await logAdminAction(user.id, 'INITIALIZE_FINALS', 'event_state', undefined, { finalistTeamIds })

    // Broadcast
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'PHASE_CHANGE',
      payload: { current_phase: 'PHASE_2', current_screen_state: 'FINALS_READY' },
    })

    revalidatePath('/admin/finals-transition')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function broadcastFinalist(finalistTeamId: string) {
  try {
    z.string().uuid().parse(finalistTeamId)

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Verify team is a finalist
    const { data: team } = await adminClient.from('teams').select('*').eq('id', finalistTeamId).eq('is_finalist', true).single()
    if (!team) return { success: false, error: 'Team is not a finalist' }

    // Update event state
    await adminClient.from('event_state').update({
      current_finalist_id: finalistTeamId,
      current_screen_state: 'FINALIST_LIVE',
      updated_at: new Date().toISOString(),
    }).eq('id', 1)

    await logAdminAction(user.id, 'BROADCAST_FINALIST', 'team', finalistTeamId, { team_name: team.team_name })

    // Broadcast
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'FINALIST_BROADCAST',
      payload: {
        finalist_team_id: team.id,
        id: team.id,
        team_name: team.team_name,
        category: team.category,
      },
    })

    revalidatePath('/admin/finals-broadcast')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function submitInvestorScore(finalistTeamId: string, score: number) {
  try {
    z.string().uuid().parse(finalistTeamId)
    const validatedScore = z.number().min(1.0).max(10.0).parse(score)

    // Validate 0.5 increments
    if ((validatedScore * 2) % 1 !== 0) {
      return { success: false, error: 'Score must be in 0.5 increments' }
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient
      .from('users')
      .select('*, teams(*)')
      .eq('id', user.id)
      .single()

    if (!userData?.team_id) return { success: false, error: 'Team not found' }
    if (userData.teams?.role !== 'INVESTOR') return { success: false, error: 'Only investors can rate' }

    // Don't allow a finalist to rate themselves
    if (userData.team_id === finalistTeamId) {
      return { success: false, error: 'You cannot rate your own team' }
    }

    // Check event state - must be FINALIST_LIVE or RATINGS_OPEN
    const { data: eventState } = await adminClient.from('event_state').select('current_screen_state, current_finalist_id').eq('id', 1).single()
    if (!eventState || (eventState.current_screen_state !== 'FINALIST_LIVE' && eventState.current_screen_state !== 'RATINGS_OPEN')) {
      return { success: false, error: 'Ratings are not currently open' }
    }
    if (eventState.current_finalist_id !== finalistTeamId) {
      return { success: false, error: 'This finalist is not currently being rated' }
    }

    // Insert score (UNIQUE constraint prevents duplicates)
    const { error: insertError } = await adminClient
      .from('final_round_scores')
      .insert({
        finalist_team_id: finalistTeamId,
        investor_team_id: userData.team_id,
        score: validatedScore,
        submitted_at: new Date().toISOString(),
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, error: 'You have already rated this finalist' }
      }
      return { success: false, error: insertError.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Alias for dashboard compatibility
export const submitScore = submitInvestorScore

export async function calculateFinalistScore(data: {
  finalist_team_id: string
  judges_average: number
}) {
  try {
    z.string().uuid().parse(data.finalist_team_id)
    const judgesAvg = z.number().min(1.0).max(10.0).parse(data.judges_average)

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Calculate investor average
    const { data: scores, error } = await adminClient
      .from('final_round_scores')
      .select('score')
      .eq('finalist_team_id', data.finalist_team_id)

    if (error) return { success: false, error: error.message }

    let investorAvg = 0
    if (scores && scores.length > 0) {
      const sum = scores.reduce((acc: number, s: any) => acc + Number(s.score), 0)
      investorAvg = sum / scores.length
    }

    // Calculate final score: (investor_avg × 0.5) + (judges_avg × 0.5)
    const finalScore = (investorAvg * 0.5) + (judgesAvg * 0.5)

    // Upsert into final_judge_results
    await adminClient
      .from('final_judge_results')
      .upsert({
        finalist_team_id: data.finalist_team_id,
        judges_average: judgesAvg,
        investor_average: parseFloat(investorAvg.toFixed(2)),
        final_score: parseFloat(finalScore.toFixed(2)),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'finalist_team_id' })

    await logAdminAction(user.id, 'CALCULATE_FINALIST_SCORE', 'team', data.finalist_team_id, {
      investor_average: investorAvg,
      judges_average: judgesAvg,
      final_score: finalScore,
      scores_count: scores?.length || 0,
    })

    // Broadcast update
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'FINALS_SCORE_CALCULATED',
      payload: { finalist_team_id: data.finalist_team_id, final_score: finalScore },
    })

    revalidatePath('/admin/finals-scoring')
    return {
      success: true,
      data: { investor_average: investorAvg, judges_average: judgesAvg, final_score: finalScore },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function publishFinalsLeaderboard() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    await adminClient.from('event_state').update({
      current_phase: 'FINALS_LEADERBOARD',
      current_screen_state: 'FINALS_LEADERBOARD',
      final_leaderboard_active: true,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)

    await logAdminAction(user.id, 'PUBLISH_FINALS_LEADERBOARD', 'event_state')

    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'FINALS_LEADERBOARD_UPDATE',
      payload: { active: true },
    })

    revalidatePath('/admin/finals-scoring')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getFinalists() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('teams')
      .select('*')
      .eq('is_finalist', true)
      .order('team_name')

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function hasRatedFinalist(finalistTeamId: string) {
  try {
    z.string().uuid().parse(finalistTeamId)
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.from('users').select('team_id').eq('id', user.id).single()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    const { data, error } = await adminClient
      .from('final_round_scores')
      .select('id')
      .eq('finalist_team_id', finalistTeamId)
      .eq('investor_team_id', userData.team_id)
      .single()

    if (error && error.code !== 'PGRST116') return { success: false, error: error.message }
    return { success: true, data: !!data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getFinalistScores(finalistTeamId: string) {
  try {
    z.string().uuid().parse(finalistTeamId)
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { data: scores, error } = await adminClient
      .from('final_round_scores')
      .select('*, investor_team:teams!final_round_scores_investor_team_id_fkey(team_name)')
      .eq('finalist_team_id', finalistTeamId)

    if (error) return { success: false, error: error.message }

    // Calculate average
    let average = 0
    if (scores && scores.length > 0) {
      const sum = scores.reduce((acc: number, s: any) => acc + Number(s.score), 0)
      average = sum / scores.length
    }

    return { success: true, data: { scores, average: parseFloat(average.toFixed(2)), count: scores?.length || 0 } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
