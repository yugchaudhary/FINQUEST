'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Badge } from '@/components/ui/badge';
import { Hash, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { importRegistrations, confirmRegistrationImport, getAllowedRegistrations, clearAllAllowedRegistrations } from '@/app/actions/setup';

export default function SetupPage() {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [existingRegs, setExistingRegs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadExisting = async () => {
    const data = await getAllowedRegistrations();
    setExistingRegs(data);
  };

  useEffect(() => {
    loadExisting();
  }, []);

  const totalRegs = existingRegs.length;
  const usedRegs = existingRegs.filter(r => r.is_used).length;
  const availableRegs = totalRegs - usedRegs;

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await importRegistrations(formData);
      if (response?.success && response?.data) {
        setPreviewData(response.data);
        if (response.data.length === 0) {
          setError('No valid registration numbers found. Ensure the column is named "Registration Number".');
        }
      } else {
        setError(response?.error || 'Failed to parse file');
      }
    } catch (e: any) {
      setError(e.message || 'Error uploading file');
    }
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const result = await confirmRegistrationImport(previewData);
      if (result?.success) {
        setIsConfirmModalOpen(false);
        setPreviewData([]);
        setSuccess(`Successfully imported ${previewData.length} registration numbers.`);
        loadExisting();
      } else {
        setError(result?.error || 'Failed to import to database');
      }
    } catch (e: any) {
      setError(e.message || 'Error saving to database');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    setError(null);
    try {
      const result = await clearAllAllowedRegistrations();
      if (result?.success) {
        setIsClearModalOpen(false);
        setSuccess('All registration numbers have been cleared.');
        loadExisting();
      } else {
        setError(result?.error || 'Failed to clear registrations');
      }
    } catch (e: any) {
      setError(e.message || 'Error clearing data');
    } finally {
      setIsClearing(false);
    }
  };

  const columns = [{ header: 'Registration Number', accessorKey: 'registration_number' }];

  const existingColumns = [
    { header: 'Registration Number', accessorKey: 'registration_number' },
    {
      header: 'Status',
      accessorKey: 'is_used',
      cell: (row: any) => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${row.is_used ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
          {row.is_used ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          {row.is_used ? 'Used' : 'Available'}
        </span>
      )
    },
    {
      header: 'Used By',
      accessorKey: 'used_by_user_id',
      cell: (row: any) => (
        <span className="text-xs text-gray-500 font-mono">
          {row.used_by_user_id ? row.used_by_user_id.substring(0, 8) + '...' : '—'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-space-grotesk font-bold">Registration Setup</h1>
        {existingRegs.length > 0 && (
          <Button
            variant="ghost"
            className="text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setIsClearModalOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Numbers
          </Button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Reg. Numbers', value: totalRegs, icon: Hash, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'Available', value: availableRegs, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Used / Claimed', value: usedRegs, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-center gap-4 p-4 rounded-xl border ${stat.bg}`}>
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      <Card variant="glass">
        <CardHeader>Import Allowed Registration Numbers (Excel / CSV)</CardHeader>
        <CardContent>
          <FileUpload accept=".xlsx,.xls,.csv" onFileSelect={handleFileSelect} />
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>Preview — {previewData.length} records found</div>
            <Button onClick={() => setIsConfirmModalOpen(true)}>Import Now</Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={previewData} />
          </CardContent>
        </Card>
      )}

      <Card variant="glass">
        <CardHeader>Allowed Registration Numbers ({existingRegs.length})</CardHeader>
        <CardContent className="p-0">
          <DataTable columns={existingColumns} data={existingRegs} emptyMessage="No registration numbers uploaded yet." />
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmImport}
        title="Confirm Registration Import"
        description={`Import ${previewData.length} registration numbers? Duplicates will be safely ignored.`}
        confirmText={isImporting ? 'Importing...' : 'Yes, Import'}
      />

      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAll}
        title="⚠️ Clear All Registration Numbers"
        description="This will permanently delete ALL registration numbers from the database. This action cannot be undone. Use this only for testing resets."
        confirmText={isClearing ? 'Clearing...' : 'Yes, Clear Everything'}
      />
    </div>
  );
}
