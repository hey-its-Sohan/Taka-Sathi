import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { transactionsApi } from '../../lib/api';
import TransactionItem from './TransactionItem';
import useLanguage from '../../context/useLanguage';

export default function TransactionCalendar() {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        
        const data = await transactionsApi.list({ startDate, endDate, limit: 500 });
        if (isMounted) {
          setTransactions(data.transactions || []);
        }
      } catch (err) {
        console.error('Failed to load transactions for calendar', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchTransactions();
    return () => { isMounted = false; };
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  // Group transactions by YYYY-MM-DD (local timezone string for stable comparisons)
  const grouped = useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      // Construct a simple local date string to avoid timezone offset mismatches
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(tx);
    });
    return map;
  }, [transactions]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr(null);
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr(null);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedTransactions = selectedDateStr ? grouped[selectedDateStr] || [] : [];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-base-300/40">
        <button onClick={handlePrevMonth} className="btn btn-sm btn-ghost btn-circle">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-semibold text-neutral flex items-center gap-2">
          {monthName} {loading && <Loader2 size={14} className="animate-spin text-primary" />}
        </h3>
        <button onClick={handleNextMonth} className="btn btn-sm btn-ghost btn-circle">
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-base-content/40 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((dateObj, idx) => {
            if (!dateObj) return <div key={`empty-${idx}`} />;
            
            const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const dayTx = grouped[dateStr] || [];
            const hasIncome = dayTx.some(t => t.type === 'income');
            const hasExpense = dayTx.some(t => t.type === 'expense');
            const isSelected = selectedDateStr === dateStr;
            
            const today = new Date();
            const isToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}` === dateStr;
            
            return (
              <button 
                key={dateStr}
                onClick={() => setSelectedDateStr(isSelected ? null : dateStr)}
                className={`relative h-11 w-full flex flex-col items-center justify-center rounded-xl transition-all ${
                  isSelected 
                    ? 'bg-primary text-white shadow-md' 
                    : isToday 
                      ? 'bg-primary/10 text-primary font-bold hover:bg-primary/20'
                      : 'hover:bg-base-200 text-neutral'
                }`}
              >
                <span className="text-sm">{dateObj.getDate()}</span>
                <div className="flex gap-1 mt-0.5">
                  {hasIncome && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-success'}`} />}
                  {hasExpense && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-error'}`} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion / Slide down */}
      {selectedDateStr && (
        <div className="bg-base-200/50 border-t border-base-300/40 p-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-neutral">
              {new Date(selectedDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </h4>
            <span className="text-xs text-base-content/50 font-medium">
              {selectedTransactions.length} {selectedTransactions.length === 1 ? 'activity' : 'activities'}
            </span>
          </div>
          
          {selectedTransactions.length > 0 ? (
            <div className="divide-y divide-base-300/50 bg-base-100 rounded-xl border border-base-300/60 shadow-sm overflow-hidden flex flex-col">
              {selectedTransactions.slice(0, 5).map(t => (
                <TransactionItem key={t._id} transaction={t} />
              ))}
              {selectedTransactions.length > 5 && (
                <Link 
                  to={`/history?date=${selectedDateStr}`} 
                  className="p-3 text-center text-sm font-medium text-primary hover:bg-base-200/50 transition-colors"
                >
                  View all {selectedTransactions.length} activities for this day
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-6 bg-base-100 rounded-xl border border-base-300/60 shadow-sm">
              <p className="text-sm text-base-content/50">{t('No activities on this date.')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
