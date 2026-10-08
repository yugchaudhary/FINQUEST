import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatIndianNumber } from '@/lib/format';
import { PiggyBank } from 'lucide-react';

interface InvestmentBalanceCardProps {
  startingBalance: number;
  currentBalance: number;
}

export function InvestmentBalanceCard({ startingBalance, currentBalance }: InvestmentBalanceCardProps) {
  return (
    <Card className="w-full bg-[#16161f] border-[#2a2a3a]">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-green-400" />
          </div>
          <h2 className="text-xl font-space-grotesk font-bold text-white">Investment Portfolio</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-black/30 border border-white/5">
            <div className="text-sm text-gray-500 mb-1 font-medium">ASSIGNED FUNDING</div>
            <div className="text-3xl font-mono font-bold text-gray-300">
              ₹{formatIndianNumber(startingBalance)}
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="text-sm text-green-500/70 mb-1 font-medium">REMAINING BALANCE</div>
            <div className="text-3xl font-mono font-bold text-green-400">
              ₹{formatIndianNumber(currentBalance)}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 flex items-start gap-2">
          <span className="text-lg">ℹ️</span>
          <p>Profits and losses from your investments will be revealed when the Phase 1 Leaderboard is published. Invest wisely.</p>
        </div>
      </CardContent>
    </Card>
  );
}
