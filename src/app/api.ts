/// <reference types="vite/client" />
import type { Report, SessionNote, CaseFile, LST } from './types';

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

// Base URL for the backend API (defaults to /api proxy, can be overridden for local dev)
export const API_BASE = import.meta.env.VITE_API_BASE || (
  LOCAL_DEV_HOSTS.has(window.location.hostname)
    ? 'http://localhost:8787'
    : '/api'
);

export const getApiHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const adminToken = localStorage.getItem('washu_admin_token');
  if (adminToken) {
    headers['X-Admin-Token'] = adminToken;
  }
  
  return headers;
};

export const getAdminAuthHeaders = () => {
  const headers: Record<string, string> = {};
  const adminToken = localStorage.getItem('washu_admin_token');
  if (adminToken) {
    headers['X-Admin-Token'] = adminToken;
  }
  return headers;
};

// NOTE: Always use getApiHeaders() for fresh auth tokens — never cache headers at module scope.

async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  const contentType = response.headers.get('content-type') || '';
  let serverMessage = '';

  if (contentType.includes('application/json')) {
    const data: any = await response.json().catch(() => ({}));
    serverMessage = data.error || data.message || '';
  } else {
    serverMessage = (await response.text().catch(() => '')).trim();
  }

  const detail = serverMessage ? `: ${serverMessage}` : '';
  throw new Error(`${fallbackMessage} (${response.status} ${response.statusText})${detail}`);
}

export async function fetchHydration(): Promise<{
  reports: Report[],
  lsts: LST[],
  notes: SessionNote[],
  cases: CaseFile[]
}> {
  const res = await fetch(`${API_BASE}/hydrate`, { headers: getApiHeaders() });
  if (!res.ok) await throwApiError(res, 'Hydration failed');
  return res.json();
}

export async function fetchReports(): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/reports`, { headers: getApiHeaders() });
  if (!res.ok) throw new Error('Failed to fetch reports');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.reports || []);
}

export async function fetchGeneratedReports(): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/reports/generated`, { headers: getApiHeaders() });
  if (!res.ok) throw new Error('Failed to fetch generated reports');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.reports || []);
}

export async function fetchNotes(): Promise<SessionNote[]> {
  const res = await fetch(`${API_BASE}/notes`, { headers: getApiHeaders() });
  if (!res.ok) throw new Error('Failed to fetch notes');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.notes || []);
}

export async function fetchCaseFiles(): Promise<CaseFile[]> {
  const res = await fetch(`${API_BASE}/case-files`, { headers: getApiHeaders() });
  if (!res.ok) throw new Error('Failed to fetch case files');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.caseFiles || []);
}

export async function updateReport(id: string, payload: Partial<Report>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/reports/${id}`, {
    method: 'PUT',
    headers: getApiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update report');
  return res.json();
}

export async function updateCaseFile(id: string, payload: Partial<CaseFile>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/case-files/${id}`, {
    method: 'PUT',
    headers: getApiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update case file');
  return res.json();
}

export async function updateNote(id: string, payload: Partial<SessionNote>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: getApiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function fetchLSTs(): Promise<LST[]> {
  const res = await fetch(`${API_BASE}/lsts`, { headers: getApiHeaders() });
  if (!res.ok) throw new Error('Failed to fetch LSTs');
  const data = await res.json();
  return Array.isArray(data) ? data : (data.lsts || []);
}

export async function fetchLstHistory(id: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/lsts/${id}/history`, { headers: getApiHeaders() });
  if (!res.ok) throw new Error('Failed to fetch LST history');
  return res.json();
}

export async function updateLst(id: string, payload: Partial<LST>): Promise<LST> {
  const response = await fetch(`${API_BASE}/lsts/${id}`, {
    method: 'PUT',
    headers: getApiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update LST');
  return response.json();
}

export async function addLst(payload: Partial<LST>): Promise<{ success: boolean, id: string }> {
  const response = await fetch(`${API_BASE}/lsts/add`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to add LST');
  return response.json();
}

export async function deleteLst(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/lsts/${id}`, {
    method: 'DELETE',
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete LST');
  return response.json();
}

export async function deleteReport(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/reports/${id}`, {
    method: 'DELETE',
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete report');
  return response.json();
}

export async function mergeLsts(ids: string[], mergedLST: Partial<LST>): Promise<{ success: boolean, id: string }> {
  const response = await fetch(`${API_BASE}/lsts/merge`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify({ ids, mergedLST }),
  });
  if (!response.ok) throw new Error('Failed to merge LSTs');
  return response.json();
}

export async function fetchErrorLog(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/error-log`, {
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch error log');
  return response.json();
}

export async function clearErrorLog(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/error-log`, {
    method: 'DELETE',
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to clear error log');
  return response.json();
}

export async function fetchTemplates(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/templates`, {
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

export async function addTemplate(template: any): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('Failed to add template');
  return response.json();
}

export async function deleteTemplate(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete template');
  return response.json();
}

export async function fetchAuditLog(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/audit-log`, {
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch audit log');
  return response.json();
}

export async function fetchBackup(): Promise<any> {
  const response = await fetch(`${API_BASE}/backup`, {
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch backup');
  return response.json();
}

export async function restoreData(data: any): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/restore`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to restore data');
  return response.json();
}

export async function searchReports(query: string): Promise<Report[]> {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: getApiHeaders(),
  });
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

export async function* streamGenerateReport(payload: any, token?: string): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE}/generate-report`, {
    method: 'POST',
    headers: {
      ...getApiHeaders(),
      'X-Turnstile-Token': token || '',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error((errData as any).error || `Generation failed (${response.status})`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No stream reader');

  const decoder = new TextDecoder();
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    accumulated += chunk;
    // Detect worker-side error sentinel written into the stream
    if (accumulated.includes('__GENERATION_ERROR__: ')) {
      const errStart = accumulated.indexOf('__GENERATION_ERROR__: ');
      const errMsg = accumulated.slice(errStart + '__GENERATION_ERROR__: '.length).trim();
      throw new Error(errMsg || 'Generation failed on the server. Please try again.');
    }
    yield chunk;
  }
}

export const semanticSearch = async (query: string): Promise<any[]> => {
  const response = await fetch(`${API_BASE}/search/semantic?q=${encodeURIComponent(query)}`, {
    headers: getApiHeaders()
  });
  if (!response.ok) return [];
  return response.json();
};

export async function reindexAll() {
  const response = await fetch(`${API_BASE}/admin/reindex`, {
    method: 'POST',
    headers: getApiHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any).error || `Reindexing failed (Status: ${response.status})`);
  }
  return response.json();
}

/**
 * Ask a natural language question against the clinical library using the Vectorize RAG index.
 * Returns a full AI-generated answer with cited source documents.
 */
export async function askAI(query: string): Promise<{
  answer: string;
  sources: { filename: string; score: number; excerpt: string }[];
  search_query: string;
}> {
  const response = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify({ query, stream: false }),
  });
  if (!response.ok) {
    const err: any = await response.json().catch(() => ({}));
    throw new Error(err.error || 'AI Search failed');
  }
  return response.json();
}
