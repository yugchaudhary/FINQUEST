import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, ArrowRight, Lock, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCurrentMatch } from '@/app/actions/matches'
import { hasSubmittedGambit } from '@/app/actions/gambits'

interface LiveStatusCardProps {
  eventState: any
  team: any
}

export function LiveStatusCard({ eventState, team }: LiveStatusCardProps) {
  const router = useRouter()
  const screen = eventState?.current_screen_state
  const [matchInfo, setMatchInfo] = useState<any>(null)
  const [gambitLocked, setGambitLocked] = useState(false)

  useEffect(() => {
    async function loadMatch() {
      if (screen === 'MATCH_LIVE' && eventState?.current_match_id) {
        const [matchRes, gambitRes] = await Promise.all([
          getCurrentMatch(),
          hasSubmittedGambit(eventState.current_match_id)
        ])
        
        if (matchRes.success) {
          setMatchInfo(matchRes.data)
        }
        if (gambitRes.success && gambitRes.data !== undefined) {
          setGambitLocked(gambitRes.data)
        }
      }
    }
    loadMatch()
  }, [screen, eventState?.current_match_id])

  // Don't show in finals
  if (screen === 'FINALS_READY' || screen === 'FINALIST_LIVE' || screen === 'RATINGS_OPEN' || screen === 'FINALS_SCORE_CALCULATED' || screen === 'FINALS_LEADERBOARD') {
    return null
  }

  const renderContent = () => {
    // Priority 1: Live Match
    if (screen === 'MATCH_LIVE' && matchInfo) {
      if (gambitLocked) {
        return (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Gambit Locked</h3>
            <p className="text-slate-500">Awaiting judge decision for Round {eventState.current_round}.</p>
          </div>
        )
      }

      return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE NOW
              </span>
              <span className="text-slate-500 font-mono text-sm">ROUND 0{eventState.current_round}</span>
            </div>
            
            <div className="flex items-center gap-4 text-lg md:text-xl font-bold">
              <span className="text-red-400">{matchInfo.red_team?.team_name}</span>
              <span className="text-slate-500 text-sm">VS</span>
              <span className="text-blue-400">{matchInfo.blue_team?.team_name}</span>
            </div>
          </div>
          
          <Button 
            onClick={() => router.push('/dashboard/live-match')}
            className="w-full md:w-auto bg-surface text-black hover:bg-gray-200 font-bold"
            size="lg"
          >
            ENTER LIVE MATCH
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )
    }



    if (screen === 'SETUP') {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-center opacity-80">
          <Activity className="w-8 h-8 text-purple-400 mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-foreground">Event Setup in Progress</h3>
          <p className="text-slate-500 text-sm mt-1">Teams are registered and confirmed. The administrator will broadcast Round 1 shortly.</p>
        </div>
      )
    }

    // Default: Waiting
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center opacity-70">
        <Activity className="w-8 h-8 text-slate-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-600">Awaiting Next Round</h3>
        <p className="text-slate-500 text-sm mt-1">The Admin will start the next phase shortly.</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="text-xs font-bold text-slate-500 tracking-widest mb-3 ml-1">WHAT&apos;S HAPPENING NOW</div>
      <Card className="w-full bg-surface border-border overflow-hidden relative group">
        {screen === 'MATCH_LIVE' && !gambitLocked && (
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        )}
        <CardContent className="p-6 md:p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </motion.div>
  )
}
