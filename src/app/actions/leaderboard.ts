'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { EVENT_CHANNEL } from '@/lib/constants'
import { revalidatePath } from 'next/cache'

export async function publishPhase1Leaderboard() {
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

    // Check not already published
    const { data: state } = await adminClient
      .from('event_state')
      .select('phase_1_leaderboard_published')
      .eq('id', 1)
      .single()

    if (state?.phase_1_leaderboard_published) {
      return { success: false, error: 'Phase 1 leaderboard has already been published' }
    }

    // Update event state
    await adminClient
      .from('event_state')
      .update({
        current_phase: 'PHASE_1_REVEAL',
        current_screen_state: 'PHASE_1_REVEAL',
        phase_1_leaderboard_published: true,
        current_match_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    await logAdminAction(user.id, 'PUBLISH_PHASE1_LEADERBOARD', 'event_state')

    // Broadcast
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'LEADERBOARD_PUBLISHED',
      payload: { phase: 'PHASE_1_REVEAL' },
    })

    revalidatePath('/admin/phase1-finale')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getPhase1Leaderboard() {
  try {
    const adminClient = createAdminClient()
    const { data: teams, error } = await adminClient
      .from('teams')
      .select('id, team_name, category, role, starting_balance, current_balance')
      .eq('role', 'INVESTOR')
      .eq('is_active', true)

    if (error) return { success: false, error: error.message }

    const leaderboard = (teams || [])
      .map((team: any) => ({
        team_id: team.id,
        team_name: team.team_name,
        category: team.category,
        net_profit_loss: team.current_balance - team.starting_balance,
        current_balance: team.current_balance,
      }))
      .sort((a: any, b: any) => b.net_profit_loss - a.net_profit_loss)
      .map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1,
      }))

    return { success: true, data: leaderboard }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getFinalsLeaderboard() {
  try {
    const adminClient = createAdminClient()
    const { data: results, error } = await adminClient
      .from('final_judge_results')
      .select(`
        *,
        teams:finalist_team_id(id, team_name, category)
      `)
      .not('final_score', 'is', null)
      .order('final_score', { ascending: false })

    if (error) return { success: false, error: error.message }

    const leaderboard = (results || []).map((entry: any, index: number) => ({
      rank: index + 1,
      team_name: entry.teams?.team_name || 'Unknown',
      category: entry.teams?.category || '',
      final_score: entry.final_score,
      investor_average: entry.investor_average,
      judges_average: entry.judges_average,
    }))

    return { success: true, data: leaderboard }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
