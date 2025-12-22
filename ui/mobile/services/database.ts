import * as SQLite from 'expo-sqlite'
import type { Note } from '@core/types/domain'
import type { MutationQueueItem } from '@core/types/offline'

const DB_NAME = 'everfreenote.db'

type LocalNoteRow = Omit<Note, 'tags'> & {
    tags: string
    is_synced: number
    is_deleted: number
}

type LocalNote = Note & {
    is_synced?: number
    is_deleted?: number
}

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

      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (note_id, tag)
      );

      CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags (tag);
      CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags (note_id);

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

        await this.backfillNoteTags(this.db)

        return this.db
    }

    private mapRowToNote(row: LocalNoteRow): Note {
        return {
            ...row,
            tags: this.parseTags(row.tags),
        }
    }

    private parseTags(tags: string | null): string[] {
        if (!tags) return []
        try {
            const parsed = JSON.parse(tags)
            return Array.isArray(parsed) ? parsed.map(String) : []
        } catch {
            return []
        }
    }

    private normalizeTags(tags: string | string[] | null | undefined): string[] {
        const parsed = typeof tags === 'string' ? this.parseTags(tags) : tags ?? []
        const seen = new Set<string>()
        const result: string[] = []

        for (const tag of parsed) {
            const trimmed = String(tag).trim()
            if (!trimmed) continue
            const key = trimmed.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            result.push(trimmed)
        }

        return result
    }

    private async replaceNoteTags(
        noteId: string,
        tags: string | string[] | null | undefined,
        db?: SQLite.SQLiteDatabase
    ) {
        const database = db ?? await this.init()
        await database.runAsync('DELETE FROM note_tags WHERE note_id = ?', [noteId])
        const normalized = this.normalizeTags(tags)
        for (const tag of normalized) {
            await database.runAsync('INSERT INTO note_tags (note_id, tag) VALUES (?, ?)', [noteId, tag])
        }
    }

    private async removeNoteTags(noteId: string, db?: SQLite.SQLiteDatabase) {
        const database = db ?? await this.init()
        await database.runAsync('DELETE FROM note_tags WHERE note_id = ?', [noteId])
    }

    private async backfillNoteTags(db: SQLite.SQLiteDatabase) {
        const rows = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM note_tags')
        const existing = rows[0]?.count ?? 0
        if (existing > 0) return

        const notes = await db.getAllAsync<{ id: string; tags: string | null }>('SELECT id, tags FROM notes')
        for (const note of notes) {
            const tags = this.normalizeTags(note.tags)
            if (tags.length === 0) continue
            for (const tag of tags) {
                await db.runAsync('INSERT INTO note_tags (note_id, tag) VALUES (?, ?)', [note.id, tag])
            }
        }
    }

    async saveNotes(notes: LocalNote[]) {
        const db = await this.init()
        for (const note of notes) {
            // Skip notes without user_id to avoid constraint violations
            if (!note.user_id) {
                console.warn(`[DatabaseService] Skipping note ${note.id} because user_id is missing`);
                continue;
            }

            const tagsJson = typeof note.tags === 'string' ? note.tags : JSON.stringify(note.tags ?? [])
            const isSynced = typeof note.is_synced === 'number' ? note.is_synced : 1
            const isDeleted = typeof note.is_deleted === 'number' ? note.is_deleted : 0

            await db.runAsync(
                `INSERT OR REPLACE INTO notes (id, title, description, tags, user_id, created_at, updated_at, is_synced, is_deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [note.id, note.title ?? '', note.description ?? '', tagsJson, note.user_id, note.created_at, note.updated_at, isSynced, isDeleted]
            )
            await this.replaceNoteTags(note.id, note.tags, db)
        }
    }

    async getLocalNotes(userId: string) {
        const db = await this.init()
        const rows = await db.getAllAsync<LocalNoteRow>(
            'SELECT * FROM notes WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
            [userId]
        )
        return rows.map((r) => this.mapRowToNote(r))
    }

    async getLocalNotesByTag(
        userId: string,
        tag: string,
        options: { limit?: number; offset?: number } = {}
    ) {
        const db = await this.init()
        const limit = options.limit ?? 50
        const offset = options.offset ?? 0
        const rows = await db.getAllAsync<LocalNoteRow>(
            `SELECT n.*
             FROM notes n
             JOIN note_tags nt ON nt.note_id = n.id
             WHERE n.user_id = ? AND n.is_deleted = 0 AND nt.tag = ?
             ORDER BY n.updated_at DESC
             LIMIT ? OFFSET ?`,
            [userId, tag, limit, offset]
        )
        const totalRows = await db.getAllAsync<{ count: number }>(
            `SELECT COUNT(*) as count
             FROM notes n
             JOIN note_tags nt ON nt.note_id = n.id
             WHERE n.user_id = ? AND n.is_deleted = 0 AND nt.tag = ?`,
            [userId, tag]
        )
        const total = totalRows[0]?.count ?? 0

        return {
            notes: rows.map((r) => this.mapRowToNote(r)),
            total,
        }
    }

    async markDeleted(noteId: string, userId: string) {
        const db = await this.init()
        await db.runAsync('UPDATE notes SET is_deleted = 1, is_synced = 0 WHERE id = ? AND user_id = ?', [
            noteId,
            userId,
        ])
        await this.removeNoteTags(noteId, db)
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

    async searchNotes(
        query: string,
        userId: string,
        options: { limit?: number; offset?: number; tag?: string | null } = {}
    ) {
        const db = await this.init()
        const limit = options.limit ?? 50
        const offset = options.offset ?? 0
        const tag = options.tag && options.tag.trim().length > 0 ? options.tag : null
        const tagJoin = tag ? 'JOIN note_tags nt ON nt.note_id = n.id' : ''
        const tagWhere = tag ? 'AND nt.tag = ?' : ''
        const params = tag
            ? [query, userId, tag, limit, offset]
            : [query, userId, limit, offset]
        const rows = await db.getAllAsync<LocalNoteRow & { snippet: string | null; rank: number }>(
            `SELECT n.*, 
              snippet(notes_search, -1, '<mark>', '</mark>', '...', 10) as snippet,
              bm25(notes_search) as rank
            FROM notes n
            JOIN notes_search ON n.rowid = notes_search.rowid
            ${tagJoin}
            WHERE notes_search MATCH ? AND n.user_id = ? AND n.is_deleted = 0
            ${tagWhere}
            ORDER BY bm25(notes_search)
            LIMIT ? OFFSET ?`,
            params
        )

        return rows.map((r) => ({
            ...this.mapRowToNote(r),
            snippet: r.snippet ?? undefined,
            rank: r.rank,
        }))
    }
}

export const databaseService = new DatabaseService()


