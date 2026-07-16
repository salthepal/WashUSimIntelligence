import { useState } from 'react';
import { Upload, Trash2, Calendar, User, CheckCircle, FileText, FileUp, X } from 'lucide-react';
import { Report, API_BASE, getApiHeaders } from '../App';
import { useDeleteReport } from '../hooks/useQueries';
import { toast } from 'sonner';
import { useConfirmDialog } from './ui/confirm-dialog';
import { DocumentPreviewModal } from './document-preview-modal';
import { FileUpload } from './ui/file-upload';
import { FormField } from './ui/form-field';
import { ActionButton } from './ui/action-button';
import { processDocxFile, formatDate } from '../utils/document';
import { validateDocxFile, FILE_VALIDATIONS } from '../utils/validation';
import { sanitizeJSON } from '../utils/sanitize';
import { Turnstile } from './ui/turnstile';

interface UploadReportsProps {
  reports: Report[];
  onRefresh: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_SIZE = 25;

export function UploadReports({ reports, onRefresh }: UploadReportsProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [debugging, setDebugging] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Report | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();
  const deleteReport = useDeleteReport();

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
    setSelectedFiles((current) => {
      const unique = valid.filter((file) => !current.some((item) => item.name === file.name && item.size === file.size));
      const available = Math.max(0, MAX_BATCH_SIZE - current.length);
      if (unique.length > available) toast.error(`A maximum of ${MAX_BATCH_SIZE} reports can be uploaded at once`);
      return [...current, ...unique.slice(0, available)];
    });
  };

  const handleDebug = async () => {
    setDebugging(true);
    try {
      const response = await fetch(`${API_BASE}/debug/all-keys`, {
        headers: getApiHeaders(),
      });
      const data = await response.json();
      console.log('=== DATABASE DEBUG INFO ===');
      console.log('Total entries:', data.total);
      console.log('All keys:', data.keys);
      const jsonStr = JSON.stringify(data.keys, null, 2);
      console.log('Keys as JSON:', jsonStr);
      
      // Show first 500 chars in alert
      const preview = jsonStr.substring(0, 500);
      confirm({
        title: 'Database Debug Info',
        description: `Database has ${data.total} entries.\n\nFirst entry preview:\n${preview}...`,
        onConfirm: () => {},
        confirmText: 'OK',
      });
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Debug failed - check console');
    } finally {
      setDebugging(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };
  
  const handleClearFile = () => {
    setSelectedFiles([]);
    const fileInput = document.getElementById('docx-upload') as HTMLInputElement;
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
          date: sessionDate || new Date().toISOString(),
          metadata: { uploaderName, sessionName, sessionDate, images: processed.images }
      }));
      
      // Upload with metadata
      const response = await fetch(`${API_BASE}/reports/upload`, {
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
        const failedIndexes = new Set<number>((responseData.failed || []).map((failure: any) => failure.index));
        const uploadedCount = responseData.uploaded?.length ?? items.length - failedIndexes.size;
        if (uploadedCount) toast.success(`${uploadedCount} report${uploadedCount === 1 ? '' : 's'} uploaded successfully`);
        if (failedIndexes.size) toast.error(`${failedIndexes.size} report${failedIndexes.size === 1 ? '' : 's'} failed and remain queued for retry`);
        // Reset form
        setSelectedFiles((files) => files.filter((_, index) => failedIndexes.has(index)));
        if (!failedIndexes.size) {
          setUploaderName('');
          setSessionName('');
          setSessionDate('');
        }
        setUploadProgress(0);
        const fileInput = document.getElementById('docx-upload') as HTMLInputElement;
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

  const handleDelete = (id: string, title: string) => {
    confirm({
      title: 'Delete Report',
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: () => {
        deleteReport.mutate(id, {
          onSuccess: () => toast.success('Report deleted successfully'),
          onError: () => toast.error('Failed to delete report'),
        });
      },
    });
  };

  const handlePreview = (report: Report) => {
    setPreviewDocument(report);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {dialog}
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDocument}
        type="report"
      />

      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Upload Prior Reports</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          Upload completed Post-Session Reports as DOCX files to preserve formatting. 
          The AI will learn from these reports to match their exact style and structure.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
        {/* Debug Button */}
        <button
          onClick={handleDebug}
          disabled={debugging}
          className="mb-4 px-3 md:px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs md:text-sm font-medium disabled:opacity-50"
        >
          {debugging ? 'Checking Database...' : '🔍 Debug Database'}
        </button>

        {/* Drag and Drop File Upload */}
        <div
          className={`text-center py-8 md:py-12 border-2 border-dashed rounded-lg transition-all bg-white dark:bg-slate-900 mb-4 ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
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
            id="docx-upload"
          />
          <label
            htmlFor="docx-upload"
            className={`cursor-pointer flex flex-col items-center gap-3 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <FileUp className={`w-12 h-12 md:w-16 md:h-16 transition-colors ${dragActive ? 'text-blue-600' : 'text-blue-600'}`} />
            <div>
              <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedFiles.length ? `${selectedFiles.length} report${selectedFiles.length === 1 ? '' : 's'} selected` : dragActive ? 'Drop files here' : 'Drag & Drop or Click to Select Reports'}
              </p>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedFiles.length ? (
                  <span className="flex items-center gap-1 justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Ready to upload as one batch
                  </span>
                ) : (
                  `DOCX files only, max ${MAX_FILE_SIZE / (1024 * 1024)}MB each · up to ${MAX_BATCH_SIZE} files`
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
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
              value={uploaderName}
              onChange={setUploaderName}
              placeholder="Enter your name"
              optional
            />

            <FormField
              label="Session Name"
              value={sessionName}
              onChange={setSessionName}
              placeholder="e.g., Cardiac Arrest Simulation"
              optional
            />

            <FormField
              label="Session Date"
              value={sessionDate}
              onChange={setSessionDate}
              type="date"
              optional
            />

            <Turnstile onVerify={setTurnstileToken} />

            <div className="flex gap-3">
              <ActionButton
                onClick={handleUpload}
                disabled={uploading || !turnstileToken}
                loading={uploading}
                variant="primary"
                fullWidth
                icon={<Upload className="w-4 h-4 md:w-5 md:h-5" />}
              >
                Upload {selectedFiles.length} Report{selectedFiles.length === 1 ? '' : 's'}
              </ActionButton>
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

      {/* Reports List */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Prior Reports Library ({reports.length})
        </h3>
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <FileText className="w-10 h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">No prior reports uploaded yet</p>
              <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 mt-1">
                Upload your first report to get started
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePreview(report)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 mb-1 truncate">{report.title}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      {report.metadata?.uploaderName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">{report.metadata.uploaderName}</span>
                        </span>
                      )}
                      {report.metadata?.sessionName && (
                        <span className="truncate">{report.metadata.sessionName}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        {formatDate(report.date)}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                      {report.content.substring(0, 150)}...
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(report.id, report.title);
                    }}
                    className="ml-2 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
