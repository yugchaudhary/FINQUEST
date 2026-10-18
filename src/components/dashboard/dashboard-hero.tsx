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
        tag: 'EVENT PREPARATION',
        title: 'Welcome to the Event',
        subtitle: 'Your team is registered and ready. Stand by for the opening round.'
      }
    }
    
    if (screen === 'WAITING_FOR_MATCH' || screen === 'MATCH_COMPLETE' || screen === 'RESULT_PROCESSING' || screen === 'AWAITING_RESULT') {
      if (!team.category_id && team.role !== 'INVESTOR') {
        return {
          tag: 'AWAITING ASSIGNMENT',
          title: 'Waiting for Category',
          subtitle: 'The Admin will assign your team a category shortly.'
        }
      }
      
      return {
        tag: 'PREPARATION',
        title: 'Event Ready',
        subtitle: team.role === 'INVESTOR' 
          ? 'Your investor balance is funded. Stand by for the match broadcast.' 
          : 'Your team is ready. Prepare your integrated pitch.'
      }
    }

    if (screen === 'MATCH_LIVE') {
      return {
        tag: 'LIVE NOW',
        title: `Battle ${eventState.current_round} Live`,
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
    <div className="w-full relative overflow-hidden rounded-2xl bg-surface border border-border p-8 md:p-12 mt-20 mb-8">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 max-w-xl"
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
          <h1 className="font-space-grotesk font-black text-4xl md:text-5xl text-foreground">
            {content.title}
          </h1>
          <p className="text-slate-500 text-lg">
            {content.subtitle}
          </p>
        </motion.div>

        {team ? (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-start md:items-end justify-center gap-3 p-5 md:p-6 rounded-2xl bg-white dark:bg-white border-2 border-border shadow-md self-start md:self-center min-w-[280px]"
          >
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-500 tracking-widest font-mono">
                YOUR TEAM
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-50 border border-emerald-300 dark:border-emerald-300 px-3 py-1 rounded-full font-mono shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                OFFICIAL TEAM
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-space-grotesk font-black text-slate-900 dark:text-slate-900 tracking-tight">
              {team.team_name}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant="outline" 
                className={team.role === 'INVESTOR' 
                  ? 'bg-blue-50 dark:bg-blue-50 text-blue-700 dark:text-blue-700 border-2 border-blue-400 dark:border-blue-400 font-mono text-xs px-2.5 py-1 font-black shadow-sm' 
                  : 'bg-purple-50 dark:bg-purple-50 text-purple-700 dark:text-purple-700 border-2 border-purple-400 dark:border-purple-400 font-mono text-xs px-2.5 py-1 font-black shadow-sm'
                }
              >
                {team.role === 'INNOVATOR' ? 'FOUNDER' : team.role}
              </Badge>
              {team.role !== 'INVESTOR' && (
                <>
                  <span className="text-slate-400 dark:text-slate-400 text-xs font-bold">/</span>
                  <span className="text-slate-800 dark:text-slate-800 font-bold text-xs px-3 py-1 bg-slate-100 dark:bg-slate-100 rounded-full border border-slate-300 dark:border-slate-300 shadow-sm">
                    {team.categoryName || (team.category && team.category !== 'N/A' ? team.category : 'Category Not Assigned')}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-1 text-left md:text-right"
          >
            <div className="text-sm text-slate-500">WELCOME BACK</div>
            <div className="text-xl font-medium text-foreground">{user?.name || 'Participant'}</div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
