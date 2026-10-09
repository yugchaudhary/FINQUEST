'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { changeTeamStatus, initializeFinals, getTeamsForTransition } from '@/app/actions/finals';

export default function FinalsTransitionPage() {
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      const res = await getTeamsForTransition();
      if (res.success && res.data) {
        setTeams(res.data);
      }
      setIsLoading(false);
    };
    fetchTeams();
  }, []);

  const handleInitialize = async () => {
    await initializeFinals(selectedTeams);
    setIsInitModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Finals Transition</h1>
      
      <Card variant="glass">
        <CardHeader>Finalist Selection</CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teams.map(team => (
              <div key={team.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <span className="font-bold">{team.team_name}</span> - <span className="text-slate-500">{team.role}</span>
                </div>
                <div className="flex gap-4 items-center">
                  <Button variant="outline" size="sm" onClick={async () => {
                    const newRole = team.role === 'INNOVATOR' ? 'INVESTOR' : 'INNOVATOR';
                    await changeTeamStatus(team.id, newRole);
                    setTeams(teams.map(t => t.id === team.id ? { ...t, role: newRole } : t));
                  }}>
                    Make {team.role === 'INNOVATOR' ? 'Investor' : 'Innovator'}
                  </Button>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" onChange={(e) => {
                      if(e.target.checked) setSelectedTeams([...selectedTeams, team.id]);
                      else setSelectedTeams(selectedTeams.filter(id => id !== team.id));
                    }} />
                    Select as Finalist
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Button size="lg" onClick={() => setIsInitModalOpen(true)} disabled={selectedTeams.length === 0}>
              INITIALIZE FINAL ROUND
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={isInitModalOpen}
        onClose={() => setIsInitModalOpen(false)}
        onConfirm={handleInitialize}
        title="Initialize Final Round"
        description="Selected teams will become finalists. Participant dashboards will switch to Rating Pad mode."
        confirmText="Initialize Finals"
      />
    </div>
  );
}
