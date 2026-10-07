'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { EVENT_CHANNEL } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const broadcastSchema = z.object({
  category: z.string().min(1),
  red_team_id: z.string().uuid(),
  blue_team_id: z.string().uuid(),
}).refine((data) => data.red_team_id !== data.blue_team_id, {
  message: 'Red and Blue teams must be different',
})

export async function broadcastMatch(data: {
  category: string
  red_team_id: string
  blue_team_id: string
}) {
  try {
    const validated = broadcastSchema.parse(data)

    // Verify admin
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

    // Verify teams exist and are in the same category
    const { data: redTeam } = await adminClient
      .from('teams')
      .select('*')
      .eq('id', validated.red_team_id)
      .single()

    const { data: blueTeam } = await adminClient
      .from('teams')
      .select('*')
      .eq('id', validated.blue_team_id)
      .single()

    if (!redTeam || !blueTeam) return { success: false, error: 'One or both teams not found' }

    // Auto-cleanup any dangling matches that got stuck in LIVE status
    await adminClient
      .from('matches')
      .update({ status: 'COMPLETED' })
      .eq('status', 'LIVE')

    // Get current round number
    const { count } = await adminClient
      .from('matches')
      .select('*', { count: 'exact', head: true })

    const roundNumber = (count || 0) + 1

    // Create match
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

    if (matchError) return { success: false, error: matchError.message }

    // Update event state
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

    // Audit log
    await logAdminAction(user.id, 'BROADCAST_MATCH', 'match', match.id, {
      round_number: roundNumber,
      category: validated.category,
      red_team: redTeam.team_name,
      blue_team: blueTeam.team_name,
    })

    // Broadcast realtime event
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'MATCH_BROADCAST',
      payload: {
        match_id: match.id,
        round_number: roundNumber,
        category: validated.category,
        red_team: { id: redTeam.id, team_name: redTeam.team_name },
        blue_team: { id: blueTeam.id, team_name: blueTeam.team_name },
      },
    })

    revalidatePath('/admin/live-match')
    revalidatePath('/dashboard')
    return { success: true, data: match }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: error.message }
  }
}

export async function getCurrentMatch() {
  try {
    const adminClient = createAdminClient()

    const { data: eventState } = await adminClient
      .from('event_state')
      .select('current_match_id')
      .eq('id', 1)
      .single()

    if (!eventState?.current_match_id) return { success: true, data: null }

    const { data: match, error } = await adminClient
      .from('matches')
      .select(`
        *,
        red_team:teams!matches_red_team_id_fkey(id, team_name, category, role),
        blue_team:teams!matches_blue_team_id_fkey(id, team_name, category, role)
      `)
      .eq('id', eventState.current_match_id)
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: match }
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
      .eq('status', 'COMPLETED')
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

    if (error) return { success: false, error: error.message }

    const categories = Array.from(new Set((data || []).map((t: any) => t.category)))
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
      .select('*')
      .eq('category', category)
      .order('team_name')

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
