'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { UserProfile, DailyTargets, AISettings } from '@/types';
import { GoogleDriveConnect } from '@/components/settings/GoogleDriveConnect';
import { signOut } from 'next-auth/react';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<string>('profile');

  // Fetch from global SWR cache (0 DB reads if already cached)
  const { data: profileRes, mutate: mutateProfile } = useSWR('/api/profile', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
  const { data: targetRes, mutate: mutateTargets } = useSWR('/api/targets', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });
  const { data: aiRes, mutate: mutateAI } = useSWR('/api/ai/settings', fetcher, { revalidateOnFocus: false, revalidateIfStale: false });

  // Profile
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '', height: 170, heightUnit: 'cm', heightInches: 0, age: undefined, gender: '', preferredUnits: 'metric',
  });

  // Targets
  const [targets, setTargets] = useState<Partial<DailyTargets>>({
    calories: 2000, protein: 50, fat: 65, carbohydrates: 250, trackCarbs: true,
    fiber: 30, sugar: 50, water: 2500,
  });

  // AI Settings
  const [ai, setAI] = useState({ 
    baseUrl: '', apiKey: '', modelId: '', 
    inputTokenLimit: 4096, outputTokenLimit: 1024, 
    textBaseUrl: '', textApiKey: '', textModelId: '',
    textInputTokenLimit: 4096, textOutputTokenLimit: 1024, 
    hasApiKey: false 
  });
  const [testingAI, setTestingAI] = useState(false);

  // Sync SWR global cache into local edit state only once when loaded
  useEffect(() => {
    if (profileRes?.data) setProfile(prev => ({ ...prev, ...profileRes.data }));
  }, [profileRes]);

  useEffect(() => {
    if (targetRes?.data) setTargets(prev => ({ ...prev, ...targetRes.data }));
  }, [targetRes]);

  useEffect(() => {
    if (aiRes?.data) setAI(prev => ({ ...prev, ...aiRes.data }));
  }, [aiRes]);

  // Data
  const [showErase, setShowErase] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Profile saved');
        mutateProfile({ data: profile }, false);
      }
    } catch {
      showToast('Failed to save profile', 'error');
    }
  };

  const saveTargets = async () => {
    try {
      const res = await fetch('/api/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targets),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Targets saved');
        mutateTargets({ data: targets }, false);
      }
    } catch {
      showToast('Failed to save targets', 'error');
    }
  };

  const saveAISettings = async () => {
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ai),
      });
      const data = await res.json();
      if (data.success) {
        showToast('AI settings saved');
        if (data.data) {
          setAI(data.data);
          mutateAI({ data: data.data }, false);
        }
      }
    } catch {
      showToast('Failed to save AI settings', 'error');
    }
  };

  const testConnection = async () => {
    setTestingAI(true);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ai),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Connection successful');
      } else {
        showToast(data.error || 'Connection failed', 'error');
      }
    } catch {
      showToast('Connection test failed', 'error');
    } finally {
      setTestingAI(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/backup/export', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-health-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Backup exported');
      }
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast('Please select a JSON file', 'error');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        showToast('Invalid JSON file', 'error');
        setImporting(false);
        return;
      }

      if (!parsed.version) {
        showToast('This does not appear to be a Daily Health backup file', 'error');
        setImporting(false);
        return;
      }

      const confirmed = window.confirm(
        `This will replace your current data with the backup from ${parsed.exportedAt || 'unknown date'}.\n\nFood entries: ${parsed.foodEntries?.length || 0}\nWeight entries: ${parsed.weightEntries?.length || 0}\nBMI entries: ${parsed.bmiEntries?.length || 0}\n\nContinue?`
      );

      if (!confirmed) {
        setImporting(false);
        return;
      }

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Backup restored successfully');
        loadSettings();
      } else {
        showToast(data.error || 'Import failed', 'error');
      }
    } catch {
      showToast('Failed to import backup', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleErase = async () => {
    setErasing(true);
    try {
      const res = await fetch('/api/data/erase', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('All data erased');
        loadSettings();
      }
    } catch {
      showToast('Failed to erase data', 'error');
    } finally {
      setErasing(false);
      setShowErase(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'ai', label: 'AI Analysis' },
    { id: 'drive', label: 'Google Drive' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-charcoal-800">Settings</h1>

      {/* Section nav */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeSection === s.id
                ? 'bg-[rgba(45,212,191,0.15)] text-brand-400'
                : 'text-charcoal-600 hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal-700">Profile</h2>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-charcoal-500 mb-1.5">
              Name / Nickname
            </label>
            <input
              id="profile-name"
              type="text"
              value={profile.name || ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your name"
              className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-height" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Height ({profile.heightUnit || 'cm'})
              </label>
              <input
                id="profile-height"
                type="number"
                min="0"
                value={profile.height || ''}
                onChange={(e) => setProfile({ ...profile, height: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="profile-age" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Age
              </label>
              <input
                id="profile-age"
                type="number"
                min="0"
                max="150"
                value={profile.age || ''}
                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-gender" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Gender (optional)
              </label>
              <select
                id="profile-gender"
                value={profile.gender || ''}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value as UserProfile['gender'] })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="profile-units" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Preferred units
              </label>
              <select
                id="profile-units"
                value={profile.preferredUnits || 'metric'}
                onChange={(e) => setProfile({ ...profile, preferredUnits: e.target.value as 'metric' | 'imperial' })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              >
                <option value="metric">Metric (kg, cm)</option>
                <option value="imperial">Imperial (lbs, ft)</option>
              </select>
            </div>
          </div>
          <button onClick={saveProfile} className="btn btn-primary">Save Profile</button>
        </div>
      )}

      {/* Nutrition Section */}
      {activeSection === 'nutrition' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-charcoal-700">Daily Nutrition Targets</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="target-calories" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Calorie target (kcal)
              </label>
              <input
                id="target-calories"
                type="number"
                min="0"
                value={targets.calories || ''}
                onChange={(e) => setTargets({ ...targets, calories: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="target-protein" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Protein target (g)
              </label>
              <input
                id="target-protein"
                type="number"
                min="0"
                value={targets.protein || ''}
                onChange={(e) => setTargets({ ...targets, protein: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="target-fat" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Fat target (g)
              </label>
              <input
                id="target-fat"
                type="number"
                min="0"
                value={targets.fat || ''}
                onChange={(e) => setTargets({ ...targets, fat: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="target-carbs" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Carb target (g)
              </label>
              <input
                id="target-carbs"
                type="number"
                min="0"
                value={targets.carbohydrates || ''}
                onChange={(e) => setTargets({ ...targets, carbohydrates: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="target-fiber" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Fiber target (g)
              </label>
              <input
                id="target-fiber"
                type="number"
                min="0"
                value={targets.fiber || ''}
                onChange={(e) => setTargets({ ...targets, fiber: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="target-sugar" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Sugar target (g, max)
              </label>
              <input
                id="target-sugar"
                type="number"
                min="0"
                value={targets.sugar || ''}
                onChange={(e) => setTargets({ ...targets, sugar: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="target-water" className="block text-xs font-medium text-charcoal-500 mb-1.5">
                Water target (ml)
              </label>
              <input
                id="target-water"
                type="number"
                min="0"
                value={targets.water || ''}
                onChange={(e) => setTargets({ ...targets, water: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={targets.trackCarbs !== false}
              onChange={(e) => setTargets({ ...targets, trackCarbs: e.target.checked })}
              className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-charcoal-600">Track carbohydrates</span>
          </label>
          <button onClick={saveTargets} className="btn btn-primary">Save Targets</button>
        </div>
      )}

      {/* AI Analysis Section */}
      {activeSection === 'ai' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal-700">Photo Scan API</h2>
            <p className="text-xs text-charcoal-400 leading-relaxed">
              Configure your AI provider for food image analysis (Vision). Auto-adds calories, food name, and macros from photos.
            </p>
            <div>
              <label htmlFor="ai-url" className="block text-xs font-medium text-charcoal-500 mb-1.5">Base URL</label>
              <input id="ai-url" type="url" value={ai.baseUrl || ''} onChange={(e) => setAI({ ...ai, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
            </div>
            <div>
              <label htmlFor="ai-key" className="block text-xs font-medium text-charcoal-500 mb-1.5">API Key</label>
              <input id="ai-key" type="password" value={ai.apiKey || ''} onChange={(e) => setAI({ ...ai, apiKey: e.target.value })} placeholder="sk-..." className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
            </div>
            <div>
              <label htmlFor="ai-model" className="block text-xs font-medium text-charcoal-500 mb-1.5">Model ID</label>
              <input id="ai-model" type="text" value={ai.modelId || ''} onChange={(e) => setAI({ ...ai, modelId: e.target.value })} placeholder="gpt-4o, llava, etc." className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="ai-input-tokens" className="block text-xs font-medium text-charcoal-500 mb-1.5">Input limit</label>
                <input id="ai-input-tokens" type="number" min="0" value={ai.inputTokenLimit || 4096} onChange={(e) => setAI({ ...ai, inputTokenLimit: parseInt(e.target.value) || 4096 })} className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
              </div>
              <div>
                <label htmlFor="ai-output-tokens" className="block text-xs font-medium text-charcoal-500 mb-1.5">Output limit</label>
                <input id="ai-output-tokens" type="number" min="0" value={ai.outputTokenLimit || 1024} onChange={(e) => setAI({ ...ai, outputTokenLimit: parseInt(e.target.value) || 1024 })} className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal-700">Health Advice & Manual Entry API</h2>
            <p className="text-xs text-charcoal-400 leading-relaxed">
              Configure your AI provider for text-based analysis. Auto-calculates macros when you type a food name and weight, and provides health advice.
            </p>
            <div>
              <label htmlFor="text-ai-url" className="block text-xs font-medium text-charcoal-500 mb-1.5">Base URL</label>
              <input id="text-ai-url" type="url" value={ai.textBaseUrl || ''} onChange={(e) => setAI({ ...ai, textBaseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
            </div>
            <div>
              <label htmlFor="text-ai-key" className="block text-xs font-medium text-charcoal-500 mb-1.5">API Key</label>
              <input id="text-ai-key" type="password" value={ai.textApiKey || ''} onChange={(e) => setAI({ ...ai, textApiKey: e.target.value })} placeholder="sk-..." className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
            </div>
            <div>
              <label htmlFor="text-ai-model" className="block text-xs font-medium text-charcoal-500 mb-1.5">Model ID</label>
              <input id="text-ai-model" type="text" value={ai.textModelId || ''} onChange={(e) => setAI({ ...ai, textModelId: e.target.value })} placeholder="gpt-4o-mini, llama3, etc." className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="text-input-tokens" className="block text-xs font-medium text-charcoal-500 mb-1.5">Input limit</label>
                <input id="text-input-tokens" type="number" min="0" value={ai.textInputTokenLimit || 4096} onChange={(e) => setAI({ ...ai, textInputTokenLimit: parseInt(e.target.value) || 4096 })} className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
              </div>
              <div>
                <label htmlFor="text-output-tokens" className="block text-xs font-medium text-charcoal-500 mb-1.5">Output limit</label>
                <input id="text-output-tokens" type="number" min="0" value={ai.textOutputTokenLimit || 1024} onChange={(e) => setAI({ ...ai, textOutputTokenLimit: parseInt(e.target.value) || 1024 })} className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal-700">Apply Changes</h2>
            <div className="flex gap-3">
              <button onClick={saveAISettings} className="btn btn-primary">Save All Settings</button>
              <button onClick={testConnection} disabled={testingAI} className="btn btn-secondary">
                {testingAI ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Section */}
      {activeSection === 'drive' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-charcoal-700">Google Drive</h2>
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.05)] border border-border-color flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-charcoal-600">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
            <p className="text-sm text-charcoal-600 font-medium mb-1">Connect Google Drive</p>
            <p className="text-xs text-charcoal-400 max-w-xs mx-auto mb-4">
              Keep a cloud backup of your health data.
            </p>
            <div className="max-w-xs mx-auto">
              <GoogleDriveConnect />
            </div>
            <p className="text-xs text-charcoal-600 mt-4 italic">
              When synced, your data will be saved securely to a new file in your personal Google Drive.
            </p>
          </div>
        </div>
      )}

      {/* Data Section */}
      {activeSection === 'data' && (
        <div className="space-y-4">
          {/* Backup */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-charcoal-700">Backup & Restore</h2>
            <p className="text-xs text-charcoal-400">
              Export your data as a JSON file for safekeeping, or restore from a previous backup.
            </p>
            <div className="flex gap-3">
              <button onClick={handleExport} className="btn btn-secondary flex-1">
                Export Backup
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="btn btn-secondary flex-1"
              >
                {importing ? 'Importing...' : 'Import Backup'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                aria-label="Import backup file"
              />
            </div>
          </div>

          {/* Erase */}
          <div className="glass-panel rounded-2xl border border-[rgba(239,68,68,0.3)] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
            <p className="text-xs text-charcoal-500">
              Permanently erase all your Daily Health data. This cannot be undone.
            </p>
            <button onClick={() => setShowErase(true)} className="btn btn-danger">
              Erase All Data
            </button>
          </div>
        </div>
      )}

      {/* Health disclaimer */}
      <p className="text-xs text-charcoal-600 text-center pt-4 pb-2 italic md:hidden">
        Daily Health is a personal tracking tool. Nutrition and image-analysis values are estimates and are not medical advice.
      </p>

      <ConfirmDialog
        open={showErase}
        title="Erase all data"
        message="This permanently removes your Daily Health data from this application. This cannot be undone. If you have Google Drive backups, they will remain unless you separately delete them."
        confirmLabel={erasing ? 'Erasing...' : 'Erase Everything'}
        variant="danger"
        onConfirm={handleErase}
        onCancel={() => setShowErase(false)}
      />
    </div>
  );
}
