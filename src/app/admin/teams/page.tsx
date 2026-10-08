'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTeamsWithDetails, updateTeamRole, getTeamMembers, clearAllTeams } from '@/app/actions/teams';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Users, Shield, Target, Trash2, ChevronDown, ChevronUp,
  XCircle, CheckCircle, Info, Loader2, Search, Trophy
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, any[]>>({});
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [selectionFilter, setSelectionFilter] = useState('ALL');

  const fetchTeams = async () => {
    setIsLoading(true);
    const result = await getTeamsWithDetails();
    if (result.success && result.data) {
      setTeams(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleUpdateRole = async (teamId: string, role: 'INNOVATOR' | 'INVESTOR') => {
    setUpdatingRole(teamId);
    setError(null);
    const result = await updateTeamRole(teamId, role);
    if (!result?.success) setError(result?.error || 'Failed to update role');
    else setSuccess(`Role updated to ${role}`);
    await fetchTeams();
    setUpdatingRole(null);
  };

  const handleToggleElimination = async (teamId: string, currentStatus: boolean) => {
    const supabase = createClient();
    await supabase.from('teams').update({ is_active: !currentStatus }).eq('id', teamId);
    fetchTeams();
  };

  const handleExpandTeam = async (teamId: string) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
      return;
    }
    setExpandedTeam(teamId);
    if (!teamMembers[teamId]) {
      const result = await getTeamMembers(teamId);
      if (result?.success && result.data) {
        setTeamMembers(prev => ({ ...prev, [teamId]: result.data! }));
      }
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    setError(null);
    const result = await clearAllTeams();
    if (result?.success) {
      setIsClearModalOpen(false);
      setSuccess('All teams cleared successfully');
      fetchTeams();
    } else {
      setError(result?.error || 'Failed to clear teams');
    }
    setIsClearing(false);
  };

  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      // Search
      if (search && !t.team_name.toLowerCase().includes(search.toLowerCase())) return false;
      
      // Role
      if (roleFilter !== 'ALL' && t.role !== roleFilter) return false;
      
      // Status
      if (statusFilter === 'ACTIVE' && !t.is_active) return false;
      if (statusFilter === 'ELIMINATED' && t.is_active) return false;

      // Members
      if (memberFilter === 'FULL' && t.memberCount !== 4) return false;
      if (memberFilter === 'PARTIAL' && (t.memberCount === 4 || t.memberCount === 0)) return false;
      if (memberFilter === 'EMPTY' && t.memberCount !== 0) return false;

      // Selection
      if (selectionFilter === 'FINALIZED' && t.selectionStatus !== 'FINALIZED') return false;
      if (selectionFilter === 'IN_PROGRESS' && t.selectionStatus !== 'IN_PROGRESS') return false;
      if (selectionFilter === 'NOT_STARTED' && t.selectionStatus !== 'NOT_STARTED') return false;

      return true;
    });
  }, [teams, search, roleFilter, statusFilter, memberFilter, selectionFilter]);

  const roleColors: any = {
    INNOVATOR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    INVESTOR: 'bg-green-500/10 text-green-400 border-green-500/20',
    PENDING: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-space-grotesk font-bold tracking-tight flex items-center gap-2">
            <Trophy className="text-purple-500" />
            Teams & Registration
          </h1>
          <p className="text-gray-400 mt-1">Manage all registered teams and their progress.</p>
        </div>
        <Button 
          variant="outline" 
          className="border-red-500/50 hover:bg-red-500/10 text-red-400"
          onClick={() => setIsClearModalOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Reset All Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#16161f] border border-[#2a2a3a] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <Select 
          label="Role"
          options={[
            { label: 'All Roles', value: 'ALL' },
            { label: 'Innovator', value: 'INNOVATOR' },
            { label: 'Investor', value: 'INVESTOR' },
            { label: 'Pending', value: 'PENDING' }
          ]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        />
        <Select 
          label="Members"
          options={[
            { label: 'All Members', value: 'ALL' },
            { label: 'Full (4/4)', value: 'FULL' },
            { label: 'Partial (1-3)', value: 'PARTIAL' },
            { label: 'Empty (0/4)', value: 'EMPTY' }
          ]}
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
        />
        <Select 
          label="Selection"
          options={[
            { label: 'All States', value: 'ALL' },
            { label: 'Finalized', value: 'FINALIZED' },
            { label: 'In Progress', value: 'IN_PROGRESS' },
            { label: 'Not Started', value: 'NOT_STARTED' }
          ]}
          value={selectionFilter}
          onChange={(e) => setSelectionFilter(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a3a]">
              {filteredTeams.map((team) => (
                <div key={team.id}>
                  {/* Team Row */}
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    {/* Team Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{team.team_name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{team.categoryName || 'Unassigned Category'}</div>
                    </div>

                    {/* Member Count */}
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <span className={`font-bold ${team.memberCount >= 4 ? 'text-green-400' : 'text-gray-300'}`}>
                        {team.memberCount || 0}/4
                      </span>
                    </div>

                    {/* Selection Status */}
                    {team.role === 'INNOVATOR' && (
                      <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full border ${team.selectionStatus === 'FINALIZED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : team.selectionStatus === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {team.selectionStatus === 'FINALIZED' ? 'Finalized' : team.selectionStatus === 'IN_PROGRESS' ? `${team.selectionsCount} Selected` : 'Not Started'}
                      </span>
                    )}

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${team.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {team.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {team.is_active ? 'Active' : 'Eliminated'}
                    </span>

                    {/* Role — switchable */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full border ${roleColors[team.role] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {team.role}
                      </span>
                      <div className="flex gap-1">
                        <button
                          disabled={updatingRole === team.id || team.role === 'INNOVATOR'}
                          onClick={() => handleUpdateRole(team.id, 'INNOVATOR')}
                          className="text-xs px-2 py-1 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Innovator
                        </button>
                        <button
                          disabled={updatingRole === team.id || team.role === 'INVESTOR'}
                          onClick={() => handleUpdateRole(team.id, 'INVESTOR')}
                          className="text-xs px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Investor
                        </button>
                      </div>
                    </div>

                    {/* Eliminate / Restore */}
                    <button
                      onClick={() => handleToggleElimination(team.id, team.is_active)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${team.is_active ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
                    >
                      {team.is_active ? 'Eliminate' : 'Restore'}
                    </button>

                    {/* More Info Toggle */}
                    <button
                      onClick={() => handleExpandTeam(team.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-white/10 px-2 py-1 rounded transition-colors"
                    >
                      <Info className="w-3 h-3" />
                      {expandedTeam === team.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Expanded Members Info */}
                  {expandedTeam === team.id && (
                    <div className="px-6 pb-5 bg-black/20 border-t border-white/5">
                      <div className="pt-4 grid grid-cols-2 gap-6">
                        {/* Team Details */}
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Team Details</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Join Code</span>
                              <span className="font-mono font-bold text-purple-400">{team.join_code || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Category</span>
                              <span className="text-white">{team.categoryName || 'Unassigned'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Balance</span>
                              <span className="text-white">₹{(team.current_balance || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Finalist</span>
                              <span className={team.is_finalist ? 'text-yellow-400 font-bold' : 'text-gray-500'}>
                                {team.is_finalist ? '⭐ Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Members List */}
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Members & Registration Numbers</div>
                          {teamMembers[team.id] === undefined ? (
                            <div className="text-xs text-gray-500">Loading...</div>
                          ) : teamMembers[team.id].length === 0 ? (
                            <div className="text-xs text-gray-500">No members joined yet.</div>
                          ) : (
                            <div className="space-y-2">
                              {teamMembers[team.id].map((member: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400 font-bold flex-shrink-0">
                                    {i + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">{member.name}</div>
                                    <div className="text-xs font-mono text-gray-400">{member.email?.replace('@finfest.com', '')}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAll}
        title="⚠️ Reset All Team Data"
        description="This will permanently delete ALL teams, all registered participants, and reset all registration numbers back to Available. Use this only between test runs. This cannot be undone."
        confirmText={isClearing ? 'Resetting...' : 'Yes, Reset Everything'}
      />
    </div>
  );
}
