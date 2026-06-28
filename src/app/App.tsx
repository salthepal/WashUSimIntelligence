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
import { FileText, Moon, Sun, HelpCircle, Menu, MapPin, X } from 'lucide-react';
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
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { LST, Report, SessionNote } from './types';

// Suppress React DevTools warning (harmless warning from browser extensions)
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('React DevTools')) return;
    originalWarn.apply(console, args);
  };
}

// Lazy load Dashboard to reduce initial bundle size
const Dashboard = lazy(() => import('./components/dashboard').then(module => ({ default: module.Dashboard })));

export type { Report, SessionNote, LST } from './types';
import { API_BASE, getApiHeaders } from './api';
export { API_BASE, getApiHeaders };

export default function App() {
  const queryClient = useQueryClient();
  
  // --- HYDRATION (Optimization #5) ---
  const { data: hydration, isLoading: loadingHydration } = useHydration();

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
  
  const [tourRunning, setTourRunning] = useState(false);
  const [darkMode, setDarkMode] = useDarkMode();
  const [tourSteps, setTourSteps] = useLocalStorage<Step[]>('tourSteps', TOUR_STEPS);
  const navigate = useNavigate();
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
        <div className="min-h-screen bg-gradient-to-br from-[#f8f5ef] to-[#f0ebe2] dark:from-slate-900 dark:to-slate-800 transition-colors">
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
          <header className="bg-gradient-to-r from-[#17413f] to-[#245855] text-white shadow-lg">
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
                    variant="ghost"
                    size="icon"
                    onClick={() => setDarkMode(!darkMode)}
                    className="text-white hover:bg-white/20 w-8 h-8"
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
                  <Suspense fallback={<div className="p-6"><Skeleton className="h-64" /></div>}>
                    <div className="p-2 md:p-6">
                      <UploadReports reports={reports} onRefresh={fetchData} />
                    </div>
                  </Suspense>
                } />

                <Route path="/cases" element={
                  <Suspense fallback={<div className="p-6"><Skeleton className="h-64" /></div>}>
                    <div className="p-2 md:p-6">
                      <CaseFiles caseFiles={caseFiles} onRefresh={fetchData} />
                    </div>
                  </Suspense>
                } />

                <Route path="/notes" element={
                  <Suspense fallback={<div className="p-6"><Skeleton className="h-64" /></div>}>
                    <div className="p-2 md:p-6">
                      <SessionNotes sessionNotes={sessionNotes} onRefresh={fetchData} />
                    </div>
                  </Suspense>
                } />

                <Route path="/generate" element={
                  <Suspense fallback={<div className="p-6"><Skeleton className="h-96" /></div>}>
                    <div className="p-2 md:p-6">
                      <GenerateReport
                        selectedSite={selectedSite}
                        onRefresh={fetchData}
                      />
                    </div>
                  </Suspense>
                } />

                <Route path="/lst-tracker" element={
                  <Suspense fallback={<div className="p-6"><Skeleton className="h-96" /></div>}>
                    <div className="p-2 md:p-6">
                      <LSTTracker selectedSite={selectedSite} />
                    </div>
                  </Suspense>
                } />

                <Route path="/repository" element={
                  <Suspense fallback={<div className="p-6"><Skeleton className="h-96" /></div>}>
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
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}