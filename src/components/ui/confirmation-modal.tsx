'use client';

import React, { useState } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Input } from './input';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  requireStringConfirmation?: string;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  requireStringConfirmation,
  isLoading = false,
}) => {
  const [confirmString, setConfirmString] = useState('');

  const isConfirmDisabled = requireStringConfirmation 
    ? confirmString !== requireStringConfirmation 
    : false;

  const handleConfirm = async () => {
    if (isConfirmDisabled || isLoading) return;
    await onConfirm();
    setConfirmString('');
  };

  const handleClose = () => {
    if (isLoading) return;
    setConfirmString('');
    onClose();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button 
        variant={isDanger ? 'destructive' : 'default'} 
        onClick={handleConfirm}
        disabled={isConfirmDisabled || isLoading}
        isLoading={isLoading}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant={isDanger ? 'warning' : 'default'}
      closeOnOutsideClick={!isLoading}
      footer={footer}
    >
      <div className="flex flex-col space-y-4 pt-4">
        <div className="flex items-start space-x-4">
          {isDanger && (
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold font-display text-foreground mb-2">{title}</h3>
            <div className="text-slate-500 text-sm space-y-2">
              {description}
            </div>
          </div>
        </div>

        {requireStringConfirmation && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-slate-500 mb-2">
              Please type <span className="font-mono font-bold text-foreground select-all">{requireStringConfirmation}</span> to confirm.
            </p>
            <Input
              value={confirmString}
              onChange={(e) => setConfirmString(e.target.value)}
              placeholder={requireStringConfirmation}
              className="font-mono"
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
