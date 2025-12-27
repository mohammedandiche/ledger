import { useState, useEffect, useRef } from 'react';
import type React from 'react';
import { AppState } from 'react-native';
import type * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { applySyncMessages, flushPendingMessages, SyncError } from '@/constants/sync';
import { deleteCachedDb } from '@/constants/db';
import type { ToastOptions } from '@/contexts/toast';
import { SYNC_INTERVAL_MS, TOAST_SUCCESS_MS, TOAST_RECONNECT_MS, FULL_SYNC_DELAY_MS } from '@/constants/config';
import { getPendingCount } from '@/services/offlineQueue';
import { logger } from '@/utils/logger';

const TAG = 'sync';

export interface SyncDeps {
  dbRef: React.RefObject<SQLite.SQLiteDatabase | null>;
  fileIdRef: React.RefObject<string | null>;
  txCacheRef: React.RefObject<Map<string, unknown>>;
  reloadAllRef: React.RefObject<() => Promise<void>>;
  reloadFullRef: React.RefObject<(forceDownload?: boolean) => Promise<void>>;
  getGroupId: () => string;
  auth: { url: string; token: string | null; activeFileId: string | null };
  isConnected: boolean;
  isOnline: boolean;
  setPendingCount: (count: number) => void;
  onSignOut: () => void;
  addToast: (
    msg: string,
    variant: 'success' | 'error' | 'warning' | 'info',
    opts?: ToastOptions,
  ) => void;
  removeToastById: (id: string) => void;
}

export function useBudgetSync(deps: SyncDeps) {
  const {
    dbRef,
    fileIdRef,
    txCacheRef,
    reloadAllRef,
    reloadFullRef,
    getGroupId,
    auth,
    isConnected,
    isOnline,
    setPendingCount,
    onSignOut,
    addToast,
    removeToastById,
  } = deps;

  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const attemptedRepairRef = useRef(false);
  const syncRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const scheduleSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Maps SyncError kinds to appropriate UX actions, mirroring the two-phase
  // repair flow in actualbudget/actual sync-events.ts
  function handleSyncError(e: unknown) {
    const kind = e instanceof SyncError ? e.kind : 'server';
    const message = e instanceof Error ? e.message : 'Sync failed unexpectedly';

    logger.warn(TAG, `Sync error kind="${kind}"`, message);

    switch (kind) {
      case 'network':
        return;

      case 'token-expired':
        addToast('Session expired — please reconnect', 'error', {
          sticky: true,
          id: 'sync-auth',
          button: { label: 'Sign out', onPress: onSignOut },
        });
        return;

      case 'auth':
        addToast('Sync failed — authentication error, please reconnect', 'error', {
          sticky: true,
          id: 'sync-auth',
          button: { label: 'Sign out', onPress: onSignOut },
        });
        return;

      case 'out-of-sync':
        if (attemptedRepairRef.current) {
          attemptedRepairRef.current = false;
          addToast('Sync repair failed — data is still out of sync', 'error', {
            sticky: true,
            id: 'sync-oos',
            button: {
              label: 'Reset sync',
              onPress: () => {
                resetSync();
              },
            },
          });
        } else {
          attemptedRepairRef.current = true;
          addToast('Your data is out of sync with the server', 'warning', {
            sticky: true,
            id: 'sync-oos',
            button: {
              label: 'Repair',
              onPress: () => {
                refresh();
              },
            },
          });
        }
        return;

      case 'file-has-reset':
      case 'file-has-new-key':
        addToast('Sync was reset on this cloud file — re-downloading', 'warning', {
          sticky: true,
          id: 'sync-reset',
          button: {
            label: 'Re-download',
            onPress: () => {
              refresh();
            },
          },
        });
        return;

      case 'file-not-found':
      case 'file-needs-upload':
        addToast(message, 'warning', { sticky: true, id: 'sync-file' });
        return;

      case 'file-old-version':
        addToast('Sync format updated — a sync reset is required', 'error', {
          sticky: true,
          id: 'sync-version',
          button: {
            label: 'Reset sync',
            onPress: () => {
              resetSync();
            },
          },
        });
        return;

      case 'clock-drift':
        addToast(
          'Sync failed — your device time differs too much from the server. Check your time settings.',
          'warning',
          { sticky: true, id: 'sync-clock' },
        );
        return;

      case 'apply-failure':
        addToast('Sync failed — could not apply some changes', 'error', { id: 'sync-apply' });
        return;

      default:
        addToast(message, 'error', { id: 'sync-error' });
    }
  }

  // Debounced post-mutation sync: rapid mutations collapse into a single extra round-trip
  function scheduleSync() {
    if (scheduleSyncTimerRef.current) clearTimeout(scheduleSyncTimerRef.current);
    scheduleSyncTimerRef.current = setTimeout(() => {
      scheduleSyncTimerRef.current = null;
      syncRef.current?.();
    }, FULL_SYNC_DELAY_MS);
  }

  async function sync() {
    const db = dbRef.current;
    if (!db || !isConnected || !auth.activeFileId || isSyncingRef.current) return;

    if (!isOnline) {
      const count = await getPendingCount(db);
      setPendingCount(count);
      return;
    }

    isSyncingRef.current = true;
    setSyncing(true);
    try {
      const pending = await getPendingCount(db);
      if (pending > 0) {
        const flushed = await flushPendingMessages(
          db,
          auth.url,
          auth.token ?? '',
          auth.activeFileId,
          getGroupId(),
        );
        logger.info(TAG, `Flushed ${flushed} pending offline messages`);
        setPendingCount(0);
      }

      await applySyncMessages(db, auth.url, auth.token ?? '', auth.activeFileId, getGroupId());
      setLastSyncAt(Date.now());

      if (attemptedRepairRef.current) {
        attemptedRepairRef.current = false;
        removeToastById('sync-oos');
        addToast('Syncing has been fixed!', 'success', { duration: TOAST_SUCCESS_MS });
      }

      removeToastById('offline-reconnect');
      await reloadAllRef.current();
    } catch (e) {
      handleSyncError(e);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }

  syncRef.current = sync;

  async function refresh() {
    if (!isConnected || !auth.activeFileId) return;
    if (!isOnline) {
      addToast('Cannot refresh while offline', 'warning', { id: 'sync-offline' });
      return;
    }
    try {
      await reloadFullRef.current(true);
      removeToastById('sync-oos');
      removeToastById('sync-reset');
      removeToastById('sync-error');
      attemptedRepairRef.current = false;
      addToast('Budget repaired and re-downloaded', 'success', { duration: TOAST_SUCCESS_MS });
    } catch (e) {
      handleSyncError(e);
    }
  }

  async function resetSync() {
    if (!isConnected || !auth.activeFileId) return;
    if (!isOnline) {
      addToast('Cannot reset sync while offline', 'warning', { id: 'sync-offline' });
      return;
    }

    // Refuse if there are unsent offline changes
    const db = dbRef.current;
    if (db) {
      const pending = await getPendingCount(db);
      if (pending > 0) {
        addToast(
          `${pending} unsent change${pending > 1 ? 's' : ''} would be lost. Sync first, then reset.`,
          'warning',
          { sticky: true, id: 'sync-reset-pending' },
        );
        return;
      }
    }

    await dbRef.current?.closeAsync().catch(() => {});
    dbRef.current = null;
    fileIdRef.current = null;
    txCacheRef.current.clear();
    attemptedRepairRef.current = false;

    await deleteCachedDb();

    try {
      await reloadFullRef.current(true);
      removeToastById('sync-oos');
      removeToastById('sync-reset');
      removeToastById('sync-version');
      removeToastById('sync-error');
      removeToastById('sync-reset-pending');
      addToast('Sync reset — fresh copy downloaded', 'success', { duration: TOAST_SUCCESS_MS });
    } catch (e) {
      handleSyncError(e);
    }
  }

  useEffect(() => {
    return () => {
      if (scheduleSyncTimerRef.current) {
        clearTimeout(scheduleSyncTimerRef.current);
        scheduleSyncTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !auth.activeFileId) return;

    const interval = setInterval(() => {
      syncRef.current?.();
    }, SYNC_INTERVAL_MS);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncRef.current?.();
    });

    let wasOnline = isOnline;
    const netInfoUnsub = NetInfo.addEventListener((state) => {
      const nowOnline = !!(state.isConnected && state.isInternetReachable !== false);
      if (!wasOnline && nowOnline) {
        addToast('Back online \u2014 syncing...', 'info', {
          id: 'offline-reconnect',
          duration: TOAST_RECONNECT_MS,
        });
        syncRef.current?.();
      }
      wasOnline = nowOnline;
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      netInfoUnsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, auth.activeFileId]);

  return { lastSyncAt, syncing, sync, refresh, resetSync, setLastSyncAt, scheduleSync };
}
