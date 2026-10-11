import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamOverviewProps {
  team: {
    team_name: string;
    role: string;
    categoryName?: string;
    starting_balance?: number;
    current_balance?: number;
  };
  members?: any[];
}

export function TeamOverviewCard({ team }: TeamOverviewProps) {
  return (
    <div className="w-full">
      <div className="text-xs font-bold text-slate-500 tracking-widest mb-3 ml-1">YOUR TEAM</div>
      <Card className="w-full bg-surface border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 md:p-8 bg-black/20 gap-4">
            {/* Left: Info */}
            <div>
              <h2 className="text-3xl md:text-4xl font-space-grotesk font-black text-foreground mb-3">
                {team.team_name}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={team.role === 'INVESTOR' 
                    ? 'bg-blue-900/20 text-blue-400 border-blue-500/30 font-mono text-xs px-2.5 py-1 font-bold' 
                    : 'bg-purple-900/20 text-purple-400 border-purple-500/30 font-mono text-xs px-2.5 py-1 font-bold'
                  }
                >
                  {team.role}
                </Badge>
                <span className="text-slate-500 text-sm">/</span>
                <span className="text-slate-300 font-medium text-sm px-3 py-1 bg-surface/5 rounded-full border border-white/10">
                  {team.categoryName || 'Category Not Assigned'}
                </span>
              </div>
            </div>

            {/* Right: Team Status */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-2 bg-emerald-400/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                OFFICIAL TEAM
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
