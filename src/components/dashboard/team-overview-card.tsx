import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle2, User } from 'lucide-react';

interface TeamOverviewProps {
  team: {
    team_name: string;
    role: string;
    categoryName?: string;
    join_code?: string;
  };
  members: any[];
}

export function TeamOverviewCard({ team, members }: TeamOverviewProps) {
  const [copied, setCopied] = React.useState(false);

  const copyCode = () => {
    if (team.join_code) {
      navigator.clipboard.writeText(team.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maxMembers = 4;
  const isComplete = members.length >= maxMembers;

  return (
    <div className="w-full">
      <div className="text-xs font-bold text-slate-500 tracking-widest mb-3 ml-1">YOUR TEAM</div>
      <Card className="w-full bg-surface border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row border-b border-border">
            {/* Left: Info */}
            <div className="p-6 md:p-8 flex-1 border-b md:border-b-0 md:border-r border-border bg-black/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-space-grotesk font-black text-foreground mb-3">
                    {team.team_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={team.role === 'INVESTOR' ? 'bg-blue-900/20 text-blue-400 border-blue-500/30 font-mono' : 'bg-purple-900/20 text-purple-400 border-purple-500/30 font-mono'}>
                      {team.role}
                    </Badge>
                    <span className="text-slate-500 text-sm">/</span>
                    <span className="text-slate-600 font-medium text-sm px-3 py-1 bg-surface/5 rounded-full border border-white/10">
                      {team.categoryName || 'Category Not Assigned'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Members Summary */}
            <div className="p-6 md:p-8 md:w-80 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500 font-medium">TEAM STATUS</div>
                {isComplete ? (
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1 bg-green-400/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> COMPLETE
                  </span>
                ) : (
                  <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
                    {members.length} / 4 JOINED
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {Array.from({ length: maxMembers }).map((_, i) => {
                  const member = members[i];
                  if (member) {
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-500/30">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                          <div className="text-xs text-slate-500 font-mono truncate">{member.email?.split('@')[0]}</div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={i} className="flex items-center gap-3 opacity-40">
                      <div className="w-8 h-8 rounded-full border border-dashed border-gray-500 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="text-sm text-slate-500 italic">Open Slot</div>
                    </div>
                  );
                })}
              </div>

              {!isComplete && team.join_code && (
                <div className="mt-6">
                  <button 
                    onClick={copyCode}
                    className="w-full flex items-center justify-between p-2 rounded bg-black/40 border border-gray-800 hover:border-gray-700 hover:bg-black/60 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Join Code</div>
                      <div className="text-sm text-foreground font-mono">{team.join_code}</div>
                    </div>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-500 group-hover:text-foreground" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
