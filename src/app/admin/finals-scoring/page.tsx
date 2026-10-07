'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { calculateFinalistScore, publishFinalsLeaderboard, getFinalistScores, getFinalists } from '@/app/actions/finals';
import { getFinalsLeaderboard } from '@/app/actions/leaderboard';

export default function FinalsScoringPage() {
  const [finalists, setFinalists] = useState<any[]>([]);
  const [selectedFinalist, setSelectedFinalist] = useState('');
  const [judgesAvg, setJudgesAvg] = useState('');
  
  const [investorAvg, setInvestorAvg] = useState<number>(0);
  const [scoreCount, setScoreCount] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Fetch finalists & leaderboard on mount
  useEffect(() => {
    const init = async () => {
      const fRes = await getFinalists();
      if (fRes.success) setFinalists(fRes.data || []);
      
      fetchLeaderboard();
    };
    init();
  }, []);

  const fetchLeaderboard = async () => {
    const lRes = await getFinalsLeaderboard();
    if (lRes.success) setLeaderboard(lRes.data || []);
  };

  // Fetch investor scores when a finalist is selected
  useEffect(() => {
    const fetchScores = async () => {
      if (!selectedFinalist) {
        setInvestorAvg(0);
        setScoreCount(0);
        return;
      }
      const result = await getFinalistScores(selectedFinalist);
      if (result.success) {
        setInvestorAvg(result.data?.average || 0);
        setScoreCount(result.data?.count || 0);
      }
    };
    fetchScores();
  }, [selectedFinalist]);

  const handleCalculate = async () => {
    if (!selectedFinalist || !judgesAvg) return;
    await calculateFinalistScore({
      finalist_team_id: selectedFinalist, 
      judges_average: parseFloat(judgesAvg)
    });
    setJudgesAvg('');
    fetchLeaderboard();
  };

  const handlePublish = async () => {
    await publishFinalsLeaderboard();
  };

  const columns = [
    { header: 'Rank', accessorKey: 'rank' },
    { header: 'Team', accessorKey: 'team_name' },
    { header: 'Inv Avg', accessorKey: 'investor_average' },
    { header: 'Judge Avg', accessorKey: 'judges_average' },
    { header: 'Final Score', accessorKey: 'final_score' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Finals Scoring</h1>
      
      <Card variant="glass">
        <CardHeader>Calculate Final Score</CardHeader>
        <CardContent className="space-y-4">
          <Select 
            label="Finalist Team" 
            options={[{label: 'Select a finalist', value: ''}, ...finalists.map(f => ({ label: f.team_name, value: f.id }))]} 
            value={selectedFinalist} 
            onChange={(e) => setSelectedFinalist(e.target.value)} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={`Investor Average (from ${scoreCount} votes)`} 
              type="text" 
              value={investorAvg.toFixed(2)} 
              disabled 
            />
            <Input 
              label="Judges Average (1.0-10.0)" 
              type="number" 
              step="0.1"
              value={judgesAvg} 
              onChange={(e) => setJudgesAvg(e.target.value)} 
            />
          </div>
          <div className="bg-[#2a2a3a] p-4 rounded-lg text-sm text-gray-300">
            Formula: Final = (Investor Avg × 0.5) + (Judges Avg × 0.5)
          </div>
          <Button onClick={handleCalculate} disabled={!selectedFinalist || !judgesAvg}>
            CALCULATE & UPDATE LEADERBOARD
          </Button>
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader>Live Finals Leaderboard</CardHeader>
        <CardContent>
          <DataTable columns={columns} data={leaderboard} emptyMessage="No scores calculated yet" />
          <div className="mt-4 flex justify-end">
            <Button variant="gold" onClick={handlePublish}>PUBLISH FINALS LEADERBOARD</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
