'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]); // would fetch from an action

  const columns = [
    { header: 'Timestamp', accessorKey: 'timestamp' },
    { header: 'Admin', accessorKey: 'admin' },
    { header: 'Action', accessorKey: 'action' },
    { header: 'Entity', accessorKey: 'entity' },
    { header: 'Details', accessorKey: 'details' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Audit Log</h1>
      
      <Card variant="glass">
        <CardContent className="p-6">
          <DataTable columns={columns} data={logs} emptyMessage="No audit logs found." />
        </CardContent>
      </Card>
    </div>
  );
}
