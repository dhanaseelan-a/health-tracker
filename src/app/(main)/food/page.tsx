'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FoodFormModal } from '@/components/food/FoodFormModal';
import { useToast } from '@/components/ui/Toast';
import type { FoodEntry, DailyTargets } from '@/types';
import { formatDateShort, formatNumber } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MacroPieChart } from '@/components/ui/MacroPieChart';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FoodPage() {
  const [showAddFood, setShowAddFood] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Default to today to prevent fetching entire history and burning read limits
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const { showToast } = useToast();

  const url = dateFilter ? `/api/food?date=${dateFilter}` : '/api/food';
  const { data: foodData, mutate: mutateFood } = useSWR(url, fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
  const { data: targetData } = useSWR('/api/targets', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });

  const entries: FoodEntry[] = foodData?.data || [];
  const targets: DailyTargets | null = targetData?.data || null;
  const loading = !foodData || !targetData;

  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Group entries by date
  const grouped = entries.reduce<Record<string, FoodEntry[]>>((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const handleDelete = async () => {
    if (!deleteId) return;

    // Optimistic Delete
    const previousEntries = [...entries];
    mutateFood({ ...foodData, data: entries.filter(e => e.id !== deleteId) }, false);

    try {
      const res = await fetch(`/api/food/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Entry deleted');
        mutateFood();
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

  const handleSaved = (savedEntry: FoodEntry) => {
    setShowAddFood(false);
    setEditingEntry(null);
    
    const isEdit = entries.some(e => e.id === savedEntry.id);
    let newEntries: FoodEntry[] = [];
    
    if (isEdit) {
      newEntries = entries.map(e => e.id === savedEntry.id ? savedEntry : e);
    } else {
      newEntries = [savedEntry, ...entries];
    }
    
    mutateFood({ ...foodData, data: newEntries }, false);
    showToast('Food entry saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-charcoal-800 flex flex-wrap items-baseline gap-x-2">
            Food Log <span className="text-sm font-normal text-charcoal-400">({dateFilter ? formatDateShort(dateFilter) : todayDisplay})</span>
          </h1>
          <p className="text-sm text-charcoal-400 mt-0.5">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <button onClick={() => setShowAddFood(true)} className="btn btn-primary self-start sm:self-auto shrink-0">
          + Add
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center flex-wrap gap-2">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
          }}
          className="px-3 py-2 text-sm border border-surface-200 rounded-xl"
          aria-label="Filter by date"
        />
        {dateFilter && (
          <button
            onClick={() => {
              setDateFilter('');
            }}
            className="ml-2 text-sm text-brand-600 hover:text-brand-700"
          >
            Show all
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="Nothing logged yet"
          description="Add your first meal to start tracking your nutrition."
          action={{ label: '+ Add Food', onClick: () => setShowAddFood(true) }}
        />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dayEntries = grouped[date];
            const dayTotals = dayEntries.reduce(
              (acc, e) => ({
                cal: acc.cal + e.calories,
                pro: acc.pro + e.protein,
                fat: acc.fat + e.fat,
                carb: acc.carb + e.carbohydrates,
                fiber: acc.fiber + (e.fiber || 0),
                sugar: acc.sugar + (e.sugar || 0),
              }),
              { cal: 0, pro: 0, fat: 0, carb: 0, fiber: 0, sugar: 0 }
            );

            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-charcoal-600">
                    {formatDateShort(date)}
                  </h3>
                  <span className="text-xs text-charcoal-400 font-medium">
                    {formatNumber(Math.round(dayTotals.cal))} kcal
                  </span>
                </div>
                
                {/* Daily Chart */}
                {targets && (
                  <div className="mb-4 p-5 glass-panel rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/5">
                    <MacroPieChart 
                      calories={dayTotals.cal} 
                      protein={dayTotals.pro} 
                      fat={dayTotals.fat} 
                      carbs={dayTotals.carb}
                      fiber={dayTotals.fiber}
                      sugar={dayTotals.sugar}
                      proteinTarget={targets.protein}
                      fatTarget={targets.fat}
                      carbsTarget={targets.carbohydrates}
                      fiberTarget={targets.fiber}
                      sugarTarget={targets.sugar}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="glass-panel rounded-xl p-3.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {entry.foodName}
                            </p>
                            {entry.source === 'ai' && (
                              <span className="text-[0.6rem] px-1.5 py-0.5 bg-[rgba(255,255,255,0.05)] text-charcoal-400 rounded-full border border-white/10">
                                estimated
                              </span>
                            )}
                          </div>
                          {(entry.portion || entry.time) && (
                            <div className="flex gap-2 items-center text-xs text-charcoal-500 mt-1">
                              {entry.time && <span>{entry.time}</span>}
                              {entry.time && entry.portion && <span>•</span>}
                              {entry.portion && <span>{entry.portion}</span>}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
                            <span className="text-emerald-400">{Math.round(entry.calories)} kcal</span>
                            <span className="text-blue-400">{Math.round(entry.protein)}g pro</span>
                            <span className="text-amber-400">{Math.round(entry.fat)}g fat</span>
                            <span className="text-purple-400">{Math.round(entry.carbohydrates)}g carb</span>
                            {!!entry.fiber && <span className="text-green-400">{Math.round(entry.fiber)}g fiber</span>}
                            {!!entry.sugar && <span className="text-pink-400">{Math.round(entry.sugar)}g sugar</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="p-1.5 rounded-lg hover:bg-surface-100 text-charcoal-400"
                            aria-label="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteId(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal-400 hover:text-red-500"
                            aria-label="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAddFood || editingEntry) && (
        <FoodFormModal
          entry={editingEntry}
          onSave={handleSaved}
          onClose={() => {
            setShowAddFood(false);
            setEditingEntry(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete food entry"
        message="This will permanently remove this food entry."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
