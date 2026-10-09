import React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface DashboardHeroProps {
  user: any
  team: any
  eventState: any
}

export function DashboardHero({ user, team, eventState }: DashboardHeroProps) {
  const getHeroContent = () => {
    const screen = eventState?.current_screen_state
    
    
    if (screen === 'SETUP') {
      return {
        tag: 'REGISTRATION',
        title: 'Get Your Team Ready',
        subtitle: 'Configure your roster before the event begins.'
      }
    }
    
    if (screen === 'WAITING_FOR_MATCH' || screen === 'MATCH_COMPLETE' || screen === 'RESULT_PROCESSING' || screen === 'AWAITING_RESULT') {
      if (!team.category_id) {
        return {
          tag: 'AWAITING ASSIGNMENT',
          title: 'Waiting for Category',
          subtitle: 'The Admin will assign your team a category shortly.'
        }
      }
      
      return {
        tag: 'PREPARATION',
        title: 'Event Ready',
        subtitle: 'Your team is ready. Prepare your integrated pitch.'
      }
    }

    if (screen === 'MATCH_LIVE') {
      return {
        tag: 'LIVE NOW',
        title: `Round 0${eventState.current_round} Live`,
        subtitle: 'The pitch is underway. Make your investment decisions.'
      }
    }

    if (screen === 'PHASE_1_REVEAL' || screen === 'FINALS_TRANSITION') {
      return {
        tag: 'PHASE 1 COMPLETE',
        title: 'Leaderboard Revealed',
        subtitle: 'The initial rounds are over. See where you stand.'
      }
    }

    if (screen === 'FINALS_READY' || screen === 'FINALIST_LIVE' || screen === 'RATINGS_OPEN' || screen === 'FINALS_SCORE_CALCULATED' || screen === 'FINALS_LEADERBOARD') {
      return {
        tag: 'PHASE 2',
        title: 'Final Round',
        subtitle: 'The top teams present their ultimate integrated pitch.'
      }
    }

    return {
      tag: 'STAND BY',
      title: 'Awaiting Event Status',
      subtitle: '...'
    }
  }

  const content = getHeroContent()

  return (
    <div className="w-full relative overflow-hidden rounded-2xl bg-[#111118] border border-[#2a2a3a] p-8 md:p-12 mt-20 mb-8">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 max-w-2xl"
        >
          <div className="flex items-center gap-3">
            <span className="text-purple-400 font-mono text-xs font-bold tracking-widest">{content.tag}</span>
            {eventState?.current_screen_state === 'MATCH_LIVE' && (
              <span className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <h1 className="font-space-grotesk font-black text-4xl md:text-5xl text-white">
            {content.title}
          </h1>
          <p className="text-gray-400 text-lg">
            {content.subtitle}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-1 text-left md:text-right"
        >
          <div className="text-sm text-gray-500">WELCOME BACK</div>
          <div className="text-xl font-medium text-white">{user?.name || 'Participant'}</div>
        </motion.div>
      </div>
    </div>
  )
}
