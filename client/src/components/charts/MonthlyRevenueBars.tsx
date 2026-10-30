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
        height: 115,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 8,
        paddingTop: 10,
      }}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const barH = item.total > 0 ? Math.max(8, Math.round((item.total / maxTotal) * 90)) : 4;
        const bg =
          item.total === 0
            ? '#e2e8f0'
            : isLast
            ? 'linear-gradient(180deg, #1f8e5f 0%, #2d6a4f 100%)'
            : 'linear-gradient(180deg, #52b788 0%, #95d5b2 100%)';

        return (
          <div
            key={item.month}
            title={`${item.month}: ${formatCOP(item.total)}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 22,
                height: barH,
                background: bg,
                borderRadius: '5px 5px 2px 2px',
                transition: 'height 0.25s ease',
              }}
            />
            <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500 }}>{item.month}</span>
          </div>
        );
      })}
    </div>
  );
};
