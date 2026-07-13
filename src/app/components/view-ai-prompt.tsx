import { useState, useEffect } from 'react';
import { FileText, Copy, CheckCircle, AlertCircle, Eye, Code } from 'lucide-react';
import { API_BASE, getApiHeaders } from '../api';
import { DEFAULT_MODEL, type AIModelOption } from '../constants/models';
import { toast } from 'sonner';

export function ViewAIPrompt() {
  const [promptTemplate, setPromptTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showFormatted, setShowFormatted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [provider, setProvider] = useState('AI');
  const [modelOptions, setModelOptions] = useState<AIModelOption[]>([]);
  const [lightweightModel, setLightweightModel] = useState('');
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    fetchPromptTemplate();
    fetchModelPreference();
  }, []);

  const fetchPromptTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/prompt-template?t=${Date.now()}`, {
        headers: getApiHeaders(),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setPromptTemplate(data.template);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch prompt template:', response.status, errorText);
        toast.error(`Failed to fetch prompt template: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error fetching prompt template:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelPreference = async () => {
    try {
      const response = await fetch(`${API_BASE}/model-preference?t=${Date.now()}`, {
        headers: getApiHeaders(),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedModel(data.model);
        setProvider(data.provider || 'AI');
        setModelOptions(Array.isArray(data.models) ? data.models : []);
        setLightweightModel(data.lightweightModel || '');
      }
    } catch (error) {
      console.error('Error fetching model preference:', error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptTemplate);
    setCopied(true);
    toast.success('Prompt template copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModelChange = async (newModel: string) => {
    setSavingModel(true);
    try {
      const response = await fetch(`${API_BASE}/model-preference`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ model: newModel }),
      });

      if (response.ok) {
        setSelectedModel(newModel);
        toast.success(`AI model changed to ${newModel}`);
      } else {
        toast.error('Failed to change AI model');
      }
    } catch (error) {
      console.error('Error changing model:', error);
      toast.error('Failed to change AI model');
    } finally {
      setSavingModel(false);
    }
  };

  const wordCount = promptTemplate.split(/\s+/).length;
  const charCount = promptTemplate.length;
  const estimatedTokens = Math.ceil(charCount / 4); // Rough estimate: 1 token ≈ 4 chars

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          AI Prompt Template
        </h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          View the exact prompt template sent to the configured AI provider for report generation.
        </p>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-[#f0ebe2] to-[#fffdf8] dark:from-[#181c1a] dark:to-[#202622] border border-[#ddd5c8] dark:border-[#303834] rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-[#17413f] dark:text-[#6db3ad]">
              {wordCount.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Words
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-[#245855] dark:text-[#8bc8c2]">
              {charCount.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Characters
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-[#b94f33] dark:text-[#f08a6c]">
              ~{estimatedTokens.toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Est. Tokens
            </div>
          </div>
        </div>
      </div>

      {/* Model Selector Card */}
      <div className="bg-gradient-to-br from-[#f0ebe2] to-[#fffdf8] dark:from-[#181c1a] dark:to-[#202622] border-2 border-[#ddd5c8] dark:border-[#303834] rounded-lg p-5">
        <div className="flex items-start gap-3">
          <Code className="w-6 h-6 text-[#17413f] dark:text-[#6db3ad] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-[#1f2523] dark:text-[#f3f1eb] text-base md:text-lg mb-2">
              {provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Gemini' : provider} Model Selection
            </h3>
            <p className="text-xs md:text-sm text-[#59615e] dark:text-[#b8c0bc] mb-4">
              Choose the primary model for professional report synthesis. Available choices come from the backend's active provider configuration.
              <span className="block mt-1 font-semibold text-[#1f2523] dark:text-[#f3f1eb] italic">
                Note: LST extraction uses {lightweightModel || 'the provider lightweight model'} for background auditing.
              </span>
            </p>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {modelOptions.map((model, index) => (
                  <label key={model.id} className="flex items-center gap-3 flex-1 p-3 bg-white dark:bg-[#151917] border-2 dark:border-[#303834] rounded-lg cursor-pointer transition-all hover:border-[#b94f33] dark:hover:border-[#f08a6c] has-[:checked]:border-[#17413f] dark:has-[:checked]:border-[#6db3ad] has-[:checked]:bg-[#17413f]/5 dark:has-[:checked]:bg-[#6db3ad]/10">
                    <input
                      type="radio"
                      name="model"
                      value={model.id}
                      checked={selectedModel === model.id}
                      onChange={(e) => handleModelChange(e.target.value)}
                      disabled={savingModel}
                      className="w-4 h-4 text-[#17413f] focus:ring-2 focus:ring-[#b94f33]"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                        {model.label}{index === 0 && <span className="text-xs bg-[#17413f]/10 dark:bg-[#6db3ad]/15 text-[#17413f] dark:text-[#6db3ad] px-2 py-0.5 rounded-full ml-1">Default</span>}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{model.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {savingModel && (
                <div className="flex items-center gap-2 text-sm text-[#17413f] dark:text-[#6db3ad]">
                  <div className="w-4 h-4 border-2 border-[#17413f] dark:border-[#6db3ad] border-t-transparent rounded-full animate-spin" />
                  Saving preference...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 text-sm md:text-base mb-1">
                View-Only Template
              </h3>
              <p className="text-xs md:text-sm text-green-700 dark:text-green-300">
                This template is read-only. It shows the exact instructions sent to the AI. Variables like <code className="bg-green-200 dark:bg-green-800 px-1 rounded">{'${priorReportsContext}'}</code> are replaced with actual data at runtime.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#f0ebe2] dark:bg-[#181c1a] border border-[#ddd5c8] dark:border-[#303834] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Code className="w-5 h-5 text-[#17413f] dark:text-[#6db3ad] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#1f2523] dark:text-[#f3f1eb] text-sm md:text-base mb-1">
                Output Format: Markdown
              </h3>
              <p className="text-xs md:text-sm text-[#59615e] dark:text-[#b8c0bc]">
                All reports use strict Markdown formatting: <code className="bg-[#ddd5c8] dark:bg-[#303834] px-1 rounded"># H1</code>, <code className="bg-[#ddd5c8] dark:bg-[#303834] px-1 rounded">## H2</code>, <code className="bg-[#ddd5c8] dark:bg-[#303834] px-1 rounded">### H3</code>, <code className="bg-[#ddd5c8] dark:bg-[#303834] px-1 rounded">**bold**</code>, <code className="bg-[#ddd5c8] dark:bg-[#303834] px-1 rounded">*italic*</code>. Temperature: 0.7 • Max Output: 8,192 tokens.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Display */}
      <div className="bg-white dark:bg-[#181c1a] border border-slate-200 dark:border-[#303834] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-[#101312] px-4 py-3 border-b border-slate-200 dark:border-[#303834] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-slate-600 dark:text-slate-400" />
            <span className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100">
              Complete Prompt Template
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormatted(!showFormatted)}
              className="px-3 py-1.5 text-xs md:text-sm font-medium text-slate-700 dark:text-[#b8c0bc] bg-white dark:bg-[#181c1a] border border-slate-300 dark:border-[#303834] rounded-lg hover:bg-slate-50 dark:hover:bg-[#202622] transition-colors"
            >
              {showFormatted ? 'Show Raw' : 'Show Formatted'}
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs md:text-sm font-medium text-white dark:text-[#101312] bg-[#17413f] hover:bg-[#245855] dark:bg-[#6db3ad] dark:hover:bg-[#8bc8c2] rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 md:w-4 md:h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-slate-600 dark:text-slate-400">Loading prompt template...</span>
            </div>
          ) : promptTemplate ? (
            <div className="relative">
              {showFormatted ? (
                <div className="prose dark:prose-invert max-w-none">
                  <div className="space-y-4 text-sm md:text-base text-slate-700 dark:text-slate-300">
                    {promptTemplate.split('\n\n').map((paragraph, idx) => {
                      // Detect section headers
                      if (paragraph.match(/^[A-Z\s]+:$/m) || paragraph.startsWith('===')) {
                        return (
                          <h3 key={idx} className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 mt-6 mb-2">
                            {paragraph}
                          </h3>
                        );
                      }
                      // Detect numbered lists
                      if (paragraph.match(/^\d+\./m)) {
                        return (
                          <div key={idx} className="pl-4 border-l-4 border-[#17413f] dark:border-[#6db3ad] bg-[#f0ebe2] dark:bg-[#181c1a] py-2 px-3 rounded">
                            {paragraph.split('\n').map((line, lineIdx) => (
                              <div key={lineIdx} className="mb-1">{line}</div>
                            ))}
                          </div>
                        );
                      }
                      // Detect variable placeholders
                      if (paragraph.includes('${')) {
                        return (
                          <div key={idx} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <code className="text-xs md:text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap break-words">
                              {paragraph}
                            </code>
                          </div>
                        );
                      }
                      // Regular paragraph
                      return (
                        <p key={idx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <pre className="text-xs md:text-sm font-mono text-slate-800 dark:text-[#f3f1eb] whitespace-pre-wrap break-words overflow-x-auto bg-slate-50 dark:bg-[#101312] p-4 rounded-lg border border-slate-200 dark:border-[#303834]">
{promptTemplate}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No prompt template available</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-slate-50 dark:bg-[#181c1a] rounded-lg p-4 border border-slate-200 dark:border-[#303834]">
        <h3 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 mb-3">
          How the Prompt Works
        </h3>
        <div className="space-y-3 text-xs md:text-sm text-slate-600 dark:text-[#b8c0bc]">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#17413f]/10 dark:bg-[#6db3ad]/15 text-[#17413f] dark:text-[#6db3ad] flex items-center justify-center font-bold text-xs flex-shrink-0">
              1
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Style Learning:</strong> The AI analyzes your uploaded prior reports to learn their exact structure, formatting, and writing style.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#245855]/10 dark:bg-[#8bc8c2]/15 text-[#245855] dark:text-[#8bc8c2] flex items-center justify-center font-bold text-xs flex-shrink-0">
              2
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Content Synthesis:</strong> New session notes are analyzed to extract latent safety threats, learning points, and common threads mentioned by multiple observers.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#b94f33]/10 dark:bg-[#f08a6c]/15 text-[#b94f33] dark:text-[#f08a6c] flex items-center justify-center font-bold text-xs flex-shrink-0">
              3
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Context Integration:</strong> Case files (if provided) give the AI accurate patient details and scenario specifics to reference in the report.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#b94f33]/10 dark:bg-[#f08a6c]/15 text-[#b94f33] dark:text-[#f08a6c] flex items-center justify-center font-bold text-xs flex-shrink-0">
              4
            </div>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Report Generation:</strong> The AI generates a new report that matches your style exactly while incorporating all new observations and insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
