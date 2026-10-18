'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

interface Team {
  id: string
  team_name: string
  category?: string
}

interface MatchBroadcastProps {
  redTeam?: Team
  blueTeam?: Team
  roundNumber?: number
  category?: string
  onSelectTeam: (team: Team, color: 'red' | 'blue') => void
}

export function MatchBroadcast({ redTeam, blueTeam, roundNumber, category, onSelectTeam }: MatchBroadcastProps) {
  if (!redTeam || !blueTeam) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-red-500/[0.03] to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/[0.03] to-transparent" />
      </div>

      {/* Live indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <Badge variant="live">LIVE</Badge>
        {roundNumber && (
          <span className="text-sm text-slate-500 uppercase tracking-wider font-display">
            Battle {roundNumber}
          </span>
        )}
        {category && (
          <span className="text-sm text-gambit-purple uppercase tracking-wider font-display">
            {category}
          </span>
        )}
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-slate-500 uppercase tracking-[0.3em] mb-8 font-display"
      >
        Select Your Side
      </motion.h2>

      {/* Team Cards */}
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full max-w-4xl z-10">
        {/* Red Team */}
        <motion.button
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectTeam(redTeam, 'red')}
          className="team-card-red w-full md:w-1/2 p-8 md:p-12 cursor-pointer text-center group transition-all duration-300"
        >
          <div className="text-red-400/60 text-xs uppercase tracking-[0.3em] mb-3 font-display">
            Red Team
          </div>
          <div className="font-display text-display-sm md:text-display-md text-foreground group-hover:text-red-100 transition-colors">
            {redTeam.team_name}
          </div>
          <div className="mt-4 text-sm text-slate-500 group-hover:text-red-300/50 transition-colors">
            Tap to select
          </div>
          {/* Red glow */}
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: '0 0 60px rgba(239, 68, 68, 0.15)' }} />
        </motion.button>

        {/* VS Divider */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="flex-shrink-0"
        >
          <div className="w-16 h-16 rounded-full border-2 border-gambit-border flex items-center justify-center bg-gambit-surface">
            <span className="font-display text-lg text-slate-500 font-bold">VS</span>
          </div>
        </motion.div>

        {/* Blue Team */}
        <motion.button
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectTeam(blueTeam, 'blue')}
          className="team-card-blue w-full md:w-1/2 p-8 md:p-12 cursor-pointer text-center group transition-all duration-300"
        >
          <div className="text-blue-400/60 text-xs uppercase tracking-[0.3em] mb-3 font-display">
            Blue Team
          </div>
          <div className="font-display text-display-sm md:text-display-md text-foreground group-hover:text-blue-100 transition-colors">
            {blueTeam.team_name}
          </div>
          <div className="mt-4 text-sm text-slate-500 group-hover:text-blue-300/50 transition-colors">
            Tap to select
          </div>
          {/* Blue glow */}
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: '0 0 60px rgba(59, 130, 246, 0.15)' }} />
        </motion.button>
      </div>

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-center"
      >
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-display">
          Place your Gambit wisely
        </p>
      </motion.div>
    </div>
  )
}
