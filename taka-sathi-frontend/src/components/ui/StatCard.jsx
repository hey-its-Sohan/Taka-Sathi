export default function StatCard({ icon: Icon, label, value, tone = 'neutral', sublabel }) {
  const toneClasses = {
    neutral: 'bg-base-200 text-neutral',
    success: 'bg-success/10 text-success',
    error: 'bg-error/10 text-error',
    gold: 'bg-secondary/10 text-secondary',
  };

  return (
    <div className="card-surface p-5 flex items-start gap-4">
      <div className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-base-content/50 uppercase tracking-wide">{label}</p>
        <p className="font-display text-2xl font-bold text-neutral mt-0.5 truncate">{value}</p>
        {sublabel && <p className="text-xs text-base-content/50 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
