'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { getTeamsWithDetails, updateTeamCategory } from '@/app/actions/teams';
import { getCategories } from '@/app/actions/categories';
import { Tags, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function CategoryAssignmentPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

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

  const handleCategoryChange = async (teamId: string, categoryId: string) => {
    setUpdating(teamId);
    await updateTeamCategory(teamId, categoryId === 'none' ? null : categoryId);
    await fetchData();
    setUpdating(null);
  };

  const filteredTeams = teams.filter(t => 
    t.team_name.toLowerCase().includes(search.toLowerCase()) ||
    t.categoryName?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'Team Name', accessorKey: 'team_name' },
    { 
      header: 'Role', 
      accessorKey: 'role',
      cell: (row: any) => (
        <Badge variant="outline" className={row.role === 'INVESTOR' ? 'text-blue-400 border-blue-400' : row.role === 'INNOVATOR' ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-gray-400'}>
          {row.role}
        </Badge>
      )
    },
    { header: 'Members', accessorKey: 'memberCount', cell: (row: any) => `${row.memberCount}/4` },
    {
      header: 'Category Assignment',
      accessorKey: 'category_id',
      cell: (row: any) => (
        <select
          value={row.category_id || 'none'}
          onChange={(e) => handleCategoryChange(row.id, e.target.value)}
          disabled={updating === row.id}
          className="bg-[#16161f] border border-[#2a2a3a] rounded px-3 py-1 text-sm focus:outline-none focus:border-purple-500 min-w-[200px]"
        >
          <option value="none">Unassigned</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )
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
          <p className="text-gray-400 mt-1">Assign teams to their problem categories.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-72">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search teams or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#16161f] border border-[#2a2a3a] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredTeams} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
