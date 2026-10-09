'use client'

import { motion } from 'framer-motion'

interface AwaitingMatchProps {
  teamName?: string
}

export function AwaitingMatch({ teamName }: AwaitingMatchProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />
      </div>
      
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gambit-purple/5 blur-[120px]" />

      {/* Team badge */}
      {teamName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 right-6"
        >
          <div className="glass-card px-4 py-2 text-sm text-slate-500">
            <span className="text-gambit-purple font-medium">{teamName}</span>
          </div>
        </motion.div>
      )}

      {/* Connection indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-6 left-6 flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-slate-500 uppercase tracking-wider">Connected</span>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center z-10"
      >
        {/* Chess-inspired decorative element */}
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8 mx-auto w-20 h-20 border border-gambit-border rounded-lg flex items-center justify-center"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gambit-purple/60">
            <path d="M12 2L15 8H9L12 2Z" />
            <rect x="8" y="8" width="8" height="4" rx="1" />
            <path d="M6 12H18V14C18 15.1046 17.1046 16 16 16H8C6.89543 16 6 15.1046 6 14V12Z" />
            <rect x="7" y="16" width="10" height="2" rx="0.5" />
            <rect x="5" y="18" width="14" height="3" rx="1" />
          </svg>
        </motion.div>

        <h1 className="font-display text-display-sm md:text-display-md text-foreground mb-4">
          AWAITING NEXT MATCH
        </h1>
        
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-center gap-1 text-slate-500"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gambit-purple/60" />
          <span className="w-1.5 h-1.5 rounded-full bg-gambit-purple/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-gambit-purple/20" />
        </motion.div>

        <p className="text-slate-500 text-sm mt-6 max-w-md mx-auto">
          The next match will appear here automatically when the admin broadcasts it.
        </p>
      </motion.div>

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 text-center"
      >
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-display">
          The Founder&apos;s Gambit
        </p>
      </motion.div>
    </div>
  )
}
