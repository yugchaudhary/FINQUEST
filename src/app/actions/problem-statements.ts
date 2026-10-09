'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EVENT_CHANNEL } from '@/lib/constants'

export async function getPublishedProblemsForTeam() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

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

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

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
  const adminClient = createAdminClient()
  const channel = adminClient.channel(EVENT_CHANNEL)
  await channel.send({
    type: 'broadcast',
    event: 'PROBLEM_PUBLISHED',
    payload: { categoryId },
  })
}

export async function publishProblem(problemId: string) {
  try {
    z.string().uuid().parse(problemId)

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

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

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

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

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { error } = await adminClient
      .from('problem_statements')
      .update({ published: true, published_at: new Date().toISOString(), published_by: user.id })
      .eq('category_id', categoryId)

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'PROBLEM_PUBLISHED_ALL', 'problem_statements', undefined, { categoryId })
    await notifyProblemChange(categoryId)
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)
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

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }
    
    const adminClient = createAdminClient()
    const { data: adminUser } = await adminClient.from('users').select('auth_role').eq('id', user.id).single()
    if (adminUser?.auth_role !== 'ADMIN') return { success: false, error: 'Unauthorized' }

    const { error } = await adminClient
      .from('problem_statements')
      .update({ published: false, published_at: null, published_by: null })
      .eq('category_id', categoryId)

    if (error) return { success: false, error: error.message }

    await logAdminAction(user.id, 'PROBLEM_UNPUBLISHED_ALL', 'problem_statements', undefined, { categoryId })
    await notifyProblemChange(categoryId)
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)
    await adminClient.from('event_state').update({ updated_at: new Date().toISOString() }).eq('id', 1)

    revalidatePath('/admin/problem-statements')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
