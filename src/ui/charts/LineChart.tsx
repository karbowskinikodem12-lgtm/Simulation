import { useState } from 'react';
import { useWidth } from '../components/common';

export interface Series {
  id: string;
  label: string;
  color: string;
  values: number[]; // y per x index
  dashed?: boolean;
}

interface Props {
  series: Series[];
  xLabels?: (i: number) => string;
  height?: number;
  yMin?: number;
  yMax?: number;
  yFormat?: (v: number) => string;
  markers?: { x: number; label: string }[];
  refLine?: number;
}

/** Lightweight responsive SVG line chart with a hover crosshair. */
export function LineChart({ series, xLabels, height = 180, yMin, yMax, yFormat = (v) => v.toFixed(0), markers = [], refLine }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.max(...series.map((s) => s.values.length), 1);
  const all = series.flatMap((s) => s.values);
  const lo = yMin ?? Math.floor(Math.min(...all) - 2);
  const hi = yMax ?? Math.ceil(Math.max(...all) + 2);
  const pad = { l: 34, r: 10, t: 10, b: 20 };
  const w = Math.max(100, width);
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const ticks = 4;
  const yTicks = [...new Set(Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks))];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left - pad.l;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / iw) * (n - 1)))));
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {width > 0 && (
        <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block' }}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(140,170,240,0.08)" />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
                {yFormat(t)}
              </text>
            </g>
          ))}
          {refLine !== undefined && <line x1={pad.l} x2={w - pad.r} y1={y(refLine)} y2={y(refLine)} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" />}
          {markers.map((m) => (
            <g key={m.label + m.x}>
              <line x1={x(m.x)} x2={x(m.x)} y1={pad.t} y2={pad.t + ih} stroke="rgba(240,184,74,0.35)" strokeDasharray="3 3" />
              <text x={x(m.x)} y={pad.t + 9} fontSize="9" fill="var(--accent)" textAnchor="middle">
                {m.label}
              </text>
            </g>
          ))}
          {series.map((s) => (
            <path
              key={s.id}
              d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')}
              fill="none"
              stroke={s.color}
              strokeWidth={2.2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              strokeLinejoin="round"
            />
          ))}
          {xLabels &&
            [...new Set([0, Math.floor((n - 1) / 2), n - 1])].map((i) => (
              <text key={i} x={x(i)} y={height - 4} fontSize="10" fill="var(--muted)" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
                {xLabels(i)}
              </text>
            ))}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="rgba(255,255,255,0.3)" />
              {series.map((s) => s.values[hover] !== undefined && <circle key={s.id} cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill={s.color} stroke="#0b1426" strokeWidth={1.5} />)}
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <div className="map-tooltip" style={{ position: 'absolute', left: Math.min(x(hover) + 10, w - 170), top: 0, minWidth: 150 }}>
          <div className="tiny muted">{xLabels?.(hover) ?? hover}</div>
          {series.map((s) => (
            <div key={s.id} className="spread small">
              <span style={{ color: s.color }}>{s.label}</span>
              <b className="mono">{s.values[hover] !== undefined ? yFormat(s.values[hover]) : '–'}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color, width = 80, height = 22 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - 2 - ((v - lo) / (hi - lo || 1)) * (height - 4);
  return (
    <svg width={width} height={height}>
      <path d={values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}
