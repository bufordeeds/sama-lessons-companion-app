import { supabase } from '@/lib/supabase';
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
   * Push all unsynced local rows to Supabase.
   * Order: sessions -> segments -> attempts -> preferences
   */
  async pushLocal(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // Push sessions
    const sessions = queries.getUnsyncedSessions();
    if (sessions.length > 0) {
      const rows = sessions.map((s) => ({
        id: s.id,
        user_id: userId,
        curriculum_item_id: s.curriculum_item_id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        notes: s.notes,
        video_url: s.video_url,
        deleted_at: s.deleted_at,
        created_at: s.created_at,
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('practice_sessions')
          .upsert(batch, { onConflict: 'id' });
        if (error) throw error;
      }

      queries.markSessionsSynced(sessions.map((s) => s.id));
    }

    // Push segments
    const segments = queries.getUnsyncedSegments();
    if (segments.length > 0) {
      const rows = segments.map((s) => ({
        id: s.id,
        user_id: userId,
        session_id: s.session_id,
        segment_number: s.segment_number,
        started_at: s.started_at,
        ended_at: s.ended_at,
        deleted_at: s.deleted_at,
        created_at: s.created_at,
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('session_segments')
          .upsert(batch, { onConflict: 'id' });
        if (error) throw error;
      }

      queries.markSegmentsSynced(segments.map((s) => s.id));
    }

    // Push attempts
    const attempts = queries.getUnsyncedAttempts();
    if (attempts.length > 0) {
      const rows = attempts.map((a) => ({
        id: a.id,
        user_id: userId,
        session_segment_id: a.session_segment_id,
        curriculum_item_id: a.curriculum_item_id,
        ostinato: a.ostinato,
        tempo: a.tempo,
        mistakes: a.mistakes,
        ostinato_broke: a.ostinato_broke === 1,
        notes: a.notes,
        deleted_at: a.deleted_at,
        created_at: a.created_at,
      }));

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('attempts')
          .upsert(batch, { onConflict: 'id' });
        if (error) throw error;
      }

      queries.markAttemptsSynced(attempts.map((a) => a.id));
    }

    // Push preferences
    const prefs = queries.getAllPreferences();
    if (prefs.length > 0) {
      // Filter out internal keys that shouldn't sync
      const syncable = prefs.filter(
        (p) => !p.key.startsWith('practice_data_seeded'),
      );
      if (syncable.length > 0) {
        const rows = syncable.map((p) => ({
          user_id: userId,
          key: p.key,
          value: p.value,
        }));
        const { error } = await supabase
          .from('user_preferences')
          .upsert(rows, { onConflict: 'user_id,key' });
        if (error) throw error;
      }
    }
  }

  /**
   * Pull changes from Supabase that are newer than our last sync.
   */
  async pullRemote(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const lastSync = queries.getPreference('last_sync_at') ?? '1970-01-01T00:00:00Z';

    // Pull sessions
    const { data: remoteSessions, error: sessErr } = await supabase
      .from('practice_sessions')
      .select('id, curriculum_item_id, started_at, ended_at, notes, video_url, deleted_at, created_at')
      .gt('updated_at', lastSync);
    if (sessErr) throw sessErr;

    for (const s of remoteSessions ?? []) {
      queries.upsertSessionFromRemote(s);
    }

    // Pull segments
    const { data: remoteSegments, error: segErr } = await supabase
      .from('session_segments')
      .select('id, session_id, segment_number, started_at, ended_at, deleted_at, created_at')
      .gt('updated_at', lastSync);
    if (segErr) throw segErr;

    for (const s of remoteSegments ?? []) {
      queries.upsertSegmentFromRemote(s);
    }

    // Pull attempts
    const { data: remoteAttempts, error: attErr } = await supabase
      .from('attempts')
      .select('id, session_segment_id, curriculum_item_id, ostinato, tempo, mistakes, ostinato_broke, notes, deleted_at, created_at')
      .gt('updated_at', lastSync);
    if (attErr) throw attErr;

    for (const a of remoteAttempts ?? []) {
      queries.upsertAttemptFromRemote(a);
    }

    // Pull preferences
    const { data: remotePrefs, error: prefErr } = await supabase
      .from('user_preferences')
      .select('key, value')
      .gt('updated_at', lastSync);
    if (prefErr) throw prefErr;

    for (const p of remotePrefs ?? []) {
      // Don't overwrite local seed keys
      if (!p.key.startsWith('practice_data_seeded')) {
        queries.upsertPreferenceFromRemote(p.key, p.value);
      }
    }

    // Update last sync timestamp
    queries.setPreference('last_sync_at', new Date().toISOString());
  }

  /**
   * Full sync: push local changes first, then pull remote changes.
   * Called on app foreground.
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
      // Network errors → offline, other errors → error state
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
   * Marks everything as synced afterwards.
   */
  async initialUpload(): Promise<void> {
    if (this._isSyncing) return;
    this._isSyncing = true;
    this.setStatus('syncing');

    try {
      // Mark all local rows as unsynced so pushLocal picks them up
      const db = queries.getDb();
      db.runSync('UPDATE practice_sessions SET synced = 0');
      db.runSync('UPDATE session_segments SET synced = 0');
      db.runSync('UPDATE attempts SET synced = 0');

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
   * Waits 300ms for additional mutations before pushing.
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
