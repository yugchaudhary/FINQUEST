import React from 'react'
import { LogOut, User, Shield } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { Badge } from '@/components/ui/badge'

interface DashboardNavProps {
  user: any
  team: any
  eventState: any
}

export function DashboardNav({ user, team, eventState }: DashboardNavProps) {
  const getPhaseText = () => {
    switch (eventState?.current_phase) {
      case 'SETUP': return 'SETUP'
      case 'PHASE_1': 
        if (eventState?.current_round) return `PHASE 1 · ROUND 0${eventState.current_round}`
        return 'PHASE 1'
      case 'PHASE_1_REVEAL': return 'PHASE 1 REVEAL'
      case 'FINALS_TRANSITION': return 'FINALS TRANSITION'
      case 'PHASE_2': return 'FINAL ROUND'
      case 'FINALS_LEADERBOARD': return 'FINALS COMPLETE'
      default: return 'LOADING...'
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-[#2a2a3a] z-50 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="font-space-grotesk font-black text-xl text-white hidden sm:block">
          FOUNDER&apos;S GOT PATENT
        </h1>
        <h1 className="font-space-grotesk font-black text-xl text-white sm:hidden">
          FGP
        </h1>
        <Badge variant="outline" className="bg-purple-900/20 text-purple-300 border-purple-500/30 hidden md:flex font-mono text-xs tracking-wider">
          {getPhaseText()}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-sm font-medium text-white">{user?.name || 'Participant'}</span>
          <span className="text-xs text-gray-500 font-mono">{user?.email?.split('@')[0] || ''}</span>
        </div>
        
        <div className="w-8 h-8 rounded-full bg-[#1e1e2d] border border-[#2a2a3a] flex items-center justify-center text-gray-400">
          <User className="w-4 h-4" />
        </div>

        <button 
          onClick={() => signOut()}
          className="ml-2 p-2 text-gray-400 hover:text-white transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  )
}
