import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, FileText, Loader2, Info } from 'lucide-react';
import { selectProblem, deselectProblem, finalizeSelection } from '@/app/actions/problem-selections';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { MIN_PROBLEM_SELECTIONS } from '@/lib/constants';

interface Problem {
  id: string;
  number: number;
  title: string;
  description: string;
}

interface SelectionState {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINALIZED';
}

interface ProblemSelectionPanelProps {
  problems: Problem[];
  selections: string[];
  selectionState: SelectionState;
  onUpdate: () => void;
}

export function ProblemSelectionPanel({ problems, selections, selectionState, onUpdate }: ProblemSelectionPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFinalized = selectionState.status === 'FINALIZED';

  const toggleSelection = async (problemId: string) => {
    if (isFinalized) return;
    setLoadingId(problemId);
    setError(null);
    
    const isSelected = selections.includes(problemId);
    let res;
    
    if (isSelected) {
      res = await deselectProblem(problemId);
    } else {
      res = await selectProblem(problemId);
    }

    if (!res.success) {
      setError(res.error);
    } else {
      onUpdate();
    }
    setLoadingId(null);
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    setError(null);
    const res = await finalizeSelection();
    if (res.success) {
      setShowConfirm(false);
      onUpdate();
    } else {
      setError(res.error);
    }
    setIsFinalizing(false);
  };

  if (problems.length === 0) {
    return (
      <Card className="w-full bg-[#16161f] border-[#2a2a3a]">
        <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FileText className="w-8 h-8 mb-4 opacity-50" />
          <p>No problem statements have been published for your category yet.</p>
          <p className="text-sm mt-2">Wait for the admin to publish them.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#16161f] p-4 rounded-lg border border-[#2a2a3a]">
        <div>
          <h3 className="text-lg font-space-grotesk font-bold text-white flex items-center gap-2">
            Problem Statement Selection
            {isFinalized && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">FINALIZED</Badge>}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {isFinalized 
              ? "Your team's selection is locked."
              : `Combine at least ${MIN_PROBLEM_SELECTIONS} problems into ONE solution. Weird, funny and pitchable wins.`}
          </p>
        </div>
        
        {!isFinalized && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className={selections.length >= MIN_PROBLEM_SELECTIONS ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>
                {selections.length} Selected
              </span>
              <span className="text-gray-500">/ {MIN_PROBLEM_SELECTIONS} Min</span>
            </div>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={selections.length < MIN_PROBLEM_SELECTIONS}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              FINALIZE SELECTION
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {problems.map((p) => {
          const isSelected = selections.includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => !isFinalized && toggleSelection(p.id)}
              className={`
                relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col h-full
                ${isSelected 
                  ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                  : isFinalized 
                    ? 'bg-black/40 border-[#2a2a3a] opacity-50 cursor-not-allowed'
                    : 'bg-[#16161f] border-[#2a2a3a] hover:border-purple-500/50 hover:bg-[#1a1a24]'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
              )}
              <Badge variant="outline" className={`w-fit mb-3 ${isSelected ? 'border-purple-500/50 text-purple-400' : 'border-gray-700 text-gray-500'}`}>
                Problem #{p.number}
              </Badge>
              <h4 className="font-bold text-white mb-2 line-clamp-2">{p.title}</h4>
              <p className="text-sm text-gray-400 flex-1">{p.description}</p>
              
              {loadingId === p.id && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleFinalize}
        title="Lock Problem Selection?"
        description={`Your team has selected ${selections.length} problem statements. Once finalized, you cannot change this selection without asking an admin. Are you ready to lock it in?`}
        confirmText={isFinalizing ? "Locking..." : "Yes, Lock Selection"}
      />
    </div>
  );
}
