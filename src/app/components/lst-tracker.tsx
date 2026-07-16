import React, { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Search, Filter, CheckCircle2, ShieldCheck, XCircle,
  TrendingUp, Users, Calendar, PlayCircle, Archive, AlertCircle,
  Download, MapPin, Pencil, X, Save, Trash2, GitMerge, Plus, History, Sparkles
} from 'lucide-react';
import { formatDate } from '../utils/document';
import { LST } from '../types';
import { toast } from 'sonner';
import { useConfirmDialog } from './ui/confirm-dialog';

interface LSTTrackerProps {
  selectedSite?: string;
}

import { EditModalState, INITIAL_EDIT, LstEditModal } from './lst-edit-modal';
import { LstHistoryModal } from './lst-history-modal';
import { useLSTs, useUpdateLST, useAddLST, useDeleteLST, useMergeLSTs } from '../hooks/useQueries';

export function LSTTracker({ selectedSite }: LSTTrackerProps) {
  const { data } = useLSTs();
  const lsts = (data || []) as LST[];
  const updateLstMutation = useUpdateLST();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<EditModalState>(INITIAL_EDIT);
  
  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Create / Merge states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [newLstData, setNewLstData] = useState<Partial<LST>>({
    title: '',
    description: '',
    severity: '' as LST['severity'],
    category: 'Process' as LST['category'],
    status: 'Identified' as LST['status'],
    location: selectedSite === 'All Sites' ? '' : selectedSite,
  });

  const [historyModal, setHistoryModal] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: '',
    title: '',
  });

  // Batch edit
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [batchEdit, setBatchEdit] = useState<{
    status: '' | LST['status'];
    severity: '' | LST['severity'];
    category: '' | LST['category'];
    assigneeEnabled: boolean;
    assignee: string;
    locationEnabled: boolean;
    location: string;
  }>({
    status: '',
    severity: '',
    category: '',
    assigneeEnabled: false,
    assignee: '',
    locationEnabled: false,
    location: '',
  });

  const { confirm, dialog } = useConfirmDialog();

  const addLstMutation = useAddLST();
  const deleteLstMutation = useDeleteLST();
  const mergeLstsMutation = useMergeLSTs();

  // ── Derived Data ──
  const uniqueLocations = useMemo(() => {
    const locations = lsts.map((l: LST) => l.location).filter(Boolean) as string[];
    return ['All', ...Array.from(new Set(locations))];
  }, [lsts]);

  const filteredLsts = useMemo(() => {
    return lsts.filter((lst: LST) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || lst.title.toLowerCase().includes(q) || lst.description.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'All' || lst.status === filterStatus;
      const matchesSeverity = filterSeverity === 'All' || (filterSeverity === 'Not reviewed' ? !lst.severity : lst.severity === filterSeverity);
      const matchesCategory = filterCategory === 'All' || lst.category === filterCategory;
      const matchesLocation = filterLocation === 'All' || lst.location === filterLocation;
      const matchesSite = !selectedSite || selectedSite === 'All Sites' || lst.location === selectedSite;
      return matchesSearch && matchesStatus && matchesSeverity && matchesCategory && matchesLocation && matchesSite;
    });
  }, [lsts, searchQuery, filterStatus, filterSeverity, filterCategory, filterLocation, selectedSite]);

  const sortedLsts = useMemo(() => {
    return [...filteredLsts].sort((a: LST, b: LST) => {
      const siteOrder = (a.location || 'Unassigned site').localeCompare(b.location || 'Unassigned site');
      if (siteOrder !== 0) return siteOrder;
      return new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime();
    });
  }, [filteredLsts]);

  const consolidationSuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const words = (lst: LST) => new Set(`${lst.title} ${lst.description}`.toLowerCase().match(/[a-z]{4,}/g) || []);
    const suggestions: { first: LST; second: LST; score: number }[] = [];
    for (let i = 0; i < lsts.length; i++) {
      for (let j = i + 1; j < lsts.length; j++) {
        const a = words(lsts[i]); const b = words(lsts[j]);
        const overlap = [...a].filter((word) => b.has(word)).length;
        const score = overlap / Math.max(1, new Set([...a, ...b]).size);
        if (score >= 0.28) suggestions.push({ first: lsts[i], second: lsts[j], score });
      }
    }
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [lsts, showSuggestions]);

  const stats = useMemo(() => {
    const siteLsts = (!selectedSite || selectedSite === 'All Sites') ? lsts : lsts.filter((l: LST) => l.location === selectedSite);
    return {
      total: siteLsts.length,
      active: siteLsts.filter((l: LST) => l.status === 'Identified').length,
      unreviewedRisk: siteLsts.filter((l: LST) => !l.severity).length,
      resolved: siteLsts.filter((l: LST) => l.status === 'Resolved').length,
    };
  }, [lsts, selectedSite]);

  const activeFilterCount = [filterStatus, filterSeverity, filterCategory, filterLocation].filter(f => f !== 'All').length;

  // ── Handlers ──
  const openEditModal = useCallback((lst: LST) => {
    setEditModal({
      open: true,
      lst,
      status: lst.status,
      severity: lst.severity,
      category: lst.category,
      location: lst.location || '',
      recommendation: lst.recommendation || '',
      resolutionNote: lst.resolutionNote || '',
      assignee: lst.assignee || '',
      locationStatuses: lst.locationStatuses || {},
    });
  }, []);

  const handleSaveEdit = async () => {
    if (!editModal.lst) return;
    setSaving(true);
    try {
      const payload = {
        ...editModal.lst,
        status: editModal.status as LST['status'],
        severity: editModal.severity as LST['severity'],
        category: editModal.category as LST['category'],
        location: editModal.location || undefined,
        recommendation: editModal.recommendation,
        resolutionNote: editModal.resolutionNote || undefined,
        assignee: editModal.assignee || undefined,
        locationStatuses: editModal.locationStatuses,
        ...(editModal.status === 'Resolved' && !editModal.lst.resolvedDate
          ? { resolvedDate: new Date().toISOString() }
          : {}),
      };

      await updateLstMutation.mutateAsync({ id: editModal.lst.id, payload });
      toast.success('LST updated successfully');
      setEditModal(INITIAL_EDIT);
    } catch (error) {
      console.error('Error updating LST:', error);
      toast.error('Failed to update LST');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (lst: LST) => {
    const flow: Record<string, LST['status']> = {
      'Identified': 'In Progress',
      'In Progress': 'In Progress',
      'Recurring': 'In Progress',
    };
    const newStatus = flow[lst.status];
    if (!newStatus) return;

    try {
      await updateLstMutation.mutateAsync({ id: lst.id, payload: { ...lst, status: newStatus } });
      toast.success(`Advanced to "${newStatus}"`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleCreateLst = async () => {
    if (!newLstData.title || !newLstData.description) {
      toast.error('Title and description are required');
      return;
    }
    setSaving(true);
    try {
      await addLstMutation.mutateAsync({
        ...newLstData,
        identifiedDate: new Date().toISOString(),
        lastSeenDate: new Date().toISOString(),
      });
      toast.success('LST created successfully');
      setIsCreateModalOpen(false);
      setNewLstData({
        title: '',
        description: '',
        severity: '' as LST['severity'],
        category: 'Process' as LST['category'],
        status: 'Identified' as LST['status'],
        location: selectedSite === 'All Sites' ? '' : selectedSite,
      });
    } catch (error) {
      toast.error('Failed to create LST');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    confirm({
      title: `Delete ${selectedIds.size} LST${selectedIds.size > 1 ? 's' : ''}`,
      description: `Are you sure you want to permanently delete ${selectedIds.size} selected LST${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        setSaving(true);
        const idsToDelete = Array.from(selectedIds);
        try {
          // Clear selection immediately for instant UI feedback
          setSelectedIds(new Set());
          
          // Execute in parallel
          await Promise.all(idsToDelete.map(id => deleteLstMutation.mutateAsync(id)));
          
          toast.success(`${idsToDelete.length} LST${idsToDelete.length > 1 ? 's' : ''} deleted`);
        } catch (error) {
          console.error('Delete error:', error);
          toast.error('Failed to delete some LSTs');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleBatchEdit = async () => {
    const hasChanges = batchEdit.status || batchEdit.severity || batchEdit.category ||
      batchEdit.assigneeEnabled || batchEdit.locationEnabled;
    if (!hasChanges) {
      toast.error('No changes selected');
      return;
    }
    const idsToUpdate = Array.from(selectedIds);
    setSaving(true);
    try {
      setSelectedIds(new Set());
      await Promise.all(idsToUpdate.map(async (id) => {
        const lst = lsts.find((l: LST) => l.id === id);
        if (!lst) return;
        const payload: Partial<LST> = { ...lst };
        if (batchEdit.status) payload.status = batchEdit.status;
        if (batchEdit.severity) payload.severity = batchEdit.severity;
        if (batchEdit.category) payload.category = batchEdit.category;
        if (batchEdit.assigneeEnabled) payload.assignee = batchEdit.assignee || undefined;
        if (batchEdit.locationEnabled) payload.location = batchEdit.location || undefined;
        if (batchEdit.status === 'Resolved' && !lst.resolvedDate) {
          payload.resolvedDate = new Date().toISOString();
        }
        await updateLstMutation.mutateAsync({ id, payload });
      }));
      toast.success(`Updated ${idsToUpdate.length} LST${idsToUpdate.length > 1 ? 's' : ''}`);
      setIsBatchEditOpen(false);
      setBatchEdit({ status: '', severity: '', category: '', assigneeEnabled: false, assignee: '', locationEnabled: false, location: '' });
    } catch (error) {
      console.error('Batch update error:', error);
      toast.error('Failed to update some LSTs');
    } finally {
      setSaving(false);
    }
  };

  const openMergeModal = () => {
    if (selectedIds.size < 2) return;
    
    // Pre-fill merge data from selected items
    const selectedLsts = lsts.filter(l => selectedIds.has(l.id));
    const humanSeverity = selectedLsts.find(l => l.severity)?.severity || '';
    
    setNewLstData({
      title: `Merged: ${selectedLsts[0].title}`,
      description: selectedLsts.map(l => l.description).join('\n\n---\n\n'),
      severity: humanSeverity as LST['severity'],
      category: selectedLsts[0].category as LST['category'],
      status: 'Identified' as LST['status'],
      location: selectedLsts[0].location,
      recommendation: selectedLsts.map(l => l.recommendation).filter(Boolean).join('\n\n'),
    });
    setIsMergeModalOpen(true);
  };

  const handleMergeLsts = async () => {
    setSaving(true);
    try {
      await mergeLstsMutation.mutateAsync({
        ids: Array.from(selectedIds),
        mergedLST: {
          ...newLstData,
          identifiedDate: new Date().toISOString(),
          lastSeenDate: new Date().toISOString(),
        }
      });
      toast.success('LSTs merged successfully');
      setIsMergeModalOpen(false);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to merge LSTs');
    } finally {
      setSaving(false);
    }
  };

  const reviewSuggestion = (first: LST, second: LST) => {
    const ids = new Set([first.id, second.id]);
    setSelectedIds(ids);
    setNewLstData({
      title: `Consolidated: ${first.title}`,
      description: `${first.description}\n\n---\n\n${second.description}`,
      severity: (first.severity || second.severity || '') as LST['severity'],
      category: first.category,
      status: 'Identified',
      location: first.location === second.location ? first.location : '',
      recommendation: [first.recommendation, second.recommendation].filter(Boolean).join('\n\n'),
    });
    setIsMergeModalOpen(true);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filteredLsts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLsts.map(l => l.id)));
    }
  };

  // ── CSV Export ──
  const handleDownloadCSV = () => {
    const headers = ['Title', 'Description', 'Status', 'Severity', 'Category', 'Location', 'Assignee', 'Identified Date', 'Last Seen', 'Resolved Date', 'Recommendation', 'Resolution Note', 'Recurrence Count'];
    const rows = sortedLsts.map((lst: LST) => [
      `"${(lst.title || '').replace(/"/g, '""')}"`,
      `"${(lst.description || '').replace(/"/g, '""')}"`,
      lst.status, lst.severity, lst.category,
      lst.location || '', lst.assignee || '',
      lst.identifiedDate ? new Date(lst.identifiedDate).toLocaleDateString() : '',
      lst.lastSeenDate ? new Date(lst.lastSeenDate).toLocaleDateString() : '',
      lst.resolvedDate ? new Date(lst.resolvedDate).toLocaleDateString() : '',
      `"${(lst.recommendation || '').replace(/"/g, '""')}"`,
      `"${(lst.resolutionNote || '').replace(/"/g, '""')}"`,
      lst.recurrenceCount || 0,
    ]);
    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lst-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('LST data exported as CSV');
  };

  // ── Badge Helpers ──
  const severityBadge = (sev: string) => {
    if (!sev) return <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border border-dashed border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400">Risk not reviewed</span>;
    const cls = sev === 'High'
      ? 'bg-[#A51417] text-white'
      : sev === 'Medium'
      ? 'bg-orange-500 text-white'
      : 'bg-slate-400 text-white';
    return <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${cls}`}>{sev}</span>;
  };

  const statusBadge = (status: string) => {
    const cls = status === 'Resolved'
      ? 'bg-[#007A33]/15 text-[#007A33] dark:bg-green-900/40 dark:text-green-400 border border-[#007A33]/30 dark:border-green-700'
      : status === 'Recurring'
      ? 'bg-[#A51417]/15 text-[#A51417] dark:bg-red-900/40 dark:text-red-400 border border-[#A51417]/30 dark:border-red-700'
      : status === 'In Progress'
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-700';
    return <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${cls}`}>{status}</span>;
  };

  return (
    <div className="space-y-4 md:space-y-5 p-2 md:p-0">
      {dialog}
      {/* ── Edit Modal Overlay ── */}
      <LstEditModal editModal={editModal} setEditModal={setEditModal} saving={saving} onSave={handleSaveEdit} />

      {/* ── History Modal Overlay ── */}
      {historyModal.open && (
        <LstHistoryModal 
          id={historyModal.id} 
          title={historyModal.title} 
          onClose={() => setHistoryModal({ open: false, id: '', title: '' })} 
        />
      )}

      {/* ── Header ── */}
      <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#A51417] rounded-lg">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">Safety Threat Tracker</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">WashU Emergency Medicine &mdash; System Safety Monitor</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSuggestions((value) => !value)} className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 font-bold rounded-lg transition-all text-sm">
            <Sparkles className="w-4 h-4" /> Consolidation suggestions
            {consolidationSuggestions.length > 0 && <span className="rounded-full bg-purple-700 px-1.5 text-[10px] text-white">{consolidationSuggestions.length}</span>}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#007A33] hover:bg-[#006428] text-white font-bold rounded-lg transition-all text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> New LST
          </button>
        </div>
      </div>

      {showSuggestions && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-800 dark:bg-purple-950/20">
          <div className="mb-3">
            <h3 className="font-bold text-purple-950 dark:text-purple-200">Possible consolidations for human review</h3>
            <p className="text-xs text-purple-700 dark:text-purple-400">These are suggestions only. Nothing is combined until you review and confirm it.</p>
          </div>
          {consolidationSuggestions.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No strong similarities found right now.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {consolidationSuggestions.map(({ first, second, score }) => (
                <button key={`${first.id}-${second.id}`} onClick={() => reviewSuggestion(first, second)} className="rounded-lg border border-purple-200 bg-white p-3 text-left hover:border-purple-400 dark:border-purple-800 dark:bg-slate-900">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{first.title}</div>
                  <div className="my-1 text-[10px] font-bold uppercase text-purple-600">may overlap with</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{second.title}</div>
                  <div className="mt-2 flex gap-2 text-[10px] text-slate-500"><span>{first.location || 'Unassigned site'}</span><span>•</span><span>{second.location || 'Unassigned site'}</span><span className="ml-auto">{Math.round(score * 100)}% overlap</span></div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">{stats.total}</div>
          <div className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-amber-700 dark:text-amber-300">{stats.active}</div>
          <div className="text-[10px] md:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Active</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-[#A51417]/30 dark:border-red-800 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-[#A51417] dark:text-red-300">{stats.unreviewedRisk}</div>
          <div className="text-[10px] md:text-xs font-semibold text-[#A51417] dark:text-red-400 uppercase tracking-wider">Needs Risk Review</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 border border-[#007A33]/30 dark:border-green-800 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-[#007A33] dark:text-green-300">{stats.resolved}</div>
          <div className="text-[10px] md:text-xs font-semibold text-[#007A33] dark:text-green-400 uppercase tracking-wider">Resolved</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search threats..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Location Dropdown */}
          <select
            value={filterLocation}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterLocation(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
          >
            {uniqueLocations.map((loc: string) => (
              <option key={loc} value={loc}>{loc === 'All' ? 'All Locations' : loc}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#A51417] text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-[#A51417] rounded-full text-[10px] font-bold">{activeFilterCount}</span>
            )}
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        {/* Expandable Filter Chips */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
            {/* Status */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Identified', 'In Progress', 'Recurring', 'Resolved'].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                      filterStatus === s ? 'bg-blue-600 text-white shadow scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            {/* Severity */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Severity</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Not reviewed', 'High', 'Medium', 'Low'].map((s) => (
                  <button key={s} onClick={() => setFilterSeverity(s)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                      filterSeverity === s
                        ? s === 'High' ? 'bg-[#A51417] text-white shadow scale-105' : 'bg-blue-600 text-white shadow scale-105'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            {/* Category */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Equipment', 'Process', 'Resources', 'Logistics'].map((s) => (
                  <button key={s} onClick={() => setFilterCategory(s)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                      filterCategory === s ? 'bg-blue-600 text-white shadow scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Header — always visible when list has items */}
        {sortedLsts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredLsts.length && filteredLsts.length > 0}
                onChange={selectAllFiltered}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>
                {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredLsts.length} selected` : 'Select all'}
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-normal"
                >
                  Clear
                </button>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBatchEdit({ status: '', severity: '', category: '', assigneeEnabled: false, assignee: '', locationEnabled: false, location: '' });
                    setIsBatchEditOpen(true);
                  }}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold rounded text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Batch Edit
                </button>
                <button
                  onClick={openMergeModal}
                  disabled={selectedIds.size < 2 || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold rounded text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  Merge
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold rounded text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Table / Card List ── */}
      {sortedLsts.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border-2 border-[#007A33]">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-[#007A33] rounded-full">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            {lsts.length === 0 ? 'System Operating Safely' : 'No Matching Threats'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {lsts.length === 0
              ? 'No latent safety threats identified. Continue monitoring simulation sessions.'
              : 'Adjust filters to view other threats.'}
          </p>
          {lsts.length > 0 && (
            <button
              onClick={() => { setFilterStatus('All'); setFilterSeverity('All'); setFilterCategory('All'); setFilterLocation('All'); setSearchQuery(''); }}
              className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedLsts.map((lst: LST) => {
            const borderColor = lst.status === 'Resolved'
              ? 'border-l-[#007A33]'
              : lst.severity === 'High'
              ? 'border-l-[#A51417]'
              : lst.severity === 'Medium'
              ? 'border-l-orange-500'
              : 'border-l-slate-300 dark:border-l-slate-600';

            const bgColor = lst.status === 'Resolved'
              ? 'bg-green-50/40 dark:bg-green-950/10'
              : lst.severity === 'High'
              ? 'bg-red-50/40 dark:bg-red-950/10'
              : 'bg-white dark:bg-slate-800';

            return (
              <div
                key={lst.id}
                className={`flex gap-0 border-l-4 ${borderColor} ${bgColor} border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-all hover:shadow-md`}
              >
                {/* Selection Checkbox Column */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 px-3 flex flex-col items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(lst.id)}
                    onChange={() => toggleSelection(lst.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                
                <div className="p-3 md:p-4 flex-1">
                  {/* Row 1: Title + Badges + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{lst.title}</h3>
                        {severityBadge(lst.severity)}
                        {statusBadge(lst.status)}
                        {lst.recurrenceCount && lst.recurrenceCount > 1 && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-0.5 ${
                            lst.recurrenceCount >= 3
                              ? 'bg-[#A51417] text-white animate-pulse'
                              : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                          }`}>
                            <TrendingUp className="w-2.5 h-2.5" />
                            {lst.recurrenceCount}×
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{lst.description}</p>
                    </div>

                    <button
                      onClick={() => openEditModal(lst)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-xs font-semibold flex-shrink-0"
                      title="Edit this LST"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    {/* History Button */}
                    <button
                      onClick={() => setHistoryModal({ open: true, id: lst.id, title: lst.title })}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg transition-colors text-xs font-semibold flex-shrink-0"
                      title="View Audit History"
                    >
                      <History className="w-3 h-3" />
                      History
                    </button>
                  </div>

                  {/* Row 2: Metadata chips */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{lst.category}</span>
                    </span>
                    {lst.location && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-indigo-700 dark:text-indigo-300">
                        <MapPin className="w-2.5 h-2.5" />
                        {lst.location}
                      </span>
                    )}
                    {lst.assignee && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
                        <Users className="w-2.5 h-2.5" />
                        {lst.assignee}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(lst.identifiedDate)}
                    </span>
                    {lst.resolvedDate && (
                      <span className="flex items-center gap-1 text-[#007A33] dark:text-green-400 font-semibold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Resolved {formatDate(lst.resolvedDate)}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Recommendation + Resolution (compact) */}
                  {lst.recommendation && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-400 rounded-r px-3 py-2">
                      <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                        <span className="font-bold">Recommendation:</span> {lst.recommendation}
                      </p>
                    </div>
                  )}

                  {lst.resolutionNote && (
                    <div className="mt-2 bg-green-50 dark:bg-green-950/20 border-l-2 border-[#007A33] rounded-r px-3 py-2">
                      <p className="text-[11px] text-green-900 dark:text-green-200 leading-relaxed">
                        <span className="font-bold">Resolution:</span> {lst.resolutionNote}
                      </p>
                    </div>
                  )}

                  {/* Quick Action: Advance status for non-resolved */}
                  {lst.status !== 'Resolved' && (
                    <div className="mt-2 flex gap-2">
                      {(lst.status === 'Identified' || lst.status === 'Recurring') && (
                        <button
                          onClick={() => handleAdvanceStatus(lst)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <PlayCircle className="w-3 h-3" />
                          Start Progress
                        </button>
                      )}
                      {lst.status === 'In Progress' && (
                        <button
                          onClick={() => openEditModal(lst)}
                          className="px-3 py-1.5 bg-[#007A33] hover:bg-[#006428] text-white font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Document Resolution
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Batch Edit Modal ── */}
      {isBatchEditOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200" onClick={() => setIsBatchEditOpen(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Batch Edit — {selectedIds.size} LST{selectedIds.size > 1 ? 's' : ''}
                </h3>
              </div>
              <button onClick={() => setIsBatchEditOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Fields set to "— No change —" will be left as-is on each selected LST.</p>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={batchEdit.status}
                    onChange={(e) => setBatchEdit(prev => ({ ...prev, status: e.target.value as typeof batchEdit.status }))}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— No change —</option>
                    <option value="Identified">Identified</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Recurring">Recurring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Severity</label>
                  <select
                    value={batchEdit.severity}
                    onChange={(e) => setBatchEdit(prev => ({ ...prev, severity: e.target.value as typeof batchEdit.severity }))}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— No change —</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={batchEdit.category}
                    onChange={(e) => setBatchEdit(prev => ({ ...prev, category: e.target.value as typeof batchEdit.category }))}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— No change —</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Process">Process</option>
                    <option value="Resources">Resources</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="checkbox"
                      id="assigneeEnabled"
                      checked={batchEdit.assigneeEnabled}
                      onChange={(e) => setBatchEdit(prev => ({ ...prev, assigneeEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="assigneeEnabled" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer">
                      Change Assignee
                    </label>
                  </div>
                  {batchEdit.assigneeEnabled && (
                    <input
                      type="text"
                      value={batchEdit.assignee}
                      onChange={(e) => setBatchEdit(prev => ({ ...prev, assignee: e.target.value }))}
                      placeholder="Enter assignee name (blank to clear)"
                      className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="checkbox"
                      id="locationEnabled"
                      checked={batchEdit.locationEnabled}
                      onChange={(e) => setBatchEdit(prev => ({ ...prev, locationEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="locationEnabled" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer">
                      Change Location
                    </label>
                  </div>
                  {batchEdit.locationEnabled && (
                    <input
                      type="text"
                      value={batchEdit.location}
                      onChange={(e) => setBatchEdit(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter location (blank to clear)"
                      className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-3 rounded-b-xl">
              <button
                onClick={handleBatchEdit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-all shadow-md"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Updating...' : `Apply to ${selectedIds.size} LST${selectedIds.size > 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => setIsBatchEditOpen(false)}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Merge Modal ── */}
      {(isCreateModalOpen || isMergeModalOpen) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200" onClick={() => { setIsCreateModalOpen(false); setIsMergeModalOpen(false); }}>
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 scale-in-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-xl">
              <div className="flex items-center gap-2">
                {isMergeModalOpen ? <GitMerge className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-[#007A33]" />}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  {isMergeModalOpen ? 'Merge Latent Safety Threats' : 'Manual Entry: New LST'}
                </h3>
              </div>
              <button onClick={() => { setIsCreateModalOpen(false); setIsMergeModalOpen(false); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Threat Title</label>
                <input
                  type="text"
                  value={newLstData.title}
                  onChange={(e) => setNewLstData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Massive Transfusion Protocol Delay"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Severity</label>
                  <select
                    value={newLstData.severity}
                    onChange={(e) => setNewLstData(prev => ({ ...prev, severity: e.target.value as LST['severity'] }))}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="">Not reviewed (default)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={newLstData.category}
                    onChange={(e) => setNewLstData(prev => ({ ...prev, category: e.target.value as LST['category'] }))}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="Equipment">Equipment</option>
                    <option value="Process">Process</option>
                    <option value="Resources">Resources</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
                <input
                  type="text"
                  value={newLstData.location}
                  onChange={(e) => setNewLstData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Barnes-Jewish Hospital"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Detailed Description</label>
                <textarea
                  value={newLstData.description}
                  onChange={(e) => setNewLstData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe the gap, impact, and context..."
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Initial Recommendation</label>
                <textarea
                  value={newLstData.recommendation}
                  onChange={(e) => setNewLstData(prev => ({ ...prev, recommendation: e.target.value }))}
                  rows={2}
                  placeholder="What is the suggested fix?"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-3 rounded-b-xl">
              <button
                onClick={isMergeModalOpen ? handleMergeLsts : handleCreateLst}
                disabled={saving || !newLstData.title || !newLstData.description}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all shadow-md ${
                  isMergeModalOpen ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#007A33] hover:bg-[#006428]'
                } text-white disabled:bg-slate-300 dark:disabled:bg-slate-700`}
              >
                {saving ? 'Processing...' : isMergeModalOpen ? 'Consolidate & Delete Originals' : 'Add to Tracker'}
              </button>
              <button
                onClick={() => { setIsCreateModalOpen(false); setIsMergeModalOpen(false); }}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
