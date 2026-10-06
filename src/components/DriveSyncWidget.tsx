'use client';

import { useDriveSync } from './DriveSyncProvider';

export function DriveSyncWidget() {
  const { token, connect, syncToDrive, restoreFromDrive, isSyncing, isRestoring } = useDriveSync();

  if (!token) {
    return (
      <div className="px-3 pb-4">
        <button
          onClick={() => connect()}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-primary hover:bg-brand-primary/10 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Connect Drive
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 space-y-2">
      <div className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold text-brand-primary uppercase tracking-wide">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Drive Connected
      </div>
      <button
        onClick={syncToDrive}
        disabled={isSyncing || isRestoring}
        className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-charcoal-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        {isSyncing ? 'Syncing...' : 'Sync to Drive'}
      </button>
      <button
        onClick={restoreFromDrive}
        disabled={isSyncing || isRestoring}
        className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-charcoal-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        {isRestoring ? 'Restoring...' : 'Restore Data'}
      </button>
    </div>
  );
}
