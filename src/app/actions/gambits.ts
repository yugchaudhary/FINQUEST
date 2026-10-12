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
      if (message.includes('Insufficient balance')) {
        return { success: false, error: 'Insufficient balance' }
      }

      // Resilient fallback if RPC encountered match status string mismatch
      try {
        const { data: teamData } = await adminClient.from('teams').select('current_balance').eq('id', team.id).single()
        if (!teamData || (teamData.current_balance || 0) < gambitAmount) {
          return { success: false, error: 'Insufficient balance' }
        }

        const { data: existing } = await adminClient.from('gambits').select('id').eq('match_id', validated.match_id).eq('investor_team_id', team.id).maybeSingle()
        if (existing) {
          return { success: false, error: 'You have already placed a Gambit for this match' }
        }

        const { error: balErr } = await adminClient.from('teams').update({
          current_balance: (teamData.current_balance || 0) - gambitAmount
        }).eq('id', team.id)
        if (balErr) return { success: false, error: balErr.message }

        const { data: fallbackData, error: insErr } = await adminClient.from('gambits').insert({
          match_id: validated.match_id,
          investor_team_id: team.id,
          selected_team_id: validated.selected_team_id,
          amount: gambitAmount,
          status: 'LOCKED'
        }).select().single()

        if (insErr) {
          await adminClient.from('teams').update({ current_balance: teamData.current_balance }).eq('id', team.id)
          return { success: false, error: insErr.message }
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
        revalidatePath('/dashboard/live-match')
        return { success: true, data: fallbackData }
      } catch (fbErr: any) {
        return { success: false, error: message.replace(/^.*ERROR:\s*/i, '') }
      }
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
    revalidatePath('/dashboard/live-match')
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
