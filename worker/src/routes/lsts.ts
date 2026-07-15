import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { verifyAdmin, logAudit, indexDocumentVector } from '../lib/helpers';
import { parseJsonField } from '../utils/json';

const lstSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required").default('Untitled'),
  description: z.string().optional().default(''),
  recommendation: z.string().optional().default(''),
  severity: z.string().optional().default(''),
  status: z.string().optional().default('Identified'),
  category: z.string().optional().default(''),
  location: z.string().optional().default(''),
  resolutionNote: z.string().optional().nullable(),
  resolvedDate: z.string().optional().nullable(),
  assignee: z.string().optional().nullable(),
  parentIssueId: z.string().optional().nullable(),
  locationStatuses: z.any().optional().nullable(),
  identifiedDate: z.string().optional(),
  lastSeenDate: z.string().optional()
});

export const lstsRouter = new Hono<{ Bindings: Bindings }>();

// LST Extraction Tracker
lstsRouter.get('/', verifyAdmin, async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);
    
    const { results } = await c.env.DB.prepare('SELECT * FROM lsts ORDER BY COALESCE(NULLIF(location, ""), "Unassigned site") ASC, CASE WHEN status = "Resolved" THEN 1 ELSE 0 END, last_seen_date DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json({ 
      lsts: results.map((l: any) => ({
        ...l,
        identifiedDate: l.identified_date,
        lastSeenDate: l.last_seen_date,
        resolvedDate: l.resolved_date,
        createdAt: l.created_at,
        relatedReportId: l.related_report_id,
        resolutionNote: l.resolution_note,
        recurrenceCount: l.recurrence_count || 1,
        parentIssueId: l.parent_issue_id,
        locationStatuses: parseJsonField(l.location_statuses, {})
      }))
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

lstsRouter.put('/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const rawLst = await c.req.json();
    const parseResult = lstSchema.safeParse(rawLst);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const lst = parseResult.data;
    
    await c.env.DB.prepare(`
      UPDATE lsts SET 
        title = ?, description = ?, recommendation = ?, 
        severity = ?, status = ?, category = ?, 
        location = ?, resolution_note = ?, 
        resolved_date = ?, assignee = ?,
        parent_issue_id = ?, location_statuses = ?
      WHERE id = ?
    `)
    .bind(
      lst.title, lst.description, lst.recommendation, 
      lst.severity, lst.status, lst.category, 
      lst.location, lst.resolutionNote || null,
      lst.resolvedDate || null, lst.assignee || null,
      lst.parentIssueId || null, lst.locationStatuses ? JSON.stringify(lst.locationStatuses) : null,
      id
    ).run();

    c.executionCtx.waitUntil(indexDocumentVector(
      c.env,
      id,
      lst.title,
      `${lst.description}\n\n${lst.recommendation}`,
      'lst',
      { category: lst.category, severity: lst.severity, status: lst.status }
    ));
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

lstsRouter.post('/add', verifyAdmin, async (c) => {
  try {
    const rawLst = await c.req.json();
    const parseResult = lstSchema.safeParse(rawLst);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const lst = parseResult.data;
    const id = lst.id || `lst_${crypto.randomUUID()}`;
    
    await c.env.DB.prepare('INSERT INTO lsts (id, title, description, recommendation, severity, status, category, location, identified_date, last_seen_date, recurrence_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, lst.title || 'Untitled', lst.description || '', lst.recommendation || '', lst.severity || '', lst.status || 'Identified', lst.category || '', lst.location || '', lst.identifiedDate || new Date().toISOString(), lst.lastSeenDate || new Date().toISOString(), 1)
      .run();
      
    await logAudit(c.env.DB, 'create', 'lst', lst.title || 'Untitled LST', id);
    c.executionCtx.waitUntil(indexDocumentVector(
      c.env,
      id,
      lst.title || 'Untitled',
      `${lst.description || ''}\n\n${lst.recommendation || ''}`,
      'lst',
      { category: lst.category || '', severity: lst.severity || '', status: lst.status || 'Identified' }
    ));
    return c.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

lstsRouter.post('/merge', verifyAdmin, async (c) => {
  try {
    const { ids, mergedLST } = await c.req.json();
    if (!ids || !Array.isArray(ids) || ids.length < 2) {
      return c.json({ error: 'At least 2 IDs required for merge' }, 400);
    }

    const id = mergedLST.id || `lst_${crypto.randomUUID()}`;
    await c.env.DB.prepare(
      'INSERT INTO lsts (id, title, description, recommendation, severity, status, category, location, identified_date, last_seen_date, recurrence_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      mergedLST.title || 'Merged LST',
      mergedLST.description || '',
      mergedLST.recommendation || '',
      mergedLST.severity || '',
      mergedLST.status || 'Identified',
      mergedLST.category || '',
      mergedLST.location || '',
      mergedLST.identifiedDate || new Date().toISOString(),
      mergedLST.lastSeenDate || new Date().toISOString(),
      ids.length
    ).run();

    const placeholders = ids.map(() => '?').join(',');
    await c.env.DB.prepare(`DELETE FROM lsts WHERE id IN (${placeholders})`).bind(...ids).run();

    await logAudit(c.env.DB, 'merge', 'lst', `Merged ${ids.length} LSTs into "${mergedLST.title}"`, id);
    c.executionCtx.waitUntil(indexDocumentVector(
      c.env,
      id,
      mergedLST.title || 'Merged LST',
      `${mergedLST.description || ''}\n\n${mergedLST.recommendation || ''}`,
      'lst',
      { category: mergedLST.category || '', severity: mergedLST.severity || '', status: mergedLST.status || 'Identified' }
    ));
    return c.json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

lstsRouter.delete('/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM lsts WHERE id = ?').bind(id).run();
    await logAudit(c.env.DB, 'delete', 'lst', `Deleted LST ${id}`, id);
    return c.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

lstsRouter.get('/:id/history', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare('SELECT * FROM lst_history WHERE lst_id = ? ORDER BY created_at DESC')
      .bind(id)
      .all();
    return c.json(results);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
