'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEventState } from '@/hooks/useEventState'
import { useSession } from '@/hooks/useSession'
import { AwaitingMatch } from '@/components/gambit/awaiting-match'
import { MatchBroadcast } from '@/components/gambit/match-broadcast'
import { GambitLocked } from '@/components/gambit/gambit-locked'
import { GambitModal } from '@/components/gambit/gambit-modal'
import { Phase1Leaderboard } from '@/components/leaderboard/phase1-leaderboard'
import { FinalistBroadcast } from '@/components/finals/finalist-broadcast'
import { FinalsLeaderboard } from '@/components/leaderboard/finals-leaderboard'
import { getPhase1Leaderboard } from '@/app/actions/leaderboard'
import { getFinalsLeaderboard } from '@/app/actions/leaderboard'
import { lockGambit } from '@/app/actions/gambits'
import { submitScore } from '@/app/actions/finals'
import { TeamSetup } from '@/components/dashboard/team-setup'

export default function DashboardPage() {
  const router = useRouter()
  const { user, role, team, isLoading: isSessionLoading } = useSession()
  const { eventState, isLoading: isEventLoading, matchData, currentFinalist } = useEventState()
  
  const [isGambitModalOpen, setIsGambitModalOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [selectedColor, setSelectedColor] = useState<'red' | 'blue' | null>(null)
  const [hasLocked, setHasLocked] = useState(false)
  const [hasRated, setHasRated] = useState(false)
  
  const [phase1Data, setPhase1Data] = useState([])
  const [finalsData, setFinalsData] = useState([])

  useEffect(() => {
    if (!isSessionLoading && !user) {
      router.push('/login')
    }
  }, [user, isSessionLoading, router])

  useEffect(() => {
    if (eventState?.current_screen_state === 'PHASE_1_REVEAL') {
      getPhase1Leaderboard().then((data: any) => setPhase1Data(data || []))
    }
    if (eventState?.current_screen_state === 'FINALS_LEADERBOARD') {
      getFinalsLeaderboard().then((data: any) => setFinalsData(data || []))
    }
    if (eventState?.current_screen_state === 'WAITING_FOR_MATCH' || eventState?.current_screen_state === 'MATCH_LIVE') {
      if (eventState?.current_screen_state === 'WAITING_FOR_MATCH') {
        setHasLocked(false)
        setSelectedTeam(null)
        setSelectedColor(null)
      }
    }
    if (eventState?.current_screen_state === 'RATINGS_OPEN') {
      setHasRated(false)
    }
  }, [eventState?.current_screen_state])

  if (isSessionLoading || isEventLoading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/50 text-sm tracking-widest uppercase">Initializing Secure Connection...</div>
  }

  if (!user) return null

  const handleSelectTeam = (team: any, color: 'red' | 'blue') => {
    if (hasLocked || eventState?.current_screen_state !== 'MATCH_LIVE') return
    setSelectedTeam(team)
    setSelectedColor(color)
    setIsGambitModalOpen(true)
  }

  const handleLockGambit = async (amount: number) => {
    if (!selectedTeam || !matchData) return
    try {
      await lockGambit(matchData.id, selectedTeam.id, amount)
      setHasLocked(true)
      setIsGambitModalOpen(false)
    } catch (err) {
      console.error(err)
      throw err
    }
  }
  
  const handleScoreSubmit = async (score: number) => {
    if (!currentFinalist) return
    try {
      await submitScore(currentFinalist.id, score)
      setHasRated(true)
    } catch (err) {
      console.error(err)
    }
  }

  const renderScreen = () => {
    switch (eventState?.current_screen_state) {
      case 'SETUP':
        return (
          <div className="max-w-4xl mx-auto pt-20 px-6">
            <div className="mb-8">
              <h1 className="text-3xl font-space-grotesk font-bold">Welcome, {team?.name}</h1>
              <p className="text-gray-400 mt-2">The event has not started yet. Please configure your team roster.</p>
            </div>
            <TeamSetup joinCode={team?.join_code} />
          </div>
        )
      case 'WAITING_FOR_MATCH':
      case 'MATCH_COMPLETE':
        return <AwaitingMatch teamName={team?.name} />
      case 'MATCH_LIVE':
        if (hasLocked) {
          return <GambitLocked selectedTeam={selectedTeam} selectedColor={selectedColor} />
        }
        return (
          <>
            <MatchBroadcast 
              redTeam={matchData?.red_team}
              blueTeam={matchData?.blue_team}
              roundNumber={matchData?.round_number}
              category={matchData?.category}
              onSelectTeam={handleSelectTeam}
            />
            <GambitModal 
              isOpen={isGambitModalOpen}
              onClose={() => setIsGambitModalOpen(false)}
              selectedTeam={selectedTeam}
              selectedColor={selectedColor}
              matchId={matchData?.id}
              onGambitLocked={handleLockGambit}
            />
          </>
        )
      case 'GAMBIT_LOCKED':
      case 'AWAITING_RESULT':
        return <GambitLocked selectedTeam={selectedTeam} selectedColor={selectedColor} />
      case 'PHASE_1_REVEAL':
        return <Phase1Leaderboard leaderboardData={phase1Data} />
      case 'FINALIST_LIVE':
      case 'RATINGS_OPEN':
        return <FinalistBroadcast finalistTeam={currentFinalist} onScoreSubmit={handleScoreSubmit} hasRated={hasRated} />
      case 'FINALS_LEADERBOARD':
        return <FinalsLeaderboard data={finalsData} />
      default:
        return <AwaitingMatch teamName={team?.name} />
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {renderScreen()}
    </div>
  )
}
