import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Info } from 'lucide-react';
import { formatIndianNumber } from '@/lib/format';

interface InvestmentBalanceCardProps {
  startingBalance: number;
  currentBalance: number;
  isPhase1LeaderboardPublished: boolean;
}

export function InvestmentBalanceCard({ startingBalance, currentBalance, isPhase1LeaderboardPublished }: InvestmentBalanceCardProps) {
  // If phase 1 leaderboard is not published, we don't show the P&L difference, 
  // we just show the remaining balance.
  const displayBalance = isPhase1LeaderboardPublished ? currentBalance : startingBalance;

  return (
    <div className="w-full pt-8">
      <div className="text-xs font-bold text-slate-500 tracking-widest mb-4 ml-1">INVESTMENT WALLET</div>
      <Card className="w-full bg-surface border-border overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/3" />
        <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
              <Wallet className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">REMAINING BALANCE</div>
              <div className="text-3xl md:text-5xl font-mono font-bold text-foreground tracking-tight">
                <span className="text-blue-500 mr-1">₹</span>
                {formatIndianNumber(displayBalance)}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-sm text-slate-500">
              Assigned Funding: <span className="font-mono text-slate-600">₹{formatIndianNumber(startingBalance)}</span>
            </div>
            
            {!isPhase1LeaderboardPublished && (
              <div className="flex items-start gap-2 bg-black/30 border border-border p-3 rounded-lg max-w-xs">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">
                  Profit/Loss from live match outcomes will remain hidden until the Phase 1 Leaderboard is published.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
