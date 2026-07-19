import { useEffect, useState } from 'react';
import { Landmark, Sparkles, Loader2 } from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import LoanMatchCard from '../components/ui/LoanMatchCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Loader from '../components/ui/Loader.jsx';
import { loansApi, insightsApi } from '../lib/api';
import useToast from '../context/useToast.js';

export default function LoanEligibility() {
  const [products, setProducts] = useState([]);
  const [matches, setMatches] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [checking, setChecking] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Load products
    loansApi
      .getProducts()
      .then(setProducts)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingProducts(false));

    // Load latest matches from snapshot if any
    insightsApi
      .getLatest('weekly')
      .then((snapshot) => {
        if (snapshot && snapshot.loanMatches && snapshot.loanMatches.length > 0) {
          setMatches(snapshot.loanMatches);
        }
      })
      .catch((err) => console.log('No existing snapshot or error:', err.message))
      .finally(() => setLoadingLatest(false));
  }, [toast]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const result = await loansApi.checkEligibility();
      setMatches(result.matches);
      toast.success('Eligibility checked against all loan products');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppShell title="Loan Eligibility">
      <div className="card-surface p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-taka-gradient">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white/15 p-2 text-white shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="font-display font-semibold text-white text-sm">
              Check your eligibility across {products.length || '…'} lenders
            </p>
            <p className="text-white/70 text-xs mt-0.5 max-w-md">
              We'll compare your transaction history to each lender's real criteria, then Gemma 4
              explains the result in plain Bangla.
            </p>
          </div>
        </div>
        <button
          onClick={handleCheck}
          disabled={checking}
          className="btn btn-sm bg-white text-neutral hover:bg-white/90 border-none gap-2 shrink-0"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
          Check eligibility
        </button>
      </div>

      {matches ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => (
            <LoanMatchCard key={m.loanProductId} match={m} />
          ))}
        </div>
      ) : (loadingProducts || loadingLatest) ? (
        <Loader label="Loading loan products…" />
      ) : products.length === 0 ? (
        <EmptyState icon={Landmark} title="No loan products available" />
      ) : (
        <>
          <p className="text-sm text-base-content/50 mb-4">
            Available lenders (run a check above to see your personalized eligibility):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div key={p._id} className="card-surface p-5 opacity-80">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-primary/10 text-primary p-2">
                    <Landmark size={18} />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-neutral">{p.lenderName}</p>
                    <p className="text-xs text-base-content/50">{p.productName}</p>
                  </div>
                </div>
                <p className="text-xs text-base-content/40 mt-3">{p.sourceNote}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
