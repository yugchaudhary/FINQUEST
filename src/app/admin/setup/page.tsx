'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Badge } from '@/components/ui/badge';
import { importRegistrations, confirmRegistrationImport, getAllowedRegistrations } from '@/app/actions/setup';

export default function SetupPage() {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [existingRegs, setExistingRegs] = useState<any[]>([]);
  
  const loadExisting = async () => {
    const data = await getAllowedRegistrations();
    setExistingRegs(data);
  };

  useEffect(() => {
    loadExisting();
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const response = await importRegistrations(formData);
    if (response?.data) setPreviewData(response.data);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    await confirmRegistrationImport(previewData);
    setIsImporting(false);
    setIsConfirmModalOpen(false);
    setPreviewData([]);
    loadExisting();
  };

  const columns = [
    { header: 'Registration Number', accessorKey: 'registration_number' },
  ];

  const existingColumns = [
    { header: 'Registration Number', accessorKey: 'registration_number' },
    { 
      header: 'Status', 
      accessorKey: 'is_used',
      cell: (row: any) => (
        <Badge variant={row.is_used ? 'default' : 'complete'}>
          {row.is_used ? 'Used' : 'Available'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-space-grotesk font-bold">Registration Setup</h1>
      
      <Card variant="glass">
        <CardHeader>Import Allowed Registrations (Excel/CSV)</CardHeader>
        <CardContent>
          <FileUpload 
            accept=".xlsx,.xls,.csv" 
            onFileSelect={handleFileSelect} 
          />
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>Preview ({previewData.length} records)</div>
            <Button onClick={() => setIsConfirmModalOpen(true)}>Import Now</Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={previewData} />
          </CardContent>
        </Card>
      )}

      <Card variant="glass" className="mt-8">
        <CardHeader>Registered Allowed Numbers ({existingRegs.length})</CardHeader>
        <CardContent className="p-0">
          <DataTable columns={existingColumns} data={existingRegs} emptyMessage="No registration numbers uploaded yet." />
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmImport}
        title="Confirm Registration Import"
        description={`Are you sure you want to import ${previewData.length} registration numbers? Duplicate numbers will be safely ignored.`}
        confirmText={isImporting ? "Importing..." : "Yes, import"}
      />
    </div>
  );
}
