import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return { ok: false as const, error: 'Not authenticated' }

  const currentSessionId = user.user_metadata?.current_session_id
  if (currentSessionId) {
    const cookieStore = await cookies()
    const deviceSession = cookieStore.get('finquest_device_session')?.value
    if (deviceSession !== currentSessionId) {
      const adminClient = createAdminClient()
      const { data: userData } = await adminClient
        .from('users')
        .select('auth_role')
        .eq('id', user.id)
        .maybeSingle()

      if (userData?.auth_role === 'PARTICIPANT') {
        return {
          ok: false as const,
          error: 'Logged in from another device. Only one device is allowed per team account.'
        }
      }
    }
  }

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
    return { ok: false as const, error: 'Only INVESTOR teams can place Investments' }
  }
  if (userData.teams.is_active === false) {
    return { ok: false as const, error: 'Team is not active' }
  }
  return { ...auth, userData, team: userData.teams }
}
