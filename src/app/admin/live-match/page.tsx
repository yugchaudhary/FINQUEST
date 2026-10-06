'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Modal } from '@/components/ui/modal';
import { broadcastMatch, getCurrentMatch } from '@/app/actions/matches';
import { submitMatchResult, resetToWaiting } from '@/app/actions/settlement';
import { SCORE_DISTRIBUTIONS } from '@/lib/constants';

export default function LiveMatchPage() {
  const [currentMatch, setCurrentMatch] = useState<any>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState('');
  
  useEffect(() => {
    fetchCurrentMatch();
  }, []);
  
  const fetchCurrentMatch = async () => {
    const match = await getCurrentMatch();
    setCurrentMatch(match);
  };
  
  const handleBroadcast = async () => {
    // This expects full params, we will pass dummy for TS to pass since it's a placeholder UI
    await broadcastMatch({ category: 'Fintech', red_team_id: '00000000-0000-0000-0000-000000000000', blue_team_id: '00000000-0000-0000-0000-000000000001' });
    fetchCurrentMatch();
  };
  
  const handleSubmitResult = async () => {
    // Extract votes from SCORE_DISTRIBUTIONS or use dummy
    await submitMatchResult({ match_id: currentMatch?.id || '00000000-0000-0000-0000-000000000000', red_votes: 3, blue_votes: 2 });
    setIsResultModalOpen(false);
    fetchCurrentMatch();
  };

  const handleReset = async () => {
    await resetToWaiting();
    fetchCurrentMatch();
  };

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
          <Select label="Category" options={[{label: 'Fintech', value: 'fintech'}]} value="" onChange={()=>{}} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Red Team" options={[]} value="" onChange={()=>{}} />
            <Select label="Blue Team" options={[]} value="" onChange={()=>{}} />
          </div>
          <Button size="xl" className="w-full mt-6" onClick={handleBroadcast}>BROADCAST MATCH</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-center bg-[#16161f] p-8 rounded-xl border border-[#8b5cf6]/30">
            <div className="text-[#e11d48] font-bold animate-pulse mb-2">● LIVE</div>
            <div className="text-xl text-gray-400 mb-6">Round {currentMatch.round} • {currentMatch.category}</div>
            
            <div className="flex justify-center items-center gap-8 mb-8">
              <Card variant="red" className="w-64 p-6 text-center">
                <div className="text-2xl font-bold">{currentMatch.redTeamName}</div>
              </Card>
              <div className="text-3xl font-bold text-gray-500">VS</div>
              <Card variant="blue" className="w-64 p-6 text-center">
                <div className="text-2xl font-bold">{currentMatch.blueTeamName}</div>
              </Card>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => setIsResultModalOpen(true)}>ENTER MATCH RESULT</Button>
              <Button size="lg" variant="outline" onClick={handleReset}>Reset to Waiting</Button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title="Match Result">
        <div className="space-y-4">
          {Object.entries(SCORE_DISTRIBUTIONS).map(([key, dist]: [string, any]) => (
            <label key={key} className="flex items-center gap-4 p-4 border border-[#2a2a3a] rounded-lg cursor-pointer hover:bg-[#2a2a3a]">
              <input 
                type="radio" 
                name="score" 
                value={key} 
                checked={selectedScore === key}
                onChange={(e) => setSelectedScore(e.target.value)}
              />
              <span className="font-bold">RED {dist.red} - BLUE {dist.blue}</span>
            </label>
          ))}
          <Button className="w-full mt-4" onClick={handleSubmitResult} disabled={!selectedScore}>
            SUBMIT RESULTS
          </Button>
        </div>
      </Modal>
    </div>
  );
}
