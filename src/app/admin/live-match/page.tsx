'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { broadcastMatch, getCurrentMatch } from '@/app/actions/matches';
import { submitMatchResult, endMatch, addInvestorBalance } from '@/app/actions/settlement';
import { getTeams } from '@/app/actions/teams';
import { getPhase1Leaderboard, publishPhase1Leaderboard } from '@/app/actions/leaderboard';
import { SCORE_DISTRIBUTIONS } from '@/lib/constants';
import { Trophy, DollarSign, Swords, CheckCircle2, XCircle, ChevronRight, Users, Loader2 } from 'lucide-react';

type Phase = 'setup' | 'live' | 'result_entered' | 'leaderboard_preview';

export default function LiveMatchPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [currentMatch, setCurrentMatch] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Setup
  const [selectedCategory, setSelectedCategory] = useState('');
  const [redTeamId, setRedTeamId] = useState('');
  const [blueTeamId, setBlueTeamId] = useState('');

  // Result
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState('');
  const [settlementResult, setSettlementResult] = useState<any>(null);

  // Investor balance modal
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('250000');

  // Publish leaderboard
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Loading/error states
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEndingMatch, setIsEndingMatch] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [matchRes, teamsRes] = await Promise.all([
      getCurrentMatch(),
      getTeams(),
    ]);
    if (matchRes?.success && matchRes.data) {
      setCurrentMatch(matchRes.data);
      if (matchRes.data.status === 'LIVE') setPhase('live');
      else if (matchRes.data.status === 'COMPLETED' && !settlementResult) setPhase('result_entered');
    } else {
      setCurrentMatch(null);
    }
    if (teamsRes?.success && teamsRes.data) setAllTeams(teamsRes.data);
  }, [settlementResult]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Derived options
  const categoryOptions = Array.from(new Set(allTeams.map(t => t.category))).filter(Boolean);
  const filteredTeams = allTeams.filter(
    t => t.is_active && (!selectedCategory || t.category === selectedCategory)
  );

  const handleBroadcast = async () => {
    setError(null);
    if (!selectedCategory) return setError('Select a category first.');
    if (!redTeamId || !blueTeamId) return setError('Select both teams.');
    if (redTeamId === blueTeamId) return setError('Red and Blue teams must be different.');
    setIsBroadcasting(true);
    const result = await broadcastMatch({ category: selectedCategory, red_team_id: redTeamId, blue_team_id: blueTeamId });
    if (result?.success) {
      await fetchAll();
      setPhase('live');
    } else {
      setError(result?.error || 'Failed to broadcast');
    }
    setIsBroadcasting(false);
  };

  const handleSubmitResult = async () => {
    if (!selectedScore || !currentMatch) return;
    const [redVotes, blueVotes] = selectedScore.split('-').map(Number);
    setIsSubmitting(true);
    setError(null);
    const result = await submitMatchResult({ match_id: currentMatch.id, red_votes: redVotes, blue_votes: blueVotes });
    if (result?.success) {
      setSettlementResult(result.data);
      setIsResultModalOpen(false);
      setPhase('result_entered');
      await fetchAll();
      showSuccess('Result submitted! Bets settled automatically.');
    } else {
      setError(result?.error || 'Settlement failed');
    }
    setIsSubmitting(false);
  };

  const handleGrantBalance = async () => {
    const amount = parseInt(balanceAmount);
    if (!amount || amount <= 0) return setError('Enter a valid amount');
    setIsGranting(true);
    setError(null);
    const result = await addInvestorBalance(amount);
    if (result?.success) {
      setIsBalanceModalOpen(false);
      showSuccess(`₹${amount.toLocaleString('en-IN')} granted to ${result.count} investor teams!`);
    } else {
      setError(result?.error || 'Failed to grant balance');
    }
    setIsGranting(false);
  };

  const handleEndMatch = async () => {
    setIsEndingMatch(true);
    const result = await endMatch();
    if (result?.success) {
      setPhase('setup');
      setCurrentMatch(null);
      setSettlementResult(null);
      setSelectedScore('');
      setRedTeamId('');
      setBlueTeamId('');
      showSuccess('Match ended. Ready for next match.');
    } else {
      setError(result?.error || 'Failed to end match');
    }
    setIsEndingMatch(false);
  };

  const handleLoadLeaderboard = async () => {
    const result = await getPhase1Leaderboard();
    if (result?.success) {
      setLeaderboard(result.data || []);
      setPhase('leaderboard_preview');
    }
  };

  const handlePublishLeaderboard = async () => {
    setIsPublishing(true);
    const result = await publishPhase1Leaderboard();
    if (result?.success) {
      setIsPublishModalOpen(false);
      showSuccess('Leaderboard published! All participant screens updated.');
    } else {
      setError(result?.error || 'Failed to publish');
    }
    setIsPublishing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-space-grotesk font-bold">Live Match Control</h1>
        <div className="flex items-center gap-2">
          {['setup', 'live', 'result_entered', 'leaderboard_preview'].map((p, i) => (
            <React.Fragment key={p}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${phase === p ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'text-gray-500 border-white/10'}`}>
                {p === 'setup' && <Swords className="w-3 h-3" />}
                {p === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />}
                {p === 'result_entered' && <CheckCircle2 className="w-3 h-3" />}
                {p === 'leaderboard_preview' && <Trophy className="w-3 h-3" />}
                {p.replace('_', ' ').toUpperCase()}
              </div>
              {i < 3 && <ChevronRight className="w-3 h-3 text-gray-600" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {/* ─── PHASE: SETUP ─── */}
      {phase === 'setup' && (
        <Card variant="glass" className="p-6 space-y-6">
          <h2 className="text-xl font-bold">Setup Next Match</h2>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Match Category</label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.length === 0 ? (
                <p className="text-gray-500 text-sm">No teams registered yet. Register teams first.</p>
              ) : categoryOptions.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setRedTeamId(''); setBlueTeamId(''); }}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${selectedCategory === cat ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:border-purple-500/50'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Team Selectors */}
          {selectedCategory && (
            <div className="grid grid-cols-2 gap-6">
              {/* Red Corner */}
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">🔴 Red Corner</div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredTeams.length === 0 && <p className="text-gray-500 text-sm">No teams in this category</p>}
                  {filteredTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setRedTeamId(team.id)}
                      disabled={blueTeamId === team.id}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${redTeamId === team.id ? 'bg-red-500/30 border border-red-500/50 text-white font-semibold' : 'bg-white/5 border border-white/5 text-gray-300 hover:border-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                    >
                      <div className="font-medium">{team.team_name}</div>
                      <div className="text-xs text-gray-500">{team.role}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Blue Corner */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">🔵 Blue Corner</div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {filteredTeams.length === 0 && <p className="text-gray-500 text-sm">No teams in this category</p>}
                  {filteredTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setBlueTeamId(team.id)}
                      disabled={redTeamId === team.id}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${blueTeamId === team.id ? 'bg-blue-500/30 border border-blue-500/50 text-white font-semibold' : 'bg-white/5 border border-white/5 text-gray-300 hover:border-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                    >
                      <div className="font-medium">{team.team_name}</div>
                      <div className="text-xs text-gray-500">{team.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700 h-12 text-base font-bold"
              onClick={handleBroadcast}
              disabled={isBroadcasting || !redTeamId || !blueTeamId}
            >
              {isBroadcasting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Starting Match...</> : '▶️ START MATCH'}
            </Button>
            <Button
              variant="outline"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => setIsBalanceModalOpen(true)}
            >
              <DollarSign className="w-4 h-4 mr-1" /> Grant Investor Funds
            </Button>
          </div>
        </Card>
      )}

      {/* ─── PHASE: LIVE ─── */}
      {phase === 'live' && currentMatch && (
        <div className="space-y-4">
          <div className="text-center bg-[#16161f] p-8 rounded-xl border border-red-500/30">
            <div className="text-red-400 font-bold animate-pulse mb-1 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> MATCH LIVE
            </div>
            <div className="text-gray-400 mb-6">Round {currentMatch.round_number} · {currentMatch.category}</div>
            <div className="flex justify-center items-center gap-8 mb-8">
              <div className="w-64 p-6 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="text-2xl font-black text-white">{currentMatch.red_team?.team_name}</div>
                <div className="text-xs text-red-400 mt-1 uppercase tracking-widest">Red</div>
              </div>
              <div className="text-3xl font-bold text-gray-500">VS</div>
              <div className="w-64 p-6 text-center bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="text-2xl font-black text-white">{currentMatch.blue_team?.team_name}</div>
                <div className="text-xs text-blue-400 mt-1 uppercase tracking-widest">Blue</div>
              </div>
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsResultModalOpen(true)}>
                📊 Enter Match Result
              </Button>
              <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => setIsBalanceModalOpen(true)}>
                <DollarSign className="w-4 h-4 mr-1" /> Grant Investor Funds
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PHASE: RESULT ENTERED ─── */}
      {phase === 'result_entered' && (
        <Card variant="glass" className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
            <div>
              <h2 className="text-xl font-bold text-green-400">Result Submitted & Bets Settled!</h2>
              <p className="text-sm text-gray-400">All investor balances have been automatically updated.</p>
            </div>
          </div>

          {settlementResult && (
            <div className="bg-black/20 rounded-lg p-4 text-sm">
              <pre className="text-gray-400 text-xs overflow-x-auto">{JSON.stringify(settlementResult, null, 2)}</pre>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Button
              className="bg-purple-600 hover:bg-purple-700 h-12 font-bold"
              onClick={handleEndMatch}
              disabled={isEndingMatch}
            >
              {isEndingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ End Match & Next'}
            </Button>
            <Button
              variant="outline"
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 h-12"
              onClick={handleLoadLeaderboard}
            >
              <Trophy className="w-4 h-4 mr-2" /> Preview Leaderboard
            </Button>
            <Button
              variant="outline"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-12"
              onClick={() => setIsBalanceModalOpen(true)}
            >
              <DollarSign className="w-4 h-4 mr-1" /> Grant Investor Funds
            </Button>
          </div>
        </Card>
      )}

      {/* ─── PHASE: LEADERBOARD PREVIEW ─── */}
      {phase === 'leaderboard_preview' && (
        <Card variant="glass" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Investor Leaderboard Preview</h2>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPhase('result_entered')}>← Back</Button>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={() => setIsPublishModalOpen(true)}>
                🚀 Publish to All Participants
              </Button>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {leaderboard.map((entry: any) => (
              <div key={entry.team_id} className="flex items-center gap-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' : entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' : entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-500'}`}>
                  {entry.rank}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{entry.team_name}</div>
                  <div className="text-xs text-gray-500">{entry.category}</div>
                </div>
                <div className={`font-mono font-bold text-sm ${entry.net_profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.net_profit_loss >= 0 ? '+' : ''}₹{Math.abs(entry.net_profit_loss).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── RESULT MODAL ─── */}
      <Modal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title="Enter Match Result">
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-4">Select the judges&apos; vote distribution for this match:</p>
          {Object.entries(SCORE_DISTRIBUTIONS).map(([key, dist]: [string, any]) => (
            <label
              key={key}
              className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${selectedScore === key ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}
            >
              <input type="radio" name="score" value={key} checked={selectedScore === key} onChange={e => setSelectedScore(e.target.value)} className="hidden" />
              <div className="flex-1 flex justify-between">
                <span className={`font-bold ${selectedScore === key ? 'text-red-400' : 'text-gray-300'}`}>🔴 {dist.red} votes</span>
                <span className={`font-bold ${selectedScore === key ? 'text-blue-400' : 'text-gray-300'}`}>🔵 {dist.blue} votes</span>
              </div>
            </label>
          ))}
          <Button
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 h-12 font-bold"
            onClick={handleSubmitResult}
            disabled={!selectedScore || isSubmitting}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Settling bets...</> : 'Confirm Result & Settle Bets'}
          </Button>
        </div>
      </Modal>

      {/* ─── GRANT BALANCE MODAL ─── */}
      <Modal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} title="Grant Funds to All Investors">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Enter the amount to add to each active Investor team&apos;s balance.</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Amount per team (₹)</label>
            <input
              type="number"
              value={balanceAmount}
              onChange={e => setBalanceAmount(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="250000"
            />
            <p className="text-xs text-gray-500 mt-1">Default: ₹2,50,000</p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            className="w-full bg-green-600 hover:bg-green-700 h-11 font-bold"
            onClick={handleGrantBalance}
            disabled={isGranting}
          >
            {isGranting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Granting...</> : <><DollarSign className="w-4 h-4 mr-2" />Grant ₹{parseInt(balanceAmount || '0').toLocaleString('en-IN')} to All Investors</>}
          </Button>
        </div>
      </Modal>

      {/* ─── PUBLISH LEADERBOARD MODAL ─── */}
      <Modal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} title="Publish Leaderboard">
        <div className="space-y-4">
          <p className="text-gray-300">This will <strong>immediately update every participant&apos;s screen</strong> to show the final leaderboard. This cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsPublishModalOpen(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              onClick={handlePublishLeaderboard}
              disabled={isPublishing}
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : '🚀 Publish Now'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
