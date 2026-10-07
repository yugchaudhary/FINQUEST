'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireUser } from '@/lib/live-match/auth'
import { emitLiveEvent } from '@/lib/live-match/realtime'
import {
  ACTIVE_MATCH_STATUSES,
  LIVE_EVENTS,
  MATCH_STATUS,
  PHASE_1_ROUNDS,
  canBroadcastNewMatch,
  nextRoundNumber,
  toPublicMatchPayload,
  validateBroadcastInput,
} from '@/lib/live-match/engine'

const broadcastSchema = z.object({
  category: z.string().min(1),
  red_team_id: z.string().uuid(),
  blue_team_id: z.string().uuid(),
}).refine((data) => data.red_team_id !== data.blue_team_id, {
  message: 'Red Team and Blue Team cannot be the same',
})

function publicTeam(team: { id: string; team_name: string }) {
  return { id: team.id, team_name: team.team_name, name: team.team_name }
}

export async function broadcastMatch(data: {
  category: string
  red_team_id: string
  blue_team_id: string
}) {
  try {
    const validated = broadcastSchema.parse(data)
    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient, user } = auth

    const { data: redTeam } = await adminClient.from('teams').select('*').eq('id', validated.red_team_id).single()
    const { data: blueTeam } = await adminClient.from('teams').select('*').eq('id', validated.blue_team_id).single()

    const validation = validateBroadcastInput({
      category: validated.category,
      redTeamId: validated.red_team_id,
      blueTeamId: validated.blue_team_id,
      redTeam,
      blueTeam,
    })
    if (!validation.ok) return { success: false, error: validation.error }

    const { data: activeMatches } = await adminClient
      .from('matches')
      .select('id, status')
      .in('status', [...ACTIVE_MATCH_STATUSES, 'LIVE', 'PENDING'])

    const blocking = (activeMatches || []).find((m: { status: string }) => !canBroadcastNewMatch(m.status))
    if (blocking) {
      return { success: false, error: 'A match is already in progress' }
    }

    const { data: rounds } = await adminClient.from('matches').select('round_number')
    let roundNumber: number
    try {
      roundNumber = nextRoundNumber((rounds || []).map((r: { round_number: number }) => r.round_number))
    } catch (error: any) {
      return { success: false, error: error.message }
    }

    const { data: match, error: matchError } = await adminClient
      .from('matches')
      .insert({
        round_number: roundNumber,
        category: validated.category,
        red_team_id: validated.red_team_id,
        blue_team_id: validated.blue_team_id,
        status: 'LIVE',
        broadcasted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (matchError) {
      if (matchError.code === '23505') {
        return { success: false, error: 'This round has already been broadcast' }
      }
      return { success: false, error: matchError.message }
    }

    await adminClient
      .from('event_state')
      .update({
        current_phase: 'PHASE_1',
        current_screen_state: 'MATCH_LIVE',
        current_match_id: match.id,
        current_round: roundNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    await logAdminAction(user.id, 'BROADCAST_MATCH', 'match', match.id, {
      round_number: roundNumber,
      category: validated.category,
      red_team: redTeam.team_name,
      blue_team: blueTeam.team_name,
    })

    const payload = toPublicMatchPayload({
      id: match.id,
      round_number: roundNumber,
      category: validated.category,
      status: MATCH_STATUS.GAMBITS_OPEN,
      red_team: redTeam,
      blue_team: blueTeam,
    })

    await emitLiveEvent(LIVE_EVENTS.MATCH_BROADCASTED, payload)

    revalidatePath('/admin/live-match')
    revalidatePath('/dashboard')
    return { success: true, data: match, payload }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: error.message }
  }
}

export async function closeGambits(matchId: string) {
  try {
    z.string().uuid().parse(matchId)
    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient, user } = auth

    const { data: match } = await adminClient.from('matches').select('*').eq('id', matchId).single()
    if (!match) return { success: false, error: 'Match not found' }
    if (match.status !== 'LIVE') {
      return { success: false, error: 'Gambits cannot be closed in the current state' }
    }

    const now = new Date().toISOString()
    // Cannot update status because DB constraint allows only PENDING, LIVE, COMPLETED
    // Cannot update closed_at because column does not exist
    
    // Instead we drive the state purely via event_state
    await adminClient
      .from('event_state')
      .update({
        current_screen_state: 'GAMBITS_CLOSED',
        updated_at: now,
      })
      .eq('id', 1)

    await logAdminAction(user.id, 'CLOSE_GAMBITS', 'match', matchId, {
      round_number: match.round_number,
    })

    await emitLiveEvent(LIVE_EVENTS.GAMBITS_CLOSED, {
      matchId,
      status: MATCH_STATUS.GAMBITS_CLOSED,
    })

    revalidatePath('/admin/live-match')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCurrentMatch() {
  try {
    const adminClient = createAdminClient()

    const { data: eventState } = await adminClient
      .from('event_state')
      .select('current_match_id, current_round, current_screen_state')
      .eq('id', 1)
      .single()

    const { data: activeMatch } = await adminClient
      .from('matches')
      .select(`
        *,
        red_team:teams!matches_red_team_id_fkey(id, team_name, category, role, is_active),
        blue_team:teams!matches_blue_team_id_fkey(id, team_name, category, role, is_active)
      `)
      .in('status', [...ACTIVE_MATCH_STATUSES, 'LIVE'])
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const matchId = activeMatch?.id || eventState?.current_match_id
    if (!matchId) {
      return {
        success: true,
        data: null,
        currentRound: eventState?.current_round || 0,
        maxRounds: PHASE_1_ROUNDS,
      }
    }

    const { data: match, error } = await adminClient
      .from('matches')
      .select(`
        *,
        red_team:teams!matches_red_team_id_fkey(id, team_name, category, role, is_active),
        blue_team:teams!matches_blue_team_id_fkey(id, team_name, category, role, is_active)
      `)
      .eq('id', matchId)
      .single()

    if (error) return { success: false, error: error.message }
    if (match && (match.status === MATCH_STATUS.MATCH_COMPLETE || match.status === 'COMPLETED')) {
      return {
        success: true,
        data: null,
        currentRound: eventState?.current_round || match.round_number,
        maxRounds: PHASE_1_ROUNDS,
      }
    }

    return {
      success: true,
      data: match,
      currentRound: match?.round_number || eventState?.current_round || 0,
      screenState: eventState?.current_screen_state || 'WAITING_FOR_MATCH',
      maxRounds: PHASE_1_ROUNDS,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getMatchActivity(matchId: string) {
  try {
    z.string().uuid().parse(matchId)
    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: auth.error }

    const { count, error } = await auth.adminClient
      .from('gambits')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId)

    if (error) return { success: false, error: error.message }
    return { success: true, data: { gambitsLocked: count || 0 } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getInvestorLiveState() {
  try {
    const auth = await requireUser()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient, user } = auth

    const { data: userData } = await adminClient
      .from('users')
      .select('team_id, auth_role')
      .eq('id', user.id)
      .single()

    const { data: eventState } = await adminClient
      .from('event_state')
      .select('*')
      .eq('id', 1)
      .single()

    const { data: activeMatch } = await adminClient
      .from('matches')
      .select(`
        id, round_number, category, status, red_team_id, blue_team_id,
        red_team:teams!matches_red_team_id_fkey(id, team_name),
        blue_team:teams!matches_blue_team_id_fkey(id, team_name)
      `)
      .in('status', [...ACTIVE_MATCH_STATUSES, 'LIVE'])
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    let myGambit = null
    if (activeMatch && userData?.team_id) {
      const { data: gambit } = await adminClient
        .from('gambits')
        .select('id, selected_team_id, locked_at, status')
        .eq('match_id', activeMatch.id)
        .eq('investor_team_id', userData.team_id)
        .maybeSingle()
      myGambit = gambit
    }

    const publicMatch = activeMatch
      ? {
          ...toPublicMatchPayload({
            id: activeMatch.id,
            round_number: activeMatch.round_number,
            category: activeMatch.category,
            status: activeMatch.status,
            red_team: Array.isArray(activeMatch.red_team) ? activeMatch.red_team[0] : activeMatch.red_team,
            blue_team: Array.isArray(activeMatch.blue_team) ? activeMatch.blue_team[0] : activeMatch.blue_team,
          }),
          red_team: publicTeam(
            (Array.isArray(activeMatch.red_team) ? activeMatch.red_team[0] : activeMatch.red_team) as {
              id: string
              team_name: string
            }
          ),
          blue_team: publicTeam(
            (Array.isArray(activeMatch.blue_team) ? activeMatch.blue_team[0] : activeMatch.blue_team) as {
              id: string
              team_name: string
            }
          ),
        }
      : null

    return {
      success: true,
      data: {
        eventState,
        match: publicMatch,
        myGambit: myGambit
          ? {
              id: myGambit.id,
              selectedTeamId: myGambit.selected_team_id,
              lockedAt: myGambit.locked_at,
              status: myGambit.status,
            }
          : null,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCompletedMatches() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('matches')
      .select(`
        *,
        red_team:teams!matches_red_team_id_fkey(id, team_name, category),
        blue_team:teams!matches_blue_team_id_fkey(id, team_name, category),
        judge_results(red_votes, blue_votes)
      `)
      .in('status', ['MATCH_COMPLETE', 'COMPLETED'])
      .order('round_number', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getMatchCount() {
  try {
    const adminClient = createAdminClient()
    const { count, error } = await adminClient
      .from('matches')
      .select('*', { count: 'exact', head: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: count || 0 }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCategories() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('teams')
      .select('category')
      .eq('is_active', true)

    if (error) return { success: false, error: error.message }

    const categories = Array.from(new Set((data || []).map((t: { category: string }) => t.category)))
    return { success: true, data: categories }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTeamsByCategory(category: string) {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('teams')
      .select('id, team_name, category, role, is_active')
      .eq('category', category)
      .eq('is_active', true)
      .order('team_name')

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
