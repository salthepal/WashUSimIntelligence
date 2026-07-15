export interface Report {
  id: string;
  title: string;
  content: string;
  htmlContent?: string;
  date: string;
  type: 'prior_report' | 'generated_report';
  createdAt: string;
  basedOnReports?: string[];
  basedOnNotes?: string[];
  tags?: string[];
  status?: 'draft' | 'reviewed' | 'approved';
  editedContent?: string;
  metadata?: {
    uploaderName?: string;
    sessionName?: string;
    sessionDate?: string;
    location?: string;
    department?: string;
    timeOfDay?: string;
    facilitators?: string[];
    observers?: string[];
    relatedReports?: string[];
    images?: string[];
  };
}

export interface SessionNote {
  id: string;
  sessionName: string;
  notes: string;
  participants: string[];
  type: 'session_notes';
  createdAt: string;
  tags?: string[];
  metadata?: {
    uploaderName?: string;
    sessionDate?: string;
    location?: string;
    department?: string;
    timeOfDay?: string;
    facilitators?: string[];
    duration?: string;
  };
}

export interface LST {
  id: string;
  title: string;
  description: string;
  status: 'Identified' | 'In Progress' | 'Resolved' | 'Recurring';
  severity: '' | 'High' | 'Medium' | 'Low';
  category: 'Equipment' | 'Process' | 'Resources' | 'Logistics';
  identifiedDate: string;
  lastSeenDate: string;
  recommendation: string;
  relatedReportId: string;
  resolutionNote?: string;
  resolvedDate?: string;
  recurrenceCount?: number;
  assignee?: string;
  location?: string;
  parentIssueId?: string; // Links identical issues across sites
  locationStatuses?: Record<string, 'Identified' | 'In Progress' | 'Resolved' | 'Recurring'>; // Maps specific sites to local status
}

export interface CaseFile {
  id: string;
  title: string;
  content: string;
  htmlContent?: string;
  date: string;
  type: 'case_file';
  createdAt: string;
  tags?: string[];
  metadata?: {
    uploaderName?: string;
    caseType?: string;
    uploadDate?: string;
    scenario?: string;
  };
}
