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

    const { data, error } = await adminClient.rpc('lock_gambit', {
      p_match_id: validated.match_id,
      p_investor_team_id: team.id,
      p_selected_team_id: validated.selected_team_id,
      p_amount: gambitAmount,
    })

    if (error) {
      const message = error.message || 'Failed to lock Gambit'
      if (message.includes('already placed') || error.code === '23505') {
        return { success: false, error: 'You have already placed a Gambit for this match' }
      }
      return { success: false, error: message.replace(/^.*ERROR:\s*/i, '') }
    }

    const { count } = await adminClient
      .from('gambits')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', validated.match_id)

    await emitLiveEvent(LIVE_EVENTS.GAMBIT_LOCKED, {
      matchId: validated.match_id,
      lockedCount: count || 0,
    })

    revalidatePath('/dashboard')
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
      .select('id, match_id, selected_team_id, status, locked_at')
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
