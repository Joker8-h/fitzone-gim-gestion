import React from 'react';

interface PlanDonutChartProps {
  distribution?: Array<{ name: string; count: number; percentage: number }>;
}

const COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#a855f7', '#3b82f6'];

export const PlanDonutChart: React.FC<PlanDonutChartProps> = ({ distribution = [] }) => {
  if (distribution.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          paddingTop: 8,
        }}
      >
        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
          <svg viewBox="0 0 42 42" style={{ width: 120, height: 120 }}>
            <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#1e293b" strokeWidth="7.5" />
            <circle cx="21" cy="21" r="10" fill="#0e1526" />
          </svg>
        </div>
        <div style={{ flex: 1, fontSize: 12.5, color: '#94a3b8' }}>
          Aún no hay membresías asignadas. Crea un plan y asígnalo a un miembro para ver la distribución.
        </div>
      </div>
    );
  }

  let offset = 25;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        paddingTop: 8,
      }}
    >
      <div style={{ width: 125, height: 125, flexShrink: 0 }}>
        <svg viewBox="0 0 42 42" style={{ width: 125, height: 125 }}>
          {distribution.map((s, idx) => {
            const dash = `${s.percentage} ${100 - s.percentage}`;
            const currentOffset = offset;
            offset -= s.percentage;
            return (
              <circle
                key={s.name}
                cx="21"
                cy="21"
                r="15.9155"
                fill="transparent"
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth="7.5"
                strokeDasharray={dash}
                strokeDashoffset={currentOffset}
              />
            );
          })}
          <circle cx="21" cy="21" r="10" fill="#0e1526" />
        </svg>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {distribution.map((s, idx) => (
          <div
            key={s.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: COLORS[idx % COLORS.length],
                  display: 'inline-block',
                  boxShadow: `0 0 6px ${COLORS[idx % COLORS.length]}88`,
                }}
              />
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{s.name}</span>
            </div>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{s.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
