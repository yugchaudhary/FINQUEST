'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Shield, Target, Users, XCircle, CheckCircle } from 'lucide-react';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeams = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(count)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTeams(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const updateTeamRole = async (teamId: string, role: string) => {
    const supabase = createClient();
    await supabase.from('teams').update({ role }).eq('id', teamId);
    fetchTeams();
  };

  const toggleElimination = async (teamId: string, currentStatus: boolean) => {
    const supabase = createClient();
    await supabase.from('teams').update({ is_active: !currentStatus }).eq('id', teamId);
    fetchTeams();
  };

  const columns = [
    {
      header: 'Team Name',
      accessorKey: 'team_name',
      cell: (team: any) => (
        <div>
          <div className="font-bold">{team.team_name}</div>
          <div className="text-xs text-gray-500">{team.category}</div>
        </div>
      )
    },
    {
      header: 'Members',
      accessorKey: 'members',
      cell: (team: any) => (
        <Badge variant={team.team_members?.[0]?.count === 4 ? 'complete' : 'default'}>
          {team.team_members?.[0]?.count || 0}/4
        </Badge>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (team: any) => (
        <Badge variant={team.is_active ? 'complete' : 'error'}>
          {team.is_active ? 'Active' : 'Eliminated'}
        </Badge>
      )
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (team: any) => (
        <div className="flex gap-2">
          {team.role === 'PENDING' ? (
            <>
              <Button size="sm" variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-400/10" onClick={() => updateTeamRole(team.id, 'INNOVATOR')}>Make Innovator</Button>
              <Button size="sm" variant="outline" className="text-green-400 border-green-400 hover:bg-green-400/10" onClick={() => updateTeamRole(team.id, 'INVESTOR')}>Make Investor</Button>
            </>
          ) : (
            <Badge variant="default" className={team.role === 'INNOVATOR' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}>
              {team.role}
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      cell: (team: any) => (
        <Button 
          size="sm" 
          variant="ghost" 
          className={team.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}
          onClick={() => toggleElimination(team.id, team.is_active)}
        >
          {team.is_active ? <XCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          {team.is_active ? 'Eliminate' : 'Restore'}
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-space-grotesk font-bold">Team Management</h1>
        <Badge variant="default" className="text-lg py-1 px-4">{teams.length} Registered Teams</Badge>
      </div>

      <Card variant="glass">
        <CardContent className="p-0">
          <DataTable 
            columns={columns} 
            data={teams} 
            emptyMessage={isLoading ? "Loading teams..." : "No teams registered yet"} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
