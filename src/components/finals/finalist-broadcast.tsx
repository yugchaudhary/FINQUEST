'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SCORE_RANGE } from '@/lib/constants'

interface FinalistBroadcastProps {
  finalistTeam: { id: string; team_name: string; category?: string } | null
  onScoreSubmit: (score: number) => Promise<void>
  hasRated: boolean
}

export function FinalistBroadcast({ finalistTeam, onScoreSubmit, hasRated }: FinalistBroadcastProps) {
  const [score, setScore] = useState(5.0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!finalistTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Waiting for finalist broadcast...
      </div>
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onScoreSubmit(score)
    } catch {
      setIsSubmitting(false)
    }
  }

  // Generate score options: 1.0, 1.5, 2.0, ..., 10.0
  const scoreOptions: number[] = []
  for (let s = SCORE_RANGE.min; s <= SCORE_RANGE.max; s += SCORE_RANGE.step) {
    scoreOptions.push(parseFloat(s.toFixed(1)))
  }

  if (hasRated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-green-500/5 blur-[100px]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mx-auto w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-6"
          >
            <Check size={40} className="text-green-400" />
          </motion.div>
          <h1 className="font-display text-display-sm text-foreground mb-2">SCORE SUBMITTED</h1>
          <p className="text-slate-500 text-sm">Your rating has been recorded</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gambit-gold/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center z-10"
      >
        {/* Header */}
        <div className="mb-2">
          <span className="text-xs text-gambit-gold uppercase tracking-[0.3em] font-display">
            The Pitching Team
          </span>
        </div>

        {/* Finalist name */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h1 className="font-display text-display-sm md:text-display-md text-gradient-gold mb-2">
            {finalistTeam.team_name}
          </h1>
          {finalistTeam.category && (
            <span className="text-sm text-slate-500">{finalistTeam.category}</span>
          )}
        </motion.div>

        {/* Score Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="text-6xl md:text-7xl font-display font-bold text-foreground mb-2">
            {score.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 text-gambit-gold/60">
            {Array.from({ length: Math.round(score / 2) }, (_, i) => (
              <Star key={i} size={14} fill="currentColor" />
            ))}
          </div>
        </motion.div>

        {/* Score Slider */}
        <div className="mb-4 px-2">
          <input
            type="range"
            min={SCORE_RANGE.min}
            max={SCORE_RANGE.max}
            step={SCORE_RANGE.step}
            value={score}
            onChange={(e) => setScore(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((score - SCORE_RANGE.min) / (SCORE_RANGE.max - SCORE_RANGE.min)) * 100}%, #1e1e2d ${((score - SCORE_RANGE.min) / (SCORE_RANGE.max - SCORE_RANGE.min)) * 100}%, #1e1e2d 100%)`,
            }}
          />
          <div className="flex justify-between mt-1 text-[10px] text-gray-600">
            <span>{SCORE_RANGE.min.toFixed(1)}</span>
            <span>{SCORE_RANGE.max.toFixed(1)}</span>
          </div>
        </div>

        {/* Quick Score Grid */}
        <div className="grid grid-cols-5 gap-1.5 mb-8 px-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
            <button
              key={s}
              onClick={() => setScore(s)}
              className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                Math.floor(score) === s
                  ? 'bg-gambit-gold/20 border-gambit-gold/50 text-gambit-gold'
                  : 'bg-gambit-surface-2 border-gambit-border text-slate-500 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          size="xl"
          className="w-full bg-gambit-gold hover:bg-gambit-gold-hover text-black font-display tracking-wider"
        >
          <Star size={18} className="mr-2" />
          SUBMIT SCORE
        </Button>
      </motion.div>
    </div>
  )
}
