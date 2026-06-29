import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Report, SessionNote } from '../App';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';

interface BulkExportModalProps {
  selectedIds: string[];
  allDocuments: (Report | SessionNote)[];
  onClose: () => void;
}

export function BulkExportModal({ selectedIds, allDocuments, onClose }: BulkExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'docx' | 'pdf' | 'txt'>('docx');

  const selectedDocs = allDocuments.filter(doc => selectedIds.includes(doc.id));

  const exportAsZip = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();

      for (const doc of selectedDocs) {
        const content = 'content' in doc ? doc.content : doc.notes;
        const title = 'title' in doc ? doc.title : doc.sessionName;

        if (format === 'txt') {
          zip.file(`${title.replace(/[^a-z0-9]/gi, '_')}.txt`, content);
        } else if (format === 'docx') {
          const docxDoc = new Document({
            sections: [{
              children: content.split('\n').map(line =>
                new Paragraph({ children: [new TextRun(line)] })
              )
            }]
          });
          const blob = await Packer.toBlob(docxDoc);
          zip.file(`${title.replace(/[^a-z0-9]/gi, '_')}.docx`, blob);
        } else if (format === 'pdf') {
          const pdf = new jsPDF();
          const lines = pdf.splitTextToSize(content, 180);
          pdf.text(lines, 15, 15);
          const pdfBlob = pdf.output('blob');
          zip.file(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`, pdfBlob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `washu-em-reports-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedDocs.length} documents as ZIP`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export documents');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-transparent dark:border-slate-700">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6" />
            <h2 className="text-xl font-bold">Bulk Export</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Export {selectedDocs.length} selected documents as a ZIP archive
            </p>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Export Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  value="docx"
                  checked={format === 'docx'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">Microsoft Word (.docx)</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Formatted documents</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">PDF (.pdf)</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Portable documents</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  value="txt"
                  checked={format === 'txt'}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">Plain Text (.txt)</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Simple text files</div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Selected Documents:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {selectedDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {'title' in doc ? doc.title : doc.sessionName}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportAsZip}
              disabled={exporting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Exporting...' : 'Export as ZIP'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
