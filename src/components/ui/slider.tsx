'use client';

import React, { useRef, useState, useEffect } from 'react';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  formatLabel?: (value: number) => string;
  className?: string;
  accentColor?: 'violet' | 'red' | 'blue';
}

export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel = (v) => v.toString(),
  className = '',
  accentColor = 'violet'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;
  
  const accentColors = {
    violet: '#8b5cf6',
    red: '#ef4444',
    blue: '#3b82f6'
  };

  const color = accentColors[accentColor];

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-slate-500">{formatLabel(min)}</span>
        <span className="text-lg font-bold text-foreground tracking-wide font-display">{formatLabel(value)}</span>
        <span className="text-xs text-slate-500">{formatLabel(max)}</span>
      </div>
      
      <div className="relative h-6 flex items-center group">
        <div className="absolute w-full h-2 bg-surface-2 rounded-full overflow-hidden border border-border">
          <div 
            className="h-full rounded-full transition-all duration-150 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute w-full h-full opacity-0 cursor-pointer touch-none z-10"
        />
        
        <div 
          className={`absolute h-6 w-6 rounded-full bg-white shadow-lg pointer-events-none transform -translate-x-1/2 transition-transform duration-150 ${isDragging ? 'scale-125' : 'scale-100 group-hover:scale-110'}`}
          style={{ 
            left: `${percentage}%`,
            border: `2px solid ${color}`
          }}
        />
      </div>
    </div>
  );
};
