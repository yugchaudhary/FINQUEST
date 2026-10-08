export const MULTIPLIER_MAP: Record<string, { winner: number; loser: number }> = {
  '5-0': { winner: 3.0, loser: 0.0 },
  '4-1': { winner: 2.2, loser: 0.5 },
  '3-2': { winner: 1.6, loser: 0.8 }
}

export const MAX_GAMBIT_AMOUNT = 250000
export const DEFAULT_STARTING_BALANCE = 1000000

export const SCORE_DISTRIBUTIONS = [
  { red: 5, blue: 0 },
  { red: 4, blue: 1 },
  { red: 3, blue: 2 },
  { red: 2, blue: 3 },
  { red: 1, blue: 4 },
  { red: 0, blue: 5 }
]

export const FINALIST_SCORE_WEIGHTS = { investor: 0.5, judges: 0.5 }

export const QUICK_AMOUNTS = [0, 50000, 100000, 150000, 200000, 250000]
export const QUICK_AMOUNT_LABELS = ['0', '50K', '1L', '1.5L', '2L', '2.5L']

export const SCORE_RANGE = { min: 1.0, max: 10.0, step: 0.5 }

export const EVENT_CHANNEL = 'founders-gambit-live'
export const PRESENCE_CHANNEL = 'founders-gambit-presence'
export const PHASE_1_ROUNDS = 10

export const CATEGORIES = [
  'LET US COOK',
  'WHAT THE FIT',
  'BON VOYAGE, BESTIE',
  'DIGITAL DISORDER',
  'CASH & CHAOS',
  'FEELING 404'
]

export const MIN_PROBLEM_SELECTIONS = 4
