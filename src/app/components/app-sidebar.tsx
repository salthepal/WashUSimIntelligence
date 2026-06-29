import { LayoutDashboard, UploadCloud, FileStack, ClipboardPaste, Wand2, ShieldAlert, Database, Settings, PanelLeftClose, PanelLeft, Hospital, ChevronDown } from 'lucide-react';
import { cn } from './ui/utils';
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface SidebarItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  className?: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, className: 'dashboard-tab' },
  { value: 'upload', label: 'Upload', icon: <UploadCloud className="w-5 h-5" />, className: 'upload-tab' },
  { value: 'cases', label: 'Cases', icon: <FileStack className="w-5 h-5" />, className: 'cases-tab' },
  { value: 'notes', label: 'Notes', icon: <ClipboardPaste className="w-5 h-5" />, className: 'notes-tab' },
  { value: 'generate', label: 'Generate', icon: <Wand2 className="w-5 h-5" />, className: 'generate-tab' },
  { value: 'lst-tracker', label: 'LST Tracker', icon: <ShieldAlert className="w-5 h-5" />, className: 'lst-tracker-tab' },
  { value: 'repository', label: 'Repository', icon: <Database className="w-5 h-5" />, className: 'repository-tab' },
  { value: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, className: 'settings-tab' },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
  selectedSite?: string;
  onSiteChange?: (site: string) => void;
  availableSites?: string[];
}

function SiteSelector({ selectedSite, onSiteChange, availableSites, collapsed }: {
  selectedSite: string;
  onSiteChange: (site: string) => void;
  availableSites: string[];
  collapsed?: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (collapsed) {
    return (
      <div className="px-2 mb-2" ref={ref}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'w-full flex items-center justify-center p-2 rounded-lg transition-colors',
            selectedSite !== 'All Sites'
              ? 'bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400'
              : 'text-slate-500 dark:text-[#b8c0bc] hover:bg-slate-200 dark:hover:bg-[#202622]'
          )}
          title={`Site: ${selectedSite}`}
          aria-label="Select hospital site"
        >
          <Hospital className="w-5 h-5" />
        </button>
        {dropdownOpen && (
          <div className="absolute left-14 top-auto z-50 w-48 bg-white dark:bg-[#181c1a] border border-slate-200 dark:border-[#303834] rounded-lg shadow-lg py-1 mt-1">
            {availableSites.map(site => (
              <button
                key={site}
                onClick={() => { onSiteChange(site); setDropdownOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  selectedSite === site
                    ? 'bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400 font-medium'
                    : 'text-slate-700 dark:text-[#b8c0bc] hover:bg-slate-100 dark:hover:bg-[#202622]'
                )}
              >
                {site}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 mb-2" ref={ref}>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#b8c0bc] mb-1.5 px-1">
        <Hospital className="w-3.5 h-3.5" />
        Hospital Site
      </label>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
          selectedSite !== 'All Sites'
            ? 'border-[#007A33]/30 bg-[#007A33]/5 text-[#007A33] dark:border-[#007A33]/40 dark:bg-[#007A33]/10 dark:text-emerald-400'
            : 'border-slate-200 dark:border-[#303834] bg-white dark:bg-[#151917] text-slate-700 dark:text-[#f3f1eb]'
        )}
        aria-label="Select hospital site"
      >
        <span className="truncate font-medium">{selectedSite}</span>
        <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
      </button>
      {dropdownOpen && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white dark:bg-[#181c1a] border border-slate-200 dark:border-[#303834] rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
            {availableSites.map(site => (
              <button
                key={site}
                onClick={() => { onSiteChange(site); setDropdownOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  selectedSite === site
                    ? 'bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400 font-medium'
                    : 'text-slate-700 dark:text-[#b8c0bc] hover:bg-slate-100 dark:hover:bg-[#202622]'
                )}
              >
                {site}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarWordmark({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center bg-primary flex-shrink-0"
        role="img"
        aria-label="WashU Sim Intelligence"
      >
        <span className="text-primary-foreground text-xs font-black tracking-tight" aria-hidden="true">W</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-md flex items-center justify-center bg-primary flex-shrink-0" aria-hidden="true">
        <span className="text-primary-foreground text-sm font-black tracking-tight">W</span>
      </div>
      <div className="leading-tight font-mono min-w-0">
        <div className="text-[9px] font-normal text-slate-400 dark:text-[#b8c0bc] uppercase tracking-widest">WashU EM</div>
        <div className="text-[13px] font-semibold text-primary tracking-wide">SIM INTEL</div>
      </div>
    </div>
  );
}

export function AppSidebar({ collapsed, onCollapsedChange, mobile, open, onClose, selectedSite, onSiteChange, availableSites }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (value: string) => {
    navigate(`/${value}`);
    if (mobile && onClose) onClose();
  };

  const showSiteSelector = selectedSite && onSiteChange && availableSites && availableSites.length > 1;

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-3">
      {/* Logo / Wordmark header — desktop only; mobile shows it in the drawer header */}
      {!mobile && (
        <div className={cn(
          "flex items-center mb-3 pb-3 border-b border-slate-200 dark:border-[#303834]",
          collapsed ? "justify-center" : "px-1"
        )}>
          <SidebarWordmark collapsed={collapsed} />
        </div>
      )}

      <div className={cn("flex items-center mb-2", collapsed ? "justify-center" : "justify-between px-2")}>
        {!collapsed && <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#b8c0bc]">Navigation</span>}
        {!mobile && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#202622] text-slate-500 dark:text-[#b8c0bc] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Site Selector */}
      {showSiteSelector && (
        <SiteSelector
          selectedSite={selectedSite}
          onSiteChange={onSiteChange}
          availableSites={availableSites}
          collapsed={collapsed && !mobile}
        />
      )}

      {SIDEBAR_ITEMS.map((item) => {
        const isActive = location.pathname.includes(`/${item.value}`);
        return (
          <button
            key={item.value}
            onClick={() => handleClick(item.value)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              item.className,
              collapsed && !mobile && 'justify-center px-2',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-700 dark:text-[#b8c0bc] hover:bg-slate-200 dark:hover:bg-[#202622]'
            )}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {(!collapsed || mobile) && <span>{item.label}</span>}
          </button>
        );
      })}

      <div className="mt-auto px-3 py-4 border-t border-slate-200 dark:border-[#303834]">
        <a
          href="https://github.com/salthepal/WashUSimIntelligence"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-[#b8c0bc] dark:hover:text-[#f3f1eb] transition-colors",
            collapsed && !mobile && "justify-center"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          {(!collapsed || mobile) && <span>Open Source</span>}
        </a>
      </div>
    </nav>
  );

  // Mobile: overlay drawer
  if (mobile) {
    return (
      <>
        {open && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
        )}
        <aside
          className={cn(
            'fixed top-0 left-0 z-50 h-full w-64 bg-slate-50 dark:bg-[#181c1a] border-r border-slate-200 dark:border-[#303834] transform transition-transform duration-200 ease-in-out',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-3 border-b border-slate-200 dark:border-[#303834] flex items-center justify-between">
            <SidebarWordmark collapsed={false} />
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#202622] text-slate-500 dark:text-[#b8c0bc]">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        'sticky top-0 h-screen flex-shrink-0 bg-slate-50 dark:bg-[#181c1a] border-r border-slate-200 dark:border-[#303834] transition-all duration-200 overflow-y-auto',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
