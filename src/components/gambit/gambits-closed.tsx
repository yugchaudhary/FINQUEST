'use client'

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

export function GambitsClosed({ locked }: { locked?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="text-xs uppercase tracking-[0.35em] text-amber-400">GAMBITS CLOSED</div>
        <h1 className="font-display text-display-sm text-white">
          {locked ? 'Your Gambit is locked.' : 'Submissions are closed.'}
        </h1>
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Clock size={16} className="animate-pulse" />
          <span>Awaiting Judge Decision.</span>
        </div>
      </motion.div>
    </div>
  )
}
