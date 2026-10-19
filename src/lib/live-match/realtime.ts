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
    // Broadcast directly over HTTP REST without creating a WebSocket connection
    if (typeof (channel as any).httpSend === 'function') {
      await (channel as any).httpSend(event, payload)
      if (event === LIVE_EVENTS.MATCH_BROADCASTED) {
        await (channel as any).httpSend('MATCH_BROADCAST', payload)
      }
    } else {
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
    }
  } catch (error) {
    console.error('Failed to emit live event', event, error)
  } finally {
    await adminClient.removeChannel(channel)
  }
}
