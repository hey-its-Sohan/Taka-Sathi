import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { formatTaka, formatDate } from '../../lib/format';

export default function CashflowChart({ forecast = [] }) {
  const data = forecast.map((p) => ({
    date: formatDate(p.date, { year: false }),
    balance: p.projectedBalance,
  }));

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-base-content/50">
        No forecast data yet — log a few transactions and generate a summary.
      </div>
    );
  }

  const willGoNegative = data.some((d) => d.balance < 0);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashflowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0E6E5D" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0E6E5D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF1EE" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 || v <= -1000 ? `৳${Math.round(v / 1000)}k` : `৳${v}`}
            width={44}
          />
          <Tooltip
            formatter={(value) => [formatTaka(value), 'Projected balance']}
            contentStyle={{ borderRadius: 12, border: '1px solid #EEF1EE', fontSize: 13 }}
          />
          {willGoNegative && <ReferenceLine y={0} stroke="#C1443C" strokeDasharray="4 4" />}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#0E6E5D"
            strokeWidth={2.5}
            fill="url(#cashflowFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
