import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2, ListFilter, X } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import TransactionItem from '../components/ui/TransactionItem.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import { transactionsApi } from '../lib/api';
import { CATEGORY_LABELS } from '../lib/format';
import useToast from '../context/useToast.js';

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [filters, setFilters] = useState({ type: '', category: '', page: 1, date: dateParam || '' });
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 20 };
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.date) {
        // Create full day range for the provided date string (YYYY-MM-DD)
        const year = parseInt(filters.date.split('-')[0]);
        const month = parseInt(filters.date.split('-')[1]) - 1;
        const day = parseInt(filters.date.split('-')[2]);
        params.startDate = new Date(year, month, day, 0, 0, 0).toISOString();
        params.endDate = new Date(year, month, day, 23, 59, 59, 999).toISOString();
      }
      const data = await transactionsApi.list(params);
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (transaction) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try {
      await transactionsApi.remove(transaction._id);
      toast.success('Transaction deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AppShell title="Transaction History">
      <div className="card-surface p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-base-content/50 font-medium">
          <ListFilter size={15} /> Filter:
        </div>
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
          className="select select-bordered select-sm"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
          className="select select-bordered select-sm"
        >
          <option value="">All categories</option>
          {Object.keys(CATEGORY_LABELS).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c].en}
            </option>
          ))}
        </select>
      </div>

      {filters.date && (
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
            Date: {new Date(filters.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            <button 
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('date');
                setSearchParams(newParams);
                setFilters(f => ({ ...f, date: '', page: 1 }));
              }}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="card-surface p-2">
        {loading ? (
          <Loader label="Loading transactions…" />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="No transactions found"
            description="Try adjusting your filters, or log a new entry."
          />
        ) : (
          <div className="divide-y divide-base-300/50">
            {transactions.map((t) => (
              <TransactionItem key={t._id} transaction={t} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="join flex justify-center mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setFilters((f) => ({ ...f, page: p }))}
              className={`join-item btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-ghost'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
