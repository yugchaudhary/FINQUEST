'use client'

import { motion } from 'framer-motion'
import { Lock, Clock } from 'lucide-react'

interface GambitLockedProps {
  selectedTeam: { id: string; team_name: string } | null
  selectedColor: 'red' | 'blue' | null
}

export function GambitLocked({ selectedTeam, selectedColor }: GambitLockedProps) {
  const colorBorder = selectedColor === 'red' ? 'border-red-500/30' : 'border-blue-500/30'
  const colorText = selectedColor === 'red' ? 'text-red-400' : 'text-blue-400'
  const colorGlow = selectedColor === 'red' ? 'shadow-glow-red' : 'shadow-glow-blue'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gambit-purple/5 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="text-center z-10"
      >
        {/* Lock icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={`mx-auto w-20 h-20 rounded-2xl border ${colorBorder} ${colorGlow} flex items-center justify-center mb-8 bg-gambit-surface`}
        >
          <Lock size={36} className={colorText} />
        </motion.div>

        {/* Status text */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-display-sm md:text-display-md text-foreground mb-3"
        >
          GAMBIT LOCKED
        </motion.h1>

        {/* Selected team */}
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${colorBorder} bg-gambit-surface mb-8`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedColor === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
            <span className={`text-sm font-medium ${colorText}`}>
              {selectedTeam.team_name}
            </span>
          </motion.div>
        )}

        {/* Waiting message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Clock size={16} className="animate-pulse" />
            <span className="text-sm">Awaiting Judge Decision</span>
          </div>

          {/* Loading dots */}
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                className="w-1.5 h-1.5 rounded-full bg-gambit-purple/60"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 text-center">
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-display">
          Your gambit has been recorded
        </p>
      </div>
    </div>
  )
}
