'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { calculateFinalistScore, publishFinalsLeaderboard, getFinalistScores } from '@/app/actions/finals';

export default function FinalsScoringPage() {
  const [selectedFinalist, setSelectedFinalist] = useState('');
  const [judgesAvg, setJudgesAvg] = useState('');
  const [scores, setScores] = useState<any[]>([]);

  const fetchScores = async (finalistId: string) => {
    if (!finalistId) return;
    const result = await getFinalistScores(finalistId);
    if (result.success) {
      setScores(result.data?.scores || []);
    }
  };

  useEffect(() => {
    if (selectedFinalist) fetchScores(selectedFinalist);
  }, [selectedFinalist]);

  const handleCalculate = async () => {
    if (!selectedFinalist || !judgesAvg) return;
    await calculateFinalistScore({
      finalist_team_id: selectedFinalist, 
      judges_average: parseFloat(judgesAvg)
    });
    fetchScores(selectedFinalist);
  };

  const handlePublish = async () => {
    await publishFinalsLeaderboard();
  };

  const columns = [
    { header: 'Rank', accessorKey: 'rank' },
    { header: 'Team', accessorKey: 'teamName' },
    { header: 'Final Score', accessorKey: 'score' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Finals Scoring</h1>
      
      <Card variant="glass">
        <CardHeader>Calculate Final Score</CardHeader>
        <CardContent className="space-y-4">
          <Select label="Finalist Team" options={[]} value={selectedFinalist} onChange={(e) => setSelectedFinalist(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Investor Average (Auto)" type="text" value="8.5" disabled />
            <Input label="Judges Average (1.0-10.0)" type="number" value={judgesAvg} onChange={(e) => setJudgesAvg(e.target.value)} />
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
          <DataTable columns={columns} data={scores} emptyMessage="No scores calculated yet" />
          <div className="mt-4 flex justify-end">
            <Button variant="gold" onClick={handlePublish}>PUBLISH FINALS LEADERBOARD</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
