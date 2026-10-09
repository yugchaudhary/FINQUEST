'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const memberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal(''))
})

export async function addTeamMember(data: any) {
  try {
    const validated = memberSchema.parse(data)
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.from('users').select('team_id').eq('id', user.id).single()
    if (!userData?.team_id) return { success: false, error: 'Team not found' }

    // Check limit
    const { count } = await adminClient.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', userData.team_id)
    if (count !== null && count >= 4) return { success: false, error: 'Team already has 4 members' }

    const { error } = await supabase.from('team_members').insert({
      team_id: userData.team_id,
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null
    })

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    if (error instanceof z.ZodError) return { success: false, error: error.errors[0].message }
    return { success: false, error: error.message }
  }
}

export async function removeTeamMember(memberId: string) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase.from('team_members').delete().eq('id', memberId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTeamMembers() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: true })
    if (error) return { success: false, error: error.message }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
