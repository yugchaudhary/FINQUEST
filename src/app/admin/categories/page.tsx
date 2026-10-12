'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { getTeamsWithDetails, updateTeamCategory, updateTeamRole } from '@/app/actions/teams';
import { getCategories } from '@/app/actions/categories';
import { Tags, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function CategoryAssignmentPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const [teamsRes, catsRes] = await Promise.all([
      getTeamsWithDetails(),
      getCategories()
    ]);
    if (teamsRes.success && teamsRes.data) setTeams(teamsRes.data);
    if (catsRes.success && catsRes.data) setCategories(catsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'INNOVATOR' | 'INVESTOR'>('ALL');

  const handleRoleChange = async (teamId: string, newRole: 'INNOVATOR' | 'INVESTOR') => {
    setUpdatingRole(teamId);
    setError(null);
    setSuccess(null);

    const prevTeams = [...teams];
    // Optimistic update
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      return {
        ...t,
        role: newRole,
        category: newRole === 'INVESTOR' ? 'N/A' : (t.category === 'N/A' ? 'Unassigned' : t.category),
        category_id: newRole === 'INVESTOR' ? null : t.category_id,
        categoryName: newRole === 'INVESTOR' ? null : (t.category === 'N/A' ? null : t.categoryName)
      };
    }));

    const res = await updateTeamRole(teamId, newRole);
    if (!res?.success) {
      setTeams(prevTeams);
      setError(res?.error || 'Failed to update role');
    } else {
      setSuccess(newRole === 'INVESTOR' ? 'Role set to Investor (category cleared)' : 'Role set to Innovator');
      const teamsRes = await getTeamsWithDetails();
      if (teamsRes.success && teamsRes.data) setTeams(teamsRes.data);
    }
    setUpdatingRole(null);
  };

  const handleCategoryChange = async (teamId: string, categoryId: string) => {
    const target = teams.find(t => t.id === teamId);
    if (target?.role === 'INVESTOR') {
      setError('Investors cannot be assigned a category. Change role to Innovator first.');
      return;
    }

    setUpdating(teamId);
    setError(null);
    setSuccess(null);

    const prevTeams = [...teams];
    const catId = categoryId === 'none' ? null : categoryId;
    const selectedCat = categories.find(c => c.id === catId);

    // Optimistic update
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      return {
        ...t,
        role: t.role === 'PENDING' ? 'INNOVATOR' : t.role,
        category_id: catId,
        category: selectedCat ? selectedCat.name : 'Unassigned',
        categoryName: selectedCat ? selectedCat.name : null
      };
    }));

    const res = await updateTeamCategory(teamId, catId);
    if (!res?.success) {
      setTeams(prevTeams);
      setError(res?.error || 'Failed to update category');
    } else {
      setSuccess(selectedCat ? `Category set to ${selectedCat.name}` : 'Category cleared to Unassigned');
      const teamsRes = await getTeamsWithDetails();
      if (teamsRes.success && teamsRes.data) setTeams(teamsRes.data);
    }
    setUpdating(null);
  };

  const filteredTeams = teams.filter(t => {
    if (roleFilter !== 'ALL' && t.role !== roleFilter) return false;
    return (
      t.team_name.toLowerCase().includes(search.toLowerCase()) ||
      t.categoryName?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const columns = [
    { header: 'Team Name', accessorKey: 'team_name' },
    { 
      header: 'Role (Select)', 
      accessorKey: 'role',
      cell: (row: any) => (
        <div className="flex items-center gap-1.5">
          <button
            disabled={updatingRole === row.id || row.role === 'INNOVATOR'}
            onClick={() => handleRoleChange(row.id, 'INNOVATOR')}
            className={`text-xs px-2.5 py-1 rounded font-bold font-mono border transition-all ${
              row.role === 'INNOVATOR'
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm cursor-default'
                : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/15'
            }`}
          >
            Innovator
          </button>
          <button
            disabled={updatingRole === row.id || row.role === 'INVESTOR'}
            onClick={() => handleRoleChange(row.id, 'INVESTOR')}
            className={`text-xs px-2.5 py-1 rounded font-bold font-mono border transition-all ${
              row.role === 'INVESTOR'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm cursor-default'
                : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/15'
            }`}
          >
            Investor
          </button>
        </div>
      )
    },
    { header: 'Members', accessorKey: 'memberCount', cell: (row: any) => `${row.memberCount}/4` },
    {
      header: 'Category Assignment',
      accessorKey: 'category_id',
      cell: (row: any) => {
        if (row.role === 'INVESTOR') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-950/20 text-blue-400/80 border border-blue-500/20 text-xs font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
              N/A (Investor — No Category)
            </span>
          );
        }

        return (
          <select
            value={row.category_id || 'none'}
            onChange={(e) => handleCategoryChange(row.id, e.target.value)}
            disabled={updating === row.id}
            className="bg-surface border border-border rounded px-3 py-1 text-sm focus:outline-none focus:border-purple-500 min-w-[200px]"
          >
            <option value="none">Unassigned</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-space-grotesk font-bold tracking-tight flex items-center gap-2">
            <Tags className="text-purple-500" />
            Category Assignment
          </h1>
          <p className="text-slate-500 mt-1">
            Assign problem categories exclusively to Innovator teams. Investors cannot be assigned any category.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search teams or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={roleFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('ALL')}
            >
              All Teams
            </Button>
            <Button
              variant={roleFilter === 'INNOVATOR' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('INNOVATOR')}
              className={roleFilter === 'INNOVATOR' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              Innovators Only
            </Button>
            <Button
              variant={roleFilter === 'INVESTOR' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('INVESTOR')}
              className={roleFilter === 'INVESTOR' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Investors (No Category)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredTeams} keyExtractor={(t) => t.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
