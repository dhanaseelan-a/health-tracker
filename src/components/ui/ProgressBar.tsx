'use client';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = false,
  color = 'bg-brand-500',
  size = 'md',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-charcoal-500 font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-xs text-charcoal-400 font-medium">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-surface-200 rounded-full overflow-hidden`}>
        <div
          className={`${heights[size]} ${color} rounded-full progress-bar-fill`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  );
}
