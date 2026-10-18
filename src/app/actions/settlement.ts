'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { EVENT_CHANNEL } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/live-match/auth'
import { emitLiveEvent } from '@/lib/live-match/realtime'
import { LIVE_EVENTS, MATCH_STATUS, getMultiplierForResult } from '@/lib/live-match/engine'

const resultSchema = z.object({
  match_id: z.string().uuid(),
  red_votes: z.number().int().min(0).max(5),
  blue_votes: z.number().int().min(0).max(5),
}).refine((data) => data.red_votes + data.blue_votes === 5, {
  message: 'Red votes + Blue votes must equal 5',
})

export async function submitMatchResult(data: {
  match_id: string
  red_votes: number
  blue_votes: number
}) {
  try {
    const validated = resultSchema.parse(data)
    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient, user } = auth

    const listedMultiplier = getMultiplierForResult(validated.red_votes, validated.blue_votes)

    const { data: match } = await adminClient
      .from('matches')
      .select('*')
      .eq('id', validated.match_id)
      .single()

    if (!match) return { success: false, error: 'Match not found' }
    if (!['GAMBITS_CLOSED', 'AWAITING_JUDGE_RESULT'].includes(match.status)) {
      return { success: false, error: 'Investments must be closed before entering a result' }
    }

    const { data: settlementResult, error: rpcError } = await adminClient.rpc('settle_match_gambits', {
      p_match_id: validated.match_id,
      p_red_votes: validated.red_votes,
      p_blue_votes: validated.blue_votes,
    })

    if (rpcError) return { success: false, error: 'Settlement failed: ' + rpcError.message }

    await emitLiveEvent(LIVE_EVENTS.MATCH_RESULT_SUBMITTED, {
      matchId: validated.match_id,
      result: `${validated.red_votes}-${validated.blue_votes}`,
    })

    await adminClient
      .from('matches')
      .update({
        completed_by: user.id,
        multiplier: listedMultiplier,
        result: `${validated.red_votes}-${validated.blue_votes}`,
        status: MATCH_STATUS.MATCH_COMPLETE,
        completed_at: new Date().toISOString(),
      })
      .eq('id', validated.match_id)

    await adminClient
      .from('event_state')
      .update({
        current_screen_state: 'WAITING_FOR_MATCH',
        current_match_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    await logAdminAction(user.id, 'SUBMIT_MATCH_RESULT', 'match', validated.match_id, {
      red_votes: validated.red_votes,
      blue_votes: validated.blue_votes,
      multiplier: listedMultiplier,
    })
    await logAdminAction(user.id, 'MATCH_SETTLED', 'match', validated.match_id, {
      settlement: settlementResult,
    })

    await emitLiveEvent(LIVE_EVENTS.MATCH_COMPLETED, {
      matchId: validated.match_id,
      status: MATCH_STATUS.MATCH_COMPLETE,
    })

    revalidatePath('/admin/live-match')
    revalidatePath('/dashboard')
    return { success: true, data: settlementResult }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function resetToWaiting() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient
      .from('users')
      .select('auth_role')
      .eq('id', user.id)
      .single()

    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Update event state
    await adminClient
      .from('event_state')
      .update({
        current_screen_state: 'WAITING_FOR_MATCH',
        current_match_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    await logAdminAction(user.id, 'RESET_TO_WAITING', 'event_state')

    // Broadcast
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'MATCH_RESET',
      payload: { screen_state: 'WAITING_FOR_MATCH' },
    })

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function endMatch() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient
      .from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    await adminClient.from('event_state').update({
      current_screen_state: 'WAITING_FOR_MATCH',
      current_match_id: null,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)

    await logAdminAction(user.id, 'END_MATCH', 'event_state')

    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'MATCH_RESET',
      payload: { screen_state: 'WAITING_FOR_MATCH' },
    })

    revalidatePath('/admin/live-match')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function addInvestorBalance(amountPerTeam: number) {
  try {
    const z = await import('zod')
    z.z.number().positive().max(10000000).parse(amountPerTeam)

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient
      .from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Fetch all active investor teams
    const { data: investors, error: fetchError } = await adminClient
      .from('teams')
      .select('id, current_balance')
      .eq('role', 'INVESTOR')
      .eq('is_active', true)

    if (fetchError) return { success: false, error: fetchError.message }
    if (!investors || investors.length === 0) return { success: false, error: 'No active investor teams found' }

    for (const team of investors) {
      await adminClient.from('teams').update({
        current_balance: (team.current_balance || 0) + amountPerTeam
      }).eq('id', team.id)
      await adminClient.from('ledger_transactions').insert({
        team_id: team.id,
        transaction_type: 'MANUAL_ADJUSTMENT',
        amount: amountPerTeam,
        reference_type: 'admin_grant',
        reference_id: user.id,
      })
    }

    await logAdminAction(user.id, 'ADD_INVESTOR_BALANCE', 'teams', undefined, { amount: amountPerTeam, count: investors.length })
    revalidatePath('/admin/live-match')
    revalidatePath('/dashboard')
    return { success: true, count: investors.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

