'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getCurrentMatch } from '@/app/actions/matches'
import { lockGambit, getMyGambit } from '@/app/actions/gambits'
import { getDashboardData } from '@/app/actions/dashboard'
import { EVENT_CHANNEL, QUICK_AMOUNTS, MAX_GAMBIT_AMOUNT, QUICK_AMOUNT_LABELS } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Lock, Trophy, TrendingUp, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export default function ParticipantLiveMatchPage() {
  const router = useRouter()
  const [match, setMatch] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [gambit, setGambit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLocking, setIsLocking] = useState(false)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [amountStr, setAmountStr] = useState<string>('')

  const loadData = async () => {
    try {
      const dashRes = await getDashboardData()
      if (!dashRes.success || !dashRes.data?.team) {
        router.push('/login')
        return
      }
      setTeam(dashRes.data.team)

      const matchRes = await getCurrentMatch()
      if (matchRes.success && matchRes.data) {
        setMatch(matchRes.data)
        const gambitRes = await getMyGambit(matchRes.data.id)
        if (gambitRes.success && gambitRes.data) {
          setGambit(gambitRes.data)
        }
      } else {
        setMatch(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const supabase = createClient()
    const ch = supabase.channel(EVENT_CHANNEL)
      .on('broadcast', { event: 'MATCH_BROADCAST' }, loadData)
      .on('broadcast', { event: 'MATCH_RESET' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadData)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!match || match.status === 'COMPLETED' || match.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full bg-surface border-border">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-500 mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-foreground mb-2">No Live Match</h2>
            <p className="text-slate-500 mb-6">There is no active match right now.</p>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleLock = async () => {
    if (!selectedTeamId) {
      setError('Please select a team.')
      return
    }
    const amt = parseInt(amountStr || '0')
    if (isNaN(amt) || amt <= 0 || amt > MAX_GAMBIT_AMOUNT) {
      setError(`Amount must be between 1 and ₹${MAX_GAMBIT_AMOUNT.toLocaleString()}`)
      return
    }
    if (amt > team.current_balance) {
      setError('Insufficient balance.')
      return
    }

    setIsLocking(true)
    setError(null)
    const res = await lockGambit(match.id, selectedTeamId, amt)
    if (res.success) {
      await loadData()
    } else {
      setError(res.error)
    }
    setIsLocking(false)
  }

  const isLocked = !!gambit
  const canLock = !isLocked && team.role === 'INVESTOR' && match.status === 'LIVE'

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button onClick={() => router.push('/dashboard')} variant="ghost" size="sm" className="text-slate-500 hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> DASHBOARD
          </Button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold tracking-widest text-red-500">LIVE MATCH</span>
          </div>
          <div className="w-24 text-right">
            <span className="text-xs font-mono text-slate-500">ROUND</span>
            <span className="ml-2 font-mono font-bold">{String(match.round_number).padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 mt-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Balance Display */}
        {team.role === 'INVESTOR' && (
          <div className="mb-8 p-4 rounded-xl bg-purple-900/10 border border-purple-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 tracking-widest mb-1">CURRENT BALANCE</div>
              <div className="text-2xl font-mono font-bold text-foreground">₹{team.current_balance.toLocaleString()}</div>
            </div>
            {isLocked && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 py-1.5 px-4">
                <Lock className="w-3 h-3 mr-2" /> GAMBIT LOCKED
              </Badge>
            )}
          </div>
        )}

        {/* Team Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* RED TEAM */}
          <button
            disabled={!canLock}
            onClick={() => setSelectedTeamId(match.red_team.id)}
            className={`
              relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col h-full
              ${(isLocked ? gambit.selected_team_id === match.red_team.id : selectedTeamId === match.red_team.id)
                ? 'border-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.15)] scale-[1.02] z-10'
                : 'border-border bg-surface hover:border-red-500/30'
              }
              ${!canLock && !isLocked ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="text-red-500 font-bold tracking-widest mb-2 flex items-center justify-between w-full">
              <span>RED TEAM</span>
              {(isLocked ? gambit.selected_team_id === match.red_team.id : selectedTeamId === match.red_team.id) && (
                <TrendingUp className="w-5 h-5 text-red-500" />
              )}
            </div>
            <h3 className="text-2xl font-black text-foreground font-space-grotesk">{match.red_team.team_name}</h3>
          </button>

          {/* BLUE TEAM */}
          <button
            disabled={!canLock}
            onClick={() => setSelectedTeamId(match.blue_team.id)}
            className={`
              relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col h-full
              ${(isLocked ? gambit.selected_team_id === match.blue_team.id : selectedTeamId === match.blue_team.id)
                ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02] z-10'
                : 'border-border bg-surface hover:border-blue-500/30'
              }
              ${!canLock && !isLocked ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="text-blue-500 font-bold tracking-widest mb-2 flex items-center justify-between w-full">
              <span>BLUE TEAM</span>
              {(isLocked ? gambit.selected_team_id === match.blue_team.id : selectedTeamId === match.blue_team.id) && (
                <TrendingUp className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <h3 className="text-2xl font-black text-foreground font-space-grotesk">{match.blue_team.team_name}</h3>
          </button>
        </div>

        {/* Investment Input */}
        {team.role === 'INVESTOR' && !isLocked && match.status === 'LIVE' && (
          <Card className="bg-surface border-border">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-lg font-bold text-foreground mb-6">Place Your Gambit</h3>
              
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                {QUICK_AMOUNTS.map((amt, idx) => (
                  <Button
                    key={amt}
                    variant="outline"
                    onClick={() => setAmountStr(amt.toString())}
                    className={`border-border hover:bg-white/5 ${amountStr === amt.toString() ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'text-slate-500'}`}
                    disabled={amt > team.current_balance}
                  >
                    {QUICK_AMOUNT_LABELS[idx]}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-mono text-lg">₹</span>
                  </div>
                  <input
                    type="number"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full bg-black/50 border border-border rounded-lg py-4 pl-10 pr-4 text-white font-mono text-lg focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter amount..."
                    max={Math.min(MAX_GAMBIT_AMOUNT, team.current_balance)}
                  />
                </div>
                <Button 
                  onClick={handleLock}
                  disabled={!selectedTeamId || !amountStr || isLocking}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-[60px] px-8 text-lg rounded-lg shadow-xl shadow-purple-600/20 w-full md:w-auto"
                >
                  {isLocking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'LOCK GAMBIT'}
                </Button>
              </div>
              <p className="text-slate-500 text-xs mt-3">Maximum gambit: ₹{MAX_GAMBIT_AMOUNT.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}

        {isLocked && (
          <div className="mt-8 text-center p-8 bg-green-500/5 border border-green-500/20 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Gambit Accepted</h3>
            <p className="text-slate-500">You have invested <span className="text-foreground font-mono font-bold">₹{gambit.amount?.toLocaleString() || '---'}</span>.</p>
            <p className="text-slate-500 mt-2 text-sm">Please wait for the live pitch to conclude and the judge to score.</p>
          </div>
        )}
      </div>
    </div>
  )
}
