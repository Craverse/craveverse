'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface DebugButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Debug button with extensive logging to diagnose click issues
 */
export function DebugButton({ onClick, disabled, children, className }: DebugButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('🔵 Button clicked!', { disabled, timestamp: Date.now() });
    e.preventDefault();
    e.stopPropagation();
    
    try {
      onClick();
      console.log('✅ onClick handler executed successfully');
    } catch (error) {
      console.error('❌ onClick handler error:', error);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={className}
      style={{ 
        pointerEvents: disabled ? 'none' : 'auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        zIndex: 9999
      }}
      onMouseEnter={() => console.log('🟢 Button hover')}
      onMouseDown={() => console.log('🟡 Button mousedown')}
      onMouseUp={() => console.log('🟣 Button mouseup')}
    >
      {children}
    </Button>
  );
}
