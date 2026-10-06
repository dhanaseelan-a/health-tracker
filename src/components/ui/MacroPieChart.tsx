import React from 'react';
import { formatNumber } from '@/lib/utils';

interface MacroPieChartProps {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
  proteinTarget?: number;
  fatTarget?: number;
  carbsTarget?: number;
  fiber?: number;
  sugar?: number;
  fiberTarget?: number;
  sugarTarget?: number;
  size?: number;
}

export function MacroPieChart({ 
  protein, fat, carbs, calories, 
  proteinTarget = 50, fatTarget = 65, carbsTarget = 250, 
  fiber = 0, sugar = 0, fiberTarget = 30, sugarTarget = 50, size = 120 
}: MacroPieChartProps) {
  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const carbsCals = carbs * 4;
  const rProtein = Math.round(protein);
  const rFat = Math.round(fat);
  const rCarbs = Math.round(carbs);
  const totalGrams = rProtein + rFat + rCarbs;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentages (0 to 1) based on total rounded grams
  const pPct = totalGrams > 0 ? rProtein / totalGrams : 0;
  const fPct = totalGrams > 0 ? rFat / totalGrams : 0;
  const cPct = totalGrams > 0 ? rCarbs / totalGrams : 0;

  // Calculate stroke dasharrays
  const pDash = pPct * circumference;
  const fDash = fPct * circumference;
  const cDash = cPct * circumference;

  // Use positive offset logic to prevent Safari/SVG rotation bugs
  // offset = dashLength + circumference - startPosition
  const pOffset = pDash + circumference;
  const fOffset = fDash + circumference - pDash;
  const cOffset = cDash + circumference - (pDash + fDash);

  // Calculate display percentages for the legend based on Daily Targets
  const pDisplayPct = proteinTarget > 0 ? (rProtein / proteinTarget) * 100 : 0;
  const fDisplayPct = fatTarget > 0 ? (rFat / fatTarget) * 100 : 0;
  const cDisplayPct = carbsTarget > 0 ? (rCarbs / carbsTarget) * 100 : 0;
  
  const rFiber = Math.round(fiber);
  const rSugar = Math.round(sugar);
  const fiberDisplayPct = fiberTarget > 0 ? (rFiber / fiberTarget) * 100 : 0;
  const sugarDisplayPct = sugarTarget > 0 ? (rSugar / sugarTarget) * 100 : 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 w-full">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
          />
          
          {totalGrams > 0 && (
            <>
              {/* Protein (Blue) */}
              {pPct > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#3b82f6" // blue-500
                  strokeWidth="12"
                  strokeDasharray={`${pDash} ${circumference}`}
                  strokeDashoffset={pOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out origin-center"
                />
              )}
              {/* Fat (Amber) */}
              {fPct > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#f59e0b" // amber-500
                  strokeWidth="12"
                  strokeDasharray={`${fDash} ${circumference}`}
                  strokeDashoffset={fOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out origin-center"
                />
              )}
              {/* Carbs (Purple) */}
              {cPct > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#a855f7" // purple-500
                  strokeWidth="12"
                  strokeDasharray={`${cDash} ${circumference}`}
                  strokeDashoffset={cOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out origin-center"
                />
              )}
            </>
          )}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-white tabular-nums leading-none">
            {formatNumber(Math.round(calories))}
          </span>
          <span className="text-[0.6rem] text-charcoal-400 mt-1 uppercase tracking-wider font-semibold">
            kcal
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 w-full flex-1">
        <div className="flex items-center justify-between text-xs w-full">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            <span className="text-charcoal-300 font-medium">Protein</span>
          </div>
          <div className="flex items-center gap-2 text-charcoal-400">
            <span className="tabular-nums font-medium text-white">{rProtein}g</span>
            <span className="w-8 text-right opacity-50">{Math.round(pDisplayPct)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs w-full">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span className="text-charcoal-300 font-medium">Fat</span>
          </div>
          <div className="flex items-center gap-2 text-charcoal-400">
            <span className="tabular-nums font-medium text-white">{rFat}g</span>
            <span className="w-8 text-right opacity-50">{Math.round(fDisplayPct)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs w-full">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
            <span className="text-charcoal-300 font-medium">Carbs</span>
          </div>
          <div className="flex items-center gap-2 text-charcoal-400">
            <span className="tabular-nums font-medium text-white">{rCarbs}g</span>
            <span className="w-8 text-right opacity-50">{Math.round(cDisplayPct)}%</span>
          </div>
        </div>
        {(fiber > 0 || sugar > 0) && (
          <div className="flex flex-col gap-3">
            {fiber > 0 && (
              <div className="flex items-center justify-between text-xs w-full">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-charcoal-300 font-medium">Fiber</span>
                </div>
                <div className="flex items-center gap-2 text-charcoal-400">
                  <span className="tabular-nums font-medium text-white">{rFiber}g</span>
                  <span className="w-8 text-right opacity-50">{Math.round(fiberDisplayPct)}%</span>
                </div>
              </div>
            )}
            {sugar > 0 && (
              <div className="flex items-center justify-between text-xs w-full">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
                  <span className="text-charcoal-300 font-medium">Sugar</span>
                </div>
                <div className="flex items-center gap-2 text-charcoal-400">
                  <span className="tabular-nums font-medium text-white">{rSugar}g</span>
                  <span className="w-8 text-right opacity-50">{Math.round(sugarDisplayPct)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
