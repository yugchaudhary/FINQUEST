'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { getTeams, updateStartingBalance } from '@/app/actions/teams';
import { PiggyBank, Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatIndianNumber } from '@/lib/format';
import { DEFAULT_STARTING_BALANCE } from '@/lib/constants';

export default function InvestmentSetupPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bulkAmount, setBulkAmount] = useState(DEFAULT_STARTING_BALANCE.toString());
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTeams = async () => {
    setIsLoading(true);
    const res = await getTeams();
    if (res.success && res.data) {
      setTeams(res.data.filter((t: any) => t.role === 'INVESTOR'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleUpdateBalance = async (teamId: string, amount: string) => {
    const num = parseInt(amount, 10);
    if (isNaN(num) || num < 0) return;
    setUpdating(teamId);
    await updateStartingBalance(teamId, num);
    await fetchTeams();
    setUpdating(null);
  };

  const handleBulkUpdate = async () => {
    const num = parseInt(bulkAmount, 10);
    if (isNaN(num) || num < 0) return;
    setUpdating('bulk');
    await Promise.all(teams.map(t => updateStartingBalance(t.id, num)));
    await fetchTeams();
    setUpdating(null);
  };

  const columns = [
    { header: 'Investor Team', accessorKey: 'team_name' },
    {
      header: 'Current Starting Balance',
      accessorKey: 'balance',
      cell: (row: any) => (
        <span className="font-mono text-lg">₹{formatIndianNumber(row.balance)}</span>
      )
    },
    {
      header: 'Update Balance',
      accessorKey: 'id',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <Input 
            type="number" 
            defaultValue={row.balance}
            className="w-48 bg-surface"
            onBlur={(e) => {
              if (e.target.value !== row.balance.toString()) {
                handleUpdateBalance(row.id, e.target.value);
              }
            }}
            disabled={updating === row.id || updating === 'bulk'}
          />
          {updating === row.id && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-space-grotesk font-bold tracking-tight flex items-center gap-2">
            <PiggyBank className="text-purple-500" />
            Investment Setup
          </h1>
          <p className="text-slate-500 mt-1">Configure starting balances for INVESTOR teams.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-end bg-surface p-4 rounded-lg border border-border">
            <div className="flex-1 max-w-xs">
              <Input
                label="Bulk Set Balance for ALL Investors"
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleBulkUpdate}
              isLoading={updating === 'bulk'}
            >
              Apply to All Investors
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <DataTable columns={columns} data={teams} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
