import { CheckCircle2, Clock, XCircle, Landmark, ShieldCheck, ShieldOff } from 'lucide-react';
import { formatTaka } from '../../lib/format';

const STATUS_CONFIG = {
  eligible: {
    label: 'Eligible now',
    icon: CheckCircle2,
    badgeClass: 'badge-success',
    borderClass: 'border-success/30',
  },
  eligible_in_x_days: {
    label: 'Almost there',
    icon: Clock,
    badgeClass: 'badge-warning',
    borderClass: 'border-warning/30',
  },
  not_eligible: {
    label: 'Not eligible yet',
    icon: XCircle,
    badgeClass: 'badge-error badge-outline',
    borderClass: 'border-base-300',
  },
};

export default function LoanMatchCard({ match }) {
  const config = STATUS_CONFIG[match.status] || STATUS_CONFIG.not_eligible;
  const StatusIcon = config.icon;

  return (
    <div className={`card-surface p-5 border-l-4 ${config.borderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="rounded-lg bg-primary/10 text-primary p-2 shrink-0">
            <Landmark size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-neutral truncate">{match.lenderName}</p>
            {match.productName && (
              <p className="text-xs text-base-content/50 truncate">{match.productName}</p>
            )}
          </div>
        </div>
        <span className={`badge ${config.badgeClass} gap-1 shrink-0`}>
          <StatusIcon size={12} />
          {config.label}
        </span>
      </div>

      {match.reason && (
        <p className="font-bn text-sm text-base-content/70 mt-3 leading-relaxed">{match.reason}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-base-300/60">
        {match.criteria?.maxLoanAmount ? (
          <span className="stat-chip bg-base-200 text-base-content/70">
            Up to {formatTaka(match.criteria.maxLoanAmount)}
          </span>
        ) : null}
        {match.criteria?.interestRateApprox && (
          <span className="stat-chip bg-base-200 text-base-content/70">
            {match.criteria.interestRateApprox}
          </span>
        )}
        <span className="stat-chip bg-base-200 text-base-content/70">
          {match.criteria?.collateralRequired ? (
            <>
              <ShieldCheck size={12} /> Collateral required
            </>
          ) : (
            <>
              <ShieldOff size={12} /> No collateral
            </>
          )}
        </span>
      </div>
    </div>
  );
}
