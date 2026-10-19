'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  broadcastMatch,
  closeGambits,
  getCurrentMatch,
  getMatchActivity,
  getCategories,
  getTeamsByCategory,
} from '@/app/actions/matches'
import { submitMatchResult } from '@/app/actions/settlement'
import { createClient } from '@/lib/supabase/client'
import { EVENT_CHANNEL, SCORE_DISTRIBUTIONS } from '@/lib/constants'
import { LIVE_EVENTS, canCloseGambits, canSubmitResult, formatRoundLabel, PHASE_1_ROUNDS } from '@/lib/live-match/engine'

// ─── Types ───────────────────────────────────────────────────────────────────
type AdminPhase =
  | 'NO_MATCH'
  | 'CONFIGURING'
  | 'CONFIRM_BROADCAST'
  | 'BROADCASTING'
  | 'MATCH_LIVE'
  | 'CLOSING_GAMBITS'
  | 'GAMBITS_CLOSED'
  | 'ENTER_RESULT'
  | 'PROCESSING'
  | 'MATCH_COMPLETE'

interface Team { id: string; team_name: string; category: string; role: string }
interface Match {
  id: string
  round_number: number
  category: string
  status: string
  red_team: Team
  blue_team: Team
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LivePulse() {
  return (
    <span className="inline-flex items-center gap-2">
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="w-2 h-2 rounded-full bg-red-500 inline-block"
      />
      <span className="text-red-400 text-xs font-bold uppercase tracking-widest">LIVE</span>
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    GAMBITS_OPEN: { label: 'INVESTMENTS OPEN', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
    MATCH_LIVE: { label: 'LIVE', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
    GAMBITS_CLOSED: { label: 'INVESTMENTS CLOSED', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    AWAITING_JUDGE_RESULT: { label: 'AWAITING RESULT', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  }
  const s = map[status] || { label: status, className: 'bg-surface/5 text-slate-500 border-white/10' }
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${s.className}`}>
      {s.label}
    </span>
  )
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  )
}

function ErrorBox({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center justify-between gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
    >
      <span>⚠ {message}</span>
      <button onClick={onDismiss} className="text-red-300 hover:text-foreground text-lg leading-none">×</button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLiveMatchPage() {
  // Core state
  const [phase, setPhase] = useState<AdminPhase>('NO_MATCH')
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null)
  const [currentRound, setCurrentRound] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Config state
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [teamsInCategory, setTeamsInCategory] = useState<Team[]>([])
  const [redTeam, setRedTeam] = useState<Team | null>(null)
  const [blueTeam, setBlueTeam] = useState<Team | null>(null)

  // Activity
  const [gambitsLocked, setGambitsLocked] = useState(0)
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Result modal
  const [selectedScore, setSelectedScore] = useState('')

  const clearError = () => setError(null)

  // ── Fetch initial state ──────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    const res = await getCurrentMatch()
    if (!res?.success) return
    if (res.data) {
      setCurrentMatch(res.data as Match)
      setCurrentRound(res.currentRound || res.data.round_number)
      const status = res.data.status
      if (['GAMBITS_OPEN', 'MATCH_LIVE', 'LIVE'].includes(status)) {
        setPhase(prev => (prev === 'CLOSING_GAMBITS' ? prev : 'MATCH_LIVE'))
      } else if (status === 'GAMBITS_CLOSED' || status === 'AWAITING_JUDGE_RESULT') {
        // Do not reset back to GAMBITS_CLOSED if admin is currently entering result or settling
        setPhase(prev => (prev === 'ENTER_RESULT' || prev === 'PROCESSING' ? prev : 'GAMBITS_CLOSED'))
      }
    } else {
      // No active match returned from server
      setPhase(prev => {
        if ([
          'MATCH_LIVE',
          'CLOSING_GAMBITS',
          'GAMBITS_CLOSED',
          'ENTER_RESULT',
          'PROCESSING',
          'BROADCASTING',
          'CONFIRM_BROADCAST',
          'MATCH_COMPLETE',
          'CONFIGURING',
        ].includes(prev)) {
          return prev
        }
        setCurrentMatch(null)
        return 'NO_MATCH'
      })
      if (res.currentRound !== undefined) {
        setCurrentRound(res.currentRound)
      }
    }
  }, [])

  // ── Fetch activity count ─────────────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    if (!currentMatch) return
    const res = await getMatchActivity(currentMatch.id)
    if (res?.success && res.data) setGambitsLocked(res.data.gambitsLocked)
  }, [currentMatch])

  useEffect(() => { fetchState() }, [fetchState])

  useEffect(() => {
    if (currentMatch && ['MATCH_LIVE', 'GAMBITS_CLOSED'].includes(phase)) {
      fetchActivity()
      activityIntervalRef.current = setInterval(fetchActivity, 8000)
    }
    return () => { if (activityIntervalRef.current) clearInterval(activityIntervalRef.current) }
  }, [currentMatch, phase, fetchActivity])

  // ── Load categories ──────────────────────────────────────────────────────
  useEffect(() => {
    getCategories().then(res => {
      if (res?.success) setCategories((res.data as string[]) || [])
    })
  }, [])

  // ── Load teams when category changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedCategory) { setTeamsInCategory([]); return }
    getTeamsByCategory(selectedCategory).then(res => {
      if (res?.success) setTeamsInCategory((res.data as Team[]) || [])
    })
    setRedTeam(null); setBlueTeam(null)
  }, [selectedCategory])

  // ── Realtime listener ────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(EVENT_CHANNEL)
    ch
      .on('broadcast', { event: LIVE_EVENTS.GAMBIT_LOCKED }, (msg: any) => {
        if (typeof msg?.payload?.lockedCount === 'number') {
          setGambitsLocked(msg.payload.lockedCount)
        } else {
          setGambitsLocked(n => n + 1)
        }
      })
      .on('broadcast', { event: LIVE_EVENTS.MATCH_COMPLETED }, () => {
        setPhase('MATCH_COMPLETE')
        setCurrentMatch(null)
        setTimeout(() => { setPhase('NO_MATCH'); setCurrentRound(r => r) }, 3500)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleBroadcast = async () => {
    if (!redTeam || !blueTeam || !selectedCategory) return
    setPhase('BROADCASTING')
    clearError()
    try {
      const res = await broadcastMatch({
        category: selectedCategory,
        red_team_id: redTeam.id,
        blue_team_id: blueTeam.id,
      })
      if (res?.success && (res.payload || res.data)) {
        const matchData: Match = {
          id: res.data?.id || res.payload?.matchId,
          round_number: res.data?.round_number || res.payload?.roundNumber || currentRound,
          category: selectedCategory,
          red_team: redTeam,
          blue_team: blueTeam,
          status: res.data?.status || 'GAMBITS_OPEN',
        }

        setCurrentMatch(matchData)
        setCurrentRound(matchData.round_number)
        setGambitsLocked(0)
        setPhase('MATCH_LIVE')
        setSelectedCategory('')
        setRedTeam(null)
        setBlueTeam(null)
        fetchState()
      } else {
        setError(res?.error || 'Broadcast failed')
        setPhase('CONFIRM_BROADCAST')
      }
    } catch (err: any) {
      setError(err?.message || 'Broadcast failed')
      setPhase('CONFIRM_BROADCAST')
    }
  }

  const handleCloseGambits = async () => {
    if (!currentMatch) return
    setPhase('CLOSING_GAMBITS')
    clearError()

    try {
      const supabase = createClient()
      const ch = supabase.channel(EVENT_CHANNEL)
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.send({
            type: 'broadcast',
            event: LIVE_EVENTS.GAMBITS_CLOSED,
            payload: { matchId: currentMatch.id, status: 'GAMBITS_CLOSED' },
          })
          setTimeout(() => {
            supabase.removeChannel(ch)
          }, 1000)
        }
      })
    } catch (e) {
      console.error('Client broadcast failed', e)
    }

    const res = await closeGambits(currentMatch.id)
    if (res?.success) {
      setCurrentMatch(prev => prev ? { ...prev, status: 'GAMBITS_CLOSED' } : null)
      setPhase('GAMBITS_CLOSED')
    } else {
      setError(res?.error || 'Failed to close investments')
      setPhase('MATCH_LIVE')
    }
  }

  const handleSubmitResult = async () => {
    if (!currentMatch || !selectedScore) return
    const [rv, bv] = selectedScore.split('-').map(Number)
    setPhase('PROCESSING')
    clearError()
    const res = await submitMatchResult({ match_id: currentMatch.id, red_votes: rv, blue_votes: bv })
    if (res?.success) {
      setPhase('MATCH_COMPLETE')
      setCurrentMatch(null)
      setTimeout(() => { setPhase('NO_MATCH'); setCurrentRound(r => r + 1) }, 4000)
    } else {
      setError(res?.error || 'Settlement failed')
      setPhase('GAMBITS_CLOSED')
    }
  }

  const isReady = !!(selectedCategory && redTeam && blueTeam && redTeam.id !== blueTeam.id)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent font-medium mb-1">
            The Founder&apos;s Gambit
          </p>
          <h1 className="text-3xl font-bold font-space-grotesk">Live Match Control</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {currentRound > 0 && (
            <span className="text-slate-500 font-mono font-bold">
              {formatRoundLabel(currentRound, PHASE_1_ROUNDS)}
            </span>
          )}
          {currentMatch ? <LivePulse /> : (
            <span className="text-slate-500 text-xs uppercase tracking-widest">Standby</span>
          )}
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && <ErrorBox message={error} onDismiss={clearError} />}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          PHASE: NO_MATCH — Configuration
      ══════════════════════════════════════════════════════════ */}
      {(phase === 'NO_MATCH' || phase === 'CONFIGURING') && (
        <SectionCard>
          <h2 className="text-lg font-bold mb-6 text-foreground">Create Live Match</h2>

          {/* Category */}
          <div className="mb-6">
            <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3 block">
              Select Category
            </label>
            {categories.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No categories found. Register teams first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-accent/20 border-accent/60 text-accent'
                        : 'bg-surface/[0.03] border-white/10 text-slate-500 hover:border-accent/30 hover:text-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Teams */}
          {selectedCategory && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-4 mb-6"
            >
              {/* Red Corner */}
              <div>
                <label className="text-xs uppercase tracking-widest text-red-400/70 font-semibold mb-3 block">
                  🔴 Red Corner
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {teamsInCategory.length === 0 && (
                    <p className="text-slate-500 text-sm italic">No active teams in this category</p>
                  )}
                  {teamsInCategory.map(team => {
                    const isSelected = redTeam?.id === team.id
                    const isDisabled = blueTeam?.id === team.id
                    return (
                      <button
                        key={team.id}
                        disabled={isDisabled}
                        onClick={() => setRedTeam(isSelected ? null : team)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                          isSelected
                            ? 'bg-red-500/20 border-red-500/50 text-white font-semibold shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                            : isDisabled
                            ? 'opacity-25 cursor-not-allowed bg-surface/[0.02] border-white/5 text-slate-500'
                            : 'bg-surface/[0.03] border-white/8 text-slate-600 hover:border-red-500/30 hover:bg-red-500/5'
                        }`}
                      >
                        <div className="font-medium">{team.team_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{team.role}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Blue Corner */}
              <div>
                <label className="text-xs uppercase tracking-widest text-blue-400/70 font-semibold mb-3 block">
                  🔵 Blue Corner
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {teamsInCategory.length === 0 && (
                    <p className="text-slate-500 text-sm italic">No active teams in this category</p>
                  )}
                  {teamsInCategory.map(team => {
                    const isSelected = blueTeam?.id === team.id
                    const isDisabled = redTeam?.id === team.id
                    return (
                      <button
                        key={team.id}
                        disabled={isDisabled}
                        onClick={() => setBlueTeam(isSelected ? null : team)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                          isSelected
                            ? 'bg-blue-500/20 border-blue-500/50 text-white font-semibold shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                            : isDisabled
                            ? 'opacity-25 cursor-not-allowed bg-surface/[0.02] border-white/5 text-slate-500'
                            : 'bg-surface/[0.03] border-white/8 text-slate-600 hover:border-blue-500/30 hover:bg-blue-500/5'
                        }`}
                      >
                        <div className="font-medium">{team.team_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{team.role}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Broadcast Button */}
          <button
            disabled={!isReady}
            onClick={() => setPhase('CONFIRM_BROADCAST')}
            className={`w-full h-14 rounded-xl font-bold text-base tracking-wider transition-all ${
              isReady
                ? 'bg-accent hover:bg-[#7c3aed] text-white shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:shadow-[0_0_40px_rgba(139,92,246,0.35)]'
                : 'bg-surface/5 text-gray-600 cursor-not-allowed border border-white/5'
            }`}
          >
            {!isReady
              ? selectedCategory
                ? !redTeam ? 'Select Red Team →' : !blueTeam ? 'Select Blue Team →' : 'Teams must differ'
                : 'Select a Category to Begin'
              : '▶ BROADCAST MATCH'}
          </button>
        </SectionCard>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: CONFIRM_BROADCAST
      ══════════════════════════════════════════════════════════ */}
      {phase === 'CONFIRM_BROADCAST' && redTeam && blueTeam && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <SectionCard className="border-accent/30">
            <h2 className="text-lg font-bold mb-2">Broadcast this match?</h2>
            <p className="text-slate-500 text-sm mb-6">
              This will immediately open Investments for all eligible Investors.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-surface/[0.03] rounded-xl p-4 text-center">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Category</div>
                <div className="font-bold text-foreground">{selectedCategory}</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <div className="text-xs text-red-400/70 uppercase tracking-wider mb-1">Red</div>
                <div className="font-bold text-foreground">{redTeam.team_name}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                <div className="text-xs text-blue-400/70 uppercase tracking-wider mb-1">Blue</div>
                <div className="font-bold text-foreground">{blueTeam.team_name}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPhase('NO_MATCH')}
                className="flex-1 h-12 rounded-xl border border-white/10 text-slate-500 hover:text-foreground hover:border-white/20 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcast}
                className="flex-1 h-12 rounded-xl bg-accent hover:bg-[#7c3aed] text-white font-bold tracking-wide transition-all shadow-[0_0_30px_rgba(139,92,246,0.25)]"
              >
                Broadcast Now →
              </button>
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: BROADCASTING
      ══════════════════════════════════════════════════════════ */}
      {phase === 'BROADCASTING' && (
        <SectionCard className="text-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent mx-auto mb-4"
          />
          <p className="text-foreground font-bold text-lg">Broadcasting...</p>
          <p className="text-slate-500 text-sm mt-1">Notifying all investors in real-time</p>
        </SectionCard>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: MATCH_LIVE
      ══════════════════════════════════════════════════════════ */}
      {(phase === 'MATCH_LIVE' || phase === 'CLOSING_GAMBITS') && currentMatch && (
        <div className="space-y-4">
          {/* Live Card */}
          <SectionCard className="border-accent/20">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <LivePulse />
              <StatusBadge status={currentMatch.status} />
            </div>

            <div className="text-center mb-8">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">
                {formatRoundLabel(currentMatch.round_number, PHASE_1_ROUNDS)}
              </div>
              <div className="text-xs uppercase tracking-[0.25em] text-accent mb-6">
                {currentMatch.category}
              </div>

              <div className="flex items-center justify-center gap-6 md:gap-10">
                <div className="flex-1 max-w-[220px] bg-red-500/8 border border-red-500/20 rounded-2xl p-6 text-center">
                  <div className="text-[10px] text-red-400/60 uppercase tracking-[0.3em] mb-2">Red Team</div>
                  <div className="text-xl font-bold text-foreground leading-tight">{currentMatch.red_team.team_name}</div>
                </div>
                <div className="text-2xl font-bold text-gray-600">VS</div>
                <div className="flex-1 max-w-[220px] bg-blue-500/8 border border-blue-500/20 rounded-2xl p-6 text-center">
                  <div className="text-[10px] text-blue-400/60 uppercase tracking-[0.3em] mb-2">Blue Team</div>
                  <div className="text-xl font-bold text-foreground leading-tight">{currentMatch.blue_team.team_name}</div>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-green-400">{gambitsLocked}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Investments Locked</div>
              </div>
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-accent">{currentMatch.round_number}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Battle</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseGambits}
                disabled={phase === 'CLOSING_GAMBITS'}
                className="flex-1 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {phase === 'CLOSING_GAMBITS' ? 'Closing...' : '🔒 Lock Investments'}
              </button>
              <button
                disabled
                className="flex-1 h-12 rounded-xl bg-surface/[0.02] border border-white/5 text-gray-600 cursor-not-allowed font-bold text-sm"
                title="Lock Investments first"
              >
                Enter Result
              </button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: GAMBITS_CLOSED
      ══════════════════════════════════════════════════════════ */}
      {phase === 'GAMBITS_CLOSED' && currentMatch && (
        <div className="space-y-4">
          <SectionCard className="border-amber-500/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-400 text-sm font-bold uppercase tracking-widest">Investments Closed</span>
              </div>
              <StatusBadge status="GAMBITS_CLOSED" />
            </div>

            <div className="text-center mb-8">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">
                {formatRoundLabel(currentMatch.round_number, PHASE_1_ROUNDS)}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex-1 max-w-[200px] text-center">
                  <div className="text-[10px] text-red-400/60 uppercase tracking-[0.3em] mb-2">Red</div>
                  <div className="text-lg font-bold text-foreground">{currentMatch.red_team.team_name}</div>
                </div>
                <div className="text-xl font-bold text-gray-600">VS</div>
                <div className="flex-1 max-w-[200px] text-center">
                  <div className="text-[10px] text-blue-400/60 uppercase tracking-[0.3em] mb-2">Blue</div>
                  <div className="text-lg font-bold text-foreground">{currentMatch.blue_team.team_name}</div>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-xl p-4 text-center mb-6">
              <div className="text-3xl font-black text-green-400">{gambitsLocked}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Total Investments Locked</div>
            </div>

            <button
              onClick={() => setPhase('ENTER_RESULT')}
              className="w-full h-14 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-foreground font-bold text-base tracking-wide transition-all shadow-[0_0_25px_rgba(16,185,129,0.15)]"
            >
              📊 Enter Match Result
            </button>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: ENTER_RESULT — Result Selection Modal
      ══════════════════════════════════════════════════════════ */}
      {phase === 'ENTER_RESULT' && currentMatch && (
        <SectionCard className="border-emerald-500/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Enter Match Result</h2>
            <button
              onClick={() => setPhase('GAMBITS_CLOSED')}
              className="text-slate-500 hover:text-foreground text-sm"
            >← Back</button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-center text-sm">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="text-red-400/70 text-xs mb-1">Red Team</div>
              <div className="font-bold text-foreground">{currentMatch.red_team.team_name}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <div className="text-blue-400/70 text-xs mb-1">Blue Team</div>
              <div className="font-bold text-foreground">{currentMatch.blue_team.team_name}</div>
            </div>
          </div>

          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">
            Judges&apos; Vote Distribution (Red – Blue)
          </div>
          <div className="space-y-2 mb-6">
            {(SCORE_DISTRIBUTIONS as Array<{ red: number; blue: number }>).map((dist) => {
              const key = `${dist.red}-${dist.blue}`
              const isSelected = selectedScore === key
              return (
                <label
                  key={key}
                  className={`flex items-center gap-4 px-4 py-3.5 border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent/60 bg-accent/10'
                      : 'border-white/8 hover:border-white/20 hover:bg-surface/[0.02]'
                  }`}
                >
                  <input
                    type="radio"
                    name="score"
                    value={key}
                    checked={isSelected}
                    onChange={e => setSelectedScore(e.target.value)}
                    className="hidden"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`font-black text-lg ${isSelected ? 'text-red-400' : 'text-slate-500'}`}>{dist.red}</span>
                      <span className="text-gray-600 text-sm">–</span>
                      <span className={`font-black text-lg ${isSelected ? 'text-blue-400' : 'text-slate-500'}`}>{dist.blue}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {dist.red === 5 && 'Red wins · 3×'}
                      {dist.red === 4 && 'Red wins · 2.2×'}
                      {dist.red === 3 && 'Red wins · 1.6×'}
                      {dist.blue === 3 && 'Blue wins · 1.6×'}
                      {dist.blue === 4 && 'Blue wins · 2.2×'}
                      {dist.blue === 5 && 'Blue wins · 3×'}
                    </div>
                  </div>
                  {isSelected && <span className="text-accent text-lg">✓</span>}
                </label>
              )
            })}
          </div>

          <button
            onClick={handleSubmitResult}
            disabled={!selectedScore}
            className={`w-full h-14 rounded-xl font-bold text-base tracking-wide transition-all ${
              selectedScore
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-surface/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            Submit Results & Settle Investments
          </button>
        </SectionCard>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: PROCESSING
      ══════════════════════════════════════════════════════════ */}
      {phase === 'PROCESSING' && (
        <SectionCard className="text-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-14 h-14 rounded-full border-2 border-emerald-500 border-t-transparent mx-auto mb-5"
          />
          <p className="text-foreground font-bold text-xl">Settling Investments</p>
          <p className="text-slate-500 text-sm mt-2">Calculating multipliers · Updating all balances</p>
        </SectionCard>
      )}

      {/* ══════════════════════════════════════════════════════════
          PHASE: MATCH_COMPLETE
      ══════════════════════════════════════════════════════════ */}
      {phase === 'MATCH_COMPLETE' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <SectionCard className="text-center py-16 border-green-500/20">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-black text-foreground mb-2">Match Complete</h2>
            <p className="text-slate-500 text-sm">All Investments settled. Returning to standby in a moment...</p>
          </SectionCard>
        </motion.div>
      )}
    </div>
  )
}
