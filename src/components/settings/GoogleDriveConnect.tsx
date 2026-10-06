'use client';

import { useDriveSync } from '@/components/DriveSyncProvider';

export function GoogleDriveConnect() {
  const { token, connect, syncToDrive, restoreFromDrive, isSyncing, isRestoring } = useDriveSync();

  if (token) {
    return (
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-center gap-2 text-brand-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span className="text-sm font-medium text-white">Connected to Google Drive</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={syncToDrive} 
            disabled={isSyncing || isRestoring}
            className="btn btn-primary w-full"
          >
            {isSyncing ? 'Syncing...' : 'Sync to Drive'}
          </button>
          <button 
            onClick={restoreFromDrive} 
            disabled={isSyncing || isRestoring}
            className="btn btn-secondary w-full"
          >
            {isRestoring ? 'Restoring...' : 'Restore Data'}
          </button>
        </div>
        <p className="text-xs text-charcoal-400 text-center mt-2">
          Your data is automatically synced every 5 actions while connected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <button 
        onClick={() => connect()} 
        className="btn btn-secondary w-full"
      >
        Connect Google Drive
      </button>
      <p className="text-xs text-charcoal-400 text-center">
        Connect to Google Drive to manually backup/restore and to enable automatic syncing every 5 actions.
      </p>
    </div>
  );
}
