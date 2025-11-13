"use client";

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface StrategyNotesBoxProps {
  strategyId: string;
  strategyName: string;
  text: string;
  onTextChange: (strategyId: string, newText: string) => void;
  style: React.CSSProperties; // For absolute positioning
}

const StrategyNotesBox: React.FC<StrategyNotesBoxProps> = ({
  strategyId,
  strategyName,
  text,
  onTextChange,
  style,
}) => {
  return (
    <div
      className={cn(
        "absolute bg-white p-3 rounded-lg shadow-md border border-gray-200 z-10",
        "w-[200px] h-[180px] flex flex-col" // Fixed size for consistency
      )}
      style={style}
    >
      <h4 className="text-base font-palanquin font-semibold text-app-header mb-2">
        {strategyId}. {strategyName}
      </h4>
      <Textarea
        value={text}
        onChange={(e) => onTextChange(strategyId, e.target.value)}
        placeholder="Add notes for this strategy..."
        rows={4}
        className="flex-grow w-full min-h-[100px] text-sm font-roboto-condensed resize-none"
      />
    </div>
  );
};

export default StrategyNotesBox;