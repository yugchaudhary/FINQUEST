import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface FinalistCardProps {
  isFinalist: boolean
  teamName: string
}

export function FinalistCard({ isFinalist, teamName }: FinalistCardProps) {
  return (
    <div className="w-full pt-8">
      <div className="text-xs font-bold text-slate-500 tracking-widest mb-4 ml-1">WHAT&apos;S NEXT?</div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isFinalist ? (
          <Card className="w-full border-gambit-gold/50 bg-gradient-to-br from-[#16161f] to-amber-900/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gambit-gold/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-8 md:p-12 text-center relative z-10">
              <div className="w-20 h-20 mx-auto rounded-full bg-gambit-gold/20 flex items-center justify-center mb-6">
                <Trophy className="w-10 h-10 text-gambit-gold" />
              </div>
              <h2 className="text-3xl font-space-grotesk font-black text-foreground mb-2">YOU MADE THE FINALS</h2>
              <h3 className="text-xl font-bold text-gambit-gold mb-4">{teamName}</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-8">
                Get ready for the Final Pitch. You will be presenting your integrated solution to the entire audience.
              </p>
              
              <div className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gambit-gold text-black font-bold uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                Prepare Your Pitch
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full bg-surface border-border">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-space-grotesk font-bold text-foreground mb-2">Phase 2: Final Round</h3>
              <p className="text-slate-500">
                The top teams will now present their ultimate integrated pitch.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
