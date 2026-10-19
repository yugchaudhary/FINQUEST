'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EVENT_CHANNEL } from '@/lib/constants'
import { requireAdmin } from '@/lib/live-match/auth'
import { emitLiveEvent } from '@/lib/live-match/realtime'

export async function getAnnouncements() {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function publishAnnouncement(content: string) {
  try {
    z.string().min(1).parse(content)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: 'Unauthorized: Admin privileges required.' }
    const { adminClient, user } = auth

    const { data, error } = await adminClient.from('announcements').insert({
      content: content.trim(),
      published_by: user.id
    }).select().single()

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'ANNOUNCEMENT_PUBLISHED', 'announcements', data.id, { content: content.trim() })

    // Touch event_state singleton to trigger realtime reload across all connected participant screens
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    await emitLiveEvent('ANNOUNCEMENT', { announcement: data })

    revalidatePath('/admin/announcements')
    revalidatePath('/dashboard')
    
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    z.string().uuid().parse(id)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: 'Unauthorized: Admin privileges required.' }
    const { adminClient, user } = auth

    const { error } = await adminClient.from('announcements').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'ANNOUNCEMENT_DELETED', 'announcements', id)
    
    // Touch event_state singleton to trigger realtime updates for all participants
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    await emitLiveEvent('ANNOUNCEMENT', { announcement: null, deletedId: id })

    revalidatePath('/admin/announcements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
