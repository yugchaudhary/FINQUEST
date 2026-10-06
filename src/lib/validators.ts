import { z } from 'zod'

export const teamImportSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  team_name: z.string().min(1, 'Team name is required')
})

export const gambitSchema = z.object({
  match_id: z.string().uuid(),
  selected_team_id: z.string().uuid(),
  amount: z.number().min(1).max(250000)
})

export const judgeResultSchema = z.object({
  match_id: z.string().uuid(),
  red_votes: z.number().min(0).max(5),
  blue_votes: z.number().min(0).max(5)
}).refine(data => data.red_votes + data.blue_votes === 5, {
  message: "Total votes must equal 5",
  path: ["blue_votes"]
})

export const investorScoreSchema = z.object({
  finalist_team_id: z.string().uuid(),
  score: z.number().min(1.0).max(10.0).step(0.5)
})

export const judgesAverageSchema = z.number().min(1.0).max(10.0)

export const matchBroadcastSchema = z.object({
  category: z.string(),
  red_team_id: z.string().uuid(),
  blue_team_id: z.string().uuid()
}).refine(data => data.red_team_id !== data.blue_team_id, {
  message: "Red and Blue teams must be different",
  path: ["blue_team_id"]
})
