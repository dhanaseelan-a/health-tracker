'use client';

import type { WeightEntry, WeightGoal } from '@/types';

interface WeightChartProps {
  entries: WeightEntry[];
  goal: WeightGoal | null;
}

export function WeightChart({ entries, goal }: WeightChartProps) {
  if (entries.length < 2) return null;

  // Sort by date ascending for chart
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last20 = sorted.slice(-20); // Show last 20 entries

  const weights = last20.map((e) => e.weight);
  const minW = Math.min(...weights, goal?.targetWeight || Infinity) - 2;
  const maxW = Math.max(...weights, goal?.startWeight || -Infinity) + 2;
  const range = maxW - minW || 1;

  const width = 100;
  const height = 40;
  const padding = { top: 4, bottom: 4, left: 0, right: 0 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = last20.map((entry, i) => {
    const x = padding.left + (i / (last20.length - 1)) * chartW;
    const y = padding.top + chartH - ((entry.weight - minW) / range) * chartH;
    return { x, y, entry };
  });

  // Build path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  // Area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(2)} ${height} L ${points[0].x.toFixed(2)} ${height} Z`;

  // Target line
  const targetY = goal?.targetWeight
    ? padding.top + chartH - ((goal.targetWeight - minW) / range) * chartH
    : null;

  return (
    <div className="chart-container">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        style={{ minHeight: '160px' }}
        role="img"
        aria-label="Weight history chart"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + chartH * (1 - frac);
          return (
            <line
              key={frac}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e7e5e4"
              strokeWidth="0.15"
            />
          );
        })}

        {/* Area gradient */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f9b6b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2f9b6b" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#2f9b6b"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Target line */}
        {targetY !== null && targetY >= padding.top && targetY <= height - padding.bottom && (
          <line
            x1={padding.left}
            y1={targetY}
            x2={width - padding.right}
            y2={targetY}
            stroke="#f59e0b"
            strokeWidth="0.3"
            strokeDasharray="1.5 1"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 1 : 0.6}
            fill={i === points.length - 1 ? '#2f9b6b' : '#fff'}
            stroke="#2f9b6b"
            strokeWidth="0.3"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center text-xs text-charcoal-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-brand-500 rounded" />
          Weight
        </span>
        {goal?.targetWeight && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-amber-400 rounded" style={{ borderStyle: 'dashed' }} />
            Target ({goal.targetWeight} {goal.unit})
          </span>
        )}
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-1 text-[0.6rem] text-charcoal-300">
        <span>{last20[0]?.date?.slice(5)}</span>
        <span>{last20[last20.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}
