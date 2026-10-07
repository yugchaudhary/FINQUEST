'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getEventOverview } from '@/app/actions/event-state';
import { getPhase1Leaderboard, getFinalsLeaderboard } from '@/app/actions/leaderboard';
import { DataTable } from '@/components/ui/data-table';
import { formatIndianNumber } from '@/lib/format';

export default function AdminOverview() {
  const [overview, setOverview] = useState<any>(null);
  const [phase1Leaderboard, setPhase1Leaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, lbData] = await Promise.all([
          getEventOverview(),
          getPhase1Leaderboard()
        ]);
        setOverview(overviewData);
        if (lbData?.success) setPhase1Leaderboard(lbData.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !overview) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-space-grotesk font-bold">Command Center</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="elevated">
          <CardHeader className="text-gray-400 pb-2">Current Phase</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{overview?.currentPhase || 'SETUP'}</div>
            <Badge variant="live">ACTIVE</Badge>
          </CardContent>
        </Card>
        
        <Card variant="elevated">
          <CardHeader className="text-gray-400 pb-2">Current Round</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#8b5cf6]">{overview?.currentRound || 0}</div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="text-gray-400 pb-2">Teams Registered</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.totalTeams || 0}</div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="text-gray-400 pb-2">Active Investors</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.activeInvestors || 0}</div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="text-gray-400 pb-2">Matches Completed</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.matchesCompleted || 0}</div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader className="text-gray-400 pb-2">Finalists Selected</CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview?.finalistsSelected || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-space-grotesk font-bold mb-4">Current Live Status</h2>
        <Card variant="glass" className="border-[#8b5cf6]/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div>
                <p className="text-gray-400 mb-1">Activity</p>
                <p className="text-xl font-bold">{overview?.currentActivity || 'Waiting for setup'}</p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-4">
                <Button variant="default">Refresh Data</Button>
                <Button variant="outline">View Detailed Logs</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-space-grotesk font-bold mb-4">Phase 1 Leaderboard</h2>
        <Card variant="glass">
          <CardContent className="p-6">
            <DataTable 
              columns={[
                { header: 'Rank', accessorKey: 'rank' },
                { header: 'Team', accessorKey: 'team_name' },
                { header: 'Category', accessorKey: 'category' },
                { 
                  header: 'Net P/L', 
                  accessorKey: 'net_profit_loss',
                  cell: (item: any) => {
                    const val = item.net_profit_loss;
                    return <span className={val >= 0 ? 'text-green-500' : 'text-red-500'}>{formatIndianNumber(val)}</span>;
                  }
                },
              ]} 
              data={phase1Leaderboard} 
              emptyMessage="No leaderboard data available" 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
