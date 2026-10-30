import React from 'react';

interface PlanDonutChartProps {
  distribution?: Array<{ name: string; count: number; percentage: number }>;
}

const COLORS = ['#1f8e5f', '#68b984', '#eab308', '#475569', '#0ea5e9'];

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
            <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#e2e8f0" strokeWidth="7.5" />
            <circle cx="21" cy="21" r="10" fill="#ffffff" />
          </svg>
        </div>
        <div style={{ flex: 1, fontSize: 12.5, color: '#64748b' }}>
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
          <circle cx="21" cy="21" r="10" fill="#ffffff" />
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
                }}
              />
              <span style={{ color: '#334155', fontWeight: 500 }}>{s.name}</span>
            </div>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{s.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
