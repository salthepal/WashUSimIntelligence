import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { verifyAdmin, verifyTurnstile, logAudit, logError } from '../lib/helpers';
import { parseJsonField } from '../utils/json';

const noteSchema = z.object({
  id: z.string().optional(),
  sessionName: z.string().min(1, "Session Name is required").default('Untitled Session'),
  notes: z.string().optional().default(''),
  participants: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.any().optional().default({})
});

export const notesRouter = new Hono<{ Bindings: Bindings }>();

notesRouter.get('/', verifyAdmin, async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);

    const { results } = await c.env.DB.prepare('SELECT * FROM session_notes ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json({
      notes: results.map((n: any) => ({
        id: n.id,
        sessionName: n.session_name,
        notes: n.notes,
        type: 'session_notes',
        createdAt: n.created_at || new Date().toISOString(),
        participants: parseJsonField(n.participants, []),
        tags: parseJsonField(n.tags, []),
        metadata: parseJsonField(n.metadata, {})
      }))
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

notesRouter.post('/add', verifyAdmin, verifyTurnstile, async (c) => {
  try {
    const rawNote = await c.req.json();
    const parseResult = noteSchema.safeParse(rawNote);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const note = parseResult.data;
    const id = note.id || `notes_${crypto.randomUUID()}`;
    
    await c.env.DB.prepare('INSERT INTO session_notes (id, session_name, notes, participants, tags, metadata) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, note.sessionName || 'Untitled Session', note.notes || '', JSON.stringify(note.participants || []), JSON.stringify(note.tags || []), JSON.stringify(note.metadata || {}))
      .run();
      
    await logAudit(c.env.DB, 'create', 'session_notes', note.sessionName || 'Untitled Session', id);
    return c.json({ success: true, notes: { ...note, id } });
  } catch (error: any) {
    await logError(c.env.DB, 'note_upload', error);
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

notesRouter.delete('/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM session_notes WHERE id = ?').bind(id).run();
    await logAudit(c.env.DB, 'delete', 'session_notes', `Deleted note ${id}`, id);
    return c.json({ success: true });
  } catch (error: any) {
    await logError(c.env.DB, 'note_delete', error);
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

notesRouter.put('/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { sessionName, created_at, participants, tags, metadata } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE session_notes SET 
        session_name = COALESCE(?, session_name),
        created_at = COALESCE(?, created_at),
        participants = COALESCE(?, participants),
        tags = COALESCE(?, tags),
        metadata = COALESCE(?, metadata)
      WHERE id = ?
    `)
    .bind(
      sessionName, 
      created_at, 
      participants ? JSON.stringify(participants) : null,
      tags ? JSON.stringify(tags) : null,
      metadata ? JSON.stringify(metadata) : null,
      id
    )
    .run();

    await logAudit(c.env.DB, 'update', 'session_notes', `Updated note ${sessionName || id}`, id);
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
