import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Candidate } from '../../engine/types';
import { PARTIES } from '../../data/parties';
import { alpha } from '../colors';
import { useGame } from '../../store/gameStore';

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: `radial-gradient(circle at 30% 25%, ${alpha(color, 1)}, ${alpha(color, 0.55)} 70%, #0b1426)` }}>
      <svg viewBox="0 0 40 40" style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
        <circle cx="20" cy="15" r="7" fill="#fff" />
        <path d="M6 40c1-9 7-14 14-14s13 5 14 14z" fill="#fff" />
      </svg>
      <span style={{ position: 'relative' }}>{initials(name)}</span>
    </div>
  );
}

export function PartyTag({ c }: { c: Pick<Candidate, 'party' | 'color'> }) {
  return (
    <span className="chip" style={{ borderColor: alpha(c.color, 0.6), color: c.color }}>
      {PARTIES[c.party].short}
    </span>
  );
}

export function Modal({ children, wide, onClose }: { children: ReactNode; wide?: boolean; onClose?: () => void }) {
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal${wide ? ' wide' : ''}`}>{children}</div>
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function StatBar({ label, value, color = 'var(--accent)' }: { label: string; value: number; color?: string }) {
  return (
    <div className="col" style={{ gap: 3 }}>
      <div className="spread tiny">
        <span className="muted">{label}</span>
        <span className="mono">{Math.round(value)}</span>
      </div>
      <div className="bar">
        <div style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

/** Element width tracking for responsive SVG charts. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Smoothly animated number. */
export function AnimatedNumber({ value, digits = 0, suffix = '' }: { value: number; digits?: number; suffix?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 500);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * e;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <>
      {shown.toFixed(digits)}
      {suffix}
    </>
  );
}

export function Delta({ v, digits = 1, suffix = '' }: { v: number; digits?: number; suffix?: string }) {
  if (Math.abs(v) < Math.pow(10, -digits) / 2) return <span className="muted tiny">±0{suffix}</span>;
  return (
    <span className={`tiny mono ${v > 0 ? 'good' : 'bad'}`}>
      {v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(digits)}
      {suffix}
    </span>
  );
}
