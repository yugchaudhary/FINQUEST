-- 011_reset_test_data.sql
-- Function to safely reset all test-generated event data while strictly preserving
-- categories, problem statements, admin accounts, and system configuration.

CREATE OR REPLACE FUNCTION reset_test_data_tables()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gambits_deleted INT;
  v_results_deleted INT;
  v_matches_deleted INT;
  v_ledger_deleted INT;
  v_final_scores_deleted INT;
  v_final_results_deleted INT;
  v_problem_selections_deleted INT;
  v_problem_state_deleted INT;
  v_team_members_deleted INT;
  v_allowed_regs_deleted INT;
  v_teams_deleted INT;
  v_participants_deleted INT;
BEGIN
  -- 1. Gambits
  DELETE FROM gambits;
  GET DIAGNOSTICS v_gambits_deleted = ROW_COUNT;

  -- 2. Judge results
  DELETE FROM judge_results;
  GET DIAGNOSTICS v_results_deleted = ROW_COUNT;

  -- 3. Matches
  DELETE FROM matches;
  GET DIAGNOSTICS v_matches_deleted = ROW_COUNT;

  -- 4. Ledger transactions
  DELETE FROM ledger_transactions;
  GET DIAGNOSTICS v_ledger_deleted = ROW_COUNT;

  -- 5. Final round scores
  DELETE FROM final_round_scores;
  GET DIAGNOSTICS v_final_scores_deleted = ROW_COUNT;

  -- 6. Final judge results
  DELETE FROM final_judge_results;
  GET DIAGNOSTICS v_final_results_deleted = ROW_COUNT;

  -- 7. Team problem selections
  DELETE FROM team_problem_selections;
  GET DIAGNOSTICS v_problem_selections_deleted = ROW_COUNT;

  -- 8. Team problem selection state
  DELETE FROM team_problem_selection_state;
  GET DIAGNOSTICS v_problem_state_deleted = ROW_COUNT;

  -- 9. Team members
  DELETE FROM team_members;
  GET DIAGNOSTICS v_team_members_deleted = ROW_COUNT;

  -- 10. Allowed registrations (imported test participant codes)
  DELETE FROM allowed_registrations;
  GET DIAGNOSTICS v_allowed_regs_deleted = ROW_COUNT;

  -- 11. Unlink users from teams
  UPDATE users SET team_id = NULL WHERE auth_role = 'PARTICIPANT';

  -- 12. Delete teams
  DELETE FROM teams;
  GET DIAGNOSTICS v_teams_deleted = ROW_COUNT;

  -- 13. Reset event_state singleton to initial state
  UPDATE event_state SET
    current_phase = 'SETUP',
    current_screen_state = 'SETUP',
    current_match_id = NULL,
    current_finalist_id = NULL,
    current_round = 0,
    phase_1_leaderboard_published = FALSE,
    finals_initialized = FALSE,
    final_leaderboard_active = FALSE,
    updated_at = NOW()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'status', 'success',
    'gambits_deleted', v_gambits_deleted,
    'matches_deleted', v_matches_deleted,
    'judge_results_deleted', v_results_deleted,
    'ledger_deleted', v_ledger_deleted,
    'final_scores_deleted', v_final_scores_deleted,
    'final_results_deleted', v_final_results_deleted,
    'problem_selections_deleted', v_problem_selections_deleted,
    'team_members_deleted', v_team_members_deleted,
    'allowed_regs_deleted', v_allowed_regs_deleted,
    'teams_deleted', v_teams_deleted
  );
END;
$$;
