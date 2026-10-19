'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireInvestor, requireUser } from '@/lib/live-match/auth'
import { emitLiveEvent } from '@/lib/live-match/realtime'
import {
  LIVE_EVENTS,
  MAX_GAMBIT_AMOUNT,
  sanitizeGambitAmount,
} from '@/lib/live-match/engine'

const lockGambitSchema = z.object({
  match_id: z.string().uuid(),
  selected_team_id: z.string().uuid(),
  amount: z.number().min(0).max(MAX_GAMBIT_AMOUNT),
})

export async function lockGambit(matchId: string, selectedTeamId: string, amount: number) {
  try {
    const validated = lockGambitSchema.parse({
      match_id: matchId,
      selected_team_id: selectedTeamId,
      amount: sanitizeGambitAmount(amount),
    })

    const auth = await requireInvestor()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient, team } = auth

    const gambitAmount = sanitizeGambitAmount(validated.amount)
    if (gambitAmount <= 0) {
      return { success: false, error: 'Investment amount must be greater than 0' }
    }

    // Pre-flight checks executed in parallel to minimize lock latency
    const [matchRes, eventStateRes, teamGambitsRes] = await Promise.all([
      adminClient
        .from('matches')
        .select('status, red_team_id, blue_team_id')
        .eq('id', validated.match_id)
        .single(),
      adminClient
        .from('event_state')
        .select('current_screen_state, phase_1_leaderboard_published')
        .eq('id', 1)
        .single(),
      adminClient
        .from('gambits')
        .select('amount')
        .eq('investor_team_id', team.id),
    ])

    const matchData = matchRes.data
    const matchErr = matchRes.error
    if (matchErr || !matchData) {
      return { success: false, error: 'Match not found' }
    }

    if (!['GAMBITS_OPEN', 'MATCH_LIVE', 'LIVE'].includes(matchData.status)) {
      return { success: false, error: 'Investments are closed for this battle' }
    }

    if (
      validated.selected_team_id !== matchData.red_team_id &&
      validated.selected_team_id !== matchData.blue_team_id
    ) {
      return { success: false, error: 'Selected team is not in this match' }
    }

    const eventState = eventStateRes.data
    if (eventState && eventState.current_screen_state !== 'MATCH_LIVE') {
      return { success: false, error: 'Investments are closed for this battle' }
    }

    // Available balance check according to logic:
    // x: amount assigned by admin (starting_balance)
    // y: amount displayed to investors
    // after round: y = y - amount invested on the team = x - totalInvested
    // after leaderboard published: y = y + z = current_balance
    const isPhase1Published = Boolean(eventState?.phase_1_leaderboard_published)
    if (!isPhase1Published) {
      const teamGambits = teamGambitsRes.data || []
      const totalInvested = teamGambits.reduce((sum, g) => sum + (Number(g.amount) || 0), 0)
      const x = Number(team.starting_balance || 0)
      const availableBalance = Math.max(0, x - totalInvested)

      if (gambitAmount > availableBalance) {
        return { success: false, error: 'Insufficient balance' }
      }
    }

    const { data, error } = await adminClient.rpc('lock_gambit', {
      p_match_id: validated.match_id,
      p_investor_team_id: team.id,
      p_selected_team_id: validated.selected_team_id,
      p_amount: gambitAmount,
    })

    if (error) {
      const message = error.message || 'Failed to lock Investment'
      if (message.includes('already placed') || error.code === '23505') {
        return { success: false, error: 'You have already placed an Investment for this match' }
      }
      if (message.includes('Insufficient balance')) {
        return { success: false, error: 'Insufficient balance' }
      }
      if (message.includes('not LIVE') || message.includes('closed') || message.includes('GAMBITS_CLOSED')) {
        return { success: false, error: 'Investments are closed for this battle' }
      }

      // Unknown RPC error – surface it cleanly
      return { success: false, error: message.replace(/^.*ERROR:\s*/i, '') }
    }

    // Non-blocking background notification to admin live screen
    // Allows the participant to receive an instant (<100ms) lock confirmation
    // without waiting for additional database count and broadcast roundtrips.
    void (async () => {
      try {
        const { count } = await adminClient
          .from('gambits')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', validated.match_id)

        await emitLiveEvent(LIVE_EVENTS.GAMBIT_LOCKED, {
          matchId: validated.match_id,
          lockedCount: count || 0,
        })
      } catch (err) {
        console.warn('Background gambit lock broadcast error:', err)
      }
    })()

    return { success: true, data }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function getMyGambit(matchId: string) {
  try {
    z.string().uuid().parse(matchId)
    const auth = await requireUser()
    if (!auth.ok) return { success: false, error: auth.error }

    const { data: userData } = await auth.adminClient
      .from('users')
      .select('team_id')
      .eq('id', auth.user.id)
      .single()

    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    const { data, error } = await auth.adminClient
      .from('gambits')
      .select('id, match_id, selected_team_id, amount, status, locked_at')
      .eq('match_id', matchId)
      .eq('investor_team_id', userData.team_id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') return { success: false, error: error.message }
    return { success: true, data: data || null }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function hasSubmittedGambit(matchId: string) {
  try {
    const res = await getMyGambit(matchId)
    return { success: true, data: !!res.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
