export type TeamRole = 'INNOVATOR' | 'INVESTOR'
export type AuthRole = 'ADMIN' | 'PARTICIPANT'
export type MatchStatus =
  | 'PENDING'
  | 'LIVE'
  | 'COMPLETED'
  | 'WAITING_FOR_MATCH'
  | 'MATCH_LIVE'
  | 'GAMBITS_OPEN'
  | 'GAMBITS_CLOSED'
  | 'AWAITING_JUDGE_RESULT'
  | 'PROCESSING_RESULT'
  | 'MATCH_COMPLETE'
export type GambitStatus = 'LOCKED' | 'SETTLED'
export type EventPhase = 'SETUP' | 'PHASE_1' | 'PHASE_1_REVEAL' | 'FINALS_TRANSITION' | 'PHASE_2' | 'FINALS_LEADERBOARD'
export type ScreenState = 'SETUP' | 'WAITING_FOR_MATCH' | 'MATCH_LIVE' | 'AWAITING_RESULT' | 'RESULT_PROCESSING' | 'MATCH_COMPLETE' | 'PHASE_1_REVEAL' | 'FINALS_TRANSITION' | 'FINALS_READY' | 'FINALIST_LIVE' | 'RATINGS_OPEN' | 'RATINGS_LOCKED' | 'FINALS_SCORE_CALCULATED' | 'FINALS_LEADERBOARD'

export interface Team {
  id: string
  team_name: string
  category: string
  role: TeamRole
  balance: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  team_id: string | null
  auth_role: AuthRole
  display_name: string
  created_at: string
  updated_at: string
}

export interface EventState {
  id: string
  current_phase: EventPhase
  current_screen_state: ScreenState
  active_match_id: string | null
  active_finalist_id: string | null
  updated_at: string
  updated_by: string | null
}

export interface Match {
  id: string
  category: string
  red_team_id: string
  blue_team_id: string
  status: MatchStatus
  created_at: string
  updated_at: string
}

export interface Gambit {
  id: string
  match_id: string
  investor_team_id: string
  selected_team_id: string
  amount: number
  status: GambitStatus
  payout_amount: number | null
  created_at: string
  updated_at: string
}

export interface JudgeResult {
  id: string
  match_id: string
  red_votes: number
  blue_votes: number
  created_at: string
  created_by: string | null
}

export interface FinalRoundScore {
  id: string
  finalist_team_id: string
  investor_team_id: string
  score: number
  created_at: string
}

export interface FinalJudgeResult {
  id: string
  finalist_team_id: string
  average_score: number
  created_at: string
  created_by: string | null
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, any> | null
  created_at: string
}
