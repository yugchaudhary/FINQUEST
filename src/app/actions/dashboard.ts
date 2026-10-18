'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getDashboardData() {
  try {
    const supabase = await createClient()
    let user = null

    const { data: sessData } = await supabase.auth.getSession()
    user = sessData?.session?.user || null

    if (!user) {
      try {
        const { data: authData } = await supabase.auth.getUser()
        user = authData?.user || null
      } catch {
        user = null
      }
    }
    
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()

    // Get User and Team info
    const { data: userData } = await adminClient.from('users').select('team_id, auth_role').eq('id', user.id).maybeSingle()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    // Fetch team with category and balance
    const { data: team } = await adminClient.from('teams').select('*, categories(name)').eq('id', userData.team_id).maybeSingle()
    
    // Fetch members
    const { data: members } = await adminClient.from('team_members').select('*').eq('team_id', userData.team_id)

    // Fetch announcements reliably using adminClient (bypassing any RLS token delays)
    const { data: announcements, error: annError } = await adminClient.from('announcements').select('*').order('published_at', { ascending: false })
    if (annError) {
      console.error('Error fetching announcements:', annError)
    }

    // Fetch event state to know what screen to show globally (e.g. Phase 1 Leaderboard)
    const { data: eventState } = await adminClient.from('event_state').select('*').maybeSingle()

    // Calculate investor display_balance according to logic:
    // x: amount assigned by admin (starting_balance)
    // y: amount will display to investors
    // initially: y = x
    // z = profit or loss from investment
    // after round: y = y - (amount invested on the team) = x - totalInvested
    // this will continue until leaderboard is globally published
    // after leaderboard published: y = y + z = current_balance
    let totalInvested = 0
    let displayBalance = Number(team?.current_balance || 0)

    if (team?.role === 'INVESTOR') {
      const { data: gambits } = await adminClient
        .from('gambits')
        .select('amount')
        .eq('investor_team_id', userData.team_id)

      totalInvested = (gambits || []).reduce((sum, g) => sum + (Number(g.amount) || 0), 0)
      const isPhase1Published = Boolean(eventState?.phase_1_leaderboard_published)
      const x = Number(team?.starting_balance || 0)
      displayBalance = isPhase1Published ? Number(team?.current_balance || 0) : Math.max(0, x - totalInvested)
    }

    return {
      success: true,
      data: {
        team: {
          ...team,
          categoryName: team?.categories?.name,
          total_invested: totalInvested,
          display_balance: displayBalance,
        },
        members: members || [],
        announcements: announcements || [],
        eventState
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
