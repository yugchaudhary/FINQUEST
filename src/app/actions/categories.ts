'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EVENT_CHANNEL } from '@/lib/constants'

export async function getCategories() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTeamCategory(teamId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('teams').select('category_id, categories(*)').eq('id', teamId).single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: data.categories }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function assignTeamCategory(teamId: string, categoryId: string) {
  try {
    z.string().uuid().parse(teamId)
    z.string().uuid().parse(categoryId)

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    // Check if category exists
    const { data: category } = await adminClient.from('categories').select('name').eq('id', categoryId).single()
    if (!category) return { success: false, error: 'Category not found' }

    const { error } = await adminClient.from('teams').update({
      category_id: categoryId,
      category: category.name // Update the text category column as well for backward compatibility
    }).eq('id', teamId)

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'CATEGORY_ASSIGNED', 'teams', teamId, { categoryId, categoryName: category.name })

    // Force a global realtime update by touching the event_state singleton table
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    // Broadcast category assignment to participants
    const channel = adminClient.channel(EVENT_CHANNEL)
    await channel.send({
      type: 'broadcast',
      event: 'CATEGORY_ASSIGNED',
      payload: { teamId, categoryId, categoryName: category.name },
    })

    revalidatePath('/admin/categories')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
