import React from 'react'
import { LogOut, User } from 'lucide-react'
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
    <nav className="fixed top-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-md border-b border-border z-50 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="font-space-grotesk font-black text-xl text-foreground hidden sm:block">
          FOUNDER&apos;S GOT PATENT
        </h1>
        <h1 className="font-space-grotesk font-black text-xl text-foreground sm:hidden">
          FGP
        </h1>
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 hidden md:flex font-mono text-xs tracking-wider">
          {getPhaseText()}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-sm font-medium text-foreground">{user?.name || 'Participant'}</span>
          <span className="text-xs text-slate-500 font-mono">{user?.email?.split('@')[0] || ''}</span>
        </div>
        
        <button 
          onClick={() => signOut()}
          className="p-2 text-slate-500 hover:text-foreground transition-colors mr-2"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* Logo in the right upper corner */}
        <div className="h-10 w-10 flex items-center justify-center rounded-full overflow-hidden border border-border shadow-sm">
          <img src="/logo.png" alt="FYI Logo" className="w-full h-full object-cover" />
        </div>
      </div>
    </nav>
  )
}
