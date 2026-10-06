import type { ScreenState } from '@/types/database'

export const VALID_TRANSITIONS: Record<ScreenState, ScreenState[]> = {
  SETUP: ['WAITING_FOR_MATCH', 'PHASE_1_REVEAL', 'FINALS_TRANSITION'],
  WAITING_FOR_MATCH: ['MATCH_LIVE', 'PHASE_1_REVEAL'],
  MATCH_LIVE: ['AWAITING_RESULT', 'MATCH_COMPLETE'],
  AWAITING_RESULT: ['RESULT_PROCESSING', 'WAITING_FOR_MATCH'],
  RESULT_PROCESSING: ['MATCH_COMPLETE'],
  MATCH_COMPLETE: ['WAITING_FOR_MATCH', 'PHASE_1_REVEAL'],
  PHASE_1_REVEAL: ['WAITING_FOR_MATCH', 'FINALS_TRANSITION'],
  FINALS_TRANSITION: ['FINALS_READY'],
  FINALS_READY: ['FINALIST_LIVE'],
  FINALIST_LIVE: ['RATINGS_OPEN'],
  RATINGS_OPEN: ['RATINGS_LOCKED'],
  RATINGS_LOCKED: ['FINALS_SCORE_CALCULATED'],
  FINALS_SCORE_CALCULATED: ['FINALS_READY', 'FINALS_LEADERBOARD'],
  FINALS_LEADERBOARD: []
}

export function validateTransition(from: ScreenState, to: ScreenState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getParticipantView(state: ScreenState): string {
  switch (state) {
    case 'SETUP': return 'WAITING'
    case 'WAITING_FOR_MATCH': return 'WAITING'
    case 'MATCH_LIVE': return 'GAMBIT_ENTRY'
    case 'AWAITING_RESULT': return 'WAITING'
    case 'RESULT_PROCESSING': return 'WAITING'
    case 'MATCH_COMPLETE': return 'WAITING'
    case 'PHASE_1_REVEAL': return 'LEADERBOARD'
    case 'FINALS_TRANSITION': return 'WAITING'
    case 'FINALS_READY': return 'WAITING'
    case 'FINALIST_LIVE': return 'PITCH_VIEW'
    case 'RATINGS_OPEN': return 'RATING_ENTRY'
    case 'RATINGS_LOCKED': return 'WAITING'
    case 'FINALS_SCORE_CALCULATED': return 'WAITING'
    case 'FINALS_LEADERBOARD': return 'FINALS_LEADERBOARD'
    default: return 'WAITING'
  }
}

export function isPhase1State(state: ScreenState): boolean {
  const phase1States: ScreenState[] = [
    'SETUP',
    'WAITING_FOR_MATCH',
    'MATCH_LIVE',
    'AWAITING_RESULT',
    'RESULT_PROCESSING',
    'MATCH_COMPLETE',
    'PHASE_1_REVEAL'
  ]
  return phase1States.includes(state)
}

export function isPhase2State(state: ScreenState): boolean {
  const phase2States: ScreenState[] = [
    'FINALS_TRANSITION',
    'FINALS_READY',
    'FINALIST_LIVE',
    'RATINGS_OPEN',
    'RATINGS_LOCKED',
    'FINALS_SCORE_CALCULATED',
    'FINALS_LEADERBOARD'
  ]
  return phase2States.includes(state)
}

export function canPlaceGambit(state: ScreenState): boolean {
  return state === 'MATCH_LIVE'
}

export function canSubmitRating(state: ScreenState): boolean {
  return state === 'RATINGS_OPEN'
}
