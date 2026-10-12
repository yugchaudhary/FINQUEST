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

    return {
      success: true,
      data: {
        team: {
          ...team,
          categoryName: team?.categories?.name
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
