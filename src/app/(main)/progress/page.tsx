'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { WeightChart } from '@/components/weight/WeightChart';
import type { WeightEntry, WeightGoal } from '@/types';
import { calculateWeightProgress, formatDateShort } from '@/lib/utils';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProgressPage() {
  const { data: weightData, mutate: mutateWeight } = useSWR('/api/weight', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
  const { data: goalData, mutate: mutateGoal } = useSWR('/api/weight-goal', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });

  const entries: WeightEntry[] = weightData?.data || [];
  const goal: WeightGoal | null = goalData?.data || null;
  const loading = !weightData || !goalData;

  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Form state
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Goal form state
  const [goalStart, setGoalStart] = useState(goal?.startWeight?.toString() || '');
  const [goalTarget, setGoalTarget] = useState(goal?.targetWeight?.toString() || '');
  const [goalUnit, setGoalUnit] = useState<'kg' | 'lbs'>(goal?.unit || 'kg');

  useEffect(() => {
    if (goal) {
      setGoalStart(goal.startWeight?.toString() || '');
      setGoalTarget(goal.targetWeight?.toString() || '');
      setGoalUnit(goal.unit || 'kg');
    }
  }, [goal]);

  const currentWeight = entries[0]?.weight || 0;
  const progress = goal && goal.startWeight > 0 && goal.targetWeight > 0
    ? calculateWeightProgress(goal.startWeight, goal.targetWeight, currentWeight, goal.unit)
    : null;

  const handleSaveWeight = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      showToast('Enter a valid weight', 'error');
      return;
    }
    setSaving(true);
    const payload = { weight: parseFloat(weight), unit, date, note };
    const url = editingEntry ? `/api/weight/${editingEntry.id}` : '/api/weight';
    const method = editingEntry ? 'PUT' : 'POST';
    
    // Optimistic Update
    const previousEntries = [...entries];
    const newEntry = { id: editingEntry?.id || Date.now().toString(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const optimisticData = editingEntry 
      ? entries.map(e => e.id === editingEntry.id ? newEntry : e)
      : [newEntry, ...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    mutateWeight({ ...weightData, data: optimisticData }, false);

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingEntry ? 'Weight updated' : 'Weight recorded');
        setShowForm(false);
        setEditingEntry(null);
        setWeight('');
        setNote('');
        setDate(new Date().toISOString().split('T')[0]);
        mutateWeight();
      } else {
        mutateWeight({ ...weightData, data: previousEntries }, false);
      }
    } catch {
      mutateWeight({ ...weightData, data: previousEntries }, false);
      showToast('Failed to save weight', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!goalStart || !goalTarget) {
      showToast('Enter start and target weight', 'error');
      return;
    }
    setSaving(true);
    const payload = { 
      startWeight: parseFloat(goalStart), 
      targetWeight: parseFloat(goalTarget), 
      unit: goalUnit 
    };

    mutateGoal({ ...goalData, data: payload }, false);

    try {
      const res = await fetch('/api/weight-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Goal updated');
        setShowGoalForm(false);
        mutateGoal();
      }
    } catch {
      showToast('Failed to update goal', 'error');
      mutateGoal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const previousEntries = [...entries];
    mutateWeight({ ...weightData, data: entries.filter(e => e.id !== deleteId) }, false);

    try {
      const res = await fetch(`/api/weight/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Entry deleted');
        mutateWeight();
      } else {
        mutateWeight({ ...weightData, data: previousEntries }, false);
      }
    } catch {
      mutateWeight({ ...weightData, data: previousEntries }, false);
      showToast('Failed to delete', 'error');
    }
    setDeleteId(null);
  };

  const startEdit = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setWeight(entry.weight.toString());
    setUnit(entry.unit);
    setDate(entry.date);
    setNote(entry.note || '');
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charcoal-800">Weight Progress</h1>
        <button onClick={() => { setShowForm(true); setEditingEntry(null); setWeight(''); setNote(''); }} className="btn btn-primary">
          + Add
        </button>
      </div>

      {/* Progress summary */}
      {progress && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-xs text-charcoal-400 mb-1">Start</p>
              <p className="text-lg font-semibold text-charcoal-700 tabular-nums">
                {goal!.startWeight} {goal!.unit}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-charcoal-400 mb-1">Current</p>
              <p className="text-lg font-semibold text-charcoal-800 tabular-nums">
                {currentWeight} {goal!.unit}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-charcoal-400 mb-1">Target</p>
              <p className="text-lg font-semibold text-brand-600 tabular-nums">
                {goal!.targetWeight} {goal!.unit}
              </p>
            </div>
          </div>
          <ProgressBar
            value={progress.progressPercentage}
            max={100}
            showPercentage
            label={`${progress.totalChange} ${goal!.unit} ${progress.direction === 'loss' ? 'lost' : 'gained'} · ${progress.remainingChange} ${goal!.unit} to go`}
          />
        </div>
      )}

      {/* Set goal button */}
      {!progress && (
        <button
          onClick={() => setShowGoalForm(true)}
          className="w-full glass-panel rounded-2xl p-5 text-center hover:border-brand-300 transition-colors"
        >
          <p className="text-sm font-medium text-charcoal-600">Set a weight goal</p>
          <p className="text-xs text-charcoal-400 mt-1">Track your progress toward your target</p>
        </button>
      )}
      {progress && (
        <button
          onClick={() => setShowGoalForm(true)}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Edit goal
        </button>
      )}

      {/* Weight chart */}
      {entries.length > 1 && (
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="text-sm font-medium text-charcoal-600 mb-4">Weight History</h2>
          <WeightChart entries={entries} goal={goal} />
        </div>
      )}

      {/* Weight entries */}
      {entries.length === 0 ? (
        <EmptyState
          title="No weight entries yet"
          description="Add your current weight to start tracking progress."
          action={{ label: '+ Add Weight', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-charcoal-600 mb-2">History</h2>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="glass-panel rounded-xl p-3.5 group flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-charcoal-800 tabular-nums">
                  {entry.weight} {entry.unit}
                </p>
                <p className="text-xs text-charcoal-400 mt-0.5">
                  {formatDateShort(entry.date)}
                  {entry.note && ` · ${entry.note}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(entry)}
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
          ))}
        </div>
      )}

      {/* Add/Edit weight modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingEntry(null); }}>
          <div className="modal-content p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-charcoal-800 mb-4">
              {editingEntry ? 'Edit Weight' : 'Record Weight'}
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="weight-value" className="block text-xs font-medium text-charcoal-500 mb-1.5">Weight</label>
                  <input
                    id="weight-value"
                    type="number"
                    min="0"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
                    autoFocus
                  />
                </div>
                <div className="w-24">
                  <label htmlFor="weight-unit" className="block text-xs font-medium text-charcoal-500 mb-1.5">Unit</label>
                  <select
                    id="weight-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as 'kg' | 'lbs')}
                    className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="weight-date" className="block text-xs font-medium text-charcoal-500 mb-1.5">Date</label>
                <input
                  id="weight-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="weight-note" className="block text-xs font-medium text-charcoal-500 mb-1.5">Note (optional)</label>
                <input
                  id="weight-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Morning weigh-in, after exercise, etc."
                  className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowForm(false); setEditingEntry(null); }} className="flex-1 btn btn-secondary py-2.5">
                  Cancel
                </button>
                <button onClick={handleSaveWeight} disabled={saving} className="flex-1 btn btn-primary py-2.5">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal form modal */}
      {showGoalForm && (
        <div className="modal-overlay" onClick={() => setShowGoalForm(false)}>
          <div className="modal-content p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-charcoal-800 mb-4">Weight Goal</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="goal-start" className="block text-xs font-medium text-charcoal-500 mb-1.5">Starting weight</label>
                <input
                  id="goal-start"
                  type="number"
                  min="0"
                  step="0.1"
                  value={goalStart}
                  onChange={(e) => setGoalStart(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="goal-target" className="block text-xs font-medium text-charcoal-500 mb-1.5">Target weight</label>
                <input
                  id="goal-target"
                  type="number"
                  min="0"
                  step="0.1"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
                />
              </div>
              <div>
                <label htmlFor="goal-unit" className="block text-xs font-medium text-charcoal-500 mb-1.5">Unit</label>
                <select
                  id="goal-unit"
                  value={goalUnit}
                  onChange={(e) => setGoalUnit(e.target.value as 'kg' | 'lbs')}
                  className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
              <p className="text-xs text-charcoal-400">
                Works for both weight loss and weight gain goals.
              </p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowGoalForm(false)} className="flex-1 btn btn-secondary py-2.5">
                  Cancel
                </button>
                <button onClick={handleSaveGoal} className="flex-1 btn btn-primary py-2.5">
                  Save Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete weight entry"
        message="This will permanently remove this weight entry."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
