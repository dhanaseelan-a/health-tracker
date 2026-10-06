'use client';

import { useState, useRef } from 'react';
import type { FoodEntry, AIAnalysisResult } from '@/types';
import { useToast } from '@/components/ui/Toast';

interface FoodFormModalProps {
  entry?: FoodEntry | null;
  onSave: (savedEntry: FoodEntry) => void;
  onClose: () => void;
}

export function FoodFormModal({ entry, onSave, onClose }: FoodFormModalProps) {
  const isEdit = !!entry;
  const { showToast } = useToast();

  const [mode, setMode] = useState<'manual' | 'image'>('manual');
  const [foodName, setFoodName] = useState(entry?.foodName || '');
  const [portion, setPortion] = useState(entry?.portion || '');
  const [calories, setCalories] = useState(entry?.calories?.toString() || '');
  const [protein, setProtein] = useState(entry?.protein?.toString() || '');
  const [fat, setFat] = useState(entry?.fat?.toString() || '');
  const [carbs, setCarbs] = useState(entry?.carbohydrates?.toString() || '');
  const [fiber, setFiber] = useState(entry?.fiber?.toString() || '');
  const [sugar, setSugar] = useState(entry?.sugar?.toString() || '');
  const [date, setDate] = useState(entry?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(entry?.time || new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);

  // Image analysis state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [textAnalyzing, setTextAnalyzing] = useState(false);
  const [healthAdvice, setHealthAdvice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a JPEG, PNG, or WebP image', 'error');
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be smaller than 10MB', 'error');
      return;
    }

    // Read and compress
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > 1024) {
          h = (h * 1024) / w;
          w = 1024;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(base64);
          setImageBase64(base64);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setAnalysisResult(data.data);
        // Fill form fields with results
        setFoodName(data.data.foodName || '');
        setPortion(data.data.portion || '');
        setCalories(data.data.calories?.toString() || '0');
        setProtein(data.data.protein?.toString() || '0');
        setFat(data.data.fat?.toString() || '0');
        setCarbs(data.data.carbohydrates?.toString() || '0');
        setFiber(data.data.fiber?.toString() || '0');
        setSugar(data.data.sugar?.toString() || '0');
        showToast('Analysis complete — review and edit before saving', 'info');
      } else {
        showToast(data.error || 'Analysis failed', 'error');
      }
    } catch {
      showToast('Failed to analyze image. Check your AI settings.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!foodName.trim()) {
      showToast('Please enter a food name to analyze', 'error');
      return;
    }

    setTextAnalyzing(true);
    setHealthAdvice(null);

    try {
      const res = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: foodName.trim(), portion: portion.trim() }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setCalories(data.data.calories?.toString() || '0');
        setProtein(data.data.protein?.toString() || '0');
        setFat(data.data.fat?.toString() || '0');
        setCarbs(data.data.carbohydrates?.toString() || '0');
        setFiber(data.data.fiber?.toString() || '0');
        setSugar(data.data.sugar?.toString() || '0');
        if (data.data.advice) {
          setHealthAdvice(data.data.advice);
        }
        showToast('Macros auto-calculated', 'success');
      } else {
        showToast(data.error || 'Text analysis failed', 'error');
      }
    } catch {
      showToast('Failed to auto-calculate. Check your AI settings.', 'error');
    } finally {
      setTextAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!foodName.trim()) {
      showToast('Food name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        foodName: foodName.trim(),
        portion: portion.trim(),
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbohydrates: parseFloat(carbs) || 0,
        fiber: parseFloat(fiber) || 0,
        sugar: parseFloat(sugar) || 0,
        date,
        time,
        source: analysisResult ? 'ai' : 'manual',
      };

      const url = isEdit ? `/api/food/${entry.id}` : '/api/food';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        onSave(data.data);
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save food entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content flex flex-col !overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 bg-[rgba(30,30,30,0.8)] backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Food' : 'Add Food'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-charcoal-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Mode tabs (only for new entries) */}
          {!isEdit && (
            <div className="flex gap-1 bg-black/20 border border-white/5 rounded-xl p-1">
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === 'manual'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-charcoal-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Manual entry
              </button>
              <button
                onClick={() => setMode('image')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === 'image'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-charcoal-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Image analysis
              </button>
            </div>
          )}

          {/* Image upload section */}
          {mode === 'image' && !isEdit && (
            <div className="space-y-3">
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-surface-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-charcoal-300 mb-3">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p className="text-sm text-charcoal-500 font-medium">Select or take a photo</p>
                  <p className="text-xs text-charcoal-400 mt-1">JPEG, PNG, WebP up to 10MB</p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Food preview"
                    className="w-full rounded-xl object-cover max-h-48"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                      setAnalysisResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-white shadow-sm"
                    aria-label="Remove image"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
                aria-label="Upload food image"
              />

              {imagePreview && !analysisResult && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full btn btn-primary py-2.5"
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    'Analyze image'
                  )}
                </button>
              )}

              {analysisResult && (
                <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-charcoal-500">Estimation result</span>
                    <span className="text-[0.6rem] px-1.5 py-0.5 bg-surface-200 text-charcoal-400 rounded-full">
                      {Math.round((analysisResult.confidence || 0.5) * 100)}% confidence
                    </span>
                  </div>
                  {analysisResult.notes && (
                    <p className="text-xs text-charcoal-400 mt-1">{analysisResult.notes}</p>
                  )}
                  <p className="text-xs text-charcoal-300 mt-2 italic">
                    Values are estimates. Review and edit before saving.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form fields */}
          {(mode === 'manual' || analysisResult || isEdit) && (
            <div className="space-y-4">
              <div>
                <label htmlFor="food-name" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                  Food name *
                </label>
                <input
                  id="food-name"
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g., Grilled chicken breast"
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                />
              </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="food-portion" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                      Serving / quantity
                    </label>
                    <input
                      id="food-portion"
                      type="text"
                      value={portion}
                      onChange={(e) => setPortion(e.target.value)}
                      placeholder="e.g., 200g, 1 cup"
                      className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleTextAnalyze}
                      disabled={textAnalyzing || !foodName.trim()}
                      className="px-3 py-2.5 text-sm font-medium rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 disabled:opacity-50 transition-colors h-[42px] flex items-center gap-1"
                    >
                      {textAnalyzing ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                        </svg>
                      )}
                      Auto-fill
                    </button>
                  </div>
                </div>

              {healthAdvice && (
                <div className="bg-[rgba(45,212,191,0.08)] rounded-xl p-3.5 border border-[rgba(45,212,191,0.15)]">
                  <div className="flex items-center gap-1.5 mb-1.5 text-brand-400 font-medium text-xs tracking-wide">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    HEALTH ADVICE
                  </div>
                  <p className="text-xs text-charcoal-700 leading-relaxed font-medium">{healthAdvice}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="food-calories" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Calories (kcal)
                  </label>
                  <input
                    id="food-calories"
                    type="number"
                    min="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="food-protein" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Protein (g)
                  </label>
                  <input
                    id="food-protein"
                    type="number"
                    min="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="food-fat" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Fat (g)
                  </label>
                  <input
                    id="food-fat"
                    type="number"
                    min="0"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="food-carbs" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Carbohydrates (g)
                  </label>
                  <input
                    id="food-carbs"
                    type="number"
                    min="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="food-fiber" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Fiber (g)
                  </label>
                  <input
                    id="food-fiber"
                    type="number"
                    min="0"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="food-sugar" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Sugar (g)
                  </label>
                  <input
                    id="food-sugar"
                    type="number"
                    min="0"
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="food-date" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Date
                  </label>
                  <input
                    id="food-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="food-time" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                    Time
                  </label>
                  <input
                    id="food-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons - Fixed at bottom */}
        <div className="shrink-0 bg-[rgba(25,25,25,0.95)] backdrop-blur-xl border-t border-white/10 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] z-10">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn btn-secondary py-2.5">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !foodName.trim()}
              className="flex-1 btn btn-primary py-2.5"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add to diary'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
