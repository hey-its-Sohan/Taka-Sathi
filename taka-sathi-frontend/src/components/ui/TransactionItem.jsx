import { ArrowUpRight, ArrowDownRight, Mic, Pencil, Trash2 } from 'lucide-react';
import { formatTaka, formatDateTime, categoryLabel } from '../../lib/format';

export default function TransactionItem({ transaction, onEdit, onDelete }) {
  const isIncome = transaction.type === 'income';

  return (
    <div className="flex items-center gap-3 py-3.5 px-4 hover:bg-base-200/60 rounded-xl transition group">
      <div
        className={`rounded-full p-2 shrink-0 ${
          isIncome ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}
      >
        {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm text-neutral truncate">
            {categoryLabel(transaction.category)}
          </p>
          {transaction.source === 'voice' && (
            <Mic size={12} className="text-base-content/30 shrink-0" />
          )}
        </div>
        <p className="text-xs text-base-content/45 truncate">
          {transaction.note || transaction.rawInputText || formatDateTime(transaction.date)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-display font-semibold ${isIncome ? 'text-success' : 'text-error'}`}>
          {isIncome ? '+' : '-'}
          {formatTaka(transaction.amount)}
        </p>
        <p className="text-[11px] text-base-content/40">{formatDateTime(transaction.date)}</p>
      </div>

      {(onEdit || onDelete) && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="btn btn-ghost btn-xs btn-square"
              aria-label="Edit transaction"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction)}
              className="btn btn-ghost btn-xs btn-square text-error"
              aria-label="Delete transaction"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
