'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminAction } from '@/lib/audit'
import { EVENT_CHANNEL } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { requireAdmin } from '@/lib/live-match/auth'

export interface ResetPreviewData {
  participantAccounts: number
  participantProfiles: number
  teams: number
  teamMembers: number
  allowedRegistrations: number
  matches: number
  gambits: number
  ledgerTransactions: number
  judgeResults: number
  finalRoundScores: number
  finalJudgeResults: number
  teamProblemSelections: number
  teamProblemSelectionState: number
  eventState: {
    currentPhase: string
    currentScreenState: string
    currentRound: number
    currentMatchId: string | null
    currentFinalistId: string | null
    phase1LeaderboardPublished: boolean
    finalsInitialized: boolean
    finalLeaderboardActive: boolean
  }
  preserved: {
    adminAccounts: number
    categories: number
    problemStatements: number
  }
}

export interface ResetResultData {
  resetId: string
  timestamp: string
  deletedCounts: {
    participantAccounts: number
    participantProfiles: number
    teams: number
    teamMembers: number
    allowedRegistrations: number
    matches: number
    gambits: number
    ledgerTransactions: number
    judgeResults: number
    finalScores: number
    finalJudgeResults: number
    problemSelections: number
    otherScopedRecords: number
  }
  operationalState: {
    activeMatch: string
    phase1Results: string
    finalsResults: string
    publishedLeaderboard: string
    currentPhase: string
    currentScreenState: string
  }
  verifiedClean: boolean
  preserved: {
    adminAccounts: number
    categories: number
    problemStatements: number
  }
}

/**
 * Fetch live counts of all records that will be cleared vs preserved
 */
export async function getResetPreview(): Promise<{ success: boolean; data?: ResetPreviewData; error?: string }> {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return { success: false, error: 'Unauthorized. Administrator privileges required.' }
    const { adminClient } = auth

    const [
      { count: participantAccounts },
      { count: teamsCount },
      { count: teamMembersCount },
      { count: allowedRegsCount },
      { count: matchesCount },
      { count: gambitsCount },
      { count: ledgerCount },
      { count: judgeResultsCount },
      { count: finalScoresCount },
      { count: finalJudgeResultsCount },
      { count: problemSelectionsCount },
      { count: problemSelectionStateCount },
      { data: eventStateData },
      { count: adminAccountsCount },
      { count: categoriesCount },
      { count: problemStatementsCount }
    ] = await Promise.all([
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('auth_role', 'PARTICIPANT'),
      adminClient.from('teams').select('*', { count: 'exact', head: true }),
      adminClient.from('team_members').select('*', { count: 'exact', head: true }),
      adminClient.from('allowed_registrations').select('*', { count: 'exact', head: true }),
      adminClient.from('matches').select('*', { count: 'exact', head: true }),
      adminClient.from('gambits').select('*', { count: 'exact', head: true }),
      adminClient.from('ledger_transactions').select('*', { count: 'exact', head: true }),
      adminClient.from('judge_results').select('*', { count: 'exact', head: true }),
      adminClient.from('final_round_scores').select('*', { count: 'exact', head: true }),
      adminClient.from('final_judge_results').select('*', { count: 'exact', head: true }),
      adminClient.from('team_problem_selections').select('*', { count: 'exact', head: true }),
      adminClient.from('team_problem_selection_state').select('*', { count: 'exact', head: true }),
      adminClient.from('event_state').select('*').eq('id', 1).single(),
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('auth_role', 'ADMIN'),
      adminClient.from('categories').select('*', { count: 'exact', head: true }),
      adminClient.from('problem_statements').select('*', { count: 'exact', head: true })
    ])

    return {
      success: true,
      data: {
        participantAccounts: participantAccounts || 0,
        participantProfiles: participantAccounts || 0,
        teams: teamsCount || 0,
        teamMembers: teamMembersCount || 0,
        allowedRegistrations: allowedRegsCount || 0,
        matches: matchesCount || 0,
        gambits: gambitsCount || 0,
        ledgerTransactions: ledgerCount || 0,
        judgeResults: judgeResultsCount || 0,
        finalRoundScores: finalScoresCount || 0,
        finalJudgeResults: finalJudgeResultsCount || 0,
        teamProblemSelections: problemSelectionsCount || 0,
        teamProblemSelectionState: problemSelectionStateCount || 0,
        eventState: {
          currentPhase: eventStateData?.current_phase || 'SETUP',
          currentScreenState: eventStateData?.current_screen_state || 'SETUP',
          currentRound: eventStateData?.current_round || 0,
          currentMatchId: eventStateData?.current_match_id || null,
          currentFinalistId: eventStateData?.current_finalist_id || null,
          phase1LeaderboardPublished: eventStateData?.phase_1_leaderboard_published || false,
          finalsInitialized: eventStateData?.finals_initialized || false,
          finalLeaderboardActive: eventStateData?.final_leaderboard_active || false
        },
        preserved: {
          adminAccounts: adminAccountsCount || 0,
          categories: categoriesCount || 0,
          problemStatements: problemStatementsCount || 0
        }
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch test reset preview counts' }
  }
}

/**
 * Execute a safe, complete test data reset
 */
export async function resetTestEnvironment(confirmationPhrase: string): Promise<{
  success: boolean
  data?: ResetResultData
  error?: string
  completedStages?: string[]
  failedStage?: string
}> {
  const completedStages: string[] = []
  const resetId = `RESET-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  const resetTimestamp = new Date().toISOString()

  try {
    // 1. Strict Server-side Authentication & Authorization Check
    const auth = await requireAdmin()
    if (!auth.ok) {
      return { success: false, error: 'Unauthorized. Only administrator accounts can reset test data.' }
    }
    const { adminClient, user } = auth

    // 2. Strict Confirmation Phrase Verification
    const normalizedPhrase = (confirmationPhrase || '').trim()
    if (normalizedPhrase !== 'RESET TEST DATA') {
      return {
        success: false,
        error: 'Confirmation phrase mismatch. You must type RESET TEST DATA exactly to confirm.'
      }
    }

    // 3. Pre-deletion Count Snapshot (for truthfulness and reporting)
    const [
      { count: preGambits },
      { count: preJudgeResults },
      { count: preMatches },
      { count: preLedger },
      { count: preFinalScores },
      { count: preFinalJudgeResults },
      { count: preProblemSelections },
      { count: preProblemState },
      { count: preTeamMembers },
      { count: preAllowedRegs },
      { count: preTeams },
      { count: preParticipantUsers }
    ] = await Promise.all([
      adminClient.from('gambits').select('*', { count: 'exact', head: true }),
      adminClient.from('judge_results').select('*', { count: 'exact', head: true }),
      adminClient.from('matches').select('*', { count: 'exact', head: true }),
      adminClient.from('ledger_transactions').select('*', { count: 'exact', head: true }),
      adminClient.from('final_round_scores').select('*', { count: 'exact', head: true }),
      adminClient.from('final_judge_results').select('*', { count: 'exact', head: true }),
      adminClient.from('team_problem_selections').select('*', { count: 'exact', head: true }),
      adminClient.from('team_problem_selection_state').select('*', { count: 'exact', head: true }),
      adminClient.from('team_members').select('*', { count: 'exact', head: true }),
      adminClient.from('allowed_registrations').select('*', { count: 'exact', head: true }),
      adminClient.from('teams').select('*', { count: 'exact', head: true }),
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('auth_role', 'PARTICIPANT')
    ])

    // Find all participant auth user IDs (strictly excluding any ADMIN account)
    const { data: participantUsersData, error: fetchUsersError } = await adminClient
      .from('users')
      .select('id, email, auth_role')
      .eq('auth_role', 'PARTICIPANT')

    if (fetchUsersError) {
      throw new Error(`Failed to query participant user accounts: ${fetchUsersError.message}`)
    }

    // Filter to ensure no admin is touched
    const safeParticipantUsers = (participantUsersData || []).filter(
      p => p.auth_role === 'PARTICIPANT' && p.id !== user.id
    )

    // 4. Staged Execution in Strict Foreign-Key Order

    // STAGE 1: Delete Gambits
    try {
      const { error } = await adminClient.from('gambits').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Gambits')
    } catch (err: any) {
      return { success: false, error: `Stage 1 (Gambits) failed: ${err.message}`, completedStages, failedStage: 'Gambits' }
    }

    // STAGE 2: Delete Judge Results
    try {
      const { error } = await adminClient.from('judge_results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Judge Results')
    } catch (err: any) {
      return { success: false, error: `Stage 2 (Judge Results) failed: ${err.message}`, completedStages, failedStage: 'Judge Results' }
    }

    // STAGE 3: Delete Matches
    try {
      const { error } = await adminClient.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Matches')
    } catch (err: any) {
      return { success: false, error: `Stage 3 (Matches) failed: ${err.message}`, completedStages, failedStage: 'Matches' }
    }

    // STAGE 4: Delete Ledger Transactions
    try {
      const { error } = await adminClient.from('ledger_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Ledger Transactions')
    } catch (err: any) {
      return { success: false, error: `Stage 4 (Ledger Transactions) failed: ${err.message}`, completedStages, failedStage: 'Ledger Transactions' }
    }

    // STAGE 5: Delete Phase 2 Final Round Scores
    try {
      const { error } = await adminClient.from('final_round_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Final Round Scores')
    } catch (err: any) {
      return { success: false, error: `Stage 5 (Final Round Scores) failed: ${err.message}`, completedStages, failedStage: 'Final Round Scores' }
    }

    // STAGE 6: Delete Phase 2 Final Judge Results
    try {
      const { error } = await adminClient.from('final_judge_results').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Final Judge Results')
    } catch (err: any) {
      return { success: false, error: `Stage 6 (Final Judge Results) failed: ${err.message}`, completedStages, failedStage: 'Final Judge Results' }
    }

    // STAGE 7: Delete Team Problem Selections
    try {
      const { error } = await adminClient.from('team_problem_selections').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Team Problem Selections')
    } catch (err: any) {
      return { success: false, error: `Stage 7 (Team Problem Selections) failed: ${err.message}`, completedStages, failedStage: 'Team Problem Selections' }
    }

    // STAGE 8: Delete Team Problem Selection State
    try {
      const { error } = await adminClient.from('team_problem_selection_state').delete().neq('team_id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Team Problem Selection State')
    } catch (err: any) {
      return { success: false, error: `Stage 8 (Team Problem Selection State) failed: ${err.message}`, completedStages, failedStage: 'Team Problem Selection State' }
    }

    // STAGE 9: Delete Team Members
    try {
      const { error } = await adminClient.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Team Members')
    } catch (err: any) {
      return { success: false, error: `Stage 9 (Team Members) failed: ${err.message}`, completedStages, failedStage: 'Team Members' }
    }

    // STAGE 10: Delete Allowed Registrations (Imported test participant registration numbers)
    try {
      const { error } = await adminClient.from('allowed_registrations').delete().neq('registration_number', '')
      if (error) throw error
      completedStages.push('Delete Allowed Registrations')
    } catch (err: any) {
      return { success: false, error: `Stage 10 (Allowed Registrations) failed: ${err.message}`, completedStages, failedStage: 'Allowed Registrations' }
    }

    // STAGE 11: Unlink teams from users before deleting teams
    try {
      await adminClient.from('users').update({ team_id: null }).neq('id', '00000000-0000-0000-0000-000000000000')
      completedStages.push('Unlink Teams from Users')
    } catch (err: any) {
      return { success: false, error: `Stage 11 (Unlink Teams) failed: ${err.message}`, completedStages, failedStage: 'Unlink Teams' }
    }

    // STAGE 12: Delete Teams
    try {
      const { error } = await adminClient.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      completedStages.push('Delete Teams')
    } catch (err: any) {
      return { success: false, error: `Stage 12 (Teams) failed: ${err.message}`, completedStages, failedStage: 'Teams' }
    }

    // STAGE 13: Delete Participant Auth Users from Supabase Auth & Users table
    try {
      let deletedAuthUsersCount = 0
      for (const p of safeParticipantUsers) {
        try {
          await adminClient.auth.admin.deleteUser(p.id)
          deletedAuthUsersCount++
        } catch (authErr) {
          console.warn(`Could not delete auth user ${p.id}:`, authErr)
        }
      }
      // Also delete any remaining participant rows in public.users
      await adminClient.from('users').delete().eq('auth_role', 'PARTICIPANT')
      completedStages.push(`Delete Participant Auth Users (${deletedAuthUsersCount})`)
    } catch (err: any) {
      return { success: false, error: `Stage 13 (Participant Users) failed: ${err.message}`, completedStages, failedStage: 'Participant Users' }
    }

    // STAGE 14: Reset Live Event State to Clean Initial State
    try {
      const { error: eventStateError } = await adminClient
        .from('event_state')
        .update({
          current_phase: 'SETUP',
          current_screen_state: 'SETUP',
          current_match_id: null,
          current_finalist_id: null,
          current_round: 0,
          phase_1_leaderboard_published: false,
          finals_initialized: false,
          final_leaderboard_active: false,
          updated_at: resetTimestamp
        })
        .eq('id', 1)

      if (eventStateError) throw eventStateError
      completedStages.push('Reset Event State')
    } catch (err: any) {
      return { success: false, error: `Stage 14 (Event State Reset) failed: ${err.message}`, completedStages, failedStage: 'Event State' }
    }

    // STAGE 15: Post-reset Verification
    const [
      { count: postTeams },
      { count: postMatches },
      { count: postGambits },
      { count: postLedger },
      { count: postParticipants },
      { count: postCategories },
      { count: postProblemStatements },
      { count: postAdmins }
    ] = await Promise.all([
      adminClient.from('teams').select('*', { count: 'exact', head: true }),
      adminClient.from('matches').select('*', { count: 'exact', head: true }),
      adminClient.from('gambits').select('*', { count: 'exact', head: true }),
      adminClient.from('ledger_transactions').select('*', { count: 'exact', head: true }),
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('auth_role', 'PARTICIPANT'),
      adminClient.from('categories').select('*', { count: 'exact', head: true }),
      adminClient.from('problem_statements').select('*', { count: 'exact', head: true }),
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('auth_role', 'ADMIN')
    ])

    const verifiedClean =
      (postTeams || 0) === 0 &&
      (postMatches || 0) === 0 &&
      (postGambits || 0) === 0 &&
      (postLedger || 0) === 0 &&
      (postParticipants || 0) === 0 &&
      (postCategories || 0) >= 6 &&
      (postProblemStatements || 0) >= 120 &&
      (postAdmins || 0) >= 1

    completedStages.push('Post-reset Verification')

    // STAGE 16: Administrative Audit Logging
    await logAdminAction(user.id, 'RESET_TEST_DATA', 'system', resetId, {
      resetId,
      timestamp: resetTimestamp,
      stagesCompleted: completedStages,
      deletedCounts: {
        participantAccounts: preParticipantUsers || 0,
        teams: preTeams || 0,
        teamMembers: preTeamMembers || 0,
        allowedRegistrations: preAllowedRegs || 0,
        matches: preMatches || 0,
        gambits: preGambits || 0,
        ledgerTransactions: preLedger || 0,
        judgeResults: preJudgeResults || 0,
        finalScores: preFinalScores || 0,
        finalJudgeResults: preFinalJudgeResults || 0,
        problemSelections: preProblemSelections || 0
      },
      verifiedClean
    })
    completedStages.push('Log Audit Event')

    // STAGE 17: Realtime Broadcast
    try {
      const channel = adminClient.channel(EVENT_CHANNEL)
      await channel.send({
        type: 'broadcast',
        event: 'RESET_TEST_DATA',
        payload: { resetId, timestamp: resetTimestamp }
      })
      await channel.send({
        type: 'broadcast',
        event: 'PHASE_CHANGE',
        payload: { current_screen_state: 'SETUP', current_phase: 'SETUP' }
      })
      completedStages.push('Realtime Broadcast')
    } catch (broadcastErr) {
      console.warn('Realtime broadcast warning:', broadcastErr)
    }

    // STAGE 18: Invalidate All Caches
    revalidatePath('/admin')
    revalidatePath('/admin/teams')
    revalidatePath('/admin/live-match')
    revalidatePath('/admin/phase1-finale')
    revalidatePath('/admin/finals-transition')
    revalidatePath('/admin/finals-broadcast')
    revalidatePath('/admin/finals-scoring')
    revalidatePath('/admin/categories')
    revalidatePath('/admin/investment-setup')
    revalidatePath('/admin/announcements')
    revalidatePath('/admin/setup')
    revalidatePath('/admin/reset')
    revalidatePath('/dashboard')
    revalidatePath('/')

    return {
      success: true,
      data: {
        resetId,
        timestamp: resetTimestamp,
        deletedCounts: {
          participantAccounts: preParticipantUsers || 0,
          participantProfiles: preParticipantUsers || 0,
          teams: preTeams || 0,
          teamMembers: preTeamMembers || 0,
          allowedRegistrations: preAllowedRegs || 0,
          matches: preMatches || 0,
          gambits: preGambits || 0,
          ledgerTransactions: preLedger || 0,
          judgeResults: preJudgeResults || 0,
          finalScores: preFinalScores || 0,
          finalJudgeResults: preFinalJudgeResults || 0,
          problemSelections: (preProblemSelections || 0) + (preProblemState || 0),
          otherScopedRecords: (preLedger || 0) + (preAllowedRegs || 0)
        },
        operationalState: {
          activeMatch: 'None',
          phase1Results: 'Cleared',
          finalsResults: 'Cleared',
          publishedLeaderboard: 'None',
          currentPhase: 'SETUP',
          currentScreenState: 'SETUP'
        },
        verifiedClean,
        preserved: {
          adminAccounts: postAdmins || 0,
          categories: postCategories || 0,
          problemStatements: postProblemStatements || 0
        }
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Reset failed: ${error.message}`,
      completedStages,
      failedStage: 'Unknown'
    }
  }
}
