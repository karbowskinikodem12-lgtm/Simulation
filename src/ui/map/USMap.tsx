import { memo, useState, type ReactNode } from 'react';
import { CALLOUT_STATES, LABEL_OFFSET, MAP_HEIGHT, MAP_WIDTH, STATE_SHAPES } from './geo';
import { STATE_BY_CODE } from '../../data/states';

interface Props {
  fills: Record<string, string>;
  selected?: string | null;
  dimmed?: Set<string>;
  onSelect?: (code: string) => void;
  tooltip?: (code: string) => ReactNode;
  showLabels?: boolean;
  /** Extra per-state decorations (e.g. "called" checkmarks). */
  badges?: Record<string, string>;
}

const StatePath = memo(function StatePath({ code, d, fill, selected, dim, onSelect, onHover }: { code: string; d: string; fill: string; selected: boolean; dim: boolean; onSelect?: (c: string) => void; onHover: (c: string | null, e?: React.MouseEvent) => void }) {
  return (
    <path
      className={`state${selected ? ' selected' : ''}${dim ? ' dim' : ''}`}
      d={d}
      style={{ fill }}
      onClick={() => onSelect?.(code)}
      onMouseMove={(e) => onHover(code, e)}
      onMouseLeave={() => onHover(null)}
    />
  );
});

export function USMap({ fills, selected, dimmed, onSelect, tooltip, showLabels = true, badges }: Props) {
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const onHover = (code: string | null, e?: React.MouseEvent) => setHover(code && e ? { code, x: e.clientX, y: e.clientY } : null);
  // Selected state is drawn last so its outline is not covered by neighbours.
  const shapes = selected ? [...STATE_SHAPES.filter((s) => s.code !== selected), ...STATE_SHAPES.filter((s) => s.code === selected)] : STATE_SHAPES;

  return (
    <>
      <svg className="usmap" viewBox={`0 0 ${MAP_WIDTH + 62} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        <g>
          {shapes.map((s) => (
            <StatePath key={s.code} code={s.code} d={s.d} fill={fills[s.code] ?? '#2a3550'} selected={selected === s.code} dim={!!dimmed?.has(s.code)} onSelect={onSelect} onHover={onHover} />
          ))}
        </g>
        {showLabels && (
          <g>
            {STATE_SHAPES.filter((s) => !CALLOUT_STATES.includes(s.code)).map((s) => {
              const off = LABEL_OFFSET[s.code] ?? [0, 0];
              const small = s.area < 2500;
              return (
                <text key={s.code} className="label" x={s.centroid[0] + off[0]} y={s.centroid[1] + off[1]}>
                  {badges?.[s.code] ? `${badges[s.code]} ` : ''}
                  {s.code}
                  {!small && (
                    <tspan className="ev" x={s.centroid[0] + off[0]} dy="11">
                      {STATE_BY_CODE[s.code].ev}
                    </tspan>
                  )}
                </text>
              );
            })}
          </g>
        )}
        <g>
          {CALLOUT_STATES.map((code, i) => {
            const y = 150 + i * 27;
            return (
              <g key={code} className={`callout${selected === code ? ' selected' : ''}`} onClick={() => onSelect?.(code)} onMouseMove={(e) => onHover(code, e)} onMouseLeave={() => onHover(null)} style={{ cursor: 'pointer' }}>
                <rect x={MAP_WIDTH} y={y} width={58} height={21} rx={4} style={{ fill: fills[code] ?? '#2a3550', opacity: dimmed?.has(code) ? 0.35 : 1 }} />
                <text x={MAP_WIDTH + 7} y={y + 15}>
                  {badges?.[code] ? `${badges[code]} ` : ''}
                  {code}
                </text>
                <text x={MAP_WIDTH + 52} y={y + 15} textAnchor="end" style={{ fontSize: 10, opacity: 0.8 }}>
                  {STATE_BY_CODE[code].ev}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {hover && tooltip && (
        <div className="map-tooltip" style={{ left: Math.min(hover.x + 16, window.innerWidth - 240), top: Math.min(hover.y + 12, window.innerHeight - 200) }}>
          {tooltip(hover.code)}
        </div>
      )}
    </>
  );
}
