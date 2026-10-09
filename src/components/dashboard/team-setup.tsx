'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTeamMembers, removeTeamMember } from '@/app/actions/team-members';
import { Users, Trash2, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';

export function TeamSetup({ joinCode }: { joinCode?: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchMembers = async () => {
    setIsLoading(true);
    const result = await getTeamMembers();
    if (result.success) setMembers(result.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRemove = async (id: string) => {
    await removeTeamMember(id);
    await fetchMembers();
  };

  const copyCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return <div>Loading team members...</div>;

  return (
    <div className="space-y-6">
      {joinCode && members.length < 4 && (
        <Card variant="glass" className="border-purple-500/30">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-space-grotesk font-bold mb-2">Invite Team Members</h3>
            <p className="text-sm text-slate-500 mb-4">Share this code with your team members so they can join your team during registration.</p>
            <div className="flex items-center justify-center gap-3">
              <div className="text-4xl font-space-grotesk font-black tracking-widest text-white px-6 py-2 bg-black/50 rounded-lg">
                {joinCode}
              </div>
              <Button variant="outline" size="sm" onClick={copyCode} className="h-12 px-4 hover:bg-surface/10">
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="glass" className="mb-8 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-space-grotesk font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Team Roster
            </h2>
            <p className="text-sm text-slate-500 mt-1">Your team can have up to 4 members.</p>
          </div>
          <Badge variant={members.length === 4 ? 'complete' : 'default'}>
            {members.length} / 4 Members
          </Badge>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <div className="space-y-3 mb-6">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border">
                  <div>
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {member.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {member.email} {member.phone && `• ${member.phone}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(member.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              No team members joined yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
