'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EVENT_CHANNEL } from '@/lib/constants'
import { requireUser, requireAdmin } from '@/lib/live-match/auth'
import { emitLiveEvent } from '@/lib/live-match/realtime'

export async function getPublishedProblemsForTeam() {
  try {
    const auth = await requireUser()
    if (!auth.ok) return { success: false, error: auth.error }
    const supabase = await createClient()

    // RLS handles everything: we just query the table.
    // The policy ensures we only get published = true AND category_id matches the team's category.
    const { data, error } = await supabase
      .from('problem_statements')
      .select('*')
      .order('number', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getAllProblemsForAdmin(categoryId: string) {
  try {
    z.string().uuid().parse(categoryId)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: auth.error }
    const { adminClient } = auth

    const { data, error } = await adminClient
      .from('problem_statements')
      .select('*')
      .eq('category_id', categoryId)
      .order('number', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function notifyProblemChange(categoryId: string) {
  await emitLiveEvent('PROBLEM_PUBLISHED', { categoryId })
}

export async function publishProblem(problemId: string) {
  try {
    z.string().uuid().parse(problemId)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: 'Unauthorized' }
    const { adminClient, user } = auth

    const { data: problem, error } = await adminClient
      .from('problem_statements')
      .update({ published: true, published_at: new Date().toISOString(), published_by: user.id })
      .eq('id', problemId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'PROBLEM_PUBLISHED', 'problem_statements', problemId, { problemNumber: problem.number, categoryId: problem.category_id })
    await notifyProblemChange(problem.category_id)
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    revalidatePath('/admin/problem-statements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function unpublishProblem(problemId: string) {
  try {
    z.string().uuid().parse(problemId)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: 'Unauthorized' }
    const { adminClient, user } = auth

    const { data: problem, error } = await adminClient
      .from('problem_statements')
      .update({ published: false, published_at: null, published_by: null })
      .eq('id', problemId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'PROBLEM_UNPUBLISHED', 'problem_statements', problemId, { problemNumber: problem.number, categoryId: problem.category_id })
    await notifyProblemChange(problem.category_id)
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    revalidatePath('/admin/problem-statements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function publishAllInCategory(categoryId: string) {
  try {
    z.string().uuid().parse(categoryId)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: 'Unauthorized' }
    const { adminClient, user } = auth

    const { error } = await adminClient
      .from('problem_statements')
      .update({ published: true, published_at: new Date().toISOString(), published_by: user.id })
      .eq('category_id', categoryId)

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'PROBLEM_PUBLISHED_ALL', 'problem_statements', undefined, { categoryId })
    await notifyProblemChange(categoryId)
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    revalidatePath('/admin/problem-statements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function unpublishAllInCategory(categoryId: string) {
  try {
    z.string().uuid().parse(categoryId)

    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: 'Unauthorized' }
    const { adminClient, user } = auth

    const { error } = await adminClient
      .from('problem_statements')
      .update({ published: false, published_at: null, published_by: null })
      .eq('category_id', categoryId)

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'PROBLEM_UNPUBLISHED_ALL', 'problem_statements', undefined, { categoryId })
    await notifyProblemChange(categoryId)
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    revalidatePath('/admin/problem-statements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
