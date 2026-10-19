'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { z } from 'zod'
import { EVENT_CHANNEL } from '@/lib/constants'

export async function getCategories() {
  noStore()
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

import { requireAdmin } from '@/lib/live-match/auth'

export async function assignTeamCategory(teamId: string, categoryId: string) {
  try {
    z.string().uuid().parse(teamId)
    z.string().uuid().parse(categoryId)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient, user } = auth

    // Check team role: Investors cannot have a category assigned
    const { data: team } = await adminClient.from('teams').select('role').eq('id', teamId).single()
    if (!team) return { success: false, error: 'Team not found' }
    if (team.role === 'INVESTOR') {
      return { success: false, error: 'Investors cannot be assigned a category. Categories are only assigned to Founders.' }
    }

    // Check if category exists
    const { data: category } = await adminClient.from('categories').select('name').eq('id', categoryId).single()
    if (!category) return { success: false, error: 'Category not found' }

    const updateData: any = {
      category_id: categoryId,
      category: category.name
    }
    if (team.role === 'PENDING') {
      updateData.role = 'INNOVATOR'
    }

    const { error } = await adminClient.from('teams').update(updateData).eq('id', teamId)

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
