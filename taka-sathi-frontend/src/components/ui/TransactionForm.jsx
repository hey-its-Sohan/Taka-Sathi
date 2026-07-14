import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { CATEGORY_LABELS } from '../../lib/format';

const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function TransactionForm({ onSubmit, submitting }) {
  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('sales');
  const [note, setNote] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    await onSubmit({ amount: Number(amount), type, category, note });
    setAmount('');
    setNote('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="join w-full">
        <button
          type="button"
          onClick={() => setType('income')}
          className={`join-item btn flex-1 gap-2 ${
            type === 'income' ? 'btn-success text-white' : 'btn-ghost bg-base-200'
          }`}
        >
          <ArrowUpCircle size={16} /> Income
        </button>
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`join-item btn flex-1 gap-2 ${
            type === 'expense' ? 'btn-error text-white' : 'btn-ghost bg-base-200'
          }`}
        >
          <ArrowDownCircle size={16} /> Expense
        </button>
      </div>

      <label className="form-control w-full">
        <span className="label-text text-xs font-medium text-base-content/60 mb-1">Amount (৳)</span>
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="input input-bordered w-full text-lg font-display font-semibold"
          required
        />
      </label>

      <label className="form-control w-full">
        <span className="label-text text-xs font-medium text-base-content/60 mb-1">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select select-bordered w-full"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c].en} · {CATEGORY_LABELS[c].bn}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control w-full">
        <span className="label-text text-xs font-medium text-base-content/60 mb-1">Note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Vegetable purchase from wholesaler"
          className="input input-bordered w-full"
        />
      </label>

      <button type="submit" disabled={submitting} className="btn-brand btn w-full gap-2">
        {submitting && <Loader2 size={16} className="animate-spin" />}
        Save transaction
      </button>
    </form>
  );
}
