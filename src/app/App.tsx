import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useHydration, useReports, useNotes, useCaseFiles, useGeneratedReports, useLSTs } from './hooks/useQueries';
import Joyride, { Step } from 'react-joyride';

// --- LAZY LOADED COMPONENTS (Optimization #3) ---
const UploadReports = lazy(() => import('./components/upload-reports').then(m => ({ default: m.UploadReports })));
const SessionNotes = lazy(() => import('./components/session-notes').then(m => ({ default: m.SessionNotes })));
const CaseFiles = lazy(() => import('./components/case-files').then(m => ({ default: m.CaseFiles })));
const GenerateReport = lazy(() => import('./components/generate-report').then(m => ({ default: m.GenerateReport })));
const ViewRepository = lazy(() => import('./components/view-repository').then(m => ({ default: m.ViewRepository })));
const LSTTracker = lazy(() => import('./components/lst-tracker').then(m => ({ default: m.LSTTracker })));
const BackupRestore = lazy(() => import('./components/backup-restore').then(m => ({ default: m.BackupRestore })));
const AuditLog = lazy(() => import('./components/audit-log').then(m => ({ default: m.AuditLog })));
const ErrorLog = lazy(() => import('./components/error-log').then(m => ({ default: m.ErrorLog })));
import { ViewAIPrompt } from './components/view-ai-prompt';
import { ErrorBoundary } from './components/error-boundary';
import { Toaster } from './components/ui/sonner';
import { AlertTriangle, Database, FileText, HelpCircle, Home, Loader2, MapPin, Menu, Moon, RefreshCw, Sun, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
import { useDarkMode } from './hooks/useDarkMode';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { useLocalStorage } from './hooks/useLocalStorage';
import { apiCache } from './utils/cache';
import { TOUR_STEPS, KEYBOARD_SHORTCUTS } from './constants/tour';
import { toast } from 'sonner';
import { AppSidebar } from './components/app-sidebar';
import { AdminSettings } from './components/admin-settings';
import { Dashboard } from './components/dashboard';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { LST, Report, SessionNote } from './types';

// Suppress React DevTools warning (harmless warning from browser extensions)
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('React DevTools')) return;
    originalWarn.apply(console, args);
  };
}

export type { Report, SessionNote, LST } from './types';
import { API_BASE, getApiHeaders } from './api';
export { API_BASE, getApiHeaders };

function DataLoadingPanel() {
  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-2xl bg-[#102f2d] px-5 text-white shadow-xl md:px-10">
      <div className="absolute -left-24 top-[-6rem] h-72 w-72 rounded-full bg-[#007A33]/30 blur-3xl" />
      <div className="absolute -right-20 bottom-[-8rem] h-80 w-80 rounded-full bg-[#A51417]/25 blur-3xl" />
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur">
          <Database className="h-9 w-9" />
          <span className="absolute inset-[-8px] animate-ping rounded-[1.4rem] border border-emerald-300/30" />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">WashU Emergency Medicine</p>
        <h2 className="text-2xl font-bold tracking-tight md:text-4xl">Preparing your simulation intelligence</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 md:text-base">
          Securely loading reports, cases, session notes, and safety insights.
        </p>
        <div className="mt-9 w-full max-w-md">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-emerald-400 via-white to-[#A51417]" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            This usually takes only a moment
          </div>
        </div>
      </div>
    </div>
  );
}

function DataLoadErrorPanel({
  message,
  onConfigureToken,
  onRetry,
}: {
  message: string;
  onConfigureToken: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-3">
      <div className="w-full max-w-2xl rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 shadow-sm p-5 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100">
              Database load failed
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              The app could not load the current intelligence database. Try again, or check the admin token if this keeps happening.
            </p>
            <p className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-800 dark:text-red-200">
              {message}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={onRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Loading Data
              </Button>
              <Button variant="outline" onClick={onConfigureToken}>
                Configure Admin Token
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteLoadingPanel({ height = 'h-96' }: { height?: string }) {
  return (
    <div className="p-3 md:p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading view...
      </div>
      <Skeleton className={`${height} rounded-lg`} />
    </div>
  );
}

export default function App() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  // --- HYDRATION (Optimization #5) ---
  const {
    data: hydration,
    isLoading: loadingHydration,
    isError: hydrationFailed,
    error: hydrationError,
    refetch: retryHydration,
  } = useHydration();

  // Populate individual caches from hydration result
  useEffect(() => {
    if (hydration) {
      queryClient.setQueryData(['reports'], hydration.reports);
      queryClient.setQueryData(['notes'], hydration.notes);
      queryClient.setQueryData(['lsts'], hydration.lsts);
      queryClient.setQueryData(['caseFiles'], hydration.cases);
      
      // Filter generated reports
      const genReports = hydration.reports.filter((r: any) => r.type === 'generated_report');
      queryClient.setQueryData(['generatedReports'], genReports);
    }
  }, [hydration, queryClient]);

  const { data: reports = [] } = useReports();
  const { data: sessionNotes = [] } = useNotes();
  const { data: caseFiles = [] } = useCaseFiles();
  const { data: generatedReports = [] } = useGeneratedReports();
  const { data: lsts = [] } = useLSTs();
  
  const loading = loadingHydration;
  const loadedRecordCount = reports.length + sessionNotes.length + caseFiles.length + generatedReports.length + lsts.length;
  const showInitialLoading = loadingHydration && !hydration && loadedRecordCount === 0;
  const isSettingsRoute = location.pathname === '/settings';
  const showHydrationError = hydrationFailed && !hydration && loadedRecordCount === 0 && !isSettingsRoute;
  
  const [tourRunning, setTourRunning] = useState(false);
  const [darkMode, setDarkMode] = useDarkMode();
  const [tourSteps, setTourSteps] = useLocalStorage<Step[]>('tourSteps', TOUR_STEPS);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>('All Sites');

  const availableSites = useMemo(() => {
    const sites = new Set<string>();
    lsts.forEach((l: LST) => { if (l.location) sites.add(l.location); });
    reports.forEach((r: Report) => { if (r.metadata?.location) sites.add(r.metadata.location); });
    sessionNotes.forEach((n: SessionNote) => { if (n.metadata?.location) sites.add(n.metadata.location); });
    return ['All Sites', ...Array.from(sites).sort()];
  }, [lsts, reports, sessionNotes]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchData = () => {
    queryClient.invalidateQueries();
  };

  useKeyboardShortcut('t', () => {
    setTourRunning(true);
  });

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
        <div className="min-h-screen bg-gradient-to-br from-[#f8f5ef] to-[#f0ebe2] dark:from-[#101312] dark:to-[#181c1a] transition-colors">
          <Toaster />
          <Joyride
            steps={tourSteps}
            run={tourRunning}
            continuous
            showProgress
            showSkipButton
            styles={{
              options: {
                primaryColor: '#17413f',
                zIndex: 10000,
              },
            }}
          />

          {/* Header */}
          <header className="bg-gradient-to-r from-[#17413f] to-[#245855] dark:from-[#101312] dark:to-[#181c1a] text-white shadow-lg dark:border-b dark:border-[#303834]">
            <div className="px-3 md:px-6 py-2.5 md:py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileSidebarOpen(true)}
                      className="text-white hover:bg-white/20 w-8 h-8 flex-shrink-0"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  )}
                  <FileText className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-base md:text-xl font-bold truncate">WashU Emergency Medicine: Simulation & Safety Intelligence</h1>
                    <p className="text-xs text-white/70 truncate hidden md:block">Post-Session Report &amp; LST Management Platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 hover:text-white px-2 md:px-3"
                  >
                    <a href="https://washuemsim.org/" aria-label="Return to home">
                      <Home className="w-4 h-4" />
                      <span className="hidden sm:inline">Return to home</span>
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDarkMode(!darkMode)}
                    className="text-white hover:bg-white/20 w-8 h-8"
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-pressed={darkMode}
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTourRunning(true)}
                    className="text-white hover:bg-white/20 w-8 h-8"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Sidebar + Main Content */}
          <div className="flex">
            {/* Mobile Sidebar */}
            {isMobile && (
              <AppSidebar
                collapsed={false}
                onCollapsedChange={() => {}}
                mobile
                open={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
                selectedSite={selectedSite}
                onSiteChange={setSelectedSite}
                availableSites={availableSites}
              />
            )}

            {/* Desktop Sidebar */}
            {!isMobile && (
              <AppSidebar
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
                selectedSite={selectedSite}
                onSiteChange={setSelectedSite}
                availableSites={availableSites}
              />
            )}

            <main className="flex-1 min-w-0 px-2 md:px-6 py-4 md:py-6">
              {/* Site Filter Badge */}
              {selectedSite !== 'All Sites' && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400 border border-[#007A33]/20 dark:border-[#007A33]/30">
                    <MapPin className="w-3.5 h-3.5" />
                    Filtered by {selectedSite}
                    <button
                      onClick={() => setSelectedSite('All Sites')}
                      className="ml-1 hover:bg-[#007A33]/20 rounded-full p-0.5 transition-colors"
                      aria-label="Clear site filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}

              {showInitialLoading ? (
                <DataLoadingPanel />
              ) : showHydrationError ? (
                <DataLoadErrorPanel
                  message={hydrationError instanceof Error ? hydrationError.message : 'Hydration request failed'}
                  onConfigureToken={() => navigate('/settings')}
                  onRetry={() => { void retryHydration(); }}
                />
              ) : (
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                <Route path="/dashboard" element={
                  <Suspense fallback={
                    <div className="space-y-6">
                      <Skeleton className="h-8 w-64" />
                      <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-24" />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-64" />
                        ))}
                      </div>
                    </div>
                  }>
                    <Dashboard
                      reports={reports}
                      sessionNotes={sessionNotes}
                      generatedReports={generatedReports}
                      lsts={lsts}
                      isLoading={loading}
                      selectedSite={selectedSite}
                    />
                  </Suspense>
                } />

                <Route path="/upload" element={
                  <Suspense fallback={<RouteLoadingPanel height="h-64" />}>
                    <div className="p-2 md:p-6">
                      <UploadReports reports={reports} onRefresh={fetchData} />
                    </div>
                  </Suspense>
                } />

                <Route path="/cases" element={
                  <Suspense fallback={<RouteLoadingPanel height="h-64" />}>
                    <div className="p-2 md:p-6">
                      <CaseFiles caseFiles={caseFiles} onRefresh={fetchData} />
                    </div>
                  </Suspense>
                } />

                <Route path="/notes" element={
                  <Suspense fallback={<RouteLoadingPanel height="h-64" />}>
                    <div className="p-2 md:p-6">
                      <SessionNotes sessionNotes={sessionNotes} onRefresh={fetchData} />
                    </div>
                  </Suspense>
                } />

                <Route path="/generate" element={
                  <Suspense fallback={<RouteLoadingPanel />}>
                    <div className="p-2 md:p-6">
                      <GenerateReport
                        selectedSite={selectedSite}
                        onRefresh={fetchData}
                      />
                    </div>
                  </Suspense>
                } />

                <Route path="/lst-tracker" element={
                  <Suspense fallback={<RouteLoadingPanel />}>
                    <div className="p-2 md:p-6">
                      <LSTTracker selectedSite={selectedSite} />
                    </div>
                  </Suspense>
                } />

                <Route path="/repository" element={
                  <Suspense fallback={<RouteLoadingPanel />}>
                    <div className="p-2 md:p-6">
                      <ViewRepository
                        reports={reports}
                        sessionNotes={sessionNotes}
                        generatedReports={generatedReports}
                        onRefresh={fetchData}
                        isLoading={loading}
                        selectedSite={selectedSite}
                      />
                    </div>
                  </Suspense>
                } />

                <Route path="/settings" element={
                  <div className="p-3 md:p-6">
                    <div className="space-y-4 md:space-y-6">
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Settings & Administration</h2>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
                          Manage backups, audit logs, and system configuration
                        </p>
                      </div>
 
                      <AdminSettings />
                      <ViewAIPrompt />
                      <Suspense fallback={<Skeleton className="h-32" />}>
                        <BackupRestore />
                      </Suspense>
                      <Suspense fallback={<Skeleton className="h-32" />}>
                        <AuditLog />
                      </Suspense>
                      <Suspense fallback={<Skeleton className="h-32" />}>
                        <ErrorLog />
                      </Suspense>
                      
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Keyboard Shortcuts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
                          {KEYBOARD_SHORTCUTS.map((shortcut) => (
                            <div key={shortcut.key} className="flex justify-between items-center">
                              <span className="text-slate-600 dark:text-slate-400">{shortcut.label}</span>
                              <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-slate-100">{shortcut.key}</kbd>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                } />
                </Routes>
              )}
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
