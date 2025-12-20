import * as SQLite from 'expo-sqlite'
import type { Note } from '@core/types/domain'
import type { MutationQueueItem } from '@core/types/offline'

const DB_NAME = 'everfreenote.db'

export class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null

    async init() {
        if (this.db) return this.db

        this.db = await SQLite.openDatabaseAsync(DB_NAME)

        // Create tables
        await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        description TEXT,
        tags TEXT,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS mutation_queue (
        id TEXT PRIMARY KEY NOT NULL,
        noteId TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        clientUpdatedAt TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        lastError TEXT
      );

      -- FTS5 Virtual Table for searching
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_search USING fts5(
        id UNINDEXED,
        title,
        description,
        tags,
        content='notes',
        content_rowid='rowid'
      );

      -- Triggers to keep FTS index in sync
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_search(rowid, id, title, description, tags) 
        VALUES (new.rowid, new.id, new.title, new.description, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_search(notes_search, rowid, id, title, description, tags) 
        VALUES('delete', old.rowid, old.id, old.title, old.description, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_search(notes_search, rowid, id, title, description, tags) 
        VALUES('delete', old.rowid, old.id, old.title, old.description, old.tags);
        INSERT INTO notes_search(rowid, id, title, description, tags) 
        VALUES (new.rowid, new.id, new.title, new.description, new.tags);
      END;
    `)

        return this.db
    }

    async saveNotes(notes: Note[]) {
        const db = await this.init()
        for (const note of notes) {
            // Skip notes without user_id to avoid constraint violations
            if (!note.user_id) {
                console.warn(`[DatabaseService] Skipping note ${note.id} because user_id is missing`);
                continue;
            }

            await db.runAsync(
                `INSERT OR REPLACE INTO notes (id, title, description, tags, user_id, created_at, updated_at, is_synced) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                [note.id, note.title ?? '', note.description ?? '', JSON.stringify(note.tags ?? []), note.user_id, note.created_at, note.updated_at]
            )
        }
    }

    async getLocalNotes(userId: string) {
        const db = await this.init()
        return await db.getAllAsync<Note & { is_synced: number }>(
            'SELECT * FROM notes WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
            [userId]
        )
    }

    async getQueue() {
        const db = await this.init()
        const rows = await db.getAllAsync<{
            id: string,
            noteId: string,
            operation: string,
            payload: string,
            clientUpdatedAt: string,
            status: string,
            attempts: number,
            lastError?: string
        }>('SELECT * FROM mutation_queue ORDER BY clientUpdatedAt ASC')
        return rows.map(r => ({
            ...r,
            payload: JSON.parse(r.payload)
        })) as MutationQueueItem[]
    }

    async upsertQueueItem(item: MutationQueueItem) {
        const db = await this.init()
        await db.runAsync(
            `INSERT OR REPLACE INTO mutation_queue (id, noteId, operation, payload, clientUpdatedAt, status, attempts, lastError) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.id, item.noteId, item.operation, JSON.stringify(item.payload), item.clientUpdatedAt, item.status, item.attempts ?? 0, item.lastError ?? null]
        )
    }

    async removeQueueItems(ids: string[]) {
        const db = await this.init()
        if (ids.length === 0) return
        const placeholders = ids.map(() => '?').join(',')
        await db.runAsync(`DELETE FROM mutation_queue WHERE id IN (${placeholders})`, ids)
    }

    async markQueueItemStatus(id: string, status: string, lastError?: string) {
        const db = await this.init()
        await db.runAsync(
            'UPDATE mutation_queue SET status = ?, lastError = ?, attempts = attempts + 1 WHERE id = ?',
            [status, lastError ?? null, id]
        )
    }

    async searchNotes(query: string, userId: string) {
        const db = await this.init()
        // Simple FTS5 search
        return await db.getAllAsync<Note>(
            `SELECT n.* FROM notes n
       JOIN notes_search s ON n.rowid = s.rowid
       WHERE notes_search MATCH ? AND n.user_id = ? AND n.is_deleted = 0
       ORDER BY rank`,
            [query, userId]
        )
    }
}

export const databaseService = new DatabaseService()
