'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { BMIEntry } from '@/types';
import { calculateBMI, getBMICategory, formatDateShort } from '@/lib/utils';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function BMIPage() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();

  const { data, mutate } = useSWR('/api/bmi', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
  const entries: BMIEntry[] = data?.data || [];

  const handleCalculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const hi = parseFloat(heightInches) || 0;

    if (!w || w <= 0) {
      showToast('Enter a valid weight', 'error');
      return;
    }
    if (!h || h <= 0) {
      showToast('Enter a valid height', 'error');
      return;
    }

    const bmi = calculateBMI(w, h, weightUnit, heightUnit, hi);
    if (bmi <= 0 || bmi > 100) {
      showToast('Please check your input values', 'error');
      return;
    }
    setCalculatedBMI(bmi);
  };

  const handleSave = async () => {
    if (!calculatedBMI) return;
    const newEntry = {
      id: Date.now().toString(),
      bmi: calculatedBMI,
      weight: parseFloat(weight),
      height: parseFloat(height),
      weightUnit,
      heightUnit,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Optimistic Add
    const previousEntries = [...entries];
    mutate({ ...data, data: [newEntry, ...entries] }, false);

    try {
      const res = await fetch('/api/bmi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      const resData = await res.json();
      if (resData.success) {
        showToast('BMI measurement saved');
        mutate();
      } else {
        mutate({ ...data, data: previousEntries }, false);
        showToast('Failed to save', 'error');
      }
    } catch {
      mutate({ ...data, data: previousEntries }, false);
      showToast('Failed to save', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    // Optimistic Delete
    const previousEntries = [...entries];
    mutate({ ...data, data: entries.filter(e => e.id !== deleteId) }, false);

    try {
      const res = await fetch(`/api/bmi/${deleteId}`, { method: 'DELETE' });
      const resData = await res.json();
      if (resData.success) {
        showToast('Entry deleted');
        mutate();
      } else {
        mutate({ ...data, data: previousEntries }, false);
        showToast('Failed to delete', 'error');
      }
    } catch {
      mutate({ ...data, data: previousEntries }, false);
      showToast('Failed to delete', 'error');
    }
    setDeleteId(null);
  };

  const toggleUnits = () => {
    if (weightUnit === 'kg') {
      setWeightUnit('lbs');
      setHeightUnit('ft');
    } else {
      setWeightUnit('kg');
      setHeightUnit('cm');
    }
    setWeight('');
    setHeight('');
    setHeightInches('');
    setCalculatedBMI(null);
  };

  const category = calculatedBMI ? getBMICategory(calculatedBMI) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-charcoal-800">BMI Calculator</h1>

      {/* Calculator card */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        {/* Unit toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-charcoal-500">Units</span>
          <button
            onClick={toggleUnits}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            {weightUnit === 'kg' ? 'Switch to Imperial' : 'Switch to Metric'}
          </button>
        </div>

        {/* Weight input */}
        <div>
          <label htmlFor="bmi-weight" className="block text-xs font-medium text-charcoal-500 mb-1.5">
            Weight ({weightUnit})
          </label>
          <input
            id="bmi-weight"
            type="number"
            min="0"
            step="0.1"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setCalculatedBMI(null); }}
            placeholder={weightUnit === 'kg' ? '70' : '154'}
            className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
          />
        </div>

        {/* Height input */}
        {heightUnit === 'cm' ? (
          <div>
            <label htmlFor="bmi-height" className="block text-xs font-medium text-charcoal-500 mb-1.5">
              Height (cm)
            </label>
            <input
              id="bmi-height"
              type="number"
              min="0"
              value={height}
              onChange={(e) => { setHeight(e.target.value); setCalculatedBMI(null); }}
              placeholder="170"
              className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
            />
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="bmi-height-ft" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Height (ft)
              </label>
              <input
                id="bmi-height-ft"
                type="number"
                min="0"
                value={height}
                onChange={(e) => { setHeight(e.target.value); setCalculatedBMI(null); }}
                placeholder="5"
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="bmi-height-in" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Inches
              </label>
              <input
                id="bmi-height-in"
                type="number"
                min="0"
                max="11"
                value={heightInches}
                onChange={(e) => { setHeightInches(e.target.value); setCalculatedBMI(null); }}
                placeholder="7"
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bmi-age" className="block text-xs font-medium text-charcoal-500 mb-1.5">
              Age (optional)
            </label>
            <input
              id="bmi-age"
              type="number"
              min="0"
              max="150"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="bmi-gender" className="block text-xs font-medium text-charcoal-500 mb-1.5">
              Gender (optional)
            </label>
            <select
              id="bmi-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl bg-transparent text-white">
              <option value="" className="bg-[#1e1e1e] text-white">Prefer not to say</option>
              <option value="male" className="bg-[#1e1e1e] text-white">Male</option>
              <option value="female" className="bg-[#1e1e1e] text-white">Female</option>
              <option value="other" className="bg-[#1e1e1e] text-white">Other</option>
            </select>
          </div>
        </div>

        <button onClick={handleCalculate} className="w-full btn btn-primary py-2.5">
          Calculate BMI
        </button>
      </div>

      {/* Result */}
      {calculatedBMI !== null && category && (
        <div className="glass-panel rounded-2xl p-5 text-center">
          <p className="text-sm text-charcoal-400 mb-2">Your BMI</p>
          <p className="text-4xl font-bold tabular-nums" style={{ color: category.color }}>
            {calculatedBMI}
          </p>
          <p className="text-base font-medium mt-2" style={{ color: category.color }}>
            {category.label}
          </p>

          {/* BMI scale */}
          <div className="mt-4 mb-3">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div className="flex-1 bg-blue-400" />
              <div className="flex-1 bg-green-400" />
              <div className="flex-1 bg-amber-400" />
              <div className="flex-1 bg-red-400" />
            </div>
            <div className="flex justify-between text-[0.6rem] text-charcoal-400 mt-1">
              <span>Under 18.5</span>
              <span>18.5–24.9</span>
              <span>25–29.9</span>
              <span>30+</span>
            </div>
          </div>

          {/* BMI categories */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-left text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-900/30">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-blue-100">Underweight (&lt;18.5)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-900/30">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-100">Normal (18.5–24.9)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-900/30">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-100">Overweight (25–29.9)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-900/30">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-100">Obese (30+)</span>
            </div>
          </div>

          <button onClick={handleSave} className="btn btn-secondary mt-4">
            Save this measurement
          </button>

          <p className="text-xs text-charcoal-300 mt-4 italic">
            BMI is a screening measure and does not diagnose health conditions.
          </p>
        </div>
      )}

      {/* BMI History */}
      {entries.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-charcoal-600 mb-2">BMI History</h2>
          <div className="space-y-2">
            {entries.map((entry) => {
              const cat = getBMICategory(entry.bmi);
              return (
                <div
                  key={entry.id}
                  className="glass-panel rounded-xl p-3.5 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-lg font-semibold tabular-nums"
                      style={{ color: cat.color }}
                    >
                      {entry.bmi}
                    </span>
                    <div>
                      <p className="text-xs text-charcoal-500">
                        {entry.weight} {entry.weightUnit} · {entry.height} {entry.heightUnit}
                      </p>
                      <p className="text-xs text-charcoal-400">{formatDateShort(entry.date)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteId(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete BMI entry"
        message="This will permanently remove this BMI measurement."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
