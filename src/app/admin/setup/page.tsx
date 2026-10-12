'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Key, 
  Hash, 
  ArrowRight,
  RefreshCw,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  importTeamsFromExcel, 
  confirmTeamExcelImport, 
  getExistingTeamsRoster,
  TeamRosterRow 
} from '@/app/actions/setup';
import { updateTeamRole } from '@/app/actions/teams';

export default function SetupPage() {
  const [previewData, setPreviewData] = useState<TeamRosterRow[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [existingTeams, setExistingTeams] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const handleRoleChange = async (teamId: string, newRole: 'INNOVATOR' | 'INVESTOR') => {
    setUpdatingRole(teamId);
    setError(null);
    setSuccess(null);
    const prevTeams = [...existingTeams];
    setExistingTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      return {
        ...t,
        role: newRole,
        category: newRole === 'INVESTOR' ? 'N/A' : (t.category === 'N/A' ? 'Unassigned' : t.category)
      };
    }));

    const result = await updateTeamRole(teamId, newRole);
    if (!result?.success) {
      setExistingTeams(prevTeams);
      setError(result?.error || 'Failed to update role');
    } else {
      setSuccess(`Role updated to ${newRole}`);
      await loadExisting();
    }
    setUpdatingRole(null);
  };

  const loadExisting = async () => {
    setLoadingExisting(true);
    try {
      const data = await getExistingTeamsRoster();
      setExistingTeams(data);
    } catch {
      setExistingTeams([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    loadExisting();
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await importTeamsFromExcel(formData);
      if (response?.success && response?.data) {
        setPreviewData(response.data);
        setSuccess(`Successfully extracted ${response.data.length} teams from ${selectedFile.name} (Format: Team No. | Team Name | Password). Click below to create accounts.`);
      } else {
        setError(response?.error || 'Failed to extract team data. Please ensure the Excel file has columns: Team No. | Team Name | Password');
      }
    } catch (e: any) {
      setError(e.message || 'Error processing uploaded file');
    }
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const result = await confirmTeamExcelImport(previewData);
      if (result?.success) {
        setIsConfirmModalOpen(false);
        setSuccess(`Successfully imported ${result.count || previewData.length} teams. Credentials have been activated.`);
        setPreviewData([]);
        loadExisting();
      } else {
        setError(result?.error || 'Failed to import teams to database');
      }
    } catch (e: any) {
      setError(e.message || 'Error saving teams to database');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
          <span>Event Setup</span>
          <span>→</span>
          <span className="text-accent-dark font-black">Team Roster Import</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-space-grotesk font-black text-foreground flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-accent-dark" />
          Team Setup & Excel Import
        </h1>
        <p className="text-slate-600 mt-2 font-medium max-w-3xl">
          Upload an Excel file with format <strong className="text-black font-mono bg-slate-200 px-1 py-0.5 rounded">Team No. | Team Name | Password</strong>. 
          Each team&apos;s name will serve as their unique participant login ID.
        </p>
      </div>

      {/* Format Requirement Guide */}
      <Card className="border-2 border-black bg-blue-50/60 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-blue-950 uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              Expected Excel Format (.xlsx / .xls / .csv)
            </h3>
            <p className="text-xs text-blue-900 font-medium">
              Create a spreadsheet with three columns: <strong>Team No.</strong>, <strong>Team Name</strong>, and <strong>Password</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-white border-2 border-black px-4 py-2 rounded-lg font-mono text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex gap-4">
              <div><span className="text-slate-400">Col A:</span> <strong>Team No.</strong></div>
              <div><span className="text-slate-400">Col B:</span> <strong>Team Name</strong></div>
              <div><span className="text-slate-400">Col C:</span> <strong>Password</strong></div>
            </div>
            <a href="/sample_teams_roster.xlsx" download="sample_teams_roster.xlsx">
              <Button variant="outline" size="sm" className="border-2 border-black font-bold whitespace-nowrap bg-white hover:bg-slate-100">
                Download Sample .xlsx
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-700 text-sm font-bold flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border-2 border-green-600 text-green-800 text-sm font-bold flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(34,197,94,1)]">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload Zone */}
      <Card className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader className="pb-3 border-b-2 border-black/5">
          <CardTitle className="text-lg font-black font-space-grotesk flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-dark" />
            Upload Team Roster File
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <FileUpload 
            onFileSelect={handleFileSelect} 
            accept=".xlsx, .xls, .csv" 
          />
        </CardContent>
      </Card>

      {/* Preview Section */}
      {previewData.length > 0 && (
        <Card className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b-2 border-black">
            <div>
              <CardTitle className="text-xl font-black font-space-grotesk">
                Import Preview ({previewData.length} Teams Detected)
              </CardTitle>
              <p className="text-xs text-slate-500 font-medium">
                Review team names and passwords before finalizing import.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPreviewData([])}
                className="border-2 border-black"
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setIsConfirmModalOpen(true)}
                className="border-2 border-black font-black uppercase tracking-wider"
              >
                Confirm & Create Teams →
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm font-medium">
              <thead className="bg-surface-2 text-xs uppercase font-black tracking-wider text-slate-700 border-b-2 border-black">
                <tr>
                  <th className="py-3 px-6 w-24">Team No.</th>
                  <th className="py-3 px-6">Team Name (Login ID)</th>
                  <th className="py-3 px-6">Assigned Password</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {previewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-6 font-mono font-bold text-slate-700">
                      {row.team_no || idx + 1}
                    </td>
                    <td className="py-3 px-6 font-bold text-black flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{row.team_name}</span>
                    </td>
                    <td className="py-3 px-6 font-mono text-slate-800">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {row.password}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        Ready to Create
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <CardFooter className="p-4 bg-surface-2/40 border-t-2 border-black flex justify-end">
            <Button 
              variant="default" 
              size="lg" 
              onClick={() => setIsConfirmModalOpen(true)}
              className="border-2 border-black font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Confirm & Create Teams ({previewData.length}) →
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Existing Teams Table */}
      <Card className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b-2 border-black/10">
          <div>
            <CardTitle className="text-lg font-black font-space-grotesk flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-dark" />
              Existing Active Teams ({existingTeams.length})
            </CardTitle>
            <p className="text-xs text-slate-500 font-medium">
              Teams currently registered in the database ready to participate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadExisting}
              disabled={loadingExisting}
              className="text-slate-600 hover:text-black gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loadingExisting ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/admin/categories">
              <Button variant="outline" size="sm" className="border-2 border-black gap-1.5 font-bold">
                Assign Categories →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loadingExisting ? (
            <div className="p-12 text-center text-slate-500 font-medium">Loading teams...</div>
          ) : existingTeams.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              No teams registered yet. Upload an Excel file above to get started.
            </div>
          ) : (
            <table className="w-full text-left text-sm font-medium">
              <thead className="bg-surface-2 text-xs uppercase font-black tracking-wider text-slate-700 border-b-2 border-black">
                <tr>
                  <th className="py-3 px-6 w-24">Team No.</th>
                  <th className="py-3 px-6">Team Name (Login ID)</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {existingTeams.map((team, idx) => (
                  <tr key={team.id || idx} className="hover:bg-slate-50">
                    <td className="py-3 px-6 font-mono font-bold text-slate-700">
                      {team.join_code || (idx + 1)}
                    </td>
                    <td className="py-3 px-6 font-bold text-black">
                      {team.team_name}
                    </td>
                    <td className="py-3 px-6">
                      <Badge variant="outline" className="text-xs">
                        {team.role === 'INVESTOR' ? 'N/A (Investor)' : (team.category || 'Unassigned')}
                      </Badge>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={updatingRole === team.id || team.role === 'INNOVATOR'}
                          onClick={() => handleRoleChange(team.id, 'INNOVATOR')}
                          className={`text-xs px-2.5 py-1 rounded font-bold font-mono border transition-all ${
                            team.role === 'INNOVATOR'
                              ? 'bg-purple-600 text-white border-purple-500 shadow-sm cursor-default'
                              : 'border-purple-500/30 text-purple-700 bg-purple-50 hover:bg-purple-100'
                          }`}
                        >
                          Innovator
                        </button>
                        <button
                          disabled={updatingRole === team.id || team.role === 'INVESTOR'}
                          onClick={() => handleRoleChange(team.id, 'INVESTOR')}
                          className={`text-xs px-2.5 py-1 rounded font-bold font-mono border transition-all ${
                            team.role === 'INVESTOR'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm cursor-default'
                              : 'border-blue-500/30 text-blue-700 bg-blue-50 hover:bg-blue-100'
                          }`}
                        >
                          Investor
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right text-xs text-slate-500 font-mono">
                      {team.created_at ? new Date(team.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
        {existingTeams.length > 0 && (
          <CardFooter className="p-4 bg-surface-2/30 border-t-2 border-black/10 flex justify-between items-center text-xs text-slate-600 font-medium">
            <span>Participants can sign in using their <strong>Team Name</strong> at <code>/login</code>.</span>
            <Link href="/admin/reset" className="text-red-600 hover:underline font-bold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Reset all test teams
            </Link>
          </CardFooter>
        )}
      </Card>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmImport}
        title="CONFIRM TEAM IMPORT"
        description={`This will create ${previewData.length} team accounts and activate their login credentials. Teams can immediately sign in with their Team Name and Password.`}
        confirmText={isImporting ? 'IMPORTING...' : 'YES, CREATE TEAMS'}
        isLoading={isImporting}
      />
    </div>
  );
}
