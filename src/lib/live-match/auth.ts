import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not authenticated' }
  return { ok: true as const, user, adminClient: createAdminClient() }
}

export async function requireAdmin() {
  const auth = await requireUser()
  if (!auth.ok) return auth
  const { data: adminUser } = await auth.adminClient
    .from('users')
    .select('id, auth_role, team_id')
    .eq('id', auth.user.id)
    .single()

  if (adminUser?.auth_role !== 'ADMIN') {
    return { ok: false as const, error: 'Unauthorized' }
  }
  return { ...auth, adminUser }
}

export async function requireInvestor() {
  const auth = await requireUser()
  if (!auth.ok) return auth
  const { data: userData } = await auth.adminClient
    .from('users')
    .select('*, teams(*)')
    .eq('id', auth.user.id)
    .single()

  if (!userData?.teams) return { ok: false as const, error: 'Team not found' }
  if (userData.teams.role !== 'INVESTOR') {
    return { ok: false as const, error: 'Only INVESTOR teams can place Gambits' }
  }
  if (userData.teams.is_active === false) {
    return { ok: false as const, error: 'Team is not active' }
  }
  return { ...auth, userData, team: userData.teams }
}
