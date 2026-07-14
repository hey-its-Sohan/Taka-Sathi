/**
 * HealthScoreGauge — the app's signature visual element.
 * A circular "taka-coin" dial: the ring reads as a coin rim, the gradient
 * sweeps from warm gold (growth/prosperity) into deep teal (stability) as
 * the score rises, giving the health score a distinct identity instead of
 * a generic progress ring.
 */
export default function HealthScoreGauge({ score = 0, size = 176 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const tone =
    clamped >= 70
      ? { label: 'Healthy', labelBn: 'সুস্থ', color: '#0E6E5D' }
      : clamped >= 40
      ? { label: 'Watch closely', labelBn: 'নজরে রাখুন', color: '#D97706' }
      : { label: 'At risk', labelBn: 'ঝুঁকিতে', color: '#C1443C' };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E7A93D" />
              <stop offset="100%" stopColor={tone.color} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EEF1EE"
            strokeWidth="12"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold text-neutral leading-none">{clamped}</span>
          <span className="text-xs text-base-content/50 mt-1">/ 100</span>
        </div>
      </div>
      <div className="stat-chip" style={{ backgroundColor: `${tone.color}1A`, color: tone.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
        {tone.label}
        <span className="font-bn">· {tone.labelBn}</span>
      </div>
    </div>
  );
}
