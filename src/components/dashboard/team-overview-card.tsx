import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Copy, CheckCircle2 } from 'lucide-react';

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

  return (
    <Card className="w-full bg-[#16161f] border-[#2a2a3a]">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-space-grotesk font-bold text-white">{team.team_name}</h2>
              <Badge variant="outline" className={team.role === 'INVESTOR' ? 'text-blue-400 border-blue-400' : 'text-purple-400 border-purple-400'}>
                {team.role}
              </Badge>
            </div>
            <div className="text-sm text-gray-400">
              Category: <span className="text-white font-medium">{team.categoryName || 'Awaiting Assignment'}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500 mb-1">TEAM MEMBERS</div>
            <div className="flex items-center gap-2 text-white">
              <Users className="w-4 h-4 text-gray-400" />
              <span className={members.length === 4 ? 'text-green-400 font-bold' : ''}>{members.length}/4 Joined</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => {
            const member = members[i];
            return (
              <div 
                key={i} 
                className={`p-3 rounded border ${member ? 'border-purple-500/30 bg-purple-500/5' : 'border-dashed border-gray-600 bg-black/20'}`}
              >
                {member ? (
                  <div className="flex flex-col">
                    <span className="font-medium text-white truncate">{member.name}</span>
                    <span className="text-xs text-gray-500 truncate">{member.email?.replace('@finfest.com', '')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-1">
                    <span className="text-xs">Empty Slot</span>
                    {i === members.length && team.join_code && (
                      <button onClick={copyCode} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                        {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : `Code: ${team.join_code}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
