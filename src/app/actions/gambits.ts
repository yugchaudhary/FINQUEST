'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clampGambitAmount } from '@/lib/format'
import { MAX_GAMBIT_AMOUNT } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const lockGambitSchema = z.object({
  match_id: z.string().uuid(),
  selected_team_id: z.string().uuid(),
  amount: z.number().positive().max(MAX_GAMBIT_AMOUNT),
})

export async function lockGambit(matchId: string, selectedTeamId: string, amount: number) {
  try {
    // Validate input
    const validated = lockGambitSchema.parse({
      match_id: matchId,
      selected_team_id: selectedTeamId,
      amount: clampGambitAmount(amount),
    })

    // Verify auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()

    // Get user's team data
    const { data: userData } = await adminClient
      .from('users')
      .select('*, teams(*)')
      .eq('id', user.id)
      .single()

    if (!userData || !userData.teams) return { success: false, error: 'Team not found' }
    if (userData.teams.role !== 'INVESTOR') return { success: false, error: 'Only INVESTOR teams can place Gambits' }

    const team = userData.teams

    // Verify match is live
    const { data: match } = await adminClient
      .from('matches')
      .select('*')
      .eq('id', validated.match_id)
      .single()

    if (!match || match.status !== 'LIVE') return { success: false, error: 'Match is not currently live' }

    // Verify selected team is in this match
    if (validated.selected_team_id !== match.red_team_id && validated.selected_team_id !== match.blue_team_id) {
      return { success: false, error: 'Selected team is not in this match' }
    }

    // Clamp and validate amount
    const gambitAmount = clampGambitAmount(validated.amount)
    if (gambitAmount <= 0) return { success: false, error: 'Amount must be greater than 0' }
    if (gambitAmount > MAX_GAMBIT_AMOUNT) return { success: false, error: `Maximum gambit amount is ${MAX_GAMBIT_AMOUNT}` }

    // Check if already submitted gambit for this match
    const { data: existingGambit } = await adminClient
      .from('gambits')
      .select('id')
      .eq('match_id', validated.match_id)
      .eq('investor_team_id', team.id)
      .single()

    if (existingGambit) return { success: false, error: 'You have already placed a Gambit for this match' }

    // Verify sufficient balance
    if (gambitAmount > team.current_balance) {
      return { success: false, error: 'Insufficient balance for this Gambit' }
    }

    // Atomically: create gambit + deduct balance
    // Insert gambit first (UNIQUE constraint prevents duplicates)
    const { error: insertError } = await adminClient
      .from('gambits')
      .insert({
        match_id: validated.match_id,
        investor_team_id: team.id,
        selected_team_id: validated.selected_team_id,
        amount: gambitAmount,
        status: 'LOCKED',
        locked_at: new Date().toISOString(),
      })

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return { success: false, error: 'You have already placed a Gambit for this match' }
      }
      return { success: false, error: 'Failed to lock Gambit: ' + insertError.message }
    }

    // Deduct balance
    const { error: balanceError } = await adminClient
      .from('teams')
      .update({ current_balance: team.current_balance - gambitAmount })
      .eq('id', team.id)

    if (balanceError) {
      // Rollback gambit
      await adminClient
        .from('gambits')
        .delete()
        .eq('match_id', validated.match_id)
        .eq('investor_team_id', team.id)
      return { success: false, error: 'Failed to update balance' }
    }

    revalidatePath('/dashboard')
    return { success: true }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single()

    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    const { data, error } = await adminClient
      .from('gambits')
      .select('*')
      .eq('match_id', matchId)
      .eq('investor_team_id', userData.team_id)
      .single()

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
