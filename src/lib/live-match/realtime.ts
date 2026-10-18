import { createAdminClient } from '@/lib/supabase/admin'
import { EVENT_CHANNEL } from '@/lib/constants'
import { LIVE_EVENTS } from '@/lib/live-match/engine'

export async function emitLiveEvent(
  event: string,
  payload: Record<string, unknown>
) {
  const adminClient = createAdminClient()
  const channel = adminClient.channel(EVENT_CHANNEL)
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), 1500)
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          resolve()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout)
          reject(new Error(status))
        }
      })
    })
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    })
    if (event === LIVE_EVENTS.MATCH_BROADCASTED) {
      await channel.send({
        type: 'broadcast',
        event: 'MATCH_BROADCAST',
        payload,
      })
    }
    // Allow brief moment for broadcast packet to flush over WebSocket
    await new Promise((resolve) => setTimeout(resolve, 300))
  } catch (error) {
    console.error('Failed to emit live event', event, error)
  } finally {
    await adminClient.removeChannel(channel)
  }
}
