export const PHASE_1_ROUNDS = 10
export const MAX_GAMBIT_AMOUNT = 250000

export const MATCH_STATUS = {
  WAITING_FOR_MATCH: 'WAITING_FOR_MATCH',
  MATCH_LIVE: 'MATCH_LIVE',
  GAMBITS_OPEN: 'GAMBITS_OPEN',
  GAMBITS_CLOSED: 'GAMBITS_CLOSED',
  AWAITING_JUDGE_RESULT: 'AWAITING_JUDGE_RESULT',
  PROCESSING_RESULT: 'PROCESSING_RESULT',
  MATCH_COMPLETE: 'MATCH_COMPLETE',
} as const

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS]

export const ACTIVE_MATCH_STATUSES: MatchStatus[] = [
  MATCH_STATUS.MATCH_LIVE,
  MATCH_STATUS.GAMBITS_OPEN,
  MATCH_STATUS.GAMBITS_CLOSED,
  MATCH_STATUS.AWAITING_JUDGE_RESULT,
  MATCH_STATUS.PROCESSING_RESULT,
]

export const RESULT_MULTIPLIERS: Record<string, number> = {
  '5-0': 3,
  '4-1': 2.2,
  '3-2': 1.6,
  '2-3': 0.8,
  '1-4': 0.5,
  '0-5': 0,
}

export const LIVE_EVENTS = {
  MATCH_BROADCASTED: 'MATCH_BROADCASTED',
  GAMBIT_LOCKED: 'GAMBIT_LOCKED',
  GAMBITS_CLOSED: 'GAMBITS_CLOSED',
  MATCH_RESULT_SUBMITTED: 'MATCH_RESULT_SUBMITTED',
  MATCH_COMPLETED: 'MATCH_COMPLETED',
} as const

export function formatRoundLabel(roundNumber: number, total = PHASE_1_ROUNDS): string {
  return `Battle ${roundNumber}`
}

export function sanitizeGambitAmount(raw: unknown): number {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return 0
    return Math.max(0, Math.min(MAX_GAMBIT_AMOUNT, Math.trunc(raw)))
  }
  if (typeof raw === 'string') {
    const digits = raw.replace(/[^0-9]/g, '')
    if (!digits) return 0
    const parsed = Number.parseInt(digits, 10)
    if (!Number.isFinite(parsed)) return 0
    return Math.max(0, Math.min(MAX_GAMBIT_AMOUNT, parsed))
  }
  return 0
}

export function getMultiplierForResult(redVotes: number, blueVotes: number): number {
  const key = `${redVotes}-${blueVotes}`
  if (!(key in RESULT_MULTIPLIERS)) {
    throw new Error('Invalid vote distribution')
  }
  return RESULT_MULTIPLIERS[key]
}

export function getSideMultiplier(
  redVotes: number,
  blueVotes: number,
  side: 'red' | 'blue'
): number {
  return side === 'red'
    ? getMultiplierForResult(redVotes, blueVotes)
    : getMultiplierForResult(blueVotes, redVotes)
}

export function settleGambit(amount: number, multiplier: number): {
  grossReturn: number
  netChange: number
} {
  const grossReturn = Math.trunc(amount * multiplier)
  return { grossReturn, netChange: grossReturn - amount }
}

export function nextRoundNumber(existingRoundNumbers: number[]): number {
  const maxRound = existingRoundNumbers.reduce((max, n) => Math.max(max, n), 0)
  const next = maxRound + 1
  if (next > PHASE_1_ROUNDS) {
    throw new Error(`All ${PHASE_1_ROUNDS} Phase 1 rounds have already been broadcast`)
  }
  if (existingRoundNumbers.includes(next)) {
    throw new Error('This round has already been broadcast')
  }
  return next
}

export function validateBroadcastInput(input: {
  category?: string
  redTeamId?: string
  blueTeamId?: string
  redTeam?: { id: string; category: string; is_active?: boolean; role?: string }
  blueTeam?: { id: string; category: string; is_active?: boolean; role?: string }
}): { ok: true } | { ok: false; error: string } {
  if (!input.category) return { ok: false, error: 'Category is required' }
  if (!input.redTeamId) return { ok: false, error: 'Red Team is required' }
  if (!input.blueTeamId) return { ok: false, error: 'Blue Team is required' }
  if (input.redTeamId === input.blueTeamId) {
    return { ok: false, error: 'Red Team and Blue Team cannot be the same' }
  }
  if (!input.redTeam || !input.blueTeam) {
    return { ok: false, error: 'One or both teams not found' }
  }
  if (input.redTeam.id !== input.redTeamId || input.blueTeam.id !== input.blueTeamId) {
    return { ok: false, error: 'Selected teams do not match' }
  }
  if (input.redTeam.category !== input.category || input.blueTeam.category !== input.category) {
    return { ok: false, error: 'Teams must belong to the selected category' }
  }
  if (input.redTeam.is_active === false || input.blueTeam.is_active === false) {
    return { ok: false, error: 'Only valid/active teams can be selected' }
  }
  return { ok: true }
}

export function canBroadcastNewMatch(activeStatus: string | null): boolean {
  if (!activeStatus) return true
  return !ACTIVE_MATCH_STATUSES.includes(activeStatus as MatchStatus) &&
    activeStatus !== 'LIVE' &&
    activeStatus !== 'PENDING'
}

export function canLockGambit(status: string): boolean {
  return status === MATCH_STATUS.GAMBITS_OPEN || status === MATCH_STATUS.MATCH_LIVE || status === 'LIVE'
}

export function canCloseGambits(status: string): boolean {
  return status === MATCH_STATUS.GAMBITS_OPEN || status === MATCH_STATUS.MATCH_LIVE || status === 'LIVE'
}

export function canSubmitResult(status: string): boolean {
  return (
    status === MATCH_STATUS.GAMBITS_CLOSED ||
    status === MATCH_STATUS.AWAITING_JUDGE_RESULT
  )
}

export function isMatchComplete(status: string): boolean {
  return status === MATCH_STATUS.MATCH_COMPLETE || status === 'COMPLETED'
}

export type InvestorViewState =
  | 'WAITING'
  | 'LIVE_MATCH'
  | 'GAMBIT_LOCKED'
  | 'GAMBITS_CLOSED'
  | 'AWAITING_RESULT'
  | 'WAITING_FOR_NEXT_MATCH'

export function deriveInvestorView(input: {
  matchStatus: string | null
  screenState?: string | null
  hasLockedGambit: boolean
}): InvestorViewState {
  const status = input.matchStatus
  const screen = input.screenState

  if (!status || isMatchComplete(status) || status === MATCH_STATUS.WAITING_FOR_MATCH) {
    return 'WAITING'
  }
  if (screen === 'WAITING_FOR_MATCH' || screen === 'MATCH_COMPLETE') {
    return 'WAITING'
  }

  if (canLockGambit(status)) {
    return input.hasLockedGambit ? 'GAMBIT_LOCKED' : 'LIVE_MATCH'
  }

  if (
    status === MATCH_STATUS.GAMBITS_CLOSED ||
    status === MATCH_STATUS.AWAITING_JUDGE_RESULT ||
    status === MATCH_STATUS.PROCESSING_RESULT ||
    screen === 'AWAITING_RESULT' ||
    screen === 'RESULT_PROCESSING'
  ) {
    if (input.hasLockedGambit) return 'AWAITING_RESULT'
    return 'GAMBITS_CLOSED'
  }

  return 'WAITING'
}

export function toPublicMatchPayload(match: {
  id: string
  round_number: number
  category: string
  status: string
  red_team: { id: string; team_name?: string; name?: string }
  blue_team: { id: string; team_name?: string; name?: string }
}) {
  return {
    matchId: match.id,
    roundNumber: match.round_number,
    category: match.category,
    redTeam: {
      id: match.red_team.id,
      name: match.red_team.name || match.red_team.team_name || '',
    },
    blueTeam: {
      id: match.blue_team.id,
      name: match.blue_team.name || match.blue_team.team_name || '',
    },
    status: match.status,
  }
}

export type SimulatedGambit = {
  investorTeamId: string
  selectedSide: 'red' | 'blue'
  amount: number
  settled?: boolean
}

export type SimulatedMatch = {
  id: string
  roundNumber: number
  category: string
  redTeamId: string
  blueTeamId: string
  status: MatchStatus
  result?: string
  multiplier?: number
  settled?: boolean
  gambits: SimulatedGambit[]
}

export type SimulatedTeam = {
  id: string
  category: string
  is_active: boolean
  balance: number
}

export class LiveMatchEngine {
  matches: SimulatedMatch[] = []
  teams: Record<string, SimulatedTeam>
  currentMatchId: string | null = null
  isAdmin: boolean

  constructor(teams: SimulatedTeam[], options?: { isAdmin?: boolean }) {
    this.teams = Object.fromEntries(teams.map((t) => [t.id, { ...t }]))
    this.isAdmin = options?.isAdmin ?? true
  }

  broadcast(input: {
    category: string
    redTeamId: string
    blueTeamId: string
    asAdmin?: boolean
  }): SimulatedMatch {
    if (!(input.asAdmin ?? this.isAdmin)) {
      throw new Error('Unauthorized')
    }
    const red = this.teams[input.redTeamId]
    const blue = this.teams[input.blueTeamId]
    const validation = validateBroadcastInput({
      category: input.category,
      redTeamId: input.redTeamId,
      blueTeamId: input.blueTeamId,
      redTeam: red,
      blueTeam: blue,
    })
    if (!validation.ok) throw new Error(validation.error)

    const active = this.matches.find((m) => ACTIVE_MATCH_STATUSES.includes(m.status))
    if (active) throw new Error('A match is already in progress')

    const roundNumber = nextRoundNumber(this.matches.map((m) => m.roundNumber))
    const match: SimulatedMatch = {
      id: `match-${roundNumber}`,
      roundNumber,
      category: input.category,
      redTeamId: input.redTeamId,
      blueTeamId: input.blueTeamId,
      status: MATCH_STATUS.GAMBITS_OPEN,
      gambits: [],
    }
    this.matches.push(match)
    this.currentMatchId = match.id
    return match
  }

  lockGambit(input: {
    matchId: string
    investorTeamId: string
    selectedTeamId: string
    amount: unknown
  }): SimulatedGambit {
    const match = this.matches.find((m) => m.id === input.matchId)
    if (!match) throw new Error('Match not found')
    if (!canLockGambit(match.status)) throw new Error('Match is not accepting Investments')
    if (input.selectedTeamId !== match.redTeamId && input.selectedTeamId !== match.blueTeamId) {
      throw new Error('Selected team is not in this match')
    }
    // Validate raw amount before sanitizing
    const rawAmount = typeof input.amount === 'number' ? input.amount : 
      typeof input.amount === 'string' ? Number.parseInt(input.amount.replace(/[^0-9]/g, ''), 10) : NaN
    if (!Number.isFinite(rawAmount) || rawAmount < 0 || rawAmount > MAX_GAMBIT_AMOUNT) {
      throw new Error('Invalid Investment amount')
    }
    const amount = sanitizeGambitAmount(input.amount)
    if (match.gambits.some((g) => g.investorTeamId === input.investorTeamId)) {
      throw new Error('You have already placed an Investment for this match')
    }
    const team = this.teams[input.investorTeamId]
    if (!team) throw new Error('Investor team not found')
    if (amount > team.balance) throw new Error('Insufficient balance for this Investment')

    team.balance -= amount
    const gambit: SimulatedGambit = {
      investorTeamId: input.investorTeamId,
      selectedSide: input.selectedTeamId === match.redTeamId ? 'red' : 'blue',
      amount,
    }
    match.gambits.push(gambit)
    return gambit
  }

  closeGambits(matchId: string, asAdmin = this.isAdmin) {
    if (!asAdmin) throw new Error('Unauthorized')
    const match = this.requireMatch(matchId)
    if (!canCloseGambits(match.status)) throw new Error('Investments cannot be closed in the current state')
    match.status = MATCH_STATUS.GAMBITS_CLOSED
    return match
  }

  submitResult(
    matchId: string,
    redVotes: number,
    blueVotes: number,
    asAdmin = this.isAdmin
  ) {
    if (!asAdmin) throw new Error('Unauthorized')
    const match = this.requireMatch(matchId)
    if (match.settled || isMatchComplete(match.status)) {
      throw new Error('Match has already been settled')
    }
    if (!canSubmitResult(match.status)) {
      throw new Error('Investments must be closed before entering a result')
    }

    match.status = MATCH_STATUS.PROCESSING_RESULT
    const listedMultiplier = getMultiplierForResult(redVotes, blueVotes)
    match.result = `${redVotes}-${blueVotes}`
    match.multiplier = listedMultiplier

    for (const gambit of match.gambits) {
      if (gambit.settled) continue
      const multiplier = getSideMultiplier(redVotes, blueVotes, gambit.selectedSide)
      const { grossReturn } = settleGambit(gambit.amount, multiplier)
      this.teams[gambit.investorTeamId].balance += grossReturn
      gambit.settled = true
    }

    match.settled = true
    match.status = MATCH_STATUS.MATCH_COMPLETE
    this.currentMatchId = null
    return match
  }

  investorView(investorTeamId: string): InvestorViewState {
    const match = this.matches.find((m) => m.id === this.currentMatchId) || null
    const hasLocked = Boolean(match?.gambits.some((g) => g.investorTeamId === investorTeamId))
    return deriveInvestorView({
      matchStatus: match?.status ?? null,
      hasLockedGambit: hasLocked,
    })
  }

  private requireMatch(matchId: string) {
    const match = this.matches.find((m) => m.id === matchId)
    if (!match) throw new Error('Match not found')
    return match
  }
}
