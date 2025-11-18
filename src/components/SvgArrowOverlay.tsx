"use client";

import React from 'react';

interface LArrow {
  start: { x: number; y: number };
  mid: { x: number; y: number }; // Corrected: 'y: y' changed to 'y: number'
  end: { x: number; y: number };
}

interface SvgArrowOverlayProps {
  arrows: LArrow[];
}

const SvgArrowOverlay: React.FC<SvgArrowOverlayProps> = ({ arrows }) => {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Important: allows clicks to pass through
        zIndex: 99, // Below sticky notes (100)
      }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="black" />
        </marker>
      </defs>
      {arrows.map((arrow, index) => (
        <g key={index}>
          {/* First segment of the L-shaped arrow */}
          <line
            x1={arrow.start.x}
            y1={arrow.start.y}
            x2={arrow.mid.x}
            y2={arrow.mid.y}
            stroke="black"
            strokeWidth="1"
          />
          {/* Second segment of the L-shaped arrow with the arrowhead */}
          <line
            x1={arrow.mid.x}
            y1={arrow.mid.y}
            x2={arrow.end.x}
            y2={arrow.end.y}
            stroke="black"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
          />
        </g>
      ))}
    </svg>
  );
};

export default SvgArrowOverlay;