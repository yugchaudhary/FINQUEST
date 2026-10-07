export type RealtimeEventType = 
  | 'MATCH_BROADCAST'
  | 'MATCH_BROADCASTED'
  | 'GAMBIT_LOCKED'
  | 'GAMBITS_CLOSED'
  | 'MATCH_RESULT_SUBMITTED'
  | 'MATCH_COMPLETED'
  | 'RESULT_SUBMITTED'
  | 'MATCH_RESET'
  | 'LEADERBOARD_PUBLISHED'
  | 'PHASE_CHANGE'
  | 'FINALIST_BROADCAST'
  | 'SCORE_SUBMITTED'
  | 'FINALS_SCORE_CALCULATED'
  | 'FINALS_LEADERBOARD_UPDATE'

export interface RealtimeEvent {
  type: RealtimeEventType
  payload: Record<string, any>
  timestamp: string
}
