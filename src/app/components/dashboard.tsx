import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Report, SessionNote, LST } from '../App';
import { ShieldAlert, CheckCircle2, FileText, Users, Sparkles, Calendar, Search, Brain, X, Send, ExternalLink } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { API_BASE, getApiHeaders, askAI } from '../api';
import { useDebounce } from 'use-debounce';

interface DashboardProps {
  reports: Report[];
  sessionNotes: SessionNote[];
  generatedReports: Report[];
  lsts: LST[];
  isLoading?: boolean;
  selectedSite?: string;
  onNavigate?: (tab: string) => void;
}

interface ActivityItem {
  id: string;
  title: string;
  type: 'prior_report' | 'session_notes' | 'generated_report' | 'lst_alert';
  createdAt: string | Date;
  status?: string;
  severity?: string;
}

interface SearchResult {
  id: string;
  title: string;
  title_highlight?: string;
  snippet?: string;
  type: string;
  score?: number;
  matchType?: 'keyword' | 'semantic';
}

export function Dashboard({ reports, sessionNotes, generatedReports, lsts, isLoading, selectedSite, onNavigate }: DashboardProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Ask AI state
  const [askQuery, setAskQuery] = useState('');
  const [askAnswer, setAskAnswer] = useState<{ answer: string; sources: { filename: string; score: number; excerpt: string }[] } | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const filteredLsts = useMemo(() => {
    if (!selectedSite || selectedSite === 'All Sites') return lsts;
    return lsts.filter(l => l.location === selectedSite);
  }, [lsts, selectedSite]);

  const totalReportsGenerated = generatedReports.length;
  const activeLsts = filteredLsts.filter(l => l.status !== 'Resolved').length;
  const resolvedLsts = filteredLsts.filter(l => l.status === 'Resolved').length;

  const recentActivity = useMemo(() => {
    const all: ActivityItem[] = [
      ...reports.map(r => ({ id: r.id, title: r.title, type: 'prior_report' as const, createdAt: r.createdAt })),
      ...sessionNotes.map(n => ({ id: n.id, title: n.sessionName, type: 'session_notes' as const, createdAt: n.createdAt })),
      ...generatedReports.map(r => ({ id: r.id, title: r.title, type: 'generated_report' as const, createdAt: r.createdAt })),
      ...filteredLsts.map(l => ({
        id: l.id,
        title: l.title,
        type: 'lst_alert' as const,
        createdAt: l.lastSeenDate || l.identifiedDate,
        status: l.status,
        severity: l.severity,
      })),
    ];
    return all
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 20);
  }, [reports, sessionNotes, generatedReports, filteredLsts]);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    fetch(`${API_BASE}/search?q=${encodeURIComponent(debouncedSearch)}`, { headers: getApiHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSearchResults(Array.isArray(data) ? data : []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  const handleAsk = async () => {
    if (!askQuery.trim() || askLoading) return;
    setAskLoading(true);
    setAskAnswer(null);
    setAskError(null);
    try {
      const result = await askAI(askQuery.trim());
      setAskAnswer({ answer: result.answer, sources: result.sources });
    } catch (err: any) {
      setAskError(err.message || 'AI Search failed');
    } finally {
      setAskLoading(false);
    }
  };

  const getActivityIcon = (type: string, severity?: string) => {
    switch (type) {
      case 'prior_report': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'session_notes': return <Users className="w-4 h-4 text-emerald-600" />;
      case 'generated_report': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'lst_alert': return <ShieldAlert className={`w-4 h-4 ${severity === 'High' ? 'text-red-600' : 'text-orange-500'}`} />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActivityLabel = (type: string, status?: string) => {
    switch (type) {
      case 'prior_report': return 'Prior Report';
      case 'session_notes': return 'Session Notes';
      case 'generated_report': return 'Generated Report';
      case 'lst_alert': return status === 'Resolved' ? 'Safety Resolved' : 'Safety Alert';
      default: return 'Document';
    }
  };

  const HighlightText = ({ text }: { text: string }) => {
    const parts = text.split(/(<mark>.*?<\/mark>)/g);
    return (
      <>
        {parts.map((part, i) =>
          part.startsWith('<mark>') ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded-sm px-0.5">
              {part.replace(/<\/?mark>/g, '')}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  if (isLoading && reports.length === 0 && lsts.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Search Bar ── */}
      <div className="relative">
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-colors">
          {searching ? (
            <Brain className="w-5 h-5 text-blue-500 animate-pulse shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
          )}
          <input
            type="text"
            placeholder="Search clinical library"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults(null); }}>
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No matches found for "<strong>{debouncedSearch}</strong>"</div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {searchResults.length} Intelligent {searchResults.length === 1 ? 'Match' : 'Matches'}
                  </span>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('repository')}
                      className="text-xs text-blue-500 hover:text-blue-700 font-semibold"
                    >
                      View all in Library →
                    </button>
                  )}
                </div>
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    role="button"
                    tabIndex={0}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults(null);
                      navigate(`/repository?open=${encodeURIComponent(result.id)}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSearchQuery('');
                        setSearchResults(null);
                        navigate(`/repository?open=${encodeURIComponent(result.id)}`);
                      }
                    }}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${result.matchType === 'semantic' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {result.matchType === 'semantic' ? <Sparkles className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {result.title_highlight ? <HighlightText text={result.title_highlight} /> : result.title}
                      </p>
                      {result.snippet && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 italic">
                          <HighlightText text={result.snippet} />
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.matchType === 'semantic' && result.score && (
                        <span className="text-[10px] font-bold text-purple-500">{Math.round(result.score * 100)}%</span>
                      )}
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                        {result.type?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Intro Statement ── */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-white">WashU Sim Intelligence</span> centralizes simulation data for the WashU Department of Emergency Medicine. Use it to track <span className="font-semibold text-[#A51417]">Latent Safety Threats (LSTs)</span>, draft post-session reports with <span className="font-semibold text-purple-600">AI</span>, and search a <span className="font-semibold text-blue-600">repository</span> of prior scenario data.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Reports Generated */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/40 dark:to-indigo-900/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-200 dark:bg-purple-900/50 px-2 py-0.5 rounded">AI</span>
          </div>
          <div className="text-4xl font-black text-purple-900 dark:text-purple-200">{totalReportsGenerated}</div>
          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mt-1">Reports Generated</div>
        </div>

        {/* Active LSTs */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <ShieldAlert className="w-7 h-7 text-[#A51417] dark:text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#A51417] dark:text-red-400 bg-red-200 dark:bg-red-900/50 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="text-4xl font-black text-red-900 dark:text-red-200">{activeLsts}</div>
          <div className="text-xs font-semibold text-red-700 dark:text-red-400 mt-1">Active LSTs</div>
        </div>

        {/* Resolved LSTs */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-800 rounded-xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-7 h-7 text-[#007A33] dark:text-green-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#007A33] dark:text-green-400 bg-green-200 dark:bg-green-900/50 px-2 py-0.5 rounded">Resolved</span>
          </div>
          <div className="text-4xl font-black text-green-900 dark:text-green-200">{resolvedLsts}</div>
          <div className="text-xs font-semibold text-green-700 dark:text-green-400 mt-1">Resolved LSTs</div>
        </div>
      </div>

      {/* ── Ask AI (RAG) ── */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/30 dark:via-slate-800 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-purple-100 dark:border-purple-800/50">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Ask AI</h3>
          <span className="ml-auto text-xs text-purple-500 font-medium">Powered by Cloudflare AI Search</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask a clinical question — e.g. 'What LSTs relate to airway management?'"
              value={askQuery}
              onChange={e => setAskQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              className="flex-1 bg-white dark:bg-slate-700 border border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-purple-400 transition-colors"
            />
            <button
              onClick={handleAsk}
              disabled={!askQuery.trim() || askLoading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              {askLoading ? <Brain className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
              {askLoading ? 'Thinking...' : 'Ask'}
            </button>
          </div>

          {askError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
              {askError}
            </div>
          )}

          {askLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          )}

          {askAnswer && (
            <div className="space-y-4">
              {/* AI Answer */}
              <div className="bg-white dark:bg-slate-700/50 rounded-lg p-4 border border-purple-100 dark:border-purple-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">AI Answer</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{askAnswer.answer}</p>
              </div>

              {/* Source Citations */}
              {askAnswer.sources.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sources ({askAnswer.sources.length})</p>
                  <div className="space-y-2">
                    {askAnswer.sources.map((src, i) => (
                      <div key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-slate-700">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {src.filename.split('/').pop()?.replace(/\.md$/, '') || src.filename}
                          </p>
                          {src.excerpt && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 italic">{src.excerpt}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-purple-500 bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 rounded shrink-0">
                          {Math.round(src.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setAskAnswer(null); setAskQuery(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear answer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── System Audit Log ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <Calendar className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Audit Log</h3>
          <span className="ml-auto text-xs text-slate-400 font-medium">Most recent activity</span>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12 text-sm">
            System idle — no clinical activity recorded
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {recentActivity.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
                  {getActivityIcon(item.type, item.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className={item.type === 'lst_alert' && item.status !== 'Resolved' ? 'font-bold text-amber-600 dark:text-amber-500' : ''}>
                      {getActivityLabel(item.type, item.status)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium shrink-0">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                </div>
                {item.severity === 'High' && item.status !== 'Resolved' && (
                  <div className="w-2 h-2 rounded-full bg-[#A51417] animate-pulse shadow-[0_0_6px_#A51417] shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
