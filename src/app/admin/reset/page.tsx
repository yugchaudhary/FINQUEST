'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  RotateCcw, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Database, 
  Upload, 
  Users, 
  Trophy, 
  RefreshCw,
  ArrowRight,
  Radio,
  FileSpreadsheet
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { getResetPreview, resetTestEnvironment, ResetPreviewData, ResetResultData } from '@/app/actions/reset'

export default function ResetTestDataPage() {
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<ResetPreviewData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Modals state
  const [isStep1Open, setIsStep1Open] = useState(false)
  const [isStep2Open, setIsStep2Open] = useState(false)
  const [confirmationInput, setConfirmationInput] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<ResetResultData | null>(null)

  const loadPreview = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await getResetPreview()
      if (res.success && res.data) {
        setPreview(res.data)
      } else {
        setFetchError(res.error || 'Failed to fetch database preview')
      }
    } catch (err: any) {
      setFetchError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
  }, [])

  const handleOpenStep1 = () => {
    setResetError(null)
    setIsStep1Open(true)
  }

  const handleProceedToStep2 = () => {
    setIsStep1Open(false)
    setConfirmationInput('')
    setIsStep2Open(true)
  }

  const handleExecuteReset = async () => {
    if (confirmationInput.trim() !== 'RESET TEST DATA') return

    setIsResetting(true)
    setResetError(null)
    try {
      const res = await resetTestEnvironment(confirmationInput)
      if (res.success && res.data) {
        setResetResult(res.data)
        setIsStep2Open(false)
        // Refresh preview counts in background
        loadPreview()
      } else {
        setResetError(res.error || 'Reset could not be completed. Some records may require cleanup.')
      }
    } catch (err: any) {
      setResetError(err.message || 'Server error occurred while resetting test data.')
    } finally {
      setIsResetting(false)
    }
  }

  const totalRecordsCount = preview 
    ? (preview.participantAccounts + 
       preview.teams + 
       preview.teamMembers + 
       preview.allowedRegistrations + 
       preview.matches + 
       preview.gambits + 
       preview.ledgerTransactions + 
       preview.judgeResults + 
       preview.finalRoundScores + 
       preview.finalJudgeResults + 
       preview.teamProblemSelections)
    : 0

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
          <span>System Management</span>
          <span>→</span>
          <span className="text-accent-dark font-black">Reset Test Data</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-space-grotesk font-black text-foreground flex items-center gap-3">
          <RotateCcw className="w-8 h-8 text-red-500 animate-wiggle" />
          Reset Test Environment
        </h1>
        <p className="text-slate-600 mt-2 font-medium max-w-3xl">
          Remove data created during testing so you can import new participants and run the event again from the beginning.
        </p>
      </div>

      {/* Completion Banner */}
      {resetResult && (
        <Card className="border-2 border-black bg-green-50 shadow-[6px_6px_0px_0px_rgba(34,197,94,1)]">
          <CardHeader className="pb-3 border-b-2 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
                <div>
                  <CardTitle className="text-xl text-green-950 font-black">
                    TEST DATA RESET COMPLETE
                  </CardTitle>
                  <p className="text-xs text-green-800 font-mono mt-0.5">
                    Operation ID: {resetResult.resetId} · {new Date(resetResult.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge variant="complete" className="bg-green-200 text-green-900 border-black">
                Verified Clean
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm font-bold text-green-900">
              Your test environment is ready for a fresh participant import.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Participants Deleted</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.participantAccounts}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Teams Deleted</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.teams}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Team Members Deleted</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.teamMembers}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Investments / Ledger</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.ledgerTransactions}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Phase 1 Matches & Gambits</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.matches + resetResult.deletedCounts.gambits}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Phase 2 Scores & Results</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.finalScores + resetResult.deletedCounts.finalJudgeResults}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Registrations Cleared</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.allowedRegistrations}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border-2 border-black">
                <span className="text-xs text-slate-500 block">Problem Selections</span>
                <span className="text-xl font-mono font-black text-black">
                  {resetResult.deletedCounts.problemSelections}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-black space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">New Operational State</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <div>Active Match: <span className="font-bold text-green-700">{resetResult.operationalState.activeMatch}</span></div>
                <div>Phase 1 Results: <span className="font-bold text-green-700">{resetResult.operationalState.phase1Results}</span></div>
                <div>Finals Results: <span className="font-bold text-green-700">{resetResult.operationalState.finalsResults}</span></div>
                <div>Published Leaderboard: <span className="font-bold text-green-700">{resetResult.operationalState.publishedLeaderboard}</span></div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/admin/setup">
                <Button variant="default" size="sm" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Import New Participants
                </Button>
              </Link>
              <Link href="/admin/teams">
                <Button variant="outline" size="sm" className="gap-2">
                  <Users className="w-4 h-4" />
                  View Teams Directory
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setResetResult(null)}
                className="text-slate-600 hover:text-black ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Notice Card */}
      <Card variant="red" className="border-2 border-black bg-red-50/50">
        <CardContent className="p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h3 className="font-black text-red-950 uppercase tracking-wide">
              Important: Scope of Reset
            </h3>
            <p className="text-red-900 leading-relaxed font-medium">
              This feature is strictly scoped to <strong>participant-generated test data</strong> and <strong>event-run operational state</strong>.
              It permanently clears test teams, login accounts, matches, and scores so you can start a clean trial.
            </p>
            <p className="text-red-900 text-xs font-bold pt-1">
              ✓ Administrator accounts, categories, official problem statements, and system code are NEVER deleted.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Data to be cleared vs Preserved */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Current Test Data Summary Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-black">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-xl font-space-grotesk font-black">
                  Current Test Records
                </CardTitle>
                <p className="text-xs text-slate-500 font-medium">
                  Actual live records currently in the database eligible for cleanup.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadPreview}
                disabled={loading}
                className="text-slate-600 hover:text-black gap-1.5"
                title="Refresh live counts"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loading && !preview ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <LoadingSpinner size="lg" />
                  <span className="text-sm font-medium text-slate-600">Querying live database records...</span>
                </div>
              ) : fetchError ? (
                <div className="p-6 text-center space-y-3">
                  <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="text-sm font-bold text-red-600">{fetchError}</p>
                  <Button variant="outline" size="sm" onClick={loadPreview}>Retry</Button>
                </div>
              ) : (
                <div className="divide-y-2 divide-black/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-2 text-xs uppercase font-black tracking-wider text-slate-700 border-b-2 border-black">
                      <tr>
                        <th className="py-3 px-6">Record Type</th>
                        <th className="py-3 px-6">Scope / Details</th>
                        <th className="py-3 px-6 text-right">Records to Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Participant Login Accounts
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Auth identities & participant user profiles
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.participantAccounts ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Teams & Registrations
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Test teams, roles, categories, and join codes
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.teams ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Team Members
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Individual team member participant entries
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.teamMembers ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Imported Registration Numbers
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Pre-uploaded Excel allowed registration list
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.allowedRegistrations ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Phase 1 Matches & Rounds
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Broadcast matches, Red/Blue matchups
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.matches ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Gambit Investment Submissions
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Locked and settled investor bets
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.gambits ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Investment Transactions & Ledger
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Capital deductions, returns, financial ledger
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.ledgerTransactions ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Phase 1 Results & Judge Votes
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          5-judge vote splits, multipliers, and results
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {preview?.judgeResults ?? 0}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Phase 2 Finalist Ratings & Scores
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Investor score submissions & judge averages
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {(preview?.finalRoundScores ?? 0) + (preview?.finalJudgeResults ?? 0)}
                        </td>
                      </tr>

                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          Team Problem Selections
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-500">
                          Selections & progress states created by teams
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-black text-base">
                          {(preview?.teamProblemSelections ?? 0) + (preview?.teamProblemSelectionState ?? 0)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-surface-2 font-black border-t-2 border-black">
                      <tr>
                        <td colSpan={2} className="py-3 px-6 uppercase tracking-wider text-xs">
                          Total Test-Generated Records
                        </td>
                        <td className="py-3 px-6 text-right font-mono text-lg text-red-600">
                          {totalRecordsCount}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-6 bg-surface-2/40 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 font-medium">
                {totalRecordsCount === 0 ? (
                  <span className="text-green-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Environment is already completely clean.
                  </span>
                ) : (
                  <span>
                    Ready to clear <strong>{totalRecordsCount}</strong> test records. Requires two-step confirmation.
                  </span>
                )}
              </div>

              <Button
                variant="destructive"
                size="lg"
                onClick={handleOpenStep1}
                disabled={loading}
                className="w-full sm:w-auto font-black uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                [ RESET TEST DATA ]
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Preserved Data & Current Event Run State */}
        <div className="space-y-6">
          {/* Permanent Data Card */}
          <Card className="border-2 border-black bg-white">
            <CardHeader className="pb-3 border-b-2 border-black/10">
              <div className="flex items-center gap-2 text-green-700">
                <ShieldCheck className="w-6 h-6" />
                <CardTitle className="text-lg font-space-grotesk font-black text-foreground">
                  Permanently Preserved
                </CardTitle>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Protected system assets that will never be touched by the reset.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-sm font-medium">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-700">Administrator Accounts</span>
                <Badge variant="default" className="font-mono bg-green-100 text-green-800 border-green-300">
                  {preview?.preserved.adminAccounts ?? 'Active'} Kept
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-700">Official Categories</span>
                <Badge variant="default" className="font-mono bg-green-100 text-green-800 border-green-300">
                  {preview?.preserved.categories ?? 6} Categories
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-700">Problem Statement Bank</span>
                <Badge variant="default" className="font-mono bg-green-100 text-green-800 border-green-300">
                  {preview?.preserved.problemStatements ?? 120} Problems
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-700">Multiplier Logic & Rules</span>
                <Badge variant="default" className="font-mono bg-slate-100 text-slate-700">
                  Protected
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">Admin Audit History</span>
                <Badge variant="default" className="font-mono bg-slate-100 text-slate-700">
                  Retained
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Current Event State Card */}
          <Card className="border-2 border-black bg-surface">
            <CardHeader className="pb-3 border-b-2 border-black/10">
              <div className="flex items-center gap-2 text-accent-dark">
                <Radio className="w-5 h-5 text-accent-dark animate-pulse" />
                <CardTitle className="text-lg font-space-grotesk font-black text-foreground">
                  Current Event State
                </CardTitle>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Live run state restored to initial setup on reset.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">Current Phase:</span>
                <Badge variant="default" className="border-black font-black">
                  {preview?.eventState.currentPhase || 'SETUP'}
                </Badge>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">Screen State:</span>
                <span className="font-bold text-foreground">
                  {preview?.eventState.currentScreenState || 'SETUP'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">Current Round:</span>
                <span className="font-bold text-foreground">
                  Round {preview?.eventState.currentRound || 0}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">Phase 1 Leaderboard:</span>
                <span className={preview?.eventState.phase1LeaderboardPublished ? 'text-green-600 font-bold' : 'text-slate-500'}>
                  {preview?.eventState.phase1LeaderboardPublished ? 'Published' : 'Unpublished'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Finals Leaderboard:</span>
                <span className={preview?.eventState.finalLeaderboardActive ? 'text-green-600 font-bold' : 'text-slate-500'}>
                  {preview?.eventState.finalLeaderboardActive ? 'Active' : 'Unpublished'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* STEP 1: PREVIEW CONFIRMATION MODAL */}
      <Modal
        isOpen={isStep1Open}
        onClose={() => setIsStep1Open(false)}
        title="RESET TEST ENVIRONMENT?"
        description="This action will permanently delete participant accounts, teams, investment records, Phase 1 results, Phase 2 scores, and associated test-run data."
      >
        <div className="space-y-4 pt-2">
          {/* Summary Box */}
          <div className="bg-red-50 border-2 border-black p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-red-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Summary of records to be cleared:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div>Participant accounts: <strong>{preview?.participantAccounts ?? 0}</strong></div>
              <div>Teams: <strong>{preview?.teams ?? 0}</strong></div>
              <div>Team members: <strong>{preview?.teamMembers ?? 0}</strong></div>
              <div>Matches & rounds: <strong>{preview?.matches ?? 0}</strong></div>
              <div>Investment records: <strong>{preview?.ledgerTransactions ?? 0}</strong></div>
              <div>Phase 1 results: <strong>{preview?.judgeResults ?? 0}</strong></div>
              <div>Phase 2 scores: <strong>{(preview?.finalRoundScores ?? 0) + (preview?.finalJudgeResults ?? 0)}</strong></div>
              <div>Registrations: <strong>{preview?.allowedRegistrations ?? 0}</strong></div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-600 p-3.5 rounded-xl text-xs text-green-950 leading-relaxed font-medium">
            <strong>Preservation Guarantee:</strong> Administrator accounts, event configuration, categories, problem statements, application code, and website functionality will be preserved.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-black/10">
            <Button
              variant="outline"
              onClick={() => setIsStep1Open(false)}
              className="border-2 border-black"
            >
              [ CANCEL ]
            </Button>
            <Button
              variant="destructive"
              onClick={handleProceedToStep2}
              className="border-2 border-black font-black uppercase"
            >
              [ CONTINUE TO CONFIRMATION ]
            </Button>
          </div>
        </div>
      </Modal>

      {/* STEP 2: EXPLICIT CONFIRMATION MODAL */}
      <Modal
        isOpen={isStep2Open}
        onClose={() => !isResetting && setIsStep2Open(false)}
        title="CONFIRM PERMANENT RESET"
        description="This action cannot be undone. Export or back up any data you need before proceeding."
      >
        <div className="space-y-5 pt-2">
          {resetError && (
            <div className="bg-red-100 border-2 border-red-600 p-3 rounded-lg text-xs font-bold text-red-900 flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-700" />
              <span>{resetError}</span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              To confirm, type <strong className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-black font-black select-all">RESET TEST DATA</strong> in the field below:
            </p>
            <Input
              type="text"
              placeholder="Type RESET TEST DATA"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              disabled={isResetting}
              className="font-mono font-bold text-base border-2 border-black bg-white"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-black/10">
            <Button
              variant="outline"
              onClick={() => setIsStep2Open(false)}
              disabled={isResetting}
              className="border-2 border-black"
            >
              [ CANCEL ]
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteReset}
              disabled={confirmationInput.trim() !== 'RESET TEST DATA' || isResetting}
              isLoading={isResetting}
              className="border-2 border-black font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40"
            >
              [ PERMANENTLY RESET TEST DATA ]
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
