'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { publishPhase1Leaderboard, getPhase1Leaderboard } from '@/app/actions/leaderboard';
import { formatIndianNumber } from '@/lib/format';

export default function Phase1FinalePage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const result = await getPhase1Leaderboard();
      if (result.success) {
        setLeaderboard(result.data || []);
      }
    };
    fetchLeaderboard();
  }, []);

  const handlePublish = async () => {
    setIsPublishing(true);
    await publishPhase1Leaderboard();
    setIsPublishing(false);
    setIsPublishModalOpen(false);
  };

  const columns = [
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
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Phase 1 Finale</h1>
      
      <Card variant="glass">
        <CardHeader>Phase 1 Leaderboard Preview</CardHeader>
        <CardContent>
          <DataTable columns={columns} data={leaderboard} emptyMessage="No leaderboard data available" />
          
          <div className="mt-8 flex justify-center">
            <Button size="xl" variant="gold" onClick={() => setIsPublishModalOpen(true)}>
              PUBLISH GAMBIT LEADERBOARD
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublish}
        title="Publish Phase 1 Leaderboard"
        description="This will transition ALL participant screens to the leaderboard view. This action broadcasts globally."
        confirmText="Publish Globally"
        isLoading={isPublishing}
      />
    </div>
  );
}
