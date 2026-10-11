import { createAdminClient } from '@/lib/supabase/admin'

export async function logAdminAction(
  adminUserId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      admin_user_id: adminUserId,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || null
    })

  if (error) {
    console.error('Failed to log admin action:', error)
  }
}
