'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getCurrentMatch } from '@/app/actions/matches'
import { lockGambit, getMyGambit } from '@/app/actions/gambits'
import { getDashboardData } from '@/app/actions/dashboard'
import { EVENT_CHANNEL, MAX_GAMBIT_AMOUNT } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Lock,
  Trophy,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info,
  ShieldCheck,
  Zap,
  HelpCircle,
} from 'lucide-react'

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 250000]

export default function ParticipantLiveMatchPage() {
  const router = useRouter()
  const [match, setMatch] = useState<any>(null)
  const [team, setTeam] = useState<any>(null)
  const [gambit, setGambit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLocking, setIsLocking] = useState(false)
  const isInitialLoadRef = useRef(true)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [amountStr, setAmountStr] = useState<string>('')

  const loadData = async () => {
    try {
      const dashRes = await getDashboardData()
      if (!dashRes.success || !dashRes.data?.team) {
        if (isInitialLoadRef.current && dashRes.error === 'Not authenticated') {
          router.push('/login')
        }
        return
      }
      isInitialLoadRef.current = false
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
      .on('broadcast', { event: 'MATCH_BROADCASTED' }, loadData)
      .on('broadcast', { event: 'GAMBITS_CLOSED' }, () => {
        setMatch((prev: any) => (prev ? { ...prev, status: 'GAMBITS_CLOSED' } : null))
        loadData()
      })
      .on('broadcast', { event: 'MATCH_RESET' }, loadData)
      .on('broadcast', { event: 'MATCH_COMPLETED' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
        if (payload.new && (payload.new as any).status === 'GAMBITS_CLOSED') {
          setMatch((prev: any) => (prev ? { ...prev, status: 'GAMBITS_CLOSED' } : null))
        }
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, (payload) => {
        if (payload.new && (payload.new as any).current_screen_state === 'AWAITING_RESULT') {
          setMatch((prev: any) => (prev ? { ...prev, status: 'GAMBITS_CLOSED' } : null))
        }
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gambits' }, loadData)
      .subscribe()

    // 3-second heartbeat fallback in case mobile tab sleeps or socket reconnects
    const heartbeat = setInterval(() => {
      loadData()
    }, 3000)

    return () => {
      clearInterval(heartbeat)
      supabase.removeChannel(ch)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    )
  }

  if (
    !match ||
    match.status === 'COMPLETED' ||
    match.status === 'MATCH_COMPLETE' ||
    match.status === 'PENDING' ||
    match.status === 'WAITING_FOR_MATCH'
  ) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full bg-surface border-border">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Trophy className="w-12 h-12 text-slate-400 mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-foreground mb-2">No Live Match</h2>
            <p className="text-slate-500 mb-6">There is no active match in progress right now.</p>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="text-foreground border-border">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isGambitsOpen = ['GAMBITS_OPEN', 'MATCH_LIVE', 'LIVE'].includes(match.status)
  const isGambitsClosed =
    match.status === 'GAMBITS_CLOSED' ||
    match.status === 'AWAITING_JUDGE_RESULT' ||
    match.status === 'PROCESSING_RESULT'
  const isLocked = !!gambit
  const canLock = !isLocked && team?.role === 'INVESTOR' && isGambitsOpen

  const parsedAmount = parseInt(amountStr || '0', 10)
  const isAmountValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= Math.min(MAX_GAMBIT_AMOUNT, team?.current_balance || 0)

  const selectedTeam =
    selectedTeamId === match.red_team?.id
      ? { ...match.red_team, color: 'Red' }
      : selectedTeamId === match.blue_team?.id
      ? { ...match.blue_team, color: 'Blue' }
      : null

  const handleLock = async () => {
    if (!canLock) {
      setError('Investments are closed for this battle')
      return
    }
    if (!selectedTeamId) {
      setError('Please select a team in Step 2.')
      return
    }
    const amt = parseInt(amountStr || '0', 10)
    if (isNaN(amt) || amt <= 0 || amt > MAX_GAMBIT_AMOUNT) {
      setError(`Amount must be between ₹1 and ₹${MAX_GAMBIT_AMOUNT.toLocaleString()}`)
      return
    }
    if (amt > (team?.current_balance || 0)) {
      setError('Insufficient balance for this investment.')
      return
    }

    setIsLocking(true)
    setError(null)
    const res = await lockGambit(match.id, selectedTeamId, amt)
    if (res.success) {
      await loadData()
    } else {
      if (res.error?.includes('closed') || res.error?.includes('not LIVE')) {
        setMatch((prev: any) => (prev ? { ...prev, status: 'GAMBITS_CLOSED' } : null))
      }
      setError(res.error || 'Failed to submit bet')
      await loadData()
    }
    setIsLocking(false)
  }

  const lockedTeam = isLocked
    ? gambit.selected_team_id === match.red_team?.id
      ? { ...match.red_team, color: 'Red' }
      : { ...match.blue_team, color: 'Blue' }
    : null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            onClick={() => router.push('/dashboard')}
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-foreground font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> DASHBOARD
          </Button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold tracking-widest text-red-500">LIVE MATCH</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-400">Battle {match.round_number}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 mt-6">
        {/* Error Notification */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Current Balance Display */}
        {team?.role === 'INVESTOR' && (
          <div className="mb-6 p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">
                CURRENT BALANCE
              </div>
              <div className="text-3xl font-mono font-black text-foreground">
                ₹{Number(team.current_balance || 0).toLocaleString()}
              </div>
            </div>
            {isLocked ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 py-2 px-4 text-sm font-bold">
                <Lock className="w-3.5 h-3.5 mr-2" /> BET LOCKED
              </Badge>
            ) : isGambitsClosed ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 py-2 px-4 text-sm font-bold">
                <Lock className="w-3.5 h-3.5 mr-2" /> INVESTMENTS CLOSED
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 py-2 px-4 text-sm font-bold">
                <Zap className="w-3.5 h-3.5 mr-2" /> BETTING OPEN
              </Badge>
            )}
          </div>
        )}

        {/* Locked State Notification */}
        {isLocked && lockedTeam && (
          <div className="mb-8 p-6 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-2xl font-black text-foreground font-space-grotesk mb-1">
              Bet Submitted & Locked
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              Your investment is registered. Waiting for the judge decision and round settlement.
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-6 p-4 rounded-xl bg-surface border border-border">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Invested Amount</span>
                <span className="text-xl font-mono font-black text-foreground">
                  ₹{Number(gambit.amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Backed Team</span>
                <span className={`text-xl font-bold ${lockedTeam.color === 'Red' ? 'text-red-500' : 'text-blue-500'}`}>
                  {lockedTeam.team_name} ({lockedTeam.color} Team)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Gambits Closed Notification */}
        {!isLocked && isGambitsClosed && (
          <div className="mb-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
            <Lock className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-foreground mb-1">Investments are Closed</h3>
            <p className="text-slate-600 text-sm">
              The betting window for Battle {match.round_number} has ended. The judges are currently evaluating the elevator pitches.
            </p>
          </div>
        )}

        {/* Notice for INNOVATOR Role */}
        {team?.role === 'INNOVATOR' && (
          <div className="mb-8 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
            <ShieldCheck className="w-10 h-10 text-blue-500 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-foreground mb-1">Innovator Pitch Battle</h3>
            <p className="text-slate-600 text-sm">
              Your team is registered as an <strong className="text-foreground">INNOVATOR</strong>. Watch the live match! Only investor teams place bets during this phase.
            </p>
          </div>
        )}

        {/* Active Betting Interface for INVESTOR */}
        {canLock && (
          <div className="space-y-6">
            {/* ─── 1. CHOOSE INVESTMENT AMOUNT ─── */}
            <Card className="bg-surface border-border shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div>
                      <h3 className="text-lg font-bold font-space-grotesk text-foreground">
                        Choose Investment Amount
                      </h3>
                      <p className="text-xs text-slate-500">
                        Select a preset or enter a custom amount for Battle {match.round_number}.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">Max Per Battle</span>
                    <span className="text-xs font-mono font-bold text-purple-600">
                      ₹{MAX_GAMBIT_AMOUNT.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-4">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isDisabled = amt > (team?.current_balance || 0)
                    const isSelected = amountStr === amt.toString()
                    return (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDisabled}
                        onClick={() => {
                          setAmountStr(amt.toString())
                          setError(null)
                        }}
                        className={`font-mono text-xs transition-all ${
                          isSelected
                            ? 'border-2 border-purple-600 bg-purple-500/15 text-purple-600 font-bold shadow-sm'
                            : 'border-border text-slate-600 hover:border-purple-300'
                        }`}
                      >
                        {amt >= 100000 ? `₹${amt / 100000}L` : `₹${amt / 1000}K`}
                      </Button>
                    )
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={(team?.current_balance || 0) <= 0}
                    onClick={() => {
                      const maxAmt = Math.min(MAX_GAMBIT_AMOUNT, team?.current_balance || 0)
                      setAmountStr(maxAmt.toString())
                      setError(null)
                    }}
                    className={`font-mono text-xs font-bold transition-all ${
                      amountStr === Math.min(MAX_GAMBIT_AMOUNT, team?.current_balance || 0).toString() &&
                      (team?.current_balance || 0) > 0
                        ? 'border-2 border-purple-600 bg-purple-500/15 text-purple-600 shadow-sm'
                        : 'border-border text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    MAX
                  </Button>
                </div>

                {/* Custom Amount Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-mono text-xl font-bold">₹</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={Math.min(MAX_GAMBIT_AMOUNT, team?.current_balance || 0)}
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value)
                      setError(null)
                    }}
                    placeholder="Enter custom amount..."
                    className="w-full bg-background border border-border rounded-xl py-4 pl-10 pr-4 text-foreground font-mono text-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all placeholder:text-slate-400"
                  />
                  {amountStr && (
                    <button
                      type="button"
                      onClick={() => setAmountStr('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Amount Feedback */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  {parsedAmount > (team?.current_balance || 0) ? (
                    <span className="text-red-500 font-medium">
                      ⚠ Amount exceeds available balance (₹{Number(team?.current_balance || 0).toLocaleString()})
                    </span>
                  ) : parsedAmount > MAX_GAMBIT_AMOUNT ? (
                    <span className="text-red-500 font-medium">
                      ⚠ Maximum investment per battle is ₹{MAX_GAMBIT_AMOUNT.toLocaleString()}
                    </span>
                  ) : parsedAmount > 0 ? (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      ✓ Selected Investment: <strong className="font-mono">₹{parsedAmount.toLocaleString()}</strong>
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Enter an investment between ₹1 and ₹{Math.min(MAX_GAMBIT_AMOUNT, team?.current_balance || 0).toLocaleString()}
                    </span>
                  )}
                  <span className="text-slate-500 font-mono">
                    Balance: ₹{Number(team?.current_balance || 0).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ─── 2. SELECT ONE OF THE TEAMS ─── */}
            <div>
              <div className="flex items-center gap-3 mb-4 px-1">
                <span className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <h3 className="text-lg font-bold font-space-grotesk text-foreground">
                    Select Your Team
                  </h3>
                  <p className="text-xs text-slate-500">
                    Back the startup you predict will win the judge panel&apos;s vote.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RED TEAM CARD */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(match.red_team.id)
                    setError(null)
                  }}
                  className={`relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col justify-between min-h-[140px] ${
                    selectedTeamId === match.red_team.id
                      ? 'border-red-500 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.2)] scale-[1.01]'
                      : 'border-border bg-surface hover:border-red-500/50 hover:bg-surface/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-xs font-bold tracking-widest text-red-500 uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        RED TEAM
                      </span>
                      {selectedTeamId === match.red_team.id && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
                          ✓ SELECTED
                        </span>
                      )}
                    </div>
                    <h4 className="text-2xl font-black text-foreground font-space-grotesk">
                      {match.red_team.team_name}
                    </h4>
                  </div>
                  {match.category && (
                    <span className="text-xs text-slate-500 font-medium mt-3 block">
                      Category: {match.category}
                    </span>
                  )}
                </button>

                {/* BLUE TEAM CARD */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(match.blue_team.id)
                    setError(null)
                  }}
                  className={`relative p-6 rounded-2xl border-2 transition-all text-left flex flex-col justify-between min-h-[140px] ${
                    selectedTeamId === match.blue_team.id
                      ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_25px_rgba(59,130,246,0.2)] scale-[1.01]'
                      : 'border-border bg-surface hover:border-blue-500/50 hover:bg-surface/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-xs font-bold tracking-widest text-blue-500 uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        BLUE TEAM
                      </span>
                      {selectedTeamId === match.blue_team.id && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
                          ✓ SELECTED
                        </span>
                      )}
                    </div>
                    <h4 className="text-2xl font-black text-foreground font-space-grotesk">
                      {match.blue_team.team_name}
                    </h4>
                  </div>
                  {match.category && (
                    <span className="text-xs text-slate-500 font-medium mt-3 block">
                      Category: {match.category}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ─── 3. OPTION TO SUBMIT HIS BET ─── */}
            <Card className="bg-surface border-border shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                    3
                  </span>
                  <div>
                    <h3 className="text-lg font-bold font-space-grotesk text-foreground">
                      Confirm & Submit Bet
                    </h3>
                    <p className="text-xs text-slate-500">
                      Review your investment and confirm your prediction.
                    </p>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-4 rounded-xl border border-border bg-background/50 mb-6">
                  {isAmountValid && selectedTeam ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Investment Amount:</span>
                        <span className="font-mono font-bold text-foreground">
                          ₹{parsedAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Selected Team:</span>
                        <span
                          className={`font-bold ${
                            selectedTeam.color === 'Red' ? 'text-red-500' : 'text-blue-500'
                          }`}
                        >
                          {selectedTeam.team_name} ({selectedTeam.color} Team)
                        </span>
                      </div>
                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-slate-500">
                        <span>Max Potential Return (5-0 sweep):</span>
                        <span className="font-mono font-bold text-green-600">
                          ₹{(parsedAmount * 3).toLocaleString()} (3.0x)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 py-1">
                      {!isAmountValid && !selectedTeam && (
                        <span>👉 Select an investment amount in Step 1 and choose a team in Step 2 to proceed.</span>
                      )}
                      {!isAmountValid && selectedTeam && (
                        <span>👉 Choose a valid investment amount in Step 1 to proceed.</span>
                      )}
                      {isAmountValid && !selectedTeam && (
                        <span>👉 Select either Red Team or Blue Team in Step 2 to proceed.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Bet Button */}
                <Button
                  onClick={handleLock}
                  disabled={!isAmountValid || !selectedTeamId || isLocking || !canLock}
                  className="w-full py-6 text-lg font-bold tracking-wider rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLocking ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> SUBMITTING BET...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="w-5 h-5" /> SUBMIT BET
                    </span>
                  )}
                </Button>
                <p className="text-center text-slate-400 text-xs mt-3">
                  Once submitted, your bet cannot be changed or cancelled for this battle.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Read-only view for teams if not in active betting state */}
        {!canLock && !isLocked && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-6 rounded-2xl border border-border bg-surface">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider block mb-1">RED TEAM</span>
              <h4 className="text-2xl font-black text-foreground font-space-grotesk">{match.red_team.team_name}</h4>
              {match.category && <span className="text-xs text-slate-500 block mt-2">Category: {match.category}</span>}
            </div>
            <div className="p-6 rounded-2xl border border-border bg-surface">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-1">BLUE TEAM</span>
              <h4 className="text-2xl font-black text-foreground font-space-grotesk">{match.blue_team.team_name}</h4>
              {match.category && <span className="text-xs text-slate-500 block mt-2">Category: {match.category}</span>}
            </div>
          </div>
        )}

        {/* ─── 4. BATTLE INSTRUCTIONS & RULES (IN EMPTY SPACE) ─── */}
        <div className="mt-8 bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-border/60 pb-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-space-grotesk text-foreground">
                BATTLE INSTRUCTIONS & RULES
              </h3>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                How to participate in Battle {match.round_number}
              </p>
            </div>
          </div>

          {/* 3 Step Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-border bg-background/50">
              <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs mb-3">
                1
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1">Choose Investment</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Allocate any amount from ₹1 up to ₹2,50,000 from your available balance. Your balance is reserved when you submit.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background/50">
              <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs mb-3">
                2
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1">Pick Winning Startup</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Watch the live pitches from Red Team and Blue Team. Select the team you believe will win the judge panel vote.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background/50">
              <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs mb-3">
                3
              </div>
              <h4 className="font-bold text-foreground text-sm mb-1">Submit Your Bet</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Confirm your bet before investments close. Once locked, your bet is permanently registered for this battle.
              </p>
            </div>
          </div>

          {/* Multiplier Matrix */}
          <div className="p-5 rounded-xl border border-border bg-background/40">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Judges&apos; Vote Multiplier Payouts (5 Total Votes)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg border border-border bg-surface">
                <div className="text-[11px] font-mono font-bold text-slate-500 mb-1">5 - 0 CLEAN SWEEP</div>
                <div className="text-base font-bold text-green-600">3.0x Gross Return</div>
                <div className="text-xs text-red-500 mt-0.5">0.0x for Loser (Total Loss)</div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <div className="text-[11px] font-mono font-bold text-slate-500 mb-1">4 - 1 STRONG WIN</div>
                <div className="text-base font-bold text-green-600">2.2x Gross Return</div>
                <div className="text-xs text-amber-500 mt-0.5">0.5x for Loser (50% Back)</div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface">
                <div className="text-[11px] font-mono font-bold text-slate-500 mb-1">3 - 2 SPLIT DECISION</div>
                <div className="text-base font-bold text-green-600">1.6x Gross Return</div>
                <div className="text-xs text-slate-500 mt-0.5">0.8x for Loser (80% Back)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
