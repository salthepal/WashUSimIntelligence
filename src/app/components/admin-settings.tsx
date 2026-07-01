import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Save, ShieldCheck, Sparkles, RefreshCcw } from 'lucide-react';
import { reindexAll } from '../api';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function AdminSettings() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('washu_admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!token.trim()) {
      localStorage.removeItem('washu_admin_token');
      setIsSaved(false);
      toast.info('Admin Token cleared');
    } else {
      localStorage.setItem('washu_admin_token', token.trim());
      setIsSaved(true);
      toast.success('Admin Token saved locally');
      // Reload to update auth state for getApiHeaders()
      window.location.reload();
    }
  };

  const handleReindex = async () => {
    if (!token) {
      toast.error('Admin token required for re-indexing');
      return;
    }
    
    const confirmReindex = confirm('This will re-calculate AI embeddings for all clinical documents. Depending on library size, this may take a moment. Continue?');
    if (!confirmReindex) return;

    const toastId = toast.loading('Re-indexing clinical library (AI Vectorization)...');
    try {
      const result = await reindexAll();
      toast.success(`Successfully re-indexed ${result.indexed} documents`, { id: toastId });
    } catch (err: any) {
      toast.error(`Re-indexing failed: ${err.message}`, { id: toastId });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border-2 border-amber-200 dark:border-amber-900 shadow-sm transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Administrative Authorization</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter your <b>ADMIN_TOKEN</b> to load protected data and enable administrative actions.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Enter Admin Token..."
            className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm transition-all"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isSaved ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Token Active (Local)
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">
                Not authenticated for admin tasks
              </span>
            )}
          </div>
          <Button 
            onClick={handleSave}
            variant={isSaved ? "outline" : "default"}
            className={isSaved ? "border-amber-200" : "bg-amber-600 hover:bg-amber-700 text-white"}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaved ? 'Update Token' : 'Save & Authorize'}
          </Button>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
           <Sparkles className="w-3 h-3 text-purple-500" />
           AI Semantic Engine
        </h4>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 rounded-xl p-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Populate Search Vectors</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Refresh the semantic index for all clinical documents. Use this after bulk updates or if AI search returns stale results.
            </p>
          </div>
          <Button 
            onClick={handleReindex}
            disabled={!isSaved}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Re-index Library
          </Button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <b>Note:</b> This token is stored locally in your browser and never reaches the server except in headers for authorized requests. 
          Destructive actions will return <code>401 Unauthorized</code> without this token.
          Data reads will also fail until a valid token is saved.
        </p>
      </div>
    </div>
  );
}
