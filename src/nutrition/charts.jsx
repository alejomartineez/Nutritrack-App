import React, { useEffect, useRef, useState } from 'react';

// Gráficos livianos (sin librerías): barras en HTML y línea en SVG medido.

const useWidth = () => {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
};

/**
 * Barras con línea de meta.
 * data: [{ key, label, value, tone: 'brand'|'amber'|'ink'|null }]
 */
export function BarChart({ data, goal, height = 140, showLabels = true }) {
  const max = Math.max(goal || 0, ...data.map((d) => d.value || 0), 1) * 1.08;
  const goalPct = goal ? (goal / max) * 100 : null;
  const fill = { brand: 'bg-brand-400', amber: 'bg-amber-400', ink: 'bg-ink-500' };
  const dense = data.length > 14;
  return (
    <div>
      <div className="relative" style={{ height }}>
        {goalPct != null && (
          <div className="absolute inset-x-0 border-t border-dashed border-ink-500/60 z-10" style={{ bottom: `${goalPct}%` }}>
            <span className="absolute -top-4 right-0 text-[10px] text-ink-500 num">{Math.round(goal)}</span>
          </div>
        )}
        <div className={`absolute inset-0 flex items-end ${dense ? 'gap-[2px]' : 'gap-1.5'}`}>
          {data.map((d) => (
            <div key={d.key} className="flex-1 h-full flex items-end">
              <div
                className={`w-full ${dense ? 'rounded-sm' : 'rounded-md'} ${d.value ? fill[d.tone || 'brand'] : 'bg-ink-700'} transition-[height] duration-700`}
                style={{ height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : 3, transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
                title={`${d.label}: ${Math.round(d.value || 0)}`}
              />
            </div>
          ))}
        </div>
      </div>
      {showLabels && (
        <div className={`flex mt-1.5 ${dense ? 'gap-[2px]' : 'gap-1.5'}`}>
          {data.map((d, i) => (
            <span key={d.key} className="flex-1 text-center text-[10px] text-ink-500 truncate">
              {!dense || i % 5 === 0 || i === data.length - 1 ? d.label : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Línea de tendencia con puntos crudos.
 * points: [{ key, weight|null, trend }]
 */
export function TrendChart({ points, height = 150, color = 'rgb(var(--brand-400))' }) {
  const [ref, w] = useWidth();
  const pad = { t: 10, b: 18, l: 4, r: 34 };
  const vals = points.flatMap((p) => [p.trend, p.weight]).filter((v) => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(0.6, max - min);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const n = points.length;
  const x = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (w - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  const ticks = [hi - (hi - lo) * 0.15, (hi + lo) / 2, lo + (hi - lo) * 0.15];

  return (
    <div ref={ref} style={{ height }} className="w-full">
      {w > 0 && n > 0 && (
        <svg width={w} height={height}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--ink-700))" strokeDasharray="2 4" />
              <text x={w - pad.r + 6} y={y(t) + 3} fontSize="10" fill="rgb(var(--ink-500))" className="num">
                {t.toFixed(1)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            p.weight != null ? <circle key={p.key} cx={x(i)} cy={y(p.weight)} r={2.6} fill="rgb(var(--ink-500))" /> : null
          )}
          <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {n > 0 && <circle cx={x(n - 1)} cy={y(points[n - 1].trend)} r={4.5} fill={color} stroke="rgb(var(--ink-800))" strokeWidth={2} />}
        </svg>
      )}
    </div>
  );
}
