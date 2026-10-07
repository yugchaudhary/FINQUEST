'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Modal } from '@/components/ui/modal';
import { broadcastMatch, getCurrentMatch } from '@/app/actions/matches';
import { submitMatchResult, resetToWaiting } from '@/app/actions/settlement';
import { getTeams } from '@/app/actions/teams';
import { SCORE_DISTRIBUTIONS } from '@/lib/constants';

export default function LiveMatchPage() {
  const [currentMatch, setCurrentMatch] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState('');
  
  // Setup state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [redTeamId, setRedTeamId] = useState('');
  const [blueTeamId, setBlueTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    fetchCurrentMatch();
    fetchAllTeams();
  }, []);
  
  const fetchCurrentMatch = async () => {
    const response = await getCurrentMatch();
    if (response?.success && response.data) {
      setCurrentMatch(response.data);
    } else {
      setCurrentMatch(null);
    }
  };

  const fetchAllTeams = async () => {
    const response = await getTeams();
    if (response?.success && response.data) {
      setAllTeams(response.data);
    }
  };
  
  const handleBroadcast = async () => {
    setError(null);
    if (!selectedCategory) {
      setError('Please select a category first.');
      return;
    }
    if (!redTeamId || !blueTeamId) {
      setError('Please select both Red and Blue teams.');
      return;
    }
    if (redTeamId === blueTeamId) {
      setError('Red and Blue teams must be different.');
      return;
    }

    setIsBroadcasting(true);
    const result = await broadcastMatch({ 
      category: selectedCategory, 
      red_team_id: redTeamId, 
      blue_team_id: blueTeamId 
    });

    if (result?.success) {
      await fetchCurrentMatch();
      setRedTeamId('');
      setBlueTeamId('');
    } else {
      setError(result?.error || 'Failed to broadcast match');
    }
    setIsBroadcasting(false);
  };
  
  const handleSubmitResult = async () => {
    if (!selectedScore) return;
    const [redVotes, blueVotes] = selectedScore.split('-').map(Number);
    
    await submitMatchResult({ 
      match_id: currentMatch?.id, 
      red_votes: redVotes, 
      blue_votes: blueVotes 
    });
    
    setIsResultModalOpen(false);
    setSelectedScore('');
    fetchCurrentMatch();
  };

  const handleReset = async () => {
    await resetToWaiting();
    fetchCurrentMatch();
  };

  // Derive options
  const categoryOptions = Array.from(new Set(allTeams.map(t => t.category)))
    .filter(Boolean)
    .map(c => ({ label: c, value: c }));

  const availableTeams = allTeams
    .filter(t => t.role === 'INNOVATOR' && t.is_active && (!selectedCategory || t.category === selectedCategory))
    .map(t => ({ label: `${t.team_name} (${t.category})`, value: t.id }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-space-grotesk font-bold">Live Match Control</h1>
        <StatusIndicator 
          status={currentMatch ? 'live' : 'pending'} 
          label={currentMatch ? 'Match in Progress' : 'Waiting for Match'} 
        />
      </div>

      {!currentMatch ? (
        <Card variant="glass" className="p-6 space-y-4">
          <h2 className="text-xl font-bold mb-4">Setup Next Match</h2>
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="max-w-md mb-6">
            <Select 
              label="Select Match Category" 
              options={[{label: 'Select Category...', value: ''}, ...categoryOptions]} 
              value={selectedCategory} 
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setRedTeamId('');
                setBlueTeamId('');
              }} 
            />
          </div>

          <div className="grid grid-cols-2 gap-6 p-4 rounded-xl border border-white/10 bg-black/20">
            <div className="space-y-2">
              <div className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">Red Corner</div>
              <Select 
                label="Select Red Team" 
                options={[{label: 'Select Team...', value: ''}, ...availableTeams]} 
                value={redTeamId} 
                onChange={(e) => setRedTeamId(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">Blue Corner</div>
              <Select 
                label="Select Blue Team" 
                options={[{label: 'Select Team...', value: ''}, ...availableTeams]} 
                value={blueTeamId} 
                onChange={(e) => setBlueTeamId(e.target.value)} 
              />
            </div>
          </div>

          <Button 
            size="xl" 
            className="w-full mt-6 bg-purple-600 hover:bg-purple-700" 
            onClick={handleBroadcast}
            disabled={isBroadcasting}
          >
            {isBroadcasting ? 'BROADCASTING...' : 'BROADCAST MATCH LIVE'}
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-center bg-[#16161f] p-8 rounded-xl border border-[#8b5cf6]/30">
            <div className="text-[#e11d48] font-bold animate-pulse mb-2">● LIVE</div>
            <div className="text-xl text-gray-400 mb-6">Round {currentMatch.round_number} • {currentMatch.category}</div>
            
            <div className="flex justify-center items-center gap-8 mb-8">
              <Card variant="red" className="w-64 p-6 text-center shadow-[0_0_30px_rgba(225,29,72,0.15)]">
                <div className="text-2xl font-bold">{currentMatch.red_team?.team_name || 'Red Team'}</div>
              </Card>
              <div className="text-3xl font-bold text-gray-500">VS</div>
              <Card variant="blue" className="w-64 p-6 text-center shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <div className="text-2xl font-bold">{currentMatch.blue_team?.team_name || 'Blue Team'}</div>
              </Card>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsResultModalOpen(true)}>ENTER MATCH RESULT</Button>
              <Button size="lg" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={handleReset}>Cancel & Reset Match</Button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title="Submit Match Result">
        <div className="space-y-4">
          <div className="text-sm text-gray-400 mb-4">Select the final distribution of judges' votes for this match.</div>
          {Object.entries(SCORE_DISTRIBUTIONS).map(([key, dist]: [string, any]) => (
            <label key={key} className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${selectedScore === key ? 'border-purple-500 bg-purple-500/10' : 'border-[#2a2a3a] hover:bg-[#2a2a3a]'}`}>
              <input 
                type="radio" 
                name="score" 
                value={key} 
                checked={selectedScore === key}
                onChange={(e) => setSelectedScore(e.target.value)}
                className="hidden"
              />
              <div className="flex-1 flex justify-between items-center">
                <span className={`font-bold ${selectedScore === key ? 'text-red-400' : ''}`}>RED {dist.red}</span>
                <span className="text-gray-500 text-sm">vs</span>
                <span className={`font-bold ${selectedScore === key ? 'text-blue-400' : ''}`}>BLUE {dist.blue}</span>
              </div>
            </label>
          ))}
          <Button className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitResult} disabled={!selectedScore}>
            CONFIRM & SETTLE BETS
          </Button>
        </div>
      </Modal>
    </div>
  );
}
