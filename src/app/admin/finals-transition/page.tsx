'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { changeTeamStatus, initializeFinals } from '@/app/actions/finals';

export default function FinalsTransitionPage() {
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  // dummy data for illustration
  const teams = [{ id: '1', name: 'Team Alpha', role: 'INVESTOR' }];

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
              <div key={team.id} className="flex items-center justify-between p-4 border border-[#2a2a3a] rounded-lg">
                <div>
                  <span className="font-bold">{team.name}</span> - <span className="text-gray-400">{team.role}</span>
                </div>
                <div className="flex gap-4 items-center">
                  <Button variant="outline" size="sm" onClick={() => changeTeamStatus(team.id, 'INNOVATOR')}>
                    Make Innovator
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
