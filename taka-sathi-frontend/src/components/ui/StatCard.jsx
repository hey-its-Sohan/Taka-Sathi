export default function StatCard({ icon: Icon, label, value, tone = 'neutral', sublabel }) {
  const toneClasses = {
    neutral: {
      bg: 'bg-base-200 text-neutral',
      border: 'border-neutral/20',
    },
    success: {
      bg: 'bg-success/10 text-success',
      border: 'border-success',
    },
    error: {
      bg: 'bg-error/10 text-error',
      border: 'border-error',
    },
    gold: {
      bg: 'bg-secondary/10 text-secondary',
      border: 'border-secondary',
    },
  };

  const style = toneClasses[tone];

  return (
    <div className={`card-surface p-5 flex items-start gap-4 border-t-4 ${style.border}`}>
      <div className={`rounded-xl p-2.5 ${style.bg} shadow-sm`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-base-content/50 uppercase tracking-wide">{label}</p>
        <p className="font-display text-2xl font-bold text-neutral mt-0.5 truncate">{value}</p>
        {sublabel && <p className="text-xs text-base-content/50 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
