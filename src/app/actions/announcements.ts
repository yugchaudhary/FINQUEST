'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EVENT_CHANNEL } from '@/lib/constants'

export async function getAnnouncements() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('announcements').select('*').order('published_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function publishAnnouncement(content: string) {
  try {
    z.string().min(1).parse(content)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { data, error } = await adminClient.from('announcements').insert({
      content,
      published_by: user.id
    }).select().single()

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'ANNOUNCEMENT_PUBLISHED', 'announcements', data.id, { content })

    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'ANNOUNCEMENT',
      payload: { announcement: data },
    })

    revalidatePath('/admin/announcements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    z.string().uuid().parse(id)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { error } = await adminClient.from('announcements').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'ANNOUNCEMENT_DELETED', 'announcements', id)
    
    // Broadcast reload so participants lose the deleted announcement
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'ANNOUNCEMENT_DELETED',
      payload: { id },
    })

    revalidatePath('/admin/announcements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
