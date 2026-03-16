import { apiFetch, getToken } from '@/lib/api';
import * as queries from '@/db/queries';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

type StatusListener = (status: SyncStatus) => void;

const BATCH_SIZE = 100;

class SyncServiceClass {
  private _status: SyncStatus = 'idle';
  private _listeners: Set<StatusListener> = new Set();
  private _pushTimer: ReturnType<typeof setTimeout> | null = null;
  private _isSyncing = false;

  get status(): SyncStatus {
    return this._status;
  }

  subscribe(listener: StatusListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private setStatus(status: SyncStatus) {
    this._status = status;
    this._listeners.forEach((l) => l(status));
  }

  /**
   * Push all unsynced local rows to the API.
   * Order: sessions -> segments -> attempts -> preferences
   */
  async pushLocal(): Promise<void> {
    const token = await getToken();
    if (!token) return;

    // Push sessions
    const sessions = await queries.getUnsyncedSessions();
    if (sessions.length > 0) {
      for (let i = 0; i < sessions.length; i += BATCH_SIZE) {
        const batch = sessions.slice(i, i + BATCH_SIZE);
        await apiFetch('/sync/sessions', {
          method: 'POST',
          body: JSON.stringify({ rows: batch }),
        });
      }
      await queries.markSessionsSynced(sessions.map((s) => s.id));
    }

    // Push segments
    const segments = await queries.getUnsyncedSegments();
    if (segments.length > 0) {
      for (let i = 0; i < segments.length; i += BATCH_SIZE) {
        const batch = segments.slice(i, i + BATCH_SIZE);
        await apiFetch('/sync/segments', {
          method: 'POST',
          body: JSON.stringify({ rows: batch }),
        });
      }
      await queries.markSegmentsSynced(segments.map((s) => s.id));
    }

    // Push attempts
    const attempts = await queries.getUnsyncedAttempts();
    if (attempts.length > 0) {
      const rows = attempts.map((a) => ({
        ...a,
        ostinato_broke: a.ostinato_broke === 1,
      }));
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        await apiFetch('/sync/attempts', {
          method: 'POST',
          body: JSON.stringify({ rows: batch }),
        });
      }
      await queries.markAttemptsSynced(attempts.map((a) => a.id));
    }

    // Push preferences
    const prefs = await queries.getAllPreferences();
    if (prefs.length > 0) {
      const syncable = prefs.filter(
        (p) => !p.key.startsWith('practice_data_seeded'),
      );
      if (syncable.length > 0) {
        await apiFetch('/sync/preferences', {
          method: 'POST',
          body: JSON.stringify({ rows: syncable }),
        });
      }
    }
  }

  /**
   * Pull changes from the API that are newer than our last sync.
   */
  async pullRemote(): Promise<void> {
    const token = await getToken();
    if (!token) return;

    const lastSync = (await queries.getPreference('last_sync_at')) ?? '1970-01-01T00:00:00Z';

    const data = await apiFetch<{
      sessions: any[];
      segments: any[];
      attempts: any[];
      preferences: any[];
    }>(`/sync/pull?since=${encodeURIComponent(lastSync)}`);

    for (const s of data.sessions) {
      await queries.upsertSessionFromRemote(s);
    }

    for (const s of data.segments) {
      await queries.upsertSegmentFromRemote(s);
    }

    for (const a of data.attempts) {
      await queries.upsertAttemptFromRemote(a);
    }

    for (const p of data.preferences) {
      if (!p.key.startsWith('practice_data_seeded')) {
        await queries.upsertPreferenceFromRemote(p.key, p.value);
      }
    }

    await queries.setPreference('last_sync_at', new Date().toISOString());
  }

  /**
   * Full sync: push local changes first, then pull remote changes.
   */
  async fullSync(): Promise<void> {
    if (this._isSyncing) return;
    this._isSyncing = true;
    this.setStatus('syncing');

    try {
      await this.pushLocal();
      await this.pullRemote();
      this.setStatus('idle');
    } catch (error: any) {
      if (
        error.message?.includes('Network') ||
        error.message?.includes('fetch') ||
        error.message?.includes('ECONNREFUSED')
      ) {
        this.setStatus('offline');
      } else {
        console.warn('Sync error:', error.message);
        this.setStatus('error');
      }
    } finally {
      this._isSyncing = false;
    }
  }

  /**
   * Initial upload of all existing local data after first sign-in.
   */
  async initialUpload(): Promise<void> {
    if (this._isSyncing) return;
    this._isSyncing = true;
    this.setStatus('syncing');

    try {
      const db = queries.getDb();
      await db.runAsync('UPDATE practice_sessions SET synced = 0');
      await db.runAsync('UPDATE session_segments SET synced = 0');
      await db.runAsync('UPDATE attempts SET synced = 0');

      await this.pushLocal();
      await this.pullRemote();
      this.setStatus('idle');
    } catch (error: any) {
      console.warn('Initial upload error:', error.message);
      this.setStatus('error');
    } finally {
      this._isSyncing = false;
    }
  }

  /**
   * Debounced push — called after each local mutation.
   */
  debouncedPush(): void {
    if (this._pushTimer) {
      clearTimeout(this._pushTimer);
    }
    this._pushTimer = setTimeout(() => {
      this._pushTimer = null;
      this.pushLocal().catch((err) => {
        console.warn('Background push failed:', err.message);
      });
    }, 300);
  }
}

export const SyncService = new SyncServiceClass();
