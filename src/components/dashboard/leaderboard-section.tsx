import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { Phase1Leaderboard } from '@/components/leaderboard/phase1-leaderboard'

interface LeaderboardSectionProps {
  isPublished: boolean
  leaderboardData: any[]
}

export function LeaderboardSection({ isPublished, leaderboardData }: LeaderboardSectionProps) {
  return (
    <div className="w-full pt-8">
      <div className="text-xs font-bold text-slate-500 tracking-widest mb-4 ml-1">PHASE 1 LEADERBOARD</div>
      
      <AnimatePresence mode="wait">
        {!isPublished ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="w-full bg-surface/50 border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-slate-500">
                <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-gray-600" />
                </div>
                <p className="font-medium">Results not yet revealed.</p>
                <p className="text-sm mt-1">The Admin will publish the leaderboard when Phase 1 concludes.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="published"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full overflow-hidden bg-background rounded-2xl border border-gambit-gold/20"
          >
            <div className="scale-[0.95] md:scale-100 origin-top">
              <Phase1Leaderboard leaderboardData={leaderboardData} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
