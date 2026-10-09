'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

export default function SettingsPage() {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleReset = async () => {
    // call reset action
    setIsResetModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Settings</h1>
      
      <Card variant="glass">
        <CardHeader>Event Configuration</CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-bold">Multipliers</h3>
            <pre className="bg-surface p-4 rounded-lg text-sm text-slate-600 mt-2 border border-border">
              {JSON.stringify({ RED_WIN: 1.5, BLUE_WIN: 1.5, DRAW: 1.0 }, null, 2)}
            </pre>
          </div>
          <div>
            <Button variant="outline">View Documentation</Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="red" className="border-red-500/30">
        <CardHeader className="text-red-500">Danger Zone</CardHeader>
        <CardContent>
          <p className="text-slate-500 mb-4">Resetting the event state will wipe all current progress, matches, and balances. This cannot be undone.</p>
          <Button variant="destructive" onClick={() => setIsResetModalOpen(true)}>RESET EVENT STATE</Button>
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleReset}
        title="DANGER: Reset Event State"
        description="Are you absolutely sure? This will wipe ALL data for the current event."
        confirmText="YES, RESET EVERYTHING"
      />
    </div>
  );
}
