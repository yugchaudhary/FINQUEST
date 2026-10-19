'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/live-match/auth'

export async function getDashboardData() {
  try {
    const auth = await requireUser()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient, user } = auth

    // Get User and Team info
    const { data: userData } = await adminClient.from('users').select('team_id, auth_role').eq('id', user.id).maybeSingle()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    // Fetch team, members, announcements, event_state, and gambits concurrently
    const [teamRes, membersRes, announcementsRes, eventStateRes, gambitsRes] = await Promise.all([
      adminClient.from('teams').select('*, categories(name)').eq('id', userData.team_id).maybeSingle(),
      adminClient.from('team_members').select('*').eq('team_id', userData.team_id),
      adminClient.from('announcements').select('*').order('published_at', { ascending: false }),
      adminClient.from('event_state').select('*').maybeSingle(),
      adminClient.from('gambits').select('amount').eq('investor_team_id', userData.team_id),
    ])

    const team = teamRes.data
    const members = membersRes.data || []
    const announcements = announcementsRes.data || []
    if (announcementsRes.error) {
      console.error('Error fetching announcements:', announcementsRes.error)
    }
    const eventState = eventStateRes.data

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
      const gambits = gambitsRes.data || []
      totalInvested = gambits.reduce((sum, g) => sum + (Number(g.amount) || 0), 0)
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
