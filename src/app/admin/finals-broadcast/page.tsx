'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { broadcastFinalist, getFinalists } from '@/app/actions/finals';
import { getEventState } from '@/app/actions/event-state';

export default function FinalsBroadcastPage() {
  const [finalists, setFinalists] = useState<any[]>([]);
  const [selectedFinalist, setSelectedFinalist] = useState('');
  const [activeFinalist, setActiveFinalist] = useState<any>(null);

  useEffect(() => {
    const fetchInit = async () => {
      const [fResult, eResult] = await Promise.all([
        getFinalists(),
        getEventState()
      ]);
      
      let loadedFinalists: any[] = [];
      if (fResult.success) {
        loadedFinalists = fResult.data || [];
        setFinalists(loadedFinalists);
      }
      
      if (eResult?.success && eResult.data?.eventState?.current_finalist_id) {
        const currentId = eResult.data.eventState.current_finalist_id;
        const current = loadedFinalists.find(f => f.id === currentId);
        if (current) {
          setActiveFinalist(current);
          setSelectedFinalist(currentId);
        }
      }
    };
    fetchInit();
  }, []);

  const handleBroadcast = async () => {
    if (!selectedFinalist) return;
    const finalist = finalists.find(f => f.id === selectedFinalist);
    await broadcastFinalist(selectedFinalist);
    setActiveFinalist(finalist);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Finals Broadcast</h1>
      
      <Card variant="glass">
        <CardHeader>Select Finalist to Pitch</CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Select 
                label="Finalist Team" 
                options={[{label: 'Select a team', value: ''}, ...finalists.map(f => ({ label: f.team_name, value: f.id }))]} 
                value={selectedFinalist} 
                onChange={(e) => setSelectedFinalist(e.target.value)} 
              />
            </div>
            <Button size="lg" onClick={handleBroadcast} disabled={!selectedFinalist}>
              BROADCAST FINALIST
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeFinalist && (
        <Card variant="elevated" className="border-[#8b5cf6]">
          <CardHeader>Currently Pitching: {activeFinalist.team_name}</CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <h2 className="text-4xl font-bold mb-4">{activeFinalist.team_name}</h2>
              <div className="text-xl text-gray-400">Waiting for investor scores...</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
