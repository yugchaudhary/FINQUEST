'use client'

import { motion } from 'framer-motion'
import { Trophy, Crown, Medal } from 'lucide-react'
import { formatScore } from '@/lib/format'

interface FinalsEntry {
  rank: number
  team_name: string
  final_score: number
}

interface FinalsLeaderboardProps {
  data: FinalsEntry[]
}

export function FinalsLeaderboard({ data }: FinalsLeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={20} className="text-yellow-400" />
      case 2: return <Medal size={20} className="text-gray-300" />
      case 3: return <Medal size={20} className="text-amber-600" />
      default: return null
    }
  }

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30 shadow-glow-gold'
      case 2: return 'text-gray-300 bg-gray-300/10 border-gray-400/30'
      case 3: return 'text-amber-600 bg-amber-600/10 border-amber-600/30'
      default: return 'text-gray-500 bg-gambit-surface-2 border-gambit-border'
    }
  }

  return (
    <div className="w-full flex flex-col items-center px-4 py-8 relative">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gambit-gold/5 blur-[150px]" />
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 z-10"
      >
        <Trophy size={48} className="mx-auto text-gambit-gold mb-4" />
        <h1 className="font-display text-display-sm md:text-display-md text-gradient-gold mb-2">
          FINALS LEADERBOARD
        </h1>
        <p className="text-gray-500 text-sm uppercase tracking-[0.2em] font-display">
          The Champions
        </p>
      </motion.div>

      {/* Leaderboard */}
      <div className="w-full max-w-2xl z-10">
        {/* Header row */}
        <div className="flex items-center gap-4 px-6 py-3 text-xs text-gray-500 uppercase tracking-wider border-b border-gambit-border/50 font-display">
          <div className="w-14 text-center">Rank</div>
          <div className="flex-1">Finalist</div>
          <div className="w-32 text-right">Total Score</div>
        </div>

        {/* Rows */}
        {data.map((entry, index) => (
          <motion.div
            key={entry.team_name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            layout
            className={`flex items-center gap-4 px-6 py-5 border-b border-gambit-border/30 transition-all duration-300 ${
              entry.rank === 1 ? 'bg-yellow-400/[0.03]' : entry.rank <= 3 ? 'bg-gambit-surface/30' : ''
            }`}
          >
            {/* Rank */}
            <div className="w-14 flex justify-center">
              <motion.span
                layout
                className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold ${getRankStyle(entry.rank)}`}
              >
                {getRankIcon(entry.rank) || entry.rank}
              </motion.span>
            </div>

            {/* Team */}
            <div className="flex-1">
              <span className={`font-display text-lg ${entry.rank === 1 ? 'text-gambit-gold' : entry.rank <= 3 ? 'text-white' : 'text-gray-300'}`}>
                {entry.team_name}
              </span>
            </div>

            {/* Score */}
            <div className="w-32 text-right">
              <span className={`font-mono text-xl font-bold ${
                entry.rank === 1 ? 'text-gambit-gold' : 'text-white'
              }`}>
                {formatScore(entry.final_score)}
              </span>
            </div>
          </motion.div>
        ))}

        {data.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            Scores will appear as finalists are evaluated
          </div>
        )}
      </div>
    </div>
  )
}
