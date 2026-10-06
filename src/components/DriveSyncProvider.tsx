'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useToast } from '@/components/ui/Toast';

interface DriveSyncContextType {
  token: string | null;
  connect: () => void;
  syncToDrive: () => Promise<void>;
  restoreFromDrive: () => Promise<void>;
  isSyncing: boolean;
  isRestoring: boolean;
}

const DriveSyncContext = createContext<DriveSyncContextType | null>(null);

export function useDriveSync() {
  const ctx = useContext(DriveSyncContext);
  if (!ctx) throw new Error('useDriveSync must be used within a DriveSyncProvider');
  return ctx;
}

export function DriveSyncProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [mutationCount, setMutationCount] = useState(0);
  const { showToast } = useToast();

  // On mount, check if there's a recent token
  useEffect(() => {
    const savedToken = localStorage.getItem('google_drive_token');
    const tokenTime = localStorage.getItem('google_drive_token_time');
    if (savedToken && tokenTime) {
      // Tokens usually expire in 1 hour. We'll be conservative with 50 minutes.
      if (Date.now() - parseInt(tokenTime) < 50 * 60 * 1000) {
        setToken(savedToken);
      } else {
        localStorage.removeItem('google_drive_token');
        localStorage.removeItem('google_drive_token_time');
      }
    }

    const savedCount = localStorage.getItem('mutation_count');
    if (savedCount) {
      setMutationCount(parseInt(savedCount));
    }
  }, []);

  const connect = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setToken(codeResponse.access_token);
      localStorage.setItem('google_drive_token', codeResponse.access_token);
      localStorage.setItem('google_drive_token_time', Date.now().toString());
      showToast('Successfully connected to Google Drive', 'success');
      
      // Auto restore check on first connect could be added here, but manual is safer
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      showToast('Failed to connect to Google Drive', 'error');
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  const syncToDrive = useCallback(async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/backup/export', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error('Failed to create local backup');

      const fileContent = JSON.stringify(data.data, null, 2);
      const fileName = `daily-health-backup.json`;

      // 1. Search if file already exists to overwrite it instead of creating copies
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&spaces=drive`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const searchData = await searchRes.json();
      const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (existingFile) {
        uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = 'PATCH';
      }

      const driveRes = await fetch(uploadUrl, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!driveRes.ok) throw new Error('Failed to upload to Google Drive');

      // Reset mutation count
      setMutationCount(0);
      localStorage.setItem('mutation_count', '0');
      showToast('Data backed up to Google Drive', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error syncing to Google Drive', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [token, showToast]);

  const restoreFromDrive = useCallback(async () => {
    if (!token) return;
    setIsRestoring(true);
    try {
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='daily-health-backup.json' and trashed=false&spaces=drive`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const searchData = await searchRes.json();
      const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

      if (!existingFile) {
        showToast('No backup found in Google Drive', 'error');
        return;
      }

      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!fileRes.ok) throw new Error('Failed to download backup');

      const backupData = await fileRes.json();

      const importRes = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: backupData })
      });
      const importData = await importRes.json();

      if (!importData.success) throw new Error('Failed to restore backup');

      showToast('Successfully restored data from Google Drive!', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      showToast('Error restoring from Google Drive', 'error');
    } finally {
      setIsRestoring(false);
    }
  }, [token, showToast]);

  // Intercept fetch calls to track mutations
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
      const method = typeof args[0] === 'string' && args[1] ? args[1].method : (args[0] instanceof Request ? args[0].method : 'GET');

      if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && url.startsWith('/api/') && !url.includes('/backup/')) {
        setMutationCount(prev => {
          const next = prev + 1;
          localStorage.setItem('mutation_count', next.toString());
          return next;
        });
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Auto-sync every 5 mutations
  useEffect(() => {
    if (mutationCount >= 5 && token && !isSyncing) {
      syncToDrive();
    }
  }, [mutationCount, token, isSyncing, syncToDrive]);

  return (
    <DriveSyncContext.Provider value={{ token, connect, syncToDrive, restoreFromDrive, isSyncing, isRestoring }}>
      {children}
    </DriveSyncContext.Provider>
  );
}
