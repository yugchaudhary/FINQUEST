'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getEventState } from '@/app/actions/event-state'
import { getInvestorLiveState } from '@/app/actions/matches'
import { EVENT_CHANNEL, PRESENCE_CHANNEL } from '@/lib/constants'
import { LIVE_EVENTS, MATCH_STATUS } from '@/lib/live-match/engine'

function normalizeMatch(payload: any) {
  if (!payload) return null
  const red = payload.redTeam || payload.red_team
  const blue = payload.blueTeam || payload.blue_team
  if (!red || !blue) return payload
  return {
    id: payload.matchId || payload.match_id || payload.id,
    round_number: payload.roundNumber || payload.round_number,
    category: payload.category,
    status: payload.status,
    red_team: {
      id: red.id,
      team_name: red.name || red.team_name,
      name: red.name || red.team_name,
    },
    blue_team: {
      id: blue.id,
      team_name: blue.name || blue.team_name,
      name: blue.name || blue.team_name,
    },
  }
}

export function useEventState(options?: { role?: 'ADMIN' | 'PARTICIPANT'; teamId?: string }) {
  const [eventState, setEventState] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [matchData, setMatchData] = useState<any>(null)
  const [currentFinalist, setCurrentFinalist] = useState<any>(null)
  const [myGambit, setMyGambit] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting')
  const [gambitsLocked, setGambitsLocked] = useState(0)
  const [investorsConnected, setInvestorsConnected] = useState(0)
  const fetchingRef = useRef(false)

  const fetchInitialState = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      if (options?.role !== 'ADMIN') {
        const live = await getInvestorLiveState()
        if (live?.success && live.data) {
          setEventState(live.data.eventState || null)
          setMatchData(normalizeMatch(live.data.match))
          setMyGambit(live.data.myGambit || null)
        }
      }

      const result = await getEventState()
      if (result && result.success && result.data) {
        const { eventState: nextState, matchData: nextMatch, currentFinalist: nextFinalist } = result.data
        setEventState(nextState || null)
        setCurrentFinalist(nextFinalist || null)
        if (options?.role === 'ADMIN') {
          const status = nextMatch?.status
          if (status === MATCH_STATUS.MATCH_COMPLETE || status === 'COMPLETED') {
            setMatchData(null)
          } else {
            setMatchData(normalizeMatch(nextMatch))
          }
        } else if (!nextState?.current_match_id && nextState?.current_screen_state === 'WAITING_FOR_MATCH') {
          // Investor live fetch is authoritative for match; keep finals data from event state.
        }
      }
    } catch (error) {
      console.error('Failed to fetch event state:', error)
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [options?.role])

  useEffect(() => {
    fetchInitialState()

    const supabase = createClient()
    const channel = supabase.channel(EVENT_CHANNEL)

    const applyBroadcasted = (msg: { payload: any }) => {
      const payload = msg.payload
      if (!payload) return
      setEventState((prev: any) => ({
        ...prev,
        current_screen_state: 'MATCH_LIVE',
        current_match_id: payload.matchId || payload.match_id,
      }))
      setMatchData(normalizeMatch(payload))
      setMyGambit(null)
      setGambitsLocked(0)
    }

    channel
      .on('broadcast', { event: LIVE_EVENTS.MATCH_BROADCASTED }, applyBroadcasted)
      .on('broadcast', { event: 'MATCH_BROADCAST' }, applyBroadcasted)
      .on('broadcast', { event: LIVE_EVENTS.GAMBITS_CLOSED }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'AWAITING_RESULT',
        }))
        setMatchData((prev: any) => prev ? { ...prev, status: MATCH_STATUS.GAMBITS_CLOSED } : prev)
      })
      .on('broadcast', { event: LIVE_EVENTS.GAMBIT_LOCKED }, (msg) => {
        if (typeof msg.payload?.lockedCount === 'number') {
          setGambitsLocked(msg.payload.lockedCount)
        }
      })
      .on('broadcast', { event: 'RESULT_SUBMITTED' }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'MATCH_COMPLETE',
        }))
      })
      .on('broadcast', { event: LIVE_EVENTS.MATCH_RESULT_SUBMITTED }, () => {
        setMatchData((prev: any) => prev ? { ...prev, status: MATCH_STATUS.PROCESSING_RESULT } : prev)
      })
      .on('broadcast', { event: LIVE_EVENTS.MATCH_COMPLETED }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'WAITING_FOR_MATCH',
          current_match_id: null,
        }))
        setMatchData(null)
        setMyGambit(null)
        setGambitsLocked(0)
      })
      .on('broadcast', { event: 'MATCH_RESET' }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'WAITING_FOR_MATCH',
          current_match_id: null,
        }))
        setMatchData(null)
        setMyGambit(null)
      })
      .on('broadcast', { event: 'LEADERBOARD_PUBLISHED' }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'PHASE_1_REVEAL',
          phase_1_leaderboard_published: true,
        }))
      })
      .on('broadcast', { event: 'PHASE_CHANGE' }, (msg) => {
        const payload = msg.payload
        if (payload) {
          setEventState((prev: any) => ({
            ...prev,
            ...payload,
          }))
        }
      })
      .on('broadcast', { event: 'FINALIST_BROADCAST' }, (msg) => {
        const payload = msg.payload
        if (payload) {
          setEventState((prev: any) => ({
            ...prev,
            current_screen_state: 'FINALIST_LIVE',
            current_finalist_id: payload.finalist_team_id,
          }))
          setCurrentFinalist(payload)
        }
      })
      .on('broadcast', { event: 'FINALS_SCORE_CALCULATED' }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'FINALS_SCORE_CALCULATED',
        }))
      })
      .on('broadcast', { event: 'FINALS_LEADERBOARD_UPDATE' }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'FINALS_LEADERBOARD',
          final_leaderboard_active: true,
        }))
      })
      .on('broadcast', { event: 'event-state-update' }, (msg) => {
        const payload = msg.payload
        if (payload) {
          if (payload.eventState !== undefined) setEventState(payload.eventState)
          if (payload.matchData !== undefined) setMatchData(normalizeMatch(payload.matchData))
          if (payload.currentFinalist !== undefined) setCurrentFinalist(payload.currentFinalist)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionStatus('reconnecting')
        }
      })

    const presence = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: options?.teamId || options?.role || 'anon' } },
    })

    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState()
        const investors = Object.values(state)
          .flat()
          .filter((row: any) => row?.role === 'INVESTOR')
        setInvestorsConnected(new Set(investors.map((row: any) => row.teamId || row.presence_ref)).size)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && options?.teamId) {
          await presence.track({
            role: 'INVESTOR',
            teamId: options.teamId,
            at: Date.now(),
          })
        }
      })

    const onOnline = () => {
      setConnectionStatus('connecting')
      fetchInitialState()
    }
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('online', onOnline)
      supabase.removeChannel(channel)
      supabase.removeChannel(presence)
    }
  }, [fetchInitialState, options?.teamId, options?.role])

  return {
    eventState,
    isLoading,
    matchData,
    currentFinalist,
    myGambit,
    setMyGambit,
    connectionStatus,
    gambitsLocked,
    investorsConnected,
    refetch: fetchInitialState,
  }
}
