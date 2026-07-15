import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Report, SessionNote, CaseFile } from '../types';
import { API_BASE, getApiHeaders, updateReport, updateNote } from '../api';
import { ReportViewer } from './report-viewer';
import { ComparisonView } from './comparison-view';
import { BulkExportModal } from './bulk-export-modal';
import { MetadataEditModal } from './metadata-edit-modal';
import { useDebounce } from '../hooks/useDebounce';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import { formatDate } from '../utils/document';
import { downloadReportDocx, downloadReportPdf } from '../utils/report-export';
import { Edit2, Users, Sparkles, FileText, ChevronUp, ChevronDown, Calendar, GitCompare, Trash2, Eye, Search, Filter, CheckCircle2, Download } from 'lucide-react';

interface ViewRepositoryProps {
  reports: Report[];
  sessionNotes: SessionNote[];
  generatedReports: Report[];
  onRefresh: () => void;
  isLoading?: boolean;
  selectedSite?: string;
}

// Helper to render highlights from backend [[HL]] tags
const HighlightText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(\[\[HL\]\].*?\[\[\/HL\]\])/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[[HL]]')) {
          const content = part.replace('[[HL]]', '').replace('[[/HL]]', '');
          return <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 text-slate-900 rounded-sm px-0.5">{content}</mark>;
        }
        return part;
      })}
    </>
  );
};

export function ViewRepository({ reports, sessionNotes, generatedReports, onRefresh, isLoading, selectedSite }: ViewRepositoryProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [expandedGenerated, setExpandedGenerated] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<Report[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [comparingReports, setComparingReports] = useState<Report[]>([]);
  const [hybridResults, setHybridResults] = useState<any[] | null>(null);
  const [editingDoc, setEditingDoc] = useState<Report | SessionNote | CaseFile | null>(null);
  const [editingType, setEditingType] = useState<'report' | 'note' | 'case'>('report');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch && debouncedSearch.length > 2) {
        setSearching(true);
        try {
          const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(debouncedSearch)}`, {
            headers: getApiHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            setHybridResults(data);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setSearching(false);
        }
      } else {
        setHybridResults(null);
      }
    };
    performSearch();
  }, [debouncedSearch]);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;

    const allDocs = [...reports, ...sessionNotes, ...generatedReports];
    const doc = allDocs.find(d => d.id === openId);

    if (doc) {
      if ('title' in doc) setViewingReport(doc as Report);
      else {
        setExpandedNote(doc.id);
        setSelectedTags([]);
        setDateRange('all');
      }
    }

    if (doc || !isLoading) {
      const params = new URLSearchParams(searchParams);
      params.delete('open');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, reports, sessionNotes, generatedReports, isLoading, setSearchParams]);

  const toggleReport = (id: string) => {
    setExpandedReport(expandedReport === id ? null : id);
  };

  const toggleNote = (id: string) => {
    setExpandedNote(expandedNote === id ? null : id);
  };

  const toggleGenerated = (id: string) => {
    setExpandedGenerated(expandedGenerated === id ? null : id);
  };

  const deleteReport = async (id: string, type: 'report' | 'note') => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const endpoint = type === 'report' ? `/reports/${id}` : `/notes/${id}`;
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      });
      if (response.ok) {
        toast.success(`${type === 'report' ? 'Report' : 'Note'} deleted successfully`);
        onRefresh();
      } else {
        toast.error(`Failed to delete ${type}`);
      }
    } catch (error) {
      toast.error('An error occurred while deleting');
    }
  };

  // Get all unique tags
  const allTags = Array.from(new Set(
    [...reports, ...sessionNotes, ...generatedReports]
      .flatMap(doc => doc.tags || [])
  ));

  // Filter documents
  const filterDocuments = <T extends Report | SessionNote>(docs: T[]) => {
    const isReportType = docs.length > 0 && 'title' in docs[0];
    
    if (isReportType && searchResults) {
      return (searchResults as unknown as T[]).filter(doc => {
        if (selectedSite && selectedSite !== 'All Sites') {
          const loc = doc.metadata?.location;
          if (loc && loc !== selectedSite) return false;
        }
        const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => doc.tags?.includes(tag));
        return matchesTags;
      });
    }

    return docs.filter(doc => {
      if (selectedSite && selectedSite !== 'All Sites') {
        const loc = doc.metadata?.location;
        if (loc && loc !== selectedSite) return false;
      }
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = searchLower === '' || 
        ('title' in doc && doc.title.toLowerCase().includes(searchLower)) ||
        ('sessionName' in doc && doc.sessionName.toLowerCase().includes(searchLower));
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => doc.tags?.includes(tag));
      let matchesDate = true;
      if (dateRange !== 'all') {
        const docDate = new Date(doc.createdAt);
        const now = new Date();
        const daysAgo = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365;
        matchesDate = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24) <= daysAgo;
      }
      return matchesSearch && matchesTags && matchesDate;
    });
  };

  const filteredReports = filterDocuments(reports);
  const filteredNotes = filterDocuments(sessionNotes);
  const filteredGenerated = filterDocuments(generatedReports);

  const toggleBulkSelection = (id: string) => {
    setSelectedForBulk(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllInCategory = (docs: any[]) => {
    const ids = docs.map(d => d.id);
    setSelectedForBulk(prev => [...new Set([...prev, ...ids])]);
  };

  const deselectAllInCategory = (docs: any[]) => {
    const ids = docs.map(d => d.id);
    setSelectedForBulk(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedForBulk.length} selected items?`)) return;
    
    try {
      const allDocs = [...reports, ...sessionNotes, ...generatedReports];
      const promises = selectedForBulk.map(id => {
        const doc = allDocs.find(d => d.id === id);
        const type = doc && 'sessionName' in doc ? 'notes' : 'reports';
        return fetch(`${API_BASE}/${type}/${id}`, {
          method: 'DELETE',
          headers: getApiHeaders(),
        });
      });
      
      await Promise.all(promises);
      toast.success(`Deleted ${selectedForBulk.length} items`);
      setSelectedForBulk([]);
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete some items');
    }
  };

  const addToComparison = (report: Report) => {
    if (comparingReports.find(r => r.id === report.id)) {
      setComparingReports(prev => prev.filter(r => r.id !== report.id));
      toast.info('Removed from comparison');
    } else if (comparingReports.length >= 3) {
      toast.error('Maximum 3 reports for comparison');
    } else {
      setComparingReports(prev => [...prev, report]);
      toast.success('Added to comparison');
    }
  };

  const downloadReport = async (report: Report, format: 'docx' | 'pdf') => {
    try {
      if (format === 'docx') await downloadReportDocx(report);
      else await downloadReportPdf(report);
      toast.success(`Report downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      toast.error(`Failed to generate ${format.toUpperCase()} file`);
    }
  };

  const handleUpdateMetadata = async (id: string, payload: any) => {
    try {
      if (editingType === 'report' || editingType === 'case') {
        await updateReport(id, payload);
      } else if (editingType === 'note') {
        await updateNote(id, payload);
      }
      toast.success('Metadata updated successfully');
      setIsEditModalOpen(false);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update metadata');
    }
  };

  if (comparingReports.length > 0) {
    return (
      <ComparisonView
        reports={comparingReports}
        onClose={() => setComparingReports([])}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isLoading && reports.length === 0 && sessionNotes.length === 0 && generatedReports.length === 0 ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={`repo-stat-${i}`} className="h-20 rounded-lg" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={`repo-row-${i}`} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
      <>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Document Repository</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Search, filter, and manage all your documents
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clinical library"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            {searching && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="all">All Time</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="year">Past Year</option>
          </select>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
                className={`px-3 py-1 rounded text-sm transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-2"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedForBulk.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <span className="text-blue-900 dark:text-blue-300 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {selectedForBulk.length} items selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkExport(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedForBulk([])}
              className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- HYBRID SEARCH MATCHES (Keyword + Semantic) --- */}
      {hybridResults && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Intelligent Matches for "{debouncedSearch}"
              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">
                {hybridResults.length}
              </span>
            </h3>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-blue-500 font-medium"
            >
              Clear Search
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {hybridResults.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No keyword or conceptual matches found.</p>
              </div>
            ) : (
              hybridResults.map((result: any) => (
                <div 
                  key={result.id} 
                  className={`bg-white dark:bg-slate-800 border-2 rounded-xl p-4 transition-all group cursor-pointer relative overflow-hidden ${
                    result.matchType === 'keyword' 
                      ? 'border-slate-200 dark:border-slate-700' 
                      : 'border-purple-100 dark:border-purple-900/30'
                  }`}
                  onClick={() => {
                    const fullDoc = [...reports, ...sessionNotes, ...generatedReports].find(d => d.id === result.id);
                    if (fullDoc) {
                      if ('title' in fullDoc) setViewingReport(fullDoc as Report);
                      else setExpandedNote(fullDoc.id);
                    }
                  }}
                >
                   {result.matchType === 'semantic' && (
                     <div className="absolute top-0 right-0 h-1 bg-purple-500" style={{ width: `${(result.score || 0) * 100}%` }}></div>
                   )}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        result.matchType === 'keyword' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {result.matchType === 'keyword' ? <Search className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-slate-900 dark:text-slate-100 transition-colors ${
                              result.matchType === 'keyword' ? 'group-hover:text-blue-600' : 'group-hover:text-purple-600'
                          }`}>
                            {result.title_highlight ? <HighlightText text={result.title_highlight} /> : result.title}
                          </h4>
                          {result.matchType === 'semantic' && (
                            <span className="text-[10px] font-black text-purple-500 uppercase tracking-tighter">
                               Conceptual Match ({Math.round(result.score * 100)}%)
                            </span>
                          )}
                          {result.isHybrid && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">
                              Strong Match
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-2 leading-relaxed">
                          {result.snippet ? <HighlightText text={result.snippet} /> : (result.content?.substring(0, 200) + '...')}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                      {result.type?.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-b border-slate-200 dark:border-slate-700 my-8"></div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{filteredReports.length}</div>
              <div className="text-sm text-blue-700 dark:text-blue-400">Prior Reports</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-300">{filteredNotes.length}</div>
              <div className="text-sm text-green-700 dark:text-green-400">Session Notes</div>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">{filteredGenerated.length}</div>
              <div className="text-sm text-purple-700 dark:text-purple-400">Generated Reports</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Panel */}
      {comparingReports.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              < GitCompare className="w-5 h-5 text-amber-700" />
              <span className="font-medium text-amber-900">
                {comparingReports.length} reports ready to compare
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                View Comparison
              </button>
              <button
                onClick={() => setComparingReports([])}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Reports */}
      {filteredGenerated.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              AI-Generated Reports
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => selectAllInCategory(filteredGenerated)}
                className="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded"
              >
                Select All
              </button>
              <button
                onClick={() => deselectAllInCategory(filteredGenerated)}
                className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {filteredGenerated.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleGenerated(report.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 text-left">
                    <input
                      type="checkbox"
                      checked={selectedForBulk.includes(report.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleBulkSelection(report.id);
                      }}
                      className="mt-1 w-4 h-4 text-purple-600 rounded"
                    />
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{report.title}</h4>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Generated on {formatDate(report.createdAt)}
                      </div>
                      {report.tags && report.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {report.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedGenerated === report.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )}
                </button>
                {expandedGenerated === report.id && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-purple-200 dark:border-purple-700 space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingReport(report)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Report
                      </button>
                      <button
                        onClick={() => addToComparison(report)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          comparingReports.find(r => r.id === report.id)
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        <GitCompare className="w-4 h-4" />
                        {comparingReports.find(r => r.id === report.id) ? 'Remove' : 'Compare'}
                      </button>
                      <button onClick={() => void downloadReport(report, 'docx')} className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> DOCX
                      </button>
                      <button onClick={() => void downloadReport(report, 'pdf')} className="bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 text-rose-700 dark:text-rose-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                      <button
                        onClick={() => deleteReport(report.id, 'report')}
                        className="bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setEditingDoc(report);
                          setEditingType('report');
                          setIsEditModalOpen(true);
                        }}
                        className="bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Metadata
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-h-96 overflow-y-auto">
                      {report.content.substring(0, 500)}...
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prior Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Prior Reports Library
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => selectAllInCategory(filteredReports)}
              className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded"
            >
              Select All
            </button>
            <button
              onClick={() => deselectAllInCategory(filteredReports)}
              className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
            >
              Deselect All
            </button>
          </div>
        </div>
        {filteredReports.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">No reports match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleReport(report.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 text-left">
                    <input
                      type="checkbox"
                      checked={selectedForBulk.includes(report.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleBulkSelection(report.id);
                      }}
                      className="mt-1 w-4 h-4 text-blue-600 rounded"
                    />
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{report.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(report.date || report.createdAt)}
                        </div>
                        <span>{report.content.length} characters</span>
                      </div>
                      {report.tags && report.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {report.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedReport === report.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )}
                </button>
                {expandedReport === report.id && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => addToComparison(report)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          comparingReports.find(r => r.id === report.id)
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        <GitCompare className="w-4 h-4" />
                        {comparingReports.find(r => r.id === report.id) ? 'Remove' : 'Compare'}
                      </button>
                      <button onClick={() => void downloadReport(report, 'docx')} className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> DOCX
                      </button>
                      <button onClick={() => void downloadReport(report, 'pdf')} className="bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 text-rose-700 dark:text-rose-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                      <button
                        onClick={() => deleteReport(report.id, 'report')}
                        className="bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setEditingDoc(report);
                          setEditingType('report');
                          setIsEditModalOpen(true);
                        }}
                        className="bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Metadata
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                      {report.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Notes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            Session Notes
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => selectAllInCategory(filteredNotes)}
              className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded"
            >
              Select All
            </button>
            <button
              onClick={() => deselectAllInCategory(filteredNotes)}
              className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
            >
              Deselect All
            </button>
          </div>
        </div>
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">No session notes match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleNote(note.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 text-left">
                    <input
                      type="checkbox"
                      checked={selectedForBulk.includes(note.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleBulkSelection(note.id);
                      }}
                      className="mt-1 w-4 h-4 text-green-600 rounded"
                    />
                    <Users className="w-5 h-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{note.sessionName}</h4>
                      <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                          {formatDate(note.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 md:w-4 md:h-4" />
                          {note.participants?.length || 0} participants
                        </span>
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {note.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedNote === note.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )}
                </button>
                {expandedNote === note.id && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => deleteReport(note.id, 'note')}
                      className="mb-3 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setEditingDoc(note);
                        setEditingType('note');
                        setIsEditModalOpen(true);
                      }}
                      className="mb-3 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Metadata
                    </button>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                      {note.notes}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Viewer Modal */}
      {viewingReport && (
        <ReportViewer
          report={viewingReport}
          onClose={() => setViewingReport(null)}
          onUpdate={onRefresh}
        />
      )}

      {/* Bulk Export Modal */}
      {showBulkExport && (
        <BulkExportModal
          selectedIds={selectedForBulk}
          allDocuments={[...reports, ...sessionNotes, ...generatedReports]}
          onClose={() => setShowBulkExport(false)}
        />
      )}
      {/* Metadata Edit Modal */}
      <MetadataEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateMetadata}
        document={editingDoc}
        type={editingType}
      />
      </>
      )}
    </div>
  );
}
