import React from 'react';

interface AttendanceLineChartProps {
  rangeMode: '7d' | '14d';
  rawDays?: Array<{ date: string; label: string; count: number }>;
}

export const AttendanceLineChart: React.FC<AttendanceLineChartProps> = ({ rawDays = [] }) => {
  const defaultDays = [
    { label: 'Día 1', count: 0 },
    { label: 'Día 2', count: 0 },
    { label: 'Día 3', count: 0 },
    { label: 'Día 4', count: 0 },
    { label: 'Día 5', count: 0 },
    { label: 'Día 6', count: 0 },
    { label: 'Hoy', count: 0 },
  ];

  const data = rawDays.length > 0 ? rawDays : defaultDays;
  const maxVal = Math.max(10, ...data.map((d) => d.count));

  const w = 480;
  const h = 195;
  const padL = 32;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const pts = data.map((d, idx) => {
    const x = padL + (idx / Math.max(1, data.length - 1)) * plotW;
    const y = padT + plotH - (d.count / maxVal) * plotH;
    return { x, y, v: d.count, label: d.label };
  });

  const polylinePts = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPts = `${pts[0].x.toFixed(1)},${padT + plotH} ${polylinePts} ${pts[pts.length - 1].x.toFixed(1)},${
    padT + plotH
  }`;

  const ySteps = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  return (
    <div style={{ width: '100%', height: 215 }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="attGradReact" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ySteps.map((val, i) => {
          const y = padT + plotH - (val / maxVal) * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10.5" fill="#64748b">
                {val}
              </text>
            </g>
          );
        })}

        <polygon points={areaPts} fill="url(#attGradReact)" />
        <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" points={polylinePts} />

        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.2" fill="#16a34a" stroke="#ffffff" strokeWidth="2">
              <title>{`${p.label}: ${p.v} asistencia(s)`}</title>
            </circle>
          </g>
        ))}

        {pts.map((p, idx) => (
          <text key={idx} x={p.x} y={h - 6} textAnchor="middle" fontSize="10.5" fill="#64748b">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
};
