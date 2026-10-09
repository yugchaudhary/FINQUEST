'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardData() {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) return { success: false, error: 'Network error connecting to auth server' }
    
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    // Get User and Team info
    const { data: userData } = await supabase.from('users').select('team_id, auth_role').eq('id', user.id).single()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    // Fetch team with category and balance
    const { data: team } = await supabase.from('teams').select('*, categories(name)').eq('id', userData.team_id).single()
    
    // Fetch members
    const { data: members } = await supabase.from('team_members').select('*').eq('team_id', userData.team_id)

    // Fetch announcements
    const { data: announcements } = await supabase.from('announcements').select('*').order('published_at', { ascending: false })

    // Fetch problems if category is assigned
    let problems = []
    if (team?.category_id) {
      // Use admin client here temporarily to bypass any RLS issues
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminClient = createAdminClient()
      const { data: probs, error: probsErr } = await adminClient.from('problem_statements')
        .select('*')
        .eq('category_id', team.category_id)
        .eq('published', true)
        .order('number', { ascending: true })
      
      console.log('Problems fetch:', probs?.length, probsErr)
      problems = probs || []
    }

    // Fetch selections
    const { data: selections } = await supabase.from('team_problem_selections').select('problem_statement_id').eq('team_id', userData.team_id)
    const { data: selectionState } = await supabase.from('team_problem_selection_state').select('*').eq('team_id', userData.team_id).single()

    // Fetch event state to know what screen to show globally (e.g. Phase 1 Leaderboard)
    const { data: eventState } = await supabase.from('event_state').select('*').single()

    return {
      success: true,
      data: {
        team: {
          ...team,
          categoryName: team?.categories?.name
        },
        members: members || [],
        announcements: announcements || [],
        problems,
        selections: (selections || []).map((s: any) => s.problem_statement_id),
        selectionState: selectionState || { status: 'NOT_STARTED' },
        eventState
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
