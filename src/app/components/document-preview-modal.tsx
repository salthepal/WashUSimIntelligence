import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Copy, Calendar, User, X, Images } from 'lucide-react';
import { Report, SessionNote } from '../App';
import { CaseFile } from './case-files';
import { toast } from 'sonner';

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Report | SessionNote | CaseFile | null;
  type: 'report' | 'note' | 'case';
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  document,
  type,
}: DocumentPreviewModalProps) {
  if (!document) return null;
  const metadata = document.metadata as any;

  const handleCopy = async () => {
    let content = '';
    if (type === 'report') {
      content = (document as Report).content;
    } else if (type === 'note') {
      content = (document as SessionNote).notes;
    } else if (type === 'case') {
      content = (document as CaseFile).content;
    }
    
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Content copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const isReport = type === 'report';
  const isNote = type === 'note';
  const isCase = type === 'case';
  const report = document as Report;
  const note = document as SessionNote;
  const caseFile = document as CaseFile;
  const embeddedImages = (() => {
    const stored = (metadata?.images || []) as string[];
    if (stored.length) return stored;
    const html = isReport ? report.htmlContent : isCase ? caseFile.htmlContent : '';
    if (!html) return [];
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(parsed.querySelectorAll('img')).map((img) => img.src).filter(Boolean);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl md:text-2xl truncate">
                {isReport ? report.title : isNote ? note.sessionName : caseFile.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(document.createdAt).toLocaleDateString()}
                </span>
                {document.metadata?.uploaderName && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {document.metadata.uploaderName}
                  </span>
                )}
                {isReport && report.type && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                    {report.type === 'prior_report' ? 'Prior Report' : 'Generated Report'}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4">
          {/* Metadata Section */}
          {metadata && Object.keys(metadata).length > 1 && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-sm mb-2">Session Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {metadata.sessionName && (
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Session:</span>
                    <span className="ml-2 text-slate-900 dark:text-slate-100">{metadata.sessionName}</span>
                  </div>
                )}
                {metadata.sessionDate && (
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Date:</span>
                    <span className="ml-2 text-slate-900 dark:text-slate-100">
                      {new Date(metadata.sessionDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                {isReport ? report.content : isNote ? note.notes : caseFile.content}
              </pre>
            </div>
          </div>

          {embeddedImages.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Images className="h-4 w-4" /> Uploaded pictures ({embeddedImages.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {embeddedImages.map((src, index) => (
                  <a key={`${src.slice(0, 40)}-${index}`} href={src} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <img src={src} alt={`Uploaded picture ${index + 1}`} className="h-52 w-full object-contain transition-transform group-hover:scale-[1.02]" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Participants (for notes) */}
          {!isReport && note.participants && note.participants.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-sm mb-2">Participants</h3>
              <div className="flex flex-wrap gap-2">
                {note.participants.map((participant, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs"
                  >
                    {participant}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-sm mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Based On (for generated reports) */}
          {isReport && report.type === 'generated_report' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
                Generation Sources
              </h3>
              <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                {report.basedOnReports && (
                  <p>Based on {report.basedOnReports.length} prior report(s)</p>
                )}
                {report.basedOnNotes && (
                  <p>Synthesized from {report.basedOnNotes.length} session note(s)</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={handleCopy} variant="outline" className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy Content
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="default" className="flex-1">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
