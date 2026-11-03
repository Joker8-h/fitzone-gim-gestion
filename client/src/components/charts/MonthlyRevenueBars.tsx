import React from 'react';
import { formatCOP } from '../../utils/format';

interface MonthlyRevenueBarsProps {
  monthlyData?: Array<{ month: string; total: number }>;
}

export const MonthlyRevenueBars: React.FC<MonthlyRevenueBarsProps> = ({ monthlyData = [] }) => {
  const defaultMonths = [
    { month: 'Ene', total: 0 },
    { month: 'Feb', total: 0 },
    { month: 'Mar', total: 0 },
    { month: 'Abr', total: 0 },
    { month: 'May', total: 0 },
    { month: 'Jun', total: 0 },
    { month: 'Jul', total: 0 },
    { month: 'Ago', total: 0 },
    { month: 'Sep', total: 0 },
    { month: 'Oct', total: 0 },
  ];

  const items = monthlyData.length > 0 ? monthlyData : defaultMonths;
  const maxTotal = Math.max(100000, ...items.map((x) => x.total));

  return (
    <div
      style={{
        height: 120,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 8,
        paddingTop: 10,
      }}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const barH = item.total > 0 ? Math.max(8, Math.round((item.total / maxTotal) * 92)) : 5;
        const bg =
          item.total === 0
            ? '#1e293b'
            : isLast
            ? 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)'
            : 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)';

        const glow = item.total > 0 && isLast ? '0 0 10px rgba(34, 197, 94, 0.45)' : 'none';

        return (
          <div
            key={item.month}
            title={`${item.month}: ${formatCOP(item.total)}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 22,
                height: barH,
                background: bg,
                boxShadow: glow,
                borderRadius: '5px 5px 2px 2px',
                transition: 'height 0.25s ease',
              }}
            />
            <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>{item.month}</span>
          </div>
        );
      })}
    </div>
  );
};
