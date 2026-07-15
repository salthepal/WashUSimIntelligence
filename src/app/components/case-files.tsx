import { useState, useEffect, useCallback } from 'react';
import { Upload, Trash2, Calendar, FolderOpen, User, CheckCircle, Save, X } from 'lucide-react';
import { API_BASE, getApiHeaders, updateCaseFile } from '../api';
import { toast } from 'sonner';
import { useConfirmDialog } from './ui/confirm-dialog';
import { DocumentPreviewModal } from './document-preview-modal';
import { FormField } from './ui/form-field';
import { ActionButton } from './ui/action-button';
import { processDocxFile, formatDate } from '../utils/document';
import { validateDocxFile } from '../utils/validation';
import { sanitizeJSON } from '../utils/sanitize';
import { Turnstile } from './ui/turnstile';
import { MetadataEditModal } from './metadata-edit-modal';
import { Edit2 } from 'lucide-react';

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

interface CaseFilesProps {
  caseFiles: CaseFile[];
  onRefresh: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CaseFiles({ caseFiles, onRefresh }: CaseFilesProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaderName, setUploaderName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<CaseFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<CaseFile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  // Auto-save to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (uploaderName.trim() || caseType.trim() || selectedFiles.length) {
      setAutoSaving(true);
      localStorage.setItem('caseFileDraft', JSON.stringify({
        uploaderName,
        caseType,
        fileNames: selectedFiles.map((file) => file.name),
        savedAt: new Date().toISOString(),
      }));
      setLastSaved(new Date());
      setTimeout(() => setAutoSaving(false), 500);
    }
  }, [uploaderName, caseType, selectedFiles]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveToLocalStorage();
    }, 30000);
    return () => clearInterval(interval);
  }, [saveToLocalStorage]);

  // Restore from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('caseFileDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.uploaderName || parsed.caseType) {
          confirm({
            title: 'Restore Draft',
            description: `Found unsaved case file data from ${new Date(parsed.savedAt).toLocaleString()}. Would you like to restore it?`,
            confirmText: 'Restore',
            cancelText: 'Discard Draft',
            onConfirm: () => {
              setUploaderName(parsed.uploaderName || '');
              setCaseType(parsed.caseType || '');
              toast.success('Draft restored (note: file must be reselected)');
            },
            onCancel: () => {
              localStorage.removeItem('caseFileDraft');
              toast.success('Draft discarded');
            },
          });
        }
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  }, []);

  const handleManualSave = () => {
    saveToLocalStorage();
    toast.success('Draft saved manually');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    addFiles(Array.from(e.dataTransfer.files || []));
  };

  const addFiles = (files: File[]) => {
    const valid = files.filter((file) => {
      const error = validateDocxFile(file);
      if (error) toast.error(`${file.name}: ${error}`);
      return !error;
    });
    setSelectedFiles((current) => [...current, ...valid.filter((file) => !current.some((item) => item.name === file.name && item.size === file.size))]);
    if (valid.length) toast.success(`${valid.length} case file${valid.length === 1 ? '' : 's'} added`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleClearFile = () => {
    setSelectedFiles([]);
    const fileInput = document.getElementById('case-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    toast.success('File cleared');
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      toast.error('Please select one or more files');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    
    try {
      setUploadProgress(30);
      
      const processedFiles = await Promise.all(selectedFiles.map(processDocxFile));
      setUploadProgress(70);
      
      const items = processedFiles.map((processed) => sanitizeJSON({
        title: processed.title,
        content: processed.content,
        htmlContent: processed.htmlContent,
        date: new Date().toISOString(),
        metadata: {
          uploaderName,
          caseType,
        }
      }));
      
      // Upload with metadata
      const response = await fetch(`${API_BASE}/case-files/upload`, {
        method: 'POST',
        headers: {
          ...getApiHeaders(),
          'X-Turnstile-Token': turnstileToken || '',
        },
        body: JSON.stringify({ items }),
      });

      setUploadProgress(90);
      const responseData = await response.json();
      console.log('Upload response:', response.status, responseData);

      if (response.ok) {
        setUploadProgress(100);
        toast.success(`${items.length} case file${items.length === 1 ? '' : 's'} uploaded successfully`);
        // Reset form and clear localStorage
        setSelectedFiles([]);
        setUploaderName('');
        setCaseType('');
        setUploadProgress(0);
        setLastSaved(null);
        localStorage.removeItem('caseFileDraft');
        const fileInput = document.getElementById('case-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        onRefresh();
      } else {
        console.error('Upload failed:', responseData);
        toast.error(`Failed to upload: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error processing DOCX:', error);
      toast.error(`Failed to process DOCX file: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    confirm({
      title: 'Delete Case File',
      description: `Are you sure you want to delete \"${title}\"? This action cannot be undone.`,
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/case-files/${id}`, {
            method: 'DELETE',
            headers: getApiHeaders(),
          });

          if (response.ok) {
            toast.success('Case file deleted successfully');
            onRefresh();
          } else {
            toast.error('Failed to delete case file');
          }
        } catch (error) {
          console.error('Delete error:', error);
          toast.error('Failed to delete case file');
        }
      },
    });
  };

  const handlePreview = (caseFile: CaseFile) => {
    setPreviewDocument(caseFile);
    setPreviewOpen(true);
  };

  const handleUpdateMetadata = async (id: string, payload: any) => {
    try {
      await updateCaseFile(id, payload);
      toast.success('Case file metadata updated');
      setIsEditModalOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Update metadata error:', error);
      toast.error('Failed to update metadata');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {dialog}
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDocument}
        type="case"
      />

      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Case Files</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          Upload simulation case files (patient scenarios) as DOCX files. 
          The AI will use these as context when generating reports to ensure accurate case details.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
        {/* Auto-save indicator */}
        {lastSaved && (
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            {autoSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                <span>Saving draft...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-green-600" />
                <span>Draft saved at {lastSaved.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        )}

        {/* Drag and Drop File Upload */}
        <div
          className={`text-center py-8 md:py-12 border-2 border-dashed rounded-lg transition-all bg-white dark:bg-slate-900 mb-4 ${
            dragActive
              ? 'border-[#007A33] bg-green-50 dark:bg-green-900/20 scale-105'
              : 'border-slate-300 dark:border-slate-600 hover:border-[#007A33]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="case-file-upload"
          />
          <label
            htmlFor="case-file-upload"
            className={`cursor-pointer flex flex-col items-center gap-3 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <FolderOpen className={`w-12 h-12 md:w-16 md:h-16 transition-colors ${dragActive ? 'text-[#007A33]' : 'text-[#007A33]'}`} />
            <div>
              <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedFiles.length ? `${selectedFiles.length} case file${selectedFiles.length === 1 ? '' : 's'} selected` : dragActive ? 'Drop case files here' : 'Drag & Drop or Click to Select Case Files'}
              </p>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedFiles.length ? (
                  <span className="flex items-center gap-1 justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Ready to upload as one batch
                  </span>
                ) : (
                  `DOCX files only, max ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                )}
              </p>
            </div>
          </label>
        </div>

        {/* Upload Progress */}
        {uploading && uploadProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-[#007A33] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Form Fields */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <span className="truncate pr-2">{file.name}</span>
                  <button type="button" onClick={() => setSelectedFiles((files) => files.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}><X className="h-4 w-4 text-slate-500" /></button>
                </div>
              ))}
            </div>
            <FormField
              label="Uploader Name"
              placeholder="Enter your name"
              value={uploaderName}
              onChange={setUploaderName}
              optional
            />

            <FormField
              label="Case Type / Scenario"
              placeholder="e.g., Cardiac Arrest, Respiratory Failure, Trauma"
              value={caseType}
              onChange={setCaseType}
              optional
            />

            <Turnstile onVerify={setTurnstileToken} />

            <div className="flex gap-3">
              <ActionButton
                onClick={handleUpload}
                disabled={uploading || !turnstileToken}
                loading={uploading}
                variant="success"
                fullWidth
                icon={<Upload className="w-4 h-4 md:w-5 md:h-5" />}
              >
                Upload {selectedFiles.length} Case File{selectedFiles.length === 1 ? '' : 's'}
              </ActionButton>
              <button
                type="button"
                onClick={handleManualSave}
                disabled={uploading || (!uploaderName.trim() && !caseType.trim())}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed"
                title="Save draft to localStorage"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleClearFile}
                disabled={uploading}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Case Files List */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Case Files Library ({caseFiles.length})
        </h3>
        <div className="space-y-3">
          {caseFiles.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <FolderOpen className="w-10 h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">No case files uploaded yet</p>
              <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 mt-1">
                Upload your first case file to get started
              </p>
            </div>
          ) : (
            caseFiles.map((caseFile) => (
              <div
                key={caseFile.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePreview(caseFile)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 mb-1 truncate">{caseFile.title}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      {caseFile.metadata?.uploaderName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">{caseFile.metadata.uploaderName}</span>
                        </span>
                      )}
                      {caseFile.metadata?.caseType && (
                        <span className="px-2 py-0.5 bg-[#007A33]/20 dark:bg-green-700/30 text-[#007A33] dark:text-green-300 rounded font-medium">
                          {caseFile.metadata.caseType}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        {formatDate(caseFile.date)}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                      {caseFile.content.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDoc(caseFile);
                        setIsEditModalOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex-shrink-0"
                      title="Edit Metadata"
                    >
                      <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(caseFile.id, caseFile.title);
                      }}
                      className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Metadata Edit Modal */}
      <MetadataEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateMetadata}
        document={editingDoc as any}
        type="case"
      />
    </div>
  );
}
