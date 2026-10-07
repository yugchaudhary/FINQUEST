'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Clock, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/hooks/useSession'
import { getInvestorLiveState } from '@/app/actions/matches'
import { lockGambit } from '@/app/actions/gambits'
import { getPhase1Leaderboard } from '@/app/actions/leaderboard'
import { getEventState } from '@/app/actions/event-state'
import { TeamSetup } from '@/components/dashboard/team-setup'
import { Phase1Leaderboard } from '@/components/leaderboard/phase1-leaderboard'
import { FinalistBroadcast } from '@/components/finals/finalist-broadcast'
import { FinalsLeaderboard } from '@/components/leaderboard/finals-leaderboard'
import { submitScore } from '@/app/actions/finals'
import {
  EVENT_CHANNEL,
  MAX_GAMBIT_AMOUNT,
  QUICK_AMOUNTS,
  QUICK_AMOUNT_LABELS,
} from '@/lib/constants'
import { LIVE_EVENTS, deriveInvestorView, formatRoundLabel, PHASE_1_ROUNDS, type InvestorViewState } from '@/lib/live-match/engine'
import { formatIndianNumber, clampGambitAmount } from '@/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PublicTeam { id: string; name: string }
interface PublicMatch {
  matchId: string
  roundNumber: number
  category: string
  status: string
  redTeam: PublicTeam
  blueTeam: PublicTeam
  red_team?: PublicTeam
  blue_team?: PublicTeam
}
interface MyGambit {
  id: string
  selectedTeamId: string
  lockedAt: string
  status: string
}

// ─── Shared Layout Wrapper ────────────────────────────────────────────────────
function Screen({ children, teamName }: { children: React.ReactNode; teamName?: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.4) 1px, transparent 1px), linear-gradient(90deg,rgba(139,92,246,0.4) 1px,transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#8b5cf6]/5 blur-[140px] pointer-events-none" />
      {teamName && (
        <div className="absolute top-5 right-5 glass-card px-3 py-1.5 text-xs text-[#8b5cf6] font-medium">
          {teamName}
        </div>
      )}
      <div className="absolute bottom-5 text-center">
        <p className="text-[10px] text-gray-700 uppercase tracking-[0.3em]">The Founder&apos;s Gambit</p>
      </div>
      {children}
    </div>
  )
}

// ─── Awaiting Match ───────────────────────────────────────────────────────────
function AwaitingMatch({ teamName }: { teamName?: string }) {
  return (
    <Screen teamName={teamName}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center z-10"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8 mx-auto w-20 h-20 border border-[#2a2a3a] rounded-xl flex items-center justify-center"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#8b5cf6]/60">
            <path d="M12 2L15 8H9L12 2Z" /><rect x="8" y="8" width="8" height="4" rx="1" />
            <path d="M6 12H18V14C18 15.1046 17.1046 16 16 16H8C6.89543 16 6 15.1046 6 14V12Z" />
            <rect x="7" y="16" width="10" height="2" rx="0.5" /><rect x="5" y="18" width="14" height="3" rx="1" />
          </svg>
        </motion.div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-wide">
          AWAITING NEXT MATCH
        </h1>
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center justify-center gap-1.5 mb-4"
        >
          {[0, 1, 2].map(i => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full bg-[#8b5cf6]/${60 - i * 20}`} />
          ))}
        </motion.div>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          The next Gambit will appear here automatically when the match is broadcast.
        </p>
      </motion.div>
    </Screen>
  )
}

// ─── Live Match Selector ──────────────────────────────────────────────────────
function LiveMatchSelector({
  match,
  teamName,
  onSelect,
}: {
  match: PublicMatch
  teamName?: string
  onSelect: (team: PublicTeam, color: 'red' | 'blue') => void
}) {
  const redTeam = match.redTeam || match.red_team!
  const blueTeam = match.blueTeam || match.blue_team!

  return (
    <Screen teamName={teamName}>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6 z-10"
      >
        <motion.span
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"
        />
        <span className="text-sm text-red-400 uppercase tracking-[0.25em] font-bold">Live</span>
        <span className="text-gray-600 text-sm">·</span>
        <span className="text-sm text-gray-400 uppercase tracking-wider">
          {formatRoundLabel(match.roundNumber, PHASE_1_ROUNDS)}
        </span>
        <span className="text-gray-600 text-sm">·</span>
        <span className="text-sm text-[#8b5cf6] uppercase tracking-wider">{match.category}</span>
      </motion.div>

      <p className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-8 z-10">
        Select your side
      </p>

      <div className="flex flex-col md:flex-row items-stretch gap-5 w-full max-w-3xl z-10">
        {/* Red */}
        <motion.button
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120 }}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(redTeam, 'red')}
          className="group relative flex-1 min-h-[200px] md:min-h-[280px] bg-red-500/[0.06] border border-red-500/25 rounded-2xl p-8 md:p-12 text-center transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_60px_rgba(239,68,68,0.12)] overflow-hidden"
        >
          <div className="text-red-400/70 text-[10px] uppercase tracking-[0.35em] mb-4 font-semibold">
            🔴 Red Team
          </div>
          <div className="text-2xl md:text-4xl font-black text-white group-hover:text-red-100 transition-colors mb-5 leading-tight">
            {redTeam.name}
          </div>
          <div className="text-xs text-gray-500 group-hover:text-red-300/60 transition-colors uppercase tracking-widest">
            Tap to back this team
          </div>
        </motion.button>

        {/* VS */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring' }}
          className="flex-shrink-0 flex items-center justify-center"
        >
          <div className="w-14 h-14 rounded-full border-2 border-[#2a2a3a] bg-[#16161f] flex items-center justify-center">
            <span className="text-gray-500 font-black text-sm">VS</span>
          </div>
        </motion.div>

        {/* Blue */}
        <motion.button
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120 }}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(blueTeam, 'blue')}
          className="group relative flex-1 min-h-[200px] md:min-h-[280px] bg-blue-500/[0.06] border border-blue-500/25 rounded-2xl p-8 md:p-12 text-center transition-all duration-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-[0_0_60px_rgba(59,130,246,0.12)] overflow-hidden"
        >
          <div className="text-blue-400/70 text-[10px] uppercase tracking-[0.35em] mb-4 font-semibold">
            🔵 Blue Team
          </div>
          <div className="text-2xl md:text-4xl font-black text-white group-hover:text-blue-100 transition-colors mb-5 leading-tight">
            {blueTeam.name}
          </div>
          <div className="text-xs text-gray-500 group-hover:text-blue-300/60 transition-colors uppercase tracking-widest">
            Tap to back this team
          </div>
        </motion.button>
      </div>
    </Screen>
  )
}

// ─── Gambit Modal ─────────────────────────────────────────────────────────────
function GambitModal({
  team,
  color,
  match,
  onLocked,
  onClose,
}: {
  team: PublicTeam
  color: 'red' | 'blue'
  match: PublicMatch
  onLocked: (gambit: MyGambit) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState(0)
  const [inputVal, setInputVal] = useState('0')
  const [isLocking, setIsLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accentRed = color === 'red'

  const updateAmount = (v: number) => {
    const clamped = clampGambitAmount(v)
    setAmount(clamped)
    setInputVal(clamped.toString())
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (!raw) { setInputVal(''); setAmount(0); return }
    const n = parseInt(raw, 10)
    const clamped = clampGambitAmount(n)
    setAmount(clamped)
    setInputVal(clamped.toString())
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '')
    if (pasted) updateAmount(parseInt(pasted, 10))
  }

  const handleLock = async () => {
    if (amount <= 0) { setError('Enter an amount greater than ₹0'); return }
    setError(null)
    setIsLocking(true)
    const res = await lockGambit(match.matchId, team.id, amount)
    if (res?.success) {
      onLocked({ id: 'pending', selectedTeamId: team.id, lockedAt: new Date().toISOString(), status: 'LOCKED' })
    } else {
      setError(res?.error || 'Failed to lock Gambit. Please try again.')
      setIsLocking(false)
    }
  }

  const fillPct = (amount / MAX_GAMBIT_AMOUNT) * 100
  const sliderColor = accentRed ? '#ef4444' : '#3b82f6'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => { if (e.target === e.currentTarget && !isLocking) onClose() }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className="relative w-full md:max-w-lg bg-[#16161f] rounded-t-3xl md:rounded-2xl border border-[#2a2a3a] p-6 md:p-8 z-10"
        style={{ boxShadow: `0 0 80px ${accentRed ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)'}` }}
      >
        {/* Handle bar (mobile) */}
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6 md:hidden" />

        {!isLocking ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-white tracking-wide mb-1">PLACE YOUR GAMBIT</h2>
              <p className={`text-sm ${accentRed ? 'text-red-400' : 'text-blue-400'}`}>
                Backing <span className="font-bold">{team.name}</span>
              </p>
            </div>

            {/* Amount Display */}
            <div className="text-center mb-5">
              <div className="text-4xl font-black text-white tabular-nums">
                ₹{formatIndianNumber(amount)}
              </div>
            </div>

            {/* Slider */}
            <div className="mb-4 px-1">
              <input
                type="range"
                min={0}
                max={MAX_GAMBIT_AMOUNT}
                step={5000}
                value={amount}
                onChange={e => updateAmount(parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-full cursor-pointer appearance-none"
                style={{
                  background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${fillPct}%, #1e1e2d ${fillPct}%, #1e1e2d 100%)`,
                }}
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1.5">
                <span>₹0</span><span>₹2,50,000</span>
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-6 gap-1.5 mb-5">
              {QUICK_AMOUNTS.map((qa, i) => (
                <button
                  key={qa}
                  onClick={() => updateAmount(qa)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    amount === qa
                      ? accentRed
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-white/[0.04] border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/20'
                  }`}
                >
                  {QUICK_AMOUNT_LABELS[i]}
                </button>
              ))}
            </div>

            {/* Numeric Input */}
            <div className="mb-5">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 block">
                Enter Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputVal}
                  onChange={handleInput}
                  onBlur={() => setInputVal(amount.toString())}
                  onPaste={handlePaste}
                  className="w-full pl-9 pr-4 py-3 bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl text-white font-mono text-lg focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
                />
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-13 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLock}
                disabled={amount <= 0}
                className={`flex-2 flex-1 h-13 py-3.5 rounded-xl font-black tracking-wide transition-all flex items-center justify-center gap-2 ${
                  amount > 0
                    ? accentRed
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Lock size={16} />
                LOCK GAMBIT
              </button>
            </div>
          </>
        ) : (
          /* Locking state */
          <div className="text-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className={`w-14 h-14 rounded-full border-2 ${accentRed ? 'border-red-500' : 'border-blue-500'} border-t-transparent mx-auto mb-5`}
            />
            <p className="text-white font-bold text-lg">LOCKING GAMBIT...</p>
            <p className="text-gray-400 text-sm mt-2">Please wait</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Gambit Locked Screen ─────────────────────────────────────────────────────
function GambitLockedScreen({ team, color, teamName }: { team: PublicTeam; color: 'red' | 'blue'; teamName?: string }) {
  const accentRed = color === 'red'
  return (
    <Screen teamName={teamName}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="text-center z-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
          className={`mx-auto w-24 h-24 rounded-2xl border flex items-center justify-center mb-8 ${
            accentRed
              ? 'border-red-500/30 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.15)]'
              : 'border-blue-500/30 bg-blue-500/10 shadow-[0_0_40px_rgba(59,130,246,0.15)]'
          }`}
        >
          <Lock size={40} className={accentRed ? 'text-red-400' : 'text-blue-400'} />
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-black text-white mb-3">GAMBIT LOCKED</h1>
        <p className="text-gray-400 text-sm mb-6">Your Gambit has been recorded.</p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 ${
            accentRed ? 'border-red-500/30 text-red-400' : 'border-blue-500/30 text-blue-400'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${accentRed ? 'bg-red-500' : 'bg-blue-500'}`} />
          <span className="text-sm font-medium">{team.name}</span>
        </motion.div>

        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Clock size={15} className="animate-pulse" />
          <span className="text-sm">Awaiting Judge Decision</span>
        </div>
        <div className="flex gap-1 justify-center mt-3">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]/60"
            />
          ))}
        </div>
      </motion.div>
    </Screen>
  )
}

// ─── Gambits Closed Screen ────────────────────────────────────────────────────
function GambitsClosedScreen({ hasLocked, teamName }: { hasLocked: boolean; teamName?: string }) {
  return (
    <Screen teamName={teamName}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 space-y-4"
      >
        <div className="text-xs uppercase tracking-[0.35em] text-amber-400 font-bold">
          Gambits Closed
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">
          {hasLocked ? 'Your Gambit is Locked.' : 'Submissions Are Closed.'}
        </h1>
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Clock size={15} className="animate-pulse" />
          <span className="text-sm">Awaiting Judge Decision</span>
        </div>
      </motion.div>
    </Screen>
  )
}

// ─── Connection Banner ────────────────────────────────────────────────────────
function ConnectionBanner({ connected }: { connected: boolean }) {
  if (connected) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 py-2 bg-amber-500/90 text-black text-xs font-bold"
    >
      <WifiOff size={14} />
      Connection interrupted — reconnecting...
    </motion.div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { user, role, team, isLoading: isSessionLoading } = useSession()

  // Core state
  const [investorState, setInvestorState] = useState<InvestorViewState>('WAITING')
  const [currentMatch, setCurrentMatch] = useState<PublicMatch | null>(null)
  const [myGambit, setMyGambit] = useState<MyGambit | null>(null)
  const [screenState, setScreenState] = useState<string | null>(null)
  const [currentFinalist, setCurrentFinalist] = useState<any>(null)

  // Gambit modal
  const [selectedTeam, setSelectedTeam] = useState<PublicTeam | null>(null)
  const [selectedColor, setSelectedColor] = useState<'red' | 'blue' | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Extra states
  const [isConnected, setIsConnected] = useState(true)
  const [phase1Data, setPhase1Data] = useState<any[]>([])
  const [finalsData, setFinalsData] = useState<any[]>([])
  const [hasRated, setHasRated] = useState(false)
  const [isStateLoading, setIsStateLoading] = useState(true)

  // Redirect if not logged in
  useEffect(() => {
    if (!isSessionLoading && !user) router.push('/login')
  }, [user, isSessionLoading, router])

  // ── Load state from server (authoritative) ────────────────────────────────
  const loadState = useCallback(async () => {
    if (!user) return
    try {
      const res = await getInvestorLiveState()
      if (!res?.success || !res.data) return
      const { match, myGambit: g, eventState } = res.data

      setCurrentMatch(match)
      setMyGambit(g)
      setScreenState(eventState?.current_screen_state ?? null)

      const derived = deriveInvestorView({
        matchStatus: match?.status ?? null,
        screenState: eventState?.current_screen_state,
        hasLockedGambit: !!g,
      })
      setInvestorState(derived)

      // Handle global screen states
      // Always fetch leaderboard data so we can show it during WAITING
      try {
        const lb = await getPhase1Leaderboard()
        setPhase1Data(lb?.data || [])
      } catch (e) {
        console.error('Failed to fetch leaderboard in dashboard:', e)
      }

    } catch (err) {
      console.error('loadState error', err)
    } finally {
      setIsStateLoading(false)
    }
  }, [user])

  // Load full event state for special phases (finals, leaderboard, setup)
  const loadEventState = useCallback(async () => {
    if (!user) return
    try {
      const res = await getEventState()
      if (res?.success && res.data) {
        setScreenState(res.data.eventState?.current_screen_state ?? null)
        setCurrentFinalist(res.data.currentFinalist)
      }
    } catch {}
  }, [user])

  useEffect(() => {
    if (user) { loadState(); loadEventState() }
  }, [user, loadState, loadEventState])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const ch = supabase.channel(EVENT_CHANNEL)

    ch
      .on('broadcast', { event: LIVE_EVENTS.MATCH_BROADCASTED }, (msg) => {
        const payload = msg.payload as PublicMatch
        setCurrentMatch(payload)
        setMyGambit(null)
        setInvestorState('LIVE_MATCH')
      })
      .on('broadcast', { event: 'MATCH_BROADCAST' }, (msg) => {
        // legacy compat
        const payload = msg.payload as PublicMatch
        setCurrentMatch(payload)
        setMyGambit(null)
        setInvestorState('LIVE_MATCH')
      })
      .on('broadcast', { event: LIVE_EVENTS.GAMBITS_CLOSED }, () => {
        setInvestorState(prev =>
          prev === 'GAMBIT_LOCKED' ? 'AWAITING_RESULT' : 'GAMBITS_CLOSED'
        )
        setCurrentMatch(prev => prev ? { ...prev, status: 'GAMBITS_CLOSED' } : null)
      })
      .on('broadcast', { event: LIVE_EVENTS.MATCH_COMPLETED }, async () => {
        setInvestorState('WAITING')
        setCurrentMatch(null)
        setMyGambit(null)
        setSelectedTeam(null)
        setSelectedColor(null)
        setIsModalOpen(false)
        const lb = await getPhase1Leaderboard()
        setPhase1Data(lb?.data || [])
      })
      .on('broadcast', { event: 'RESULT_SUBMITTED' }, async () => {
        setInvestorState('WAITING')
        setCurrentMatch(null)
        setMyGambit(null)
        setSelectedTeam(null)
        setSelectedColor(null)
        setIsModalOpen(false)
        const lb = await getPhase1Leaderboard()
        setPhase1Data(lb?.data || [])
      })
      .on('broadcast', { event: 'MATCH_RESET' }, () => {
        setInvestorState('WAITING')
        setCurrentMatch(null)
        setMyGambit(null)
        setSelectedTeam(null)
        setSelectedColor(null)
        setIsModalOpen(false)
      })
      .on('broadcast', { event: 'LEADERBOARD_PUBLISHED' }, async () => {
        setScreenState('PHASE_1_REVEAL')
        const lb = await getPhase1Leaderboard()
        setPhase1Data(lb?.data || [])
      })
      .on('broadcast', { event: 'PHASE_CHANGE' }, (msg) => {
        const { current_screen_state } = msg.payload as { current_screen_state: string }
        setScreenState(current_screen_state)
        loadEventState()
      })
      .on('broadcast', { event: 'FINALIST_BROADCAST' }, (msg) => {
        setScreenState('FINALIST_LIVE')
        setCurrentFinalist(msg.payload)
        setHasRated(false)
      })
      .on('broadcast', { event: 'FINALS_LEADERBOARD_UPDATE' }, () => {
        setScreenState('FINALS_LEADERBOARD')
      })
      .subscribe(status => {
        setIsConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') loadState()
      })

    return () => { supabase.removeChannel(ch) }
  }, [user, loadState, loadEventState])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTeamSelect = (t: PublicTeam, color: 'red' | 'blue') => {
    if (investorState !== 'LIVE_MATCH') return
    setSelectedTeam(t)
    setSelectedColor(color)
    setIsModalOpen(true)
  }

  const handleGambitLocked = (gambit: MyGambit) => {
    setMyGambit(gambit)
    setInvestorState('GAMBIT_LOCKED')
    setIsModalOpen(false)
  }

  const handleScoreSubmit = async (score: number) => {
    if (!currentFinalist) return
    await submitScore(currentFinalist.id, score)
    setHasRated(true)
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isSessionLoading || isStateLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-[#8b5cf6] border-t-transparent mx-auto"
          />
          <p className="text-gray-500 text-xs uppercase tracking-widest">Connecting...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const teamName = team?.team_name || team?.name

  // ── Special global screens (bypass match logic) ───────────────────────────
  if (screenState === 'SETUP') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black mb-2">Welcome, {teamName}</h1>
          <p className="text-gray-400 mb-8">The event has not started yet. Configure your team roster below.</p>
          <TeamSetup joinCode={team?.join_code} />
        </div>
      </div>
    )
  }

  if (screenState === 'PHASE_1_REVEAL') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Phase1Leaderboard leaderboardData={phase1Data} />
      </div>
    )
  }

  if (screenState === 'FINALIST_LIVE' || screenState === 'RATINGS_OPEN') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <FinalistBroadcast finalistTeam={currentFinalist} onScoreSubmit={handleScoreSubmit} hasRated={hasRated} />
      </div>
    )
  }

  if (screenState === 'FINALS_LEADERBOARD') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <FinalsLeaderboard data={finalsData} />
      </div>
    )
  }

  // ── Investor-role: match-based state machine ──────────────────────────────
  if (role === 'PARTICIPANT' && team?.role === 'INVESTOR') {
    return (
      <>
        <ConnectionBanner connected={isConnected} />
        <AnimatePresence mode="wait">
          {investorState === 'WAITING' || investorState === 'WAITING_FOR_NEXT_MATCH' ? (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {phase1Data && phase1Data.length > 0 ? (
                <Phase1Leaderboard leaderboardData={phase1Data} />
              ) : (
                <AwaitingMatch teamName={teamName} />
              )}
            </motion.div>
          ) : investorState === 'LIVE_MATCH' && currentMatch ? (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LiveMatchSelector match={currentMatch} teamName={teamName} onSelect={handleTeamSelect} />
            </motion.div>
          ) : investorState === 'GAMBIT_LOCKED' && myGambit ? (
            <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GambitLockedScreen
                team={
                  myGambit.selectedTeamId === (currentMatch?.redTeam?.id || currentMatch?.red_team?.id)
                    ? (currentMatch?.redTeam || currentMatch?.red_team!)
                    : (currentMatch?.blueTeam || currentMatch?.blue_team!)
                }
                color={
                  myGambit.selectedTeamId === (currentMatch?.redTeam?.id || currentMatch?.red_team?.id)
                    ? 'red' : 'blue'
                }
                teamName={teamName}
              />
            </motion.div>
          ) : (investorState === 'GAMBITS_CLOSED' || investorState === 'AWAITING_RESULT') ? (
            <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GambitsClosedScreen hasLocked={investorState === 'AWAITING_RESULT'} teamName={teamName} />
            </motion.div>
          ) : (
            <motion.div key="fallback-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AwaitingMatch teamName={teamName} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gambit Modal */}
        <AnimatePresence>
          {isModalOpen && selectedTeam && selectedColor && currentMatch && (
            <GambitModal
              key="gambit-modal"
              team={selectedTeam}
              color={selectedColor}
              match={currentMatch}
              onLocked={handleGambitLocked}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </AnimatePresence>
      </>
    )
  }

  // ── Innovator / non-investor ───────────────────────────────────────────────
  return phase1Data && phase1Data.length > 0 
    ? <div className="min-h-screen bg-[#0a0a0f] text-white"><Phase1Leaderboard leaderboardData={phase1Data} /></div>
    : <AwaitingMatch teamName={teamName} />
}
