'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'live' | 'locked' | 'complete' | 'pending' | 'error' | 'gold' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  className = '', 
  variant = 'default', 
  size = 'md',
  children,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-full font-medium';
  
  const variants = {
    default: 'bg-surface-2 text-slate-500 border border-border',
    live: 'bg-red-500/10 text-red-500 border border-red-500/20',
    locked: 'bg-surface-2 text-slate-500 border border-border',
    complete: 'bg-green-500/10 text-green-500 border border-green-500/20',
    pending: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border border-red-500/20',
    gold: 'bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    outline: 'bg-transparent text-slate-600 border border-gray-600',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {variant === 'live' && (
        <span className="mr-1.5 flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      {children}
    </span>
  );
};
