import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Lock, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showSummary, setShowSummary] = useState(false);

  const isFinalized = selectionState.status === 'FINALIZED';
  const minReached = selections.length >= MIN_PROBLEM_SELECTIONS;

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
      <div className="w-full pt-8">
        <div className="text-xs font-bold text-gray-500 tracking-widest mb-4 ml-1">YOUR CHALLENGE</div>
        <Card className="w-full bg-[#16161f] border-[#2a2a3a]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-500">
            <FileText className="w-10 h-10 mb-4 opacity-50" />
            <p className="text-lg font-medium text-white mb-2">Problem Statements Not Available</p>
            <p>Your category's problem statements haven't been published yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get selected problem details for summary
  const selectedProblems = problems.filter(p => selections.includes(p.id));

  return (
    <div className="w-full pt-8 relative" id="problem-selection">
      <div className="text-xs font-bold text-gray-500 tracking-widest mb-4 ml-1">YOUR CHALLENGE</div>
      
      {/* Sticky Progress Bar */}
      <div className="sticky top-16 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-t border-[#2a2a3a] -mx-4 px-4 py-4 mb-8 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-space-grotesk font-bold text-white flex items-center gap-2">
              {isFinalized ? (
                <>
                  <Lock className="w-4 h-4 text-purple-400" />
                  Problem Set Finalized
                </>
              ) : (
                'Select Your Problem Statements'
              )}
            </h3>
            <p className="text-sm text-gray-400">
              {isFinalized 
                ? "Your team's selection is locked."
                : `Combine at least ${MIN_PROBLEM_SELECTIONS} problems into ONE solution.`}
            </p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none">
              <div className="text-xs text-gray-500 font-bold mb-1">PROBLEMS SELECTED</div>
              {minReached ? (
                <div className="text-green-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {isFinalized ? `${selections.length} PROBLEMS` : `${selections.length} / ${MIN_PROBLEM_SELECTIONS} MINIMUM REACHED`}
                </div>
              ) : (
                <div className="text-yellow-500 font-bold">
                  {selections.length} / {MIN_PROBLEM_SELECTIONS} MINIMUM
                </div>
              )}
            </div>
            
            {!isFinalized && (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!minReached}
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
              >
                FINALIZE
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-sm mb-6">
          {error}
        </div>
      )}

      {/* Grid of problems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {problems.map((p) => {
          const isSelected = selections.includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => !isFinalized && toggleSelection(p.id)}
              className={`
                relative p-6 rounded-xl border-2 transition-all h-full flex flex-col
                ${isFinalized 
                  ? isSelected 
                    ? 'bg-purple-900/20 border-purple-500/50 cursor-default' 
                    : 'bg-black/40 border-[#2a2a3a] opacity-40 cursor-not-allowed'
                  : isSelected 
                    ? 'bg-purple-900/20 border-purple-500 cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.15)] scale-[1.02]' 
                    : 'bg-[#16161f] border-[#2a2a3a] hover:border-purple-500/50 hover:bg-[#1a1a24] cursor-pointer'
                }
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className={`font-mono ${isSelected ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                  #{String(p.number).padStart(2, '0')}
                </Badge>
                {isSelected && (
                  <div className="flex items-center gap-1 text-purple-400 text-xs font-bold bg-purple-500/10 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" /> SELECTED
                  </div>
                )}
              </div>
              
              <h4 className="font-bold text-white text-lg mb-3 leading-tight">{p.title}</h4>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">{p.description}</p>
              
              {loadingId === p.id && (
                <div className="absolute inset-0 bg-[#0a0a0f]/60 rounded-xl flex items-center justify-center backdrop-blur-[2px]">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Problems Summary */}
      {selections.length > 0 && (
        <Card className="w-full bg-[#16161f] border-[#2a2a3a] overflow-hidden mb-8">
          <button 
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            onClick={() => setShowSummary(!showSummary)}
          >
            <div className="flex items-center gap-3">
              <h3 className="font-space-grotesk font-bold text-white">YOUR SELECTED PROBLEMS</h3>
              <Badge variant="outline" className="bg-white/5 text-gray-400 border-white/10">{selections.length}</Badge>
            </div>
            {showSummary ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </button>
          
          {showSummary && (
            <div className="p-4 pt-0 border-t border-[#2a2a3a]">
              <div className="space-y-2 mt-4">
                {selectedProblems.map((p, idx) => (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded bg-black/30 border border-[#2a2a3a]">
                    <div className="text-purple-400 mt-0.5"><CheckCircle2 className="w-4 h-4" /></div>
                    <div>
                      <span className="font-mono text-gray-500 text-xs mr-2">#{String(p.number).padStart(2, '0')}</span>
                      <span className="font-medium text-gray-200">{p.title}</span>
                      <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleFinalize}
        title="FINALIZE YOUR PROBLEM SET"
        description={`You have selected ${selections.length} problem statements. These problems will form the basis of your team's ONE integrated product, service, or solution. Once finalized, the selection will follow the event rules and cannot be changed without admin approval.`}
        confirmText={isFinalizing ? "Locking..." : "FINALIZE"}
      />
    </div>
  );
}
