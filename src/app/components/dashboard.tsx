import { useMemo, useState, useEffect, useRef } from 'react';
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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearching(false);
  };

  // Ask AI state
  const [askQuery, setAskQuery] = useState('');
  const [askAnswer, setAskAnswer] = useState<{ answer: string; sources: { filename: string; score: number; excerpt: string }[] } | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const askRequestId = useRef(0);

  const clearAskSearch = () => {
    askRequestId.current += 1;
    setAskQuery('');
    setAskAnswer(null);
    setAskError(null);
    setAskLoading(false);
  };

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
    const controller = new AbortController();
    setSearching(true);
    fetch(`${API_BASE}/search?q=${encodeURIComponent(debouncedSearch)}`, { headers: getApiHeaders(), signal: controller.signal })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSearchResults(Array.isArray(data) ? data : []))
      .catch((error) => { if (error.name !== 'AbortError') setSearchResults([]); })
      .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    return () => controller.abort();
  }, [debouncedSearch]);

  const handleAsk = async () => {
    if (!askQuery.trim() || askLoading) return;
    const requestId = ++askRequestId.current;
    setAskLoading(true);
    setAskAnswer(null);
    setAskError(null);
    try {
      const result = await askAI(askQuery.trim());
      if (requestId !== askRequestId.current) return;
      setAskAnswer({ answer: result.answer, sources: result.sources });
    } catch (err: any) {
      if (requestId !== askRequestId.current) return;
      setAskError(err.message || 'AI Search failed');
    } finally {
      if (requestId === askRequestId.current) setAskLoading(false);
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
        <div className="flex items-center gap-3 bg-white dark:bg-[#181c1a] border-2 border-slate-200 dark:border-[#303834] rounded-xl px-4 py-3 shadow-sm focus-within:border-[#b94f33] dark:focus-within:border-[#f08a6c] transition-colors">
          {searching ? (
            <Brain className="w-5 h-5 text-primary animate-pulse shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
          )}
          <input
            type="text"
            placeholder="Search clinical library"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-[#f3f1eb] placeholder-slate-400 dark:placeholder-[#b8c0bc] outline-none"
          />
          {searchQuery && (
            <button onClick={clearSearch} aria-label="Clear dashboard search" title="Clear search">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-[#181c1a] border border-slate-200 dark:border-[#303834] rounded-xl shadow-xl overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                <p>No matches found for "<strong>{debouncedSearch}</strong>"</p>
                <button onClick={clearSearch} className="mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
                  <X className="h-3.5 w-3.5" /> Clear search results
                </button>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#303834]">
                <div className="px-4 py-2 bg-slate-50 dark:bg-[#101312] flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {searchResults.length} Intelligent {searchResults.length === 1 ? 'Match' : 'Matches'}
                  </span>
                  <div className="flex items-center gap-3">
                  <button onClick={clearSearch} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                    <X className="h-3.5 w-3.5" /> Clear results
                  </button>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('repository')}
                      className="text-xs text-primary hover:text-accent-foreground font-semibold"
                    >
                      View all in Library →
                    </button>
                  )}
                  </div>
                </div>
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    role="button"
                    tabIndex={0}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#202622] cursor-pointer transition-colors"
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
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${result.matchType === 'semantic' ? 'bg-[#f08a6c]/15 text-[#f08a6c]' : 'bg-primary/15 text-primary'}`}>
                      {result.matchType === 'semantic' ? <Sparkles className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {result.title_highlight ? <HighlightText text={result.title_highlight} /> : result.title}
                      </p>
                      {result.snippet && (
                        <p className="text-xs text-slate-500 dark:text-[#b8c0bc] line-clamp-1 mt-0.5 italic">
                          <HighlightText text={result.snippet} />
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.matchType === 'semantic' && result.score && (
                        <span className="text-[10px] font-bold text-[#f08a6c]">{Math.round(result.score * 100)}%</span>
                      )}
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#b8c0bc] bg-slate-100 dark:bg-[#101312] px-1.5 py-0.5 rounded">
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
      <div className="bg-slate-50 dark:bg-[#181c1a] border border-slate-200 dark:border-[#303834] rounded-xl p-5">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-[#b8c0bc]">
          <span className="font-bold text-slate-900 dark:text-[#f3f1eb]">WashU Sim Intelligence</span> centralizes simulation data for the WashU Department of Emergency Medicine. Use it to track <span className="font-semibold text-[#A51417] dark:text-[#f08a6c]">Latent Safety Threats (LSTs)</span>, draft post-session reports with <span className="font-semibold text-[#17413f] dark:text-[#6db3ad]">AI</span>, and search a <span className="font-semibold text-[#245855] dark:text-[#8bc8c2]">repository</span> of prior scenario data.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Reports Generated */}
        <div className="bg-gradient-to-br from-[#f0ebe2] to-[#fffdf8] dark:from-[#181c1a] dark:to-[#202622] border-2 border-[#ddd5c8] dark:border-[#303834] rounded-xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <Sparkles className="w-7 h-7 text-[#17413f] dark:text-[#6db3ad]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#17413f] dark:text-[#6db3ad] bg-[#17413f]/10 dark:bg-[#6db3ad]/15 px-2 py-0.5 rounded">AI</span>
          </div>
          <div className="text-4xl font-black text-[#1f2523] dark:text-[#f3f1eb]">{totalReportsGenerated}</div>
          <div className="text-xs font-semibold text-[#59615e] dark:text-[#b8c0bc] mt-1">Reports Generated</div>
        </div>

        {/* Active LSTs */}
        <div className="bg-gradient-to-br from-[#f0ebe2] to-[#fffdf8] dark:from-[#181c1a] dark:to-[#202622] border-2 border-[#e7c6b8] dark:border-[#6d3529] rounded-xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <ShieldAlert className="w-7 h-7 text-[#b94f33] dark:text-[#f08a6c]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#b94f33] dark:text-[#f08a6c] bg-[#b94f33]/10 dark:bg-[#f08a6c]/15 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="text-4xl font-black text-[#1f2523] dark:text-[#f3f1eb]">{activeLsts}</div>
          <div className="text-xs font-semibold text-[#59615e] dark:text-[#b8c0bc] mt-1">Active LSTs</div>
        </div>

        {/* Resolved LSTs */}
        <div className="bg-gradient-to-br from-[#f0ebe2] to-[#fffdf8] dark:from-[#181c1a] dark:to-[#202622] border-2 border-[#ddd5c8] dark:border-[#303834] rounded-xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-7 h-7 text-[#245855] dark:text-[#8bc8c2]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#245855] dark:text-[#8bc8c2] bg-[#245855]/10 dark:bg-[#8bc8c2]/15 px-2 py-0.5 rounded">Resolved</span>
          </div>
          <div className="text-4xl font-black text-[#1f2523] dark:text-[#f3f1eb]">{resolvedLsts}</div>
          <div className="text-xs font-semibold text-[#59615e] dark:text-[#b8c0bc] mt-1">Resolved LSTs</div>
        </div>
      </div>

      {/* ── Ask AI (RAG) ── */}
      <div className="bg-gradient-to-br from-[#f0ebe2] via-white to-[#fffdf8] dark:from-[#181c1a] dark:via-[#181c1a] dark:to-[#202622] border border-[#ddd5c8] dark:border-[#303834] rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#ddd5c8] dark:border-[#303834]">
          <Sparkles className="w-4 h-4 text-[#17413f] dark:text-[#6db3ad]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Ask AI</h3>
          <span className="ml-auto text-xs text-[#59615e] dark:text-[#b8c0bc] font-medium">Powered by Vectorize RAG</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask a clinical question — e.g. 'What LSTs relate to airway management?'"
              value={askQuery}
              onChange={e => setAskQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              className="flex-1 bg-white dark:bg-[#151917] border border-[#ddd5c8] dark:border-[#303834] rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-[#f3f1eb] placeholder-slate-400 dark:placeholder-[#b8c0bc] outline-none focus:border-[#b94f33] dark:focus:border-[#f08a6c] transition-colors"
            />
            <button
              onClick={handleAsk}
              disabled={!askQuery.trim() || askLoading}
              className="flex items-center gap-2 bg-[#17413f] hover:bg-[#245855] dark:bg-[#6db3ad] dark:hover:bg-[#8bc8c2] disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-[#101312] text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              {askLoading ? <Brain className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
              {askLoading ? 'Thinking...' : 'Ask'}
            </button>
            {(askQuery || askAnswer || askError) && (
              <button
                onClick={clearAskSearch}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#ddd5c8] px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-[#303834] dark:text-[#b8c0bc] dark:hover:bg-[#202622]"
                aria-label="Clear Ask AI search"
                title="Clear Ask AI search"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
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
              <div className="bg-white dark:bg-[#151917] rounded-lg p-4 border border-[#ddd5c8] dark:border-[#303834]">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#17413f] dark:text-[#6db3ad]" />
                  <span className="text-xs font-bold text-[#17413f] dark:text-[#6db3ad] uppercase tracking-widest">AI Answer</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{askAnswer.answer}</p>
              </div>

              {/* Source Citations */}
              {askAnswer.sources.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sources ({askAnswer.sources.length})</p>
                  <div className="space-y-2">
                    {askAnswer.sources.map((src, i) => (
                      <div key={i} className="flex items-start gap-3 bg-slate-50 dark:bg-[#101312] rounded-lg px-3 py-2.5 border border-slate-100 dark:border-[#303834]">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {src.filename.split('/').pop()?.replace(/\.md$/, '') || src.filename}
                          </p>
                          {src.excerpt && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 italic">{src.excerpt}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#17413f] dark:text-[#6db3ad] bg-[#17413f]/10 dark:bg-[#6db3ad]/15 px-1.5 py-0.5 rounded shrink-0">
                          {Math.round(src.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={clearAskSearch}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear Ask AI search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── System Audit Log ── */}
      <div className="bg-white dark:bg-[#181c1a] border border-slate-200 dark:border-[#303834] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-[#303834]">
          <Calendar className="w-4 h-4 text-slate-500 dark:text-[#b8c0bc]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Audit Log</h3>
          <span className="ml-auto text-xs text-slate-400 font-medium">Most recent activity</span>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12 text-sm">
            System idle — no clinical activity recorded
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-[#303834]">
            {recentActivity.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#202622] transition-colors">
                <div className="p-2 bg-slate-100 dark:bg-[#202622] rounded-lg shrink-0">
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
