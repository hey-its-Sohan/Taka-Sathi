import { useState, useCallback } from 'react';
import { Mic, Keyboard, CheckCircle2, Loader2 } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import VoiceInput from '../components/ui/VoiceInput.jsx';
import TransactionForm from '../components/ui/TransactionForm.jsx';
import { transactionsApi } from '../lib/api';
import { formatTaka, categoryLabel } from '../lib/format';
import useToast from '../context/useToast.js';

export default function LogEntry() {
  const [mode, setMode] = useState('voice'); // 'voice' | 'manual'
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const toast = useToast();

  const handleVoiceTranscript = useCallback(async (rawInputText) => {
    setSubmitting(true);
    try {
      const transaction = await transactionsApi.create({ rawInputText, source: 'voice' });
      setLastSaved(transaction);
      toast.success('Transaction saved — parsed by Gemma 4');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [toast]);

  const handleManualSubmit = useCallback(async (payload) => {
    setSubmitting(true);
    try {
      const transaction = await transactionsApi.create(payload);
      setLastSaved(transaction);
      toast.success('Transaction saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [toast]);

  return (
    <AppShell title="Log Entry">
      <div className="max-w-md mx-auto">
        <div className="tabs tabs-boxed bg-base-100 shadow-card p-1.5 rounded-2xl mb-6">
          <button
            onClick={() => setMode('voice')}
            className={`tab flex-1 gap-2 rounded-xl ${mode === 'voice' ? 'tab-active bg-taka-gradient text-primary-content' : ''}`}
          >
            <Mic size={15} /> Voice
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`tab flex-1 gap-2 rounded-xl ${mode === 'manual' ? 'tab-active bg-taka-gradient text-primary-content' : ''}`}
          >
            <Keyboard size={15} /> Manual
          </button>
        </div>

        <div className="card-surface p-6">
          {mode === 'voice' ? (
            <VoiceInput onTranscriptReady={handleVoiceTranscript} disabled={submitting} />
          ) : (
            <TransactionForm onSubmit={handleManualSubmit} submitting={submitting} />
          )}
        </div>

        {submitting && mode === 'voice' && (
          <div className="flex items-center justify-center gap-2 text-sm text-base-content/50 mt-4">
            <Loader2 size={14} className="animate-spin" /> Gemma 4 is structuring your entry…
          </div>
        )}

        {lastSaved && !submitting && (
          <div className="card-surface p-4 mt-4 flex items-center gap-3 border-l-4 border-success/40">
            <CheckCircle2 size={20} className="text-success shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral">
                {lastSaved.type === 'income' ? '+' : '-'}
                {formatTaka(lastSaved.amount)} · {categoryLabel(lastSaved.category)}
              </p>
              {lastSaved.note && (
                <p className="text-xs text-base-content/50 truncate">{lastSaved.note}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
