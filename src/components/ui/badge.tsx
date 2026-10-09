import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'live' | 'locked' | 'complete' | 'pending' | 'error' | 'gold' | 'outline';
}

export function Badge({ className = '', variant = 'default', children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors border-2 border-black';
  
  const variants = {
    default: 'bg-surface text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    live: 'bg-red-50 text-red-600 shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] border-red-200',
    locked: 'bg-slate-100 text-slate-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    complete: 'bg-green-100 text-green-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    pending: 'bg-yellow-100 text-yellow-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    error: 'bg-red-100 text-red-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    outline: 'bg-surface text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {variant === 'live' && (
        <span className="mr-1.5 flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      {children}
    </div>
  );
}
