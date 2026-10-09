'use client';

import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, prefix, suffix, type, ...props }, ref) => {
    
    // For numbers, we might want to prevent non-numeric input on keypress if needed, 
    // but standard HTML5 input type="number" handles most of this.
    
    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && <label className="text-sm font-medium text-slate-500">{label}</label>}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-500">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`w-full rounded-md border bg-surface py-2 text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
              prefix ? 'pl-9' : 'pl-3'
            } ${suffix ? 'pr-9' : 'pr-3'} ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-border'
            } ${className}`}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 flex items-center pointer-events-none text-slate-500">
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
