import { X, FileText } from 'lucide-react';
import { Report } from '../App';

interface ComparisonViewProps {
  reports: Report[];
  onClose: () => void;
}

export function ComparisonView({ reports, onClose }: ComparisonViewProps) {
  // Find common and unique words/phrases
  const getWords = (text: string) => {
    return text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  };

  const highlightDifferences = (text: string, otherTexts: string[]) => {
    const words = getWords(text);
    const otherWords = new Set(otherTexts.flatMap(getWords));
    
    return text.split(/\s+/).map((word, i) => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      const isUnique = cleanWord.length > 3 && !otherWords.has(cleanWord);
      return (
        <span
          key={i}
          className={isUnique ? 'bg-yellow-200 dark:bg-yellow-800/70 rounded-sm px-0.5' : ''}
        >
          {word}{' '}
        </span>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-transparent dark:border-slate-700">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h2 className="text-xl font-bold">Report Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Tip:</strong> Unique words/phrases in each report are highlighted in yellow
            </p>
          </div>

          <div className={`grid grid-cols-${Math.min(reports.length, 3)} gap-4`}>
            {reports.map((report) => {
              const otherContents = reports
                .filter(r => r.id !== report.id)
                .map(r => r.content);

              return (
                <div key={report.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="mb-3 pb-3 border-b border-slate-300 dark:border-slate-700">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{report.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                    {report.tags && report.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {report.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                    {highlightDifferences(report.content, otherContents)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Comparison Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-800 dark:text-blue-300">Number of reports:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-200">{reports.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800 dark:text-blue-300">Total characters:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  {reports.reduce((sum, r) => sum + r.content.length, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-800 dark:text-blue-300">Date range:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  {new Date(Math.min(...reports.map(r => new Date(r.createdAt).getTime()))).toLocaleDateString()}
                  {' - '}
                  {new Date(Math.max(...reports.map(r => new Date(r.createdAt).getTime()))).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
