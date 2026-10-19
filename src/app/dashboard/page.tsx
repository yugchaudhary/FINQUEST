'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getDashboardData } from '@/app/actions/dashboard'
import { submitScore } from '@/app/actions/finals'
import { getPhase1Leaderboard, getFinalsLeaderboard } from '@/app/actions/leaderboard'
import { EVENT_CHANNEL } from '@/lib/constants'

// Components
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { LiveStatusCard } from '@/components/dashboard/live-status-card'
import { InvestmentBalanceCard } from '@/components/dashboard/investment-balance-card'
import { AnnouncementsBanner } from '@/components/dashboard/announcements-banner'
import { LeaderboardSection } from '@/components/dashboard/leaderboard-section'
import { FinalistCard } from '@/components/dashboard/finalist-card'

// Fullscreen Overrides
import { FinalsLeaderboard } from '@/components/leaderboard/finals-leaderboard'
import { FinalistBroadcast } from '@/components/finals/finalist-broadcast'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [phase1Data, setPhase1Data] = useState<any[]>([])
  const [finalsData, setFinalsData] = useState<any[]>([])
  const [hasRated, setHasRated] = useState(false)
  const [currentFinalist, setCurrentFinalist] = useState<any>(null)
  const isInitialLoadRef = useRef(true)
  const isFetchingRef = useRef(false)
  const hasQueuedFetchRef = useRef(false)

  const loadData = async () => {
    if (isFetchingRef.current) {
      hasQueuedFetchRef.current = true
      return
    }
    isFetchingRef.current = true
    try {
      const res = await getDashboardData()
      if (res.success && res.data) {
        setData(res.data)
        isInitialLoadRef.current = false
        
        const { eventState } = res.data

        if (eventState?.phase_1_leaderboard_published) {
          const lb1 = await getPhase1Leaderboard()
          setPhase1Data(lb1?.data || [])
        }
        
        if (eventState?.final_leaderboard_active) {
          const lbf = await getFinalsLeaderboard()
          setFinalsData(lbf?.data || [])
        }

        if (eventState?.current_screen_state === 'FINALIST_LIVE') {
          setCurrentFinalist({ id: eventState.current_finalist_id })
        }
      } else {
        if (res?.error?.includes('another device')) {
          router.push('/login?error=' + encodeURIComponent('Logged in from another device. Only one device is allowed per team account.'))
        } else if (isInitialLoadRef.current && (res.error === 'Not authenticated' || res.error === 'Team not found')) {
          router.push('/login')
        } else {
          console.warn('Dashboard sync skipped:', res?.error)
        }
      }
    } catch (err) {
      console.warn('Dashboard sync error:', err)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
      if (hasQueuedFetchRef.current) {
        hasQueuedFetchRef.current = false
        throttledLoadData()
      }
    }
  }

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const throttledLoadData = (delay = Math.random() * 1500) => {
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
    timeoutIdRef.current = setTimeout(() => {
      loadData()
    }, delay)
  }

  useEffect(() => {
    loadData()

    const supabase = createClient()
    const ch = supabase.channel(EVENT_CHANNEL)
      // Broadcast events (Fallback / Custom payload events)
      .on('broadcast', { event: 'CATEGORY_ASSIGNED' }, () => throttledLoadData())
      .on('broadcast', { event: 'ANNOUNCEMENT' }, () => throttledLoadData())
      .on('broadcast', { event: 'ANNOUNCEMENT_DELETED' }, () => throttledLoadData())
      .on('broadcast', { event: 'PHASE_CHANGE' }, () => throttledLoadData())
      .on('broadcast', { event: 'LEADERBOARD_PUBLISHED' }, () => throttledLoadData())
      .on('broadcast', { event: 'FINALS_LEADERBOARD_UPDATE' }, () => throttledLoadData())
      .on('broadcast', { event: 'FINALIST_BROADCAST' }, (msg) => {
        setHasRated(false)
        setCurrentFinalist(msg.payload)
        throttledLoadData()
      })
      // Database changes (Highly reliable, bypasses Serverless edge issues)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, () => throttledLoadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => throttledLoadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => throttledLoadData())
      .subscribe()

    return () => { 
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
      supabase.removeChannel(ch) 
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent mx-auto"
          />
          <p className="text-slate-500 text-xs uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Global override screens
  const screen = data.eventState?.current_screen_state

  if (data.eventState?.final_leaderboard_active || screen === 'FINALS_LEADERBOARD') {
    return <div className="min-h-screen bg-background text-foreground pt-24"><FinalsLeaderboard data={finalsData} /></div>
  }

  if (screen === 'FINALIST_LIVE' || screen === 'RATINGS_OPEN') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <FinalistBroadcast 
          finalistTeam={currentFinalist} 
          onScoreSubmit={async (score) => {
            if (!currentFinalist?.id) return;
            await submitScore(currentFinalist.id, score)
            setHasRated(true)
          }} 
          hasRated={hasRated} 
        />
      </div>
    )
  }

  const isFinalsPhase = screen === 'FINALS_TRANSITION' || screen === 'FINALS_READY' || screen === 'FINALS_SCORE_CALCULATED'

  // Active Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground pb-32 flex flex-col relative overflow-x-hidden">
      <DashboardNav user={data.user} team={data.team} eventState={data.eventState} />

      <main className="flex-1 px-4 max-w-5xl mx-auto w-full relative z-10 flex flex-col gap-6">
        <DashboardHero 
          user={data.user} 
          team={data.team} 
          eventState={data.eventState} 
        />

        <LiveStatusCard 
          eventState={data.eventState} 
          team={data.team} 
        />



        {data.team.role === 'INVESTOR' && (
          <InvestmentBalanceCard 
            startingBalance={data.team.starting_balance} 
            currentBalance={data.team.current_balance} 
            isPhase1LeaderboardPublished={data.eventState?.phase_1_leaderboard_published}
            displayBalance={data.team.display_balance}
            totalInvested={data.team.total_invested}
          />
        )}

        <AnnouncementsBanner announcements={data.announcements} />

        <LeaderboardSection 
          isPublished={data.eventState?.phase_1_leaderboard_published} 
          leaderboardData={phase1Data} 
        />

        {isFinalsPhase && (
          <FinalistCard 
            isFinalist={data.team.is_finalist} 
            teamName={data.team.team_name} 
          />
        )}
      </main>

      {/* Ambient Grid Background */}
      <div 
        className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.4) 1px, transparent 1px), linear-gradient(90deg,rgba(139,92,246,0.4) 1px,transparent 1px)`,
          backgroundSize: '60px 60px',
        }} 
      />
      <div className="fixed top-1/3 right-0 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none z-0" />
    </div>
  )
}
