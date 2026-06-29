import { useState } from 'react';
import { Download, Eye, X, Edit, Save, CheckCircle, XCircle, Tag as TagIcon } from 'lucide-react';
import { Report, API_BASE, getApiHeaders } from '../App';
import { toast } from 'sonner';
import { downloadDocxFromMarkdown } from '../utils/docx';

interface ReportViewerProps {
  report: Report;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ReportViewer({ report, onClose, onUpdate }: ReportViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(report.editedContent || report.content);
  const [status, setStatus] = useState<'draft' | 'reviewed' | 'approved'>(report.status || 'draft');
  const [tags, setTags] = useState<string[]>(report.tags || []);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const isGenerated = report.type === 'generated_report';

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/reports/${report.id}`, {
        method: 'PATCH',
        headers: getApiHeaders(),
        body: JSON.stringify({
          editedContent: editedContent !== report.content ? editedContent : undefined,
          status,
          tags,
        }),
      });

      if (response.ok) {
        toast.success('Report updated successfully');
        setIsEditing(false);
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to update report');
      }
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const downloadAsDocx = async () => {
    setDownloading(true);
    try {
      const content = editedContent || report.content;
      await downloadDocxFromMarkdown(content, {
        filename: `${report.title.replace(/[^a-z0-9]/gi, '_')}.docx`,
      });
      toast.success('Report downloaded as DOCX');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      toast.error('Failed to generate DOCX file');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-transparent dark:border-slate-700">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6" />
              <h2 className="text-xl font-bold">{report.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {isGenerated && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={downloadAsDocx}
                disabled={downloading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Downloading...' : 'Download DOCX'}
              </button>
              <button
                onClick={onClose}
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status and Tags Section */}
          {isGenerated && (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-300">Status:</span>
                <div className="flex gap-2">
                  {(['draft', 'reviewed', 'approved'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => isEditing && setStatus(s)}
                      disabled={!isEditing}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        status === s
                          ? s === 'draft'
                            ? 'bg-slate-200 text-slate-900'
                            : s === 'reviewed'
                            ? 'bg-blue-500 text-white'
                            : 'bg-green-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      } ${!isEditing && 'cursor-not-allowed opacity-70'}`}
                    >
                      {s === 'draft' && <Edit className="w-3 h-3 inline mr-1" />}
                      {s === 'reviewed' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {s === 'approved' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-sm text-slate-300 mt-2">Tags:</span>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded flex items-center gap-1"
                      >
                        {tag}
                        {isEditing && (
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-red-300"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        placeholder="Add tag..."
                        className="px-3 py-1 bg-slate-800 text-white border border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[500px] px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          ) : (
            <div className="prose max-w-none text-slate-900 dark:text-slate-100">
              <pre className="whitespace-pre-wrap font-sans">
                {editedContent || report.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
