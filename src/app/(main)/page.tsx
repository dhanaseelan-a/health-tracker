'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FoodFormModal } from '@/components/food/FoodFormModal';
import type { FoodEntry, DailyTargets, WaterEntry } from '@/types';
import { formatNumber } from '@/lib/utils';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TodayPage() {
  const today = new Date().toISOString().split('T')[0];
  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const { data: foodData, mutate: mutateFood } = useSWR(`/api/food?date=${today}`, fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
  const { data: targetData } = useSWR('/api/targets', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
  const { data: waterData, mutate: mutateWater } = useSWR(`/api/water?date=${today}`, fetcher, { revalidateOnFocus: false, revalidateIfStale: false });

  const entries: FoodEntry[] = foodData?.data || [];
  const waterEntries: WaterEntry[] = waterData?.data || [];
  const targets: DailyTargets | null = targetData?.data || null;
  const loading = !foodData || !targetData || !waterData;

  const [showAddFood, setShowAddFood] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [customWater, setCustomWater] = useState('');
  const { showToast } = useToast();

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbohydrates,
      fiber: acc.fiber + (e.fiber || 0),
      sugar: acc.sugar + (e.sugar || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 }
  );

  const waterTotal = waterEntries.reduce((acc, e) => acc + e.amount, 0);

  const calTarget = targets?.calories || 2000;
  const proteinTarget = targets?.protein || 50;
  const fatTarget = targets?.fat || 65;
  const carbTarget = targets?.carbohydrates || 250;
  const fiberTarget = targets?.fiber || 30;
  const sugarTarget = targets?.sugar || 50;
  const waterTarget = targets?.water || 2500;
  const trackCarbs = targets?.trackCarbs !== false;

  const handleDelete = async () => {
    if (!deleteId) return;
    
    // Optimistic UI Delete
    const previousEntries = [...entries];
    mutateFood({ ...foodData, data: entries.filter(e => e.id !== deleteId) }, false);

    try {
      const res = await fetch(`/api/food/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Entry deleted');
        mutateFood(); // Verify background
      } else {
        mutateFood({ ...foodData, data: previousEntries }, false);
        showToast('Failed to delete', 'error');
      }
    } catch {
      mutateFood({ ...foodData, data: previousEntries }, false);
      showToast('Failed to delete', 'error');
    }
    setDeleteId(null);
  };

  const handleFoodSaved = (savedEntry: FoodEntry) => {
    setShowAddFood(false);
    setEditingEntry(null);
    
    // Update local cache WITHOUT re-fetching from API
    const isEdit = entries.some(e => e.id === savedEntry.id);
    let newEntries: FoodEntry[] = [];
    
    if (isEdit) {
      newEntries = entries.map(e => e.id === savedEntry.id ? savedEntry : e);
    } else {
      // Add and sort by time
      newEntries = [savedEntry, ...entries].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    }
    
    mutateFood({ ...foodData, data: newEntries }, false);
    showToast('Food entry saved');
  };

  const handleAddWater = async (amount: number) => {
    // Optimistic UI Add
    const previousWater = [...waterEntries];
    const tempEntry = { id: Date.now().toString(), amount, date: today, createdAt: new Date().toISOString() };
    mutateWater({ ...waterData, data: [...waterEntries, tempEntry] }, false);

    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date: today })
      });
      if (res.ok) {
        showToast(`Added ${amount}ml water`, 'success');
        mutateWater();
      } else {
        mutateWater({ ...waterData, data: previousWater }, false);
        showToast('Failed to log water', 'error');
      }
    } catch {
      mutateWater({ ...waterData, data: previousWater }, false);
      showToast('Failed to log water', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="skeleton h-20 w-full rounded-2xl" />
        <div className="skeleton h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-charcoal-800 md:hidden">Daily Health</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">{todayDisplay}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Summary */}
        <div className="md:col-span-5 space-y-6">
          {/* Calories card */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-charcoal-500">Calories</h2>
              <span className="text-xs text-charcoal-400">
                {formatNumber(calTarget)} kcal target
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className={`text-3xl font-semibold tabular-nums ${totals.calories > calTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                {formatNumber(Math.round(totals.calories))}
              </span>
              <span className="text-sm text-charcoal-400 mb-1">kcal consumed</span>
            </div>
            <ProgressBar value={totals.calories} max={calTarget} size="md" />
            <div className="flex justify-between mt-2 text-xs text-charcoal-400">
              <span>{Math.round(Math.max(0, calTarget - totals.calories)).toLocaleString()} remaining</span>
              <span>{Math.min(100, Math.round((totals.calories / calTarget) * 100))}%</span>
            </div>
          </div>

          {/* Macro cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Protein */}
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-medium text-charcoal-400 mb-2">Protein</p>
              <p className="text-lg font-semibold tabular-nums text-emerald-400">
                {Math.round(totals.protein)}g
              </p>
              <p className="text-xs text-charcoal-400 mb-2">/ {proteinTarget}g</p>
              <ProgressBar value={totals.protein} max={proteinTarget} size="sm" color="bg-blue-500" />
            </div>

            {/* Fat */}
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-medium text-charcoal-400 mb-2">Fat</p>
              <p className={`text-lg font-semibold tabular-nums ${totals.fat > fatTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                {Math.round(totals.fat)}g
              </p>
              <p className="text-xs text-charcoal-400 mb-2">/ {fatTarget}g</p>
              <ProgressBar value={totals.fat} max={fatTarget} size="sm" color="bg-amber-500" />
            </div>

            {/* Carbohydrates */}
            {trackCarbs && (
              <div className="glass-panel rounded-2xl p-4">
                <p className="text-xs font-medium text-charcoal-400 mb-2">Carbs</p>
                <p className={`text-lg font-semibold tabular-nums ${totals.carbs > carbTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                  {Math.round(totals.carbs)}g
                </p>
                <p className="text-xs text-charcoal-400 mb-2">/ {carbTarget}g</p>
                <ProgressBar value={totals.carbs} max={carbTarget} size="sm" color="bg-purple-500" />
              </div>
            )}
            
            {/* Fiber */}
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-medium text-charcoal-400 mb-2">Fiber</p>
              <p className={`text-lg font-semibold tabular-nums ${totals.fiber < fiberTarget ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.round(totals.fiber)}g
              </p>
              <p className="text-xs text-charcoal-400 mb-2">/ {fiberTarget}g</p>
              <ProgressBar value={totals.fiber} max={fiberTarget} size="sm" color="bg-green-500" />
            </div>

            {/* Sugar */}
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs font-medium text-charcoal-400 mb-2">Sugar</p>
              <p className={`text-lg font-semibold tabular-nums ${totals.sugar > sugarTarget ? 'text-red-400' : 'text-emerald-400'}`}>
                {Math.round(totals.sugar)}g
              </p>
              <p className="text-xs text-charcoal-400 mb-2">/ {sugarTarget}g max</p>
              <ProgressBar value={totals.sugar} max={sugarTarget} size="sm" color="bg-pink-500" />
            </div>
          </div>
          
          {/* Water Tracker */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-charcoal-500 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
                </svg>
                Water Tracker
              </h2>
              <span className="text-xs text-charcoal-400">
                {formatNumber(waterTarget)} ml target
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold tabular-nums text-blue-400">
                  {formatNumber(waterTotal)}
                </span>
                <span className="text-sm text-charcoal-400 mb-1">ml logged</span>
              </div>
              <ProgressBar value={waterTotal} max={waterTarget} size="md" color="bg-blue-400" />
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <button onClick={() => handleAddWater(250)} className="flex-1 min-w-[100px] btn btn-secondary py-2 text-xs">
                  + 250 ml
                </button>
                <button onClick={() => handleAddWater(500)} className="flex-1 min-w-[100px] btn btn-secondary py-2 text-xs">
                  + 500 ml
                </button>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
                <input
                  type="number"
                  min="0"
                  value={customWater}
                  onChange={(e) => setCustomWater(e.target.value)}
                  placeholder="Custom ml"
                  className="flex-1 w-full min-w-[100px] px-3 py-2 text-sm border border-surface-200 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(customWater);
                      if (val > 0) {
                        handleAddWater(val);
                        setCustomWater('');
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const val = parseInt(customWater);
                    if (val > 0) {
                      handleAddWater(val);
                      setCustomWater('');
                    }
                  }}
                  className="btn btn-primary py-2 px-4 w-full sm:w-auto"
                  disabled={!customWater || parseInt(customWater) <= 0}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Meals */}
        <div className="md:col-span-7 space-y-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-charcoal-600">
              Meals today
              {entries.length > 0 && (
                <span className="text-charcoal-400 font-normal ml-1.5">({entries.length})</span>
              )}
            </h2>
          </div>

          {entries.length === 0 ? (
            <EmptyState
              title="Nothing logged yet"
              description="Add your first meal to start today's nutrition log."
              action={{ label: '+ Add Food', onClick: () => setShowAddFood(true) }}
            />
          ) : (
            <div className="space-y-3">
              {entries
                .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
                .map((entry) => (
                <div
                  key={entry.id}
                  className="glass-panel rounded-xl p-4 card-hover group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-charcoal-800 truncate">
                          {entry.foodName}
                        </h3>
                        {entry.source === 'ai' && (
                          <span className="text-[0.6rem] px-1.5 py-0.5 bg-surface-100 text-charcoal-400 rounded-full border border-surface-200">
                            estimated
                          </span>
                        )}
                      </div>
                      {entry.portion && (
                        <p className="text-xs text-charcoal-400 mt-0.5">{entry.portion}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-charcoal-500">
                        <span>{Math.round(entry.calories)} kcal</span>
                        <span>{Math.round(entry.protein)}g protein</span>
                        <span>{Math.round(entry.fat)}g fat</span>
                        {trackCarbs && <span>{Math.round(entry.carbohydrates)}g carbs</span>}
                        {!!entry.fiber && <span>{Math.round(entry.fiber)}g fiber</span>}
                        {!!entry.sugar && <span>{Math.round(entry.sugar)}g sugar</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-1.5 rounded-lg hover:bg-surface-100 text-charcoal-400 hover:text-charcoal-600"
                        aria-label={`Edit ${entry.foodName}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteId(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal-400 hover:text-red-500"
                        aria-label={`Delete ${entry.foodName}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {entry.time && (
                    <p className="text-[0.65rem] text-charcoal-300 mt-2">{entry.time}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Food button */}
      <div className="sticky bottom-20 md:bottom-4 z-30">
        <button
          onClick={() => setShowAddFood(true)}
          className="w-full btn btn-primary py-3 text-base rounded-xl shadow-elevated"
          id="add-food-btn"
        >
          + Add Food
        </button>
      </div>

      {/* Food form modal */}
      {(showAddFood || editingEntry) && (
        <FoodFormModal
          entry={editingEntry}
          onSave={handleFoodSaved}
          onClose={() => {
            setShowAddFood(false);
            setEditingEntry(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete food entry"
        message="This will remove this entry from today's log."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
