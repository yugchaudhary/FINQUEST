'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getEventState } from '@/app/actions/event-state'
import { EVENT_CHANNEL } from '@/lib/constants'

export function useEventState() {
  const [eventState, setEventState] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [matchData, setMatchData] = useState<any>(null)
  const [currentFinalist, setCurrentFinalist] = useState<any>(null)

  const fetchInitialState = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await getEventState()
      if (result && result.success && result.data) {
        const { eventState, matchData, currentFinalist } = result.data
        setEventState(eventState || null)
        setMatchData(matchData || null)
        setCurrentFinalist(currentFinalist || null)
      }
    } catch (error) {
      console.error('Failed to fetch event state:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitialState()

    const supabase = createClient()
    const channel = supabase.channel(EVENT_CHANNEL)

    // Listen for broadcast events
    channel
      .on('broadcast', { event: 'MATCH_BROADCAST' }, (msg) => {
        const payload = msg.payload
        if (payload) {
          setEventState((prev: any) => ({
            ...prev,
            current_screen_state: 'MATCH_LIVE',
            current_match_id: payload.match_id,
          }))
          setMatchData(payload)
        }
      })
      .on('broadcast', { event: 'RESULT_SUBMITTED' }, (msg) => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'MATCH_COMPLETE',
        }))
      })
      .on('broadcast', { event: 'MATCH_RESET' }, () => {
        setEventState((prev: any) => ({
          ...prev,
          current_screen_state: 'WAITING_FOR_MATCH',
          current_match_id: null,
        }))
        setMatchData(null)
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
      .on('broadcast', { event: 'FINALS_SCORE_CALCULATED' }, (msg) => {
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
        // Generic state update fallback
        const payload = msg.payload
        if (payload) {
          if (payload.eventState !== undefined) {
            setEventState(payload.eventState)
          }
          if (payload.matchData !== undefined) {
            setMatchData(payload.matchData)
          }
          if (payload.currentFinalist !== undefined) {
            setCurrentFinalist(payload.currentFinalist)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchInitialState])

  return { eventState, isLoading, matchData, currentFinalist, refetch: fetchInitialState }
}
