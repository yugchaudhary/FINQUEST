'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { EVENT_CHANNEL } from '@/lib/constants'

export async function getEventState() {
  try {
    const adminClient = createAdminClient()
    
    const { data: eventState, error } = await adminClient
      .from('event_state')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) return { success: false, error: error.message }

    // If there's a current match, fetch match data with teams
    let matchData = null
    if (eventState?.current_match_id) {
      const { data: match } = await adminClient
        .from('matches')
        .select(`
          *,
          red_team:teams!matches_red_team_id_fkey(id, team_name, category),
          blue_team:teams!matches_blue_team_id_fkey(id, team_name, category)
        `)
        .eq('id', eventState.current_match_id)
        .single()
      matchData = match
    }

    // If there's a current finalist, fetch team data
    let currentFinalist = null
    if (eventState?.current_finalist_id) {
      const { data: finalist } = await adminClient
        .from('teams')
        .select('*')
        .eq('id', eventState.current_finalist_id)
        .single()
      currentFinalist = finalist
    }

    return {
      success: true,
      data: {
        eventState,
        matchData,
        currentFinalist,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateScreenState(newState: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient
      .from('users')
      .select('auth_role')
      .eq('id', user.id)
      .single()

    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    await adminClient
      .from('event_state')
      .update({
        current_screen_state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    await logAdminAction(user.id, 'UPDATE_SCREEN_STATE', 'event_state', undefined, { newState })

    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'PHASE_CHANGE',
      payload: { current_screen_state: newState },
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getEventOverview() {
  try {
    const adminClient = createAdminClient()

    const [
      { count: teamsCount },
      { count: investorCount },
      { count: matchesCount },
      { count: completedMatchCount },
      { count: finalistsCount },
      { data: eventState },
    ] = await Promise.all([
      adminClient.from('teams').select('*', { count: 'exact', head: true }),
      adminClient.from('teams').select('*', { count: 'exact', head: true }).eq('role', 'INVESTOR'),
      adminClient.from('matches').select('*', { count: 'exact', head: true }),
      adminClient.from('matches').select('*', { count: 'exact', head: true }).in('status', ['COMPLETED', 'MATCH_COMPLETE']),
      adminClient.from('teams').select('*', { count: 'exact', head: true }).eq('is_finalist', true),
      adminClient.from('event_state').select('*').eq('id', 1).single(),
    ])

    return {
      success: true,
      data: {
        totalTeams: teamsCount || 0,
        investorCount: investorCount || 0,
        totalMatches: matchesCount || 0,
        completedMatches: completedMatchCount || 0,
        finalistsCount: finalistsCount || 0,
        currentPhase: eventState?.current_phase || 'SETUP',
        currentScreenState: eventState?.current_screen_state || 'SETUP',
        currentRound: eventState?.current_round || 0,
        phase1LeaderboardPublished: eventState?.phase_1_leaderboard_published || false,
        finalsInitialized: eventState?.finals_initialized || false,
        finalLeaderboardActive: eventState?.final_leaderboard_active || false,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
