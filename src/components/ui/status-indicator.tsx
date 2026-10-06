'use client';

import React from 'react';

export interface StatusIndicatorProps {
  status: 'live' | 'active' | 'pending' | 'offline' | 'error';
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  label,
  className = '' 
}) => {
  const colors = {
    live: 'bg-red-500',
    active: 'bg-green-500',
    pending: 'bg-amber-500',
    offline: 'bg-gray-500',
    error: 'bg-red-600',
  };

  const pingColors = {
    live: 'bg-red-400',
    active: 'bg-green-400',
    pending: 'bg-amber-400',
    offline: 'bg-gray-400',
    error: 'bg-red-500',
  };

  const shouldPing = status === 'live' || status === 'active' || status === 'pending';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5">
        {shouldPing && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingColors[status]}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`}></span>
      </span>
      {label && <span className="text-sm font-medium text-[#9ca3af]">{label}</span>}
    </div>
  );
};
