import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
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
        <CardHeader className="text-red-500">Danger Zone: Reset Test Environment</CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4 font-medium">
            Permanently clear participants, teams, matches, investment ledgers, and trial scores to start a fresh test run.
          </p>
          <Link href="/admin/reset">
            <Button variant="destructive">GO TO RESET TEST DATA →</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
