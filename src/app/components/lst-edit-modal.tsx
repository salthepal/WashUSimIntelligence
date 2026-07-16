import React from 'react';
import { Pencil, X, Save } from 'lucide-react';
import { LST } from '../types';

export interface EditModalState {
  open: boolean;
  lst: LST | null;
  status: string;
  severity: string;
  category: string;
  location: string;
  recommendation: string;
  resolutionNote: string;
  assignee: string;
  locationStatuses: Record<string, LST['status']>;
}

export const INITIAL_EDIT: EditModalState = {
  open: false, lst: null, status: '', severity: '', category: '',
  location: '', recommendation: '', resolutionNote: '', assignee: '', locationStatuses: {},
};

interface LstEditModalProps {
  editModal: EditModalState;
  setEditModal: React.Dispatch<React.SetStateAction<EditModalState>>;
  saving: boolean;
  onSave: () => void;
}

export function LstEditModal({ editModal, setEditModal, saving, onSave }: LstEditModalProps) {
  if (!editModal.open || !editModal.lst) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditModal(INITIAL_EDIT)}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[#A51417]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Edit Latent Safety Threat</h3>
          </div>
          <button onClick={() => setEditModal(INITIAL_EDIT)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Threat Title</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{editModal.lst.title}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Status</label>
              <select
                value={editModal.status}
                onChange={(e) => setEditModal(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Identified">Identified</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Recurring">Recurring</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Severity</label>
              <select
                value={editModal.severity}
                onChange={(e) => setEditModal(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Not reviewed</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Category</label>
              <select
                value={editModal.category}
                onChange={(e) => setEditModal(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="Equipment">Equipment</option>
                <option value="Process">Process</option>
                <option value="Resources">Resources</option>
                <option value="Logistics">Logistics</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Location</label>
              <input
                type="text"
                value={editModal.location}
                onChange={(e) => setEditModal(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Christian Northwest"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Assignee / Department</label>
            <input
              type="text"
              value={editModal.assignee}
              onChange={(e) => setEditModal(prev => ({ ...prev, assignee: e.target.value }))}
              placeholder="e.g., Pharmacy, Dr. Smith"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Recommendation</label>
            <textarea
              value={editModal.recommendation}
              onChange={(e) => setEditModal(prev => ({ ...prev, recommendation: e.target.value }))}
              rows={3}
              placeholder="Recommended intervention or corrective action..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Resolution Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Resolution Note {editModal.status === 'Resolved' && <span className="text-[#A51417]">*</span>}
            </label>
            <textarea
              value={editModal.resolutionNote}
              onChange={(e) => setEditModal(prev => ({ ...prev, resolutionNote: e.target.value }))}
              rows={3}
              placeholder="Document corrective actions taken, equipment changes, or policy updates..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Multi-Site Status Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
             <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Multi-Site Context</label>
                <button 
                  onClick={() => {
                    const newStatuses = {...editModal.locationStatuses};
                    Object.keys(newStatuses).forEach(loc => newStatuses[loc] = editModal.status as LST['status']);
                    setEditModal(prev => ({...prev, locationStatuses: newStatuses}));
                  }}
                  className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold transition-all"
                >
                  Sync Master Status to All Sites
                </button>
             </div>
             <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {Object.entries(editModal.locationStatuses).map(([site, status]) => (
                   <div key={site} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{site}</span>
                      <select 
                        value={status}
                        onChange={(e) => {
                          const newStatuses = {...editModal.locationStatuses, [site]: e.target.value as LST['status']};
                          setEditModal(prev => ({...prev, locationStatuses: newStatuses}));
                        }}
                        className="text-[10px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 focus:ring-1 focus:ring-blue-500"
                      >
                         <option value="Identified">Identified</option>
                         <option value="In Progress">In Progress</option>
                         <option value="Resolved">Resolved</option>
                         <option value="Recurring">Recurring</option>
                      </select>
                   </div>
                ))}
                {Object.keys(editModal.locationStatuses).length === 0 && (
                   <p className="text-[10px] text-slate-400 italic">No multi-site data available for this issue.</p>
                )}
             </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-xl">
          <button
            onClick={onSave}
            disabled={saving || (editModal.status === 'Resolved' && !editModal.resolutionNote.trim())}
            className="flex-1 px-4 py-2.5 bg-[#007A33] hover:bg-[#006428] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => setEditModal(INITIAL_EDIT)}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
