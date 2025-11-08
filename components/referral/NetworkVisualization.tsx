'use client';

import React from 'react';

interface NetworkVisualizationProps {
  totalReferrals: number;
}

export function NetworkVisualization({ totalReferrals }: NetworkVisualizationProps) {
  // Generate network nodes
  const nodes = React.useMemo(() => {
    const count = Math.min(totalReferrals, 20); // Limit to 20 nodes for performance
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 2 * Math.PI;
      const radius = 60 + (i % 3) * 20;
      return {
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
        size: 3 + (i % 3),
      };
    });
  }, [totalReferrals]);

  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Network connections */}
        {nodes.map((node, i) => (
          <line
            key={`line-${i}`}
            x1="50"
            y1="50"
            x2={node.x}
            y2={node.y}
            stroke="rgba(168, 85, 247, 0.3)"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Network nodes */}
        {nodes.map((node, i) => (
          <circle
            key={`node-${i}`}
            cx={node.x}
            cy={node.y}
            r={node.size}
            fill="rgba(168, 85, 247, 0.6)"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.8))',
            }}
          />
        ))}
        
        {/* Center node */}
        <circle
          cx="50"
          cy="50"
          r="4"
          fill="rgba(168, 85, 247, 1)"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 1))',
          }}
        />
      </svg>
    </div>
  );
}
