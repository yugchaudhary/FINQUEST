'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getDashboardData } from '@/app/actions/dashboard'
import { TeamSetup } from '@/components/dashboard/team-setup'
import { TeamOverviewCard } from '@/components/dashboard/team-overview-card'
import { ProblemSelectionPanel } from '@/components/dashboard/problem-selection-panel'
import { InvestmentBalanceCard } from '@/components/dashboard/investment-balance-card'
import { AnnouncementsBanner } from '@/components/dashboard/announcements-banner'
import { Phase1Leaderboard } from '@/components/leaderboard/phase1-leaderboard'
import { FinalsLeaderboard } from '@/components/leaderboard/finals-leaderboard'
import { FinalistBroadcast } from '@/components/finals/finalist-broadcast'
import { submitScore } from '@/app/actions/finals'
import { getPhase1Leaderboard, getFinalsLeaderboard } from '@/app/actions/leaderboard'
import { EVENT_CHANNEL } from '@/lib/constants'

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [phase1Data, setPhase1Data] = useState<any[]>([])
  const [finalsData, setFinalsData] = useState<any[]>([])
  const [hasRated, setHasRated] = useState(false)
  const [currentFinalist, setCurrentFinalist] = useState<any>(null)

  const loadData = async () => {
    const res = await getDashboardData()
    if (res.success && res.data) {
      setData(res.data)
      
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
      if (res.error === 'Not authenticated' || res.error === 'Team not found') {
        router.push('/login')
      } else {
        console.error('Failed to load dashboard:', res.error)
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()

    const supabase = createClient()
    const ch = supabase.channel(EVENT_CHANNEL)
      .on('broadcast', { event: 'CATEGORY_ASSIGNED' }, loadData)
      .on('broadcast', { event: 'PROBLEM_PUBLISHED' }, loadData)
      .on('broadcast', { event: 'PROBLEM_SELECTION_UPDATE' }, loadData)
      .on('broadcast', { event: 'ANNOUNCEMENT' }, loadData)
      .on('broadcast', { event: 'ANNOUNCEMENT_DELETED' }, loadData)
      .on('broadcast', { event: 'PHASE_CHANGE' }, loadData)
      .on('broadcast', { event: 'LEADERBOARD_PUBLISHED' }, loadData)
      .on('broadcast', { event: 'FINALS_LEADERBOARD_UPDATE' }, loadData)
      .on('broadcast', { event: 'FINALIST_BROADCAST' }, (msg) => {
        setHasRated(false)
        setCurrentFinalist(msg.payload)
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-[#8b5cf6] border-t-transparent mx-auto"
          />
          <p className="text-gray-500 text-xs uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Global override screens
  const screen = data.eventState?.current_screen_state

  if (data.eventState?.final_leaderboard_active || screen === 'FINALS_LEADERBOARD') {
    return <div className="min-h-screen bg-[#0a0a0f] text-white pt-24"><FinalsLeaderboard data={finalsData} /></div>
  }

  if (screen === 'FINALIST_LIVE' || screen === 'RATINGS_OPEN') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
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

  if (data.eventState?.phase_1_leaderboard_published) {
    return <div className="min-h-screen bg-[#0a0a0f] text-white"><Phase1Leaderboard leaderboardData={phase1Data} /></div>
  }

  if (screen === 'SETUP') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black mb-2">Welcome, {data.team.team_name}</h1>
          <p className="text-gray-400 mb-8">The event has not started yet. Configure your team roster below.</p>
          <TeamSetup joinCode={data.team.join_code} />
        </div>
      </div>
    )
  }

  // Active Dashboard
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-12 pb-32">
      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        <AnnouncementsBanner announcements={data.announcements} />
        
        <TeamOverviewCard team={data.team} members={data.members} />

        {data.team.role === 'INVESTOR' && (
          <InvestmentBalanceCard 
            startingBalance={data.team.starting_balance} 
            currentBalance={data.team.current_balance} 
          />
        )}

        <ProblemSelectionPanel 
          problems={data.problems}
          selections={data.selections}
          selectionState={data.selectionState}
          onUpdate={loadData}
        />
      </div>

      {/* Ambient grid */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.4) 1px, transparent 1px), linear-gradient(90deg,rgba(139,92,246,0.4) 1px,transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#8b5cf6]/5 blur-[140px] pointer-events-none z-0" />
    </div>
  )
}
