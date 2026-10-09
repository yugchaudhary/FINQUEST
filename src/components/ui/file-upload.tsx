'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
  maxSizeMB?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  accept = '.xlsx,.xls,.csv', 
  isLoading = false,
  maxSizeMB = 5
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | undefined | null) => {
    setError(null);
    if (!file) return;

    // Check size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e.target.files?.[0])}
        accept={accept}
        className="hidden"
        disabled={isLoading}
      />
      
      {!selectedFile ? (
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center p-8 w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            isDragging 
              ? 'border-violet-500 bg-violet-500/10' 
              : 'border-border bg-surface hover:bg-surface-2 hover:border-[#3a3a4a]'
          } ${error ? 'border-red-500/50 bg-red-500/5' : ''}`}
        >
          <div className="p-4 rounded-full bg-surface-2 text-slate-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" x2="12" y1="3" y2="15"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Click or drag file to upload</h3>
          <p className="text-sm text-slate-500 text-center">
            Supported formats: {accept.replace(/,/g, ', ')} (Max {maxSizeMB}MB)
          </p>
          {error && <p className="mt-4 text-sm text-red-500 bg-red-500/10 px-3 py-1 rounded">{error}</p>}
        </motion.div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center space-x-4 overflow-hidden">
            <div className="p-2 rounded bg-violet-500/10 text-violet-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {isLoading ? (
              <div className="px-3 py-1.5 flex items-center space-x-2 rounded-md bg-surface-2 text-sm text-foreground">
                <svg className="animate-spin h-4 w-4 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={removeFile} type="button">
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
