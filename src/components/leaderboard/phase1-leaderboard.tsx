'use client'

import { motion } from 'framer-motion'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatIndianNumber } from '@/lib/format'

interface LeaderboardEntry {
  rank: number
  team_name: string
  category: string
  net_profit_loss: number
}

interface Phase1LeaderboardProps {
  leaderboardData: LeaderboardEntry[]
}

export function Phase1Leaderboard({ leaderboardData }: Phase1LeaderboardProps) {
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 2: return 'text-slate-600 bg-gray-300/10 border-gray-400/30'
      case 3: return 'text-amber-600 bg-amber-600/10 border-amber-600/30'
      default: return 'text-slate-500 bg-gambit-surface-2 border-gambit-border'
    }
  }

  const getPLDisplay = (amount: number) => {
    if (amount > 0) {
      return {
        text: `+₹${formatIndianNumber(amount)}`,
        color: 'text-green-400',
        icon: <TrendingUp size={16} className="text-green-400" />,
      }
    } else if (amount < 0) {
      return {
        text: `-₹${formatIndianNumber(Math.abs(amount))}`,
        color: 'text-red-400',
        icon: <TrendingDown size={16} className="text-red-400" />,
      }
    }
    return {
      text: '₹0',
      color: 'text-slate-500',
      icon: <Minus size={16} className="text-slate-500" />,
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
        className="text-center mb-10 z-10"
      >
        <Trophy size={40} className="mx-auto text-gambit-gold mb-4" />
        <h1 className="font-display text-display-sm md:text-display-md text-gradient-gold mb-2">
          PHASE 1 LEADERBOARD
        </h1>
        <p className="text-slate-500 text-sm uppercase tracking-[0.2em] font-display">
          The Gambit Standings
        </p>
      </motion.div>

      {/* Leaderboard Table */}
      <div className="w-full max-w-3xl z-10">
        {/* Header row */}
        <div className="flex items-center gap-4 px-6 py-3 text-xs text-slate-500 uppercase tracking-wider border-b border-gambit-border/50 font-display">
          <div className="w-14 text-center">Rank</div>
          <div className="flex-1">Team</div>
          <div className="w-28 text-center hidden md:block">Category</div>
          <div className="w-40 text-right">Net Profit/Loss</div>
        </div>

        {/* Rows */}
        {leaderboardData.map((entry, index) => {
          const pl = getPLDisplay(entry.net_profit_loss)
          return (
            <motion.div
              key={entry.team_name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className={`flex items-center gap-4 px-6 py-4 border-b border-border transition-colors hover:bg-surface-2 ${entry.rank <= 3 ? 'bg-surface-2/30' : ''}`}
            >
              {/* Rank */}
              <div className="w-14 flex justify-center">
                <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold ${getRankStyle(entry.rank)}`}>
                  {entry.rank}
                </span>
              </div>

              {/* Team Name */}
              <div className="flex-1">
                <span className={`font-medium ${entry.rank <= 3 ? 'text-black' : 'text-slate-600'}`}>
                  {entry.team_name}
                </span>
                <span className="md:hidden text-xs text-slate-500 block mt-0.5">{entry.category}</span>
              </div>

              {/* Category (desktop) */}
              <div className="w-28 text-center hidden md:block">
                <span className="text-xs px-2 py-1 rounded-full bg-gambit-surface-2 text-slate-500 border border-gambit-border">
                  {entry.category}
                </span>
              </div>

              {/* P/L */}
              <div className={`w-40 text-right flex items-center justify-end gap-2 ${pl.color} font-mono font-bold`}>
                {pl.icon}
                {pl.text}
              </div>
            </motion.div>
          )
        })}

        {leaderboardData.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            No leaderboard data available
          </div>
        )}
      </div>
    </div>
  )
}
