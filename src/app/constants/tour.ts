import { Step } from 'react-joyride';

export const TOUR_STEPS: Step[] = [
  {
    target: '.dashboard-tab',
    content: 'Your command center: View real-time analytics, LST metrics, trend analysis, and system health at a glance. Track active gaps, recent activity, and key performance indicators.',
    title: '📊 Dashboard Overview',
  },
  {
    target: '.upload-tab',
    content: 'Upload past post-session reports to establish your writing style, structure, and formatting preferences. These serve as AI training examples for consistent report generation.',
    title: '📤 Upload Past Reports',
  },
  {
    target: '.cases-tab',
    content: 'Manage simulation case files with detailed metadata including location, participants, and equipment. Link cases to reports and track case-specific learning points.',
    title: '📋 Case Files',
  },
  {
    target: '.notes-tab',
    content: 'Enter or import session observations, debriefing notes, facilitator comments, and observer insights. Rich metadata tracking for comprehensive documentation.',
    title: '📝 Session Notes',
  },
  {
    target: '.generate-tab',
    content: 'AI-powered report generation using the configured provider. Select style guides, session notes, and case files to synthesize professional reports with LST identification and educational insights.',
    title: '✨ Generate Reports',
  },
  {
    target: '.lst-tracker-tab',
    content: 'Latent Safety Threat Intelligence: Track, manage, and resolve system gaps. Color-coded severity, location tracking, assignee management, and recurrence monitoring with full edit capabilities.',
    title: '🎯 LST Tracker',
  },
  {
    target: '.repository-tab',
    content: 'Centralized document management: Search, filter, tag, and organize all reports, notes, and generated documents. Advanced filtering with metadata support.',
    title: '🗄️ Repository',
  },
  {
    target: '.settings-tab',
    content: 'System administration: View/edit AI prompts, manage backups & restore, review audit logs, check keyboard shortcuts, and view comprehensive system information.',
    title: '⚙️ Settings',
  },
];

export const KEYBOARD_SHORTCUTS = [
  { label: 'Start Tour', key: 'T' },
  { label: 'Quick Generate', key: 'Ctrl+G' },
  { label: 'Upload', key: 'Ctrl+U' },
  { label: 'Search', key: 'Ctrl+F' },
] as const;
