import { useState } from 'react';
import type { CandidateSetup, IssueId, Positions } from '../../engine/types';
import { ISSUES, ISSUE_BY_ID, positionLabel } from '../../data/issues';
import { analyzeProgramText, bucketOf, generatePlatform, platformLine, STYLE_LABEL, type PlatformStyle } from '../../engine/platform';
import { createRng, randomSeed } from '../../engine/rng';
import { Modal } from '../components/common';

interface Props {
  candidate: CandidateSetup;
  title: string;
  onClose: () => void;
  onSave: (patch: Partial<CandidateSetup>) => void;
}

export function ProgramEditor({ candidate, title, onClose, onSave }: Props) {
  const [positions, setPositions] = useState<Positions>({ ...candidate.positions });
  const [platform, setPlatform] = useState<Partial<Record<IssueId, string>>>({ ...candidate.platform });
  const [manifesto, setManifesto] = useState(candidate.manifesto);
  const [slogan, setSlogan] = useState(candidate.slogan);
  const [style, setStyle] = useState<PlatformStyle>('mainstream');
  const [detected, setDetected] = useState<string | null>(null);

  const generate = () => {
    const p = generatePlatform(candidate.party, candidate.profile, style, randomSeed());
    setPositions(p.positions);
    setPlatform(p.platform);
    setManifesto(p.manifesto);
    setSlogan(p.slogan);
    setDetected('AI wygenerowało nowy program na podstawie partii i profilu kandydata.');
  };

  const analyze = () => {
    const r = analyzeProgramText(manifesto, platform, positions);
    setPositions(r.positions);
    // Keep per-issue descriptions consistent with stances that changed bucket.
    const rng = createRng(randomSeed());
    setPlatform((p) => {
      const next = { ...p };
      for (const d of r.detected) if (d.mentioned && bucketOf(d.value) !== bucketOf(positions[d.issue])) next[d.issue] = platformLine(d.issue, d.value, rng);
      return next;
    });
    const found = r.detected.filter((d) => d.mentioned);
    setDetected(
      found.length
        ? `Rozpoznane stanowiska: ${found.map((d) => `${ISSUE_BY_ID[d.issue].label} (${positionLabel(d.value).toLowerCase()})`).join(', ')}.`
        : 'Nie rozpoznano jednoznacznych stanowisk — użyj konkretnych sformułowań (np. „obniżka podatków”, „Medicare for All”, „mur na granicy”) albo ustaw suwaki ręcznie.',
    );
  };

  return (
    <Modal wide onClose={onClose}>
      <div className="modal-head spread">
        <div>
          <div className="tiny muted display" style={{ letterSpacing: '0.1em' }}>
            Program wyborczy
          </div>
          <h2 className="display" style={{ fontSize: 24 }}>
            {title}
          </h2>
        </div>
        <div className="row">
          <div className="segmented">
            {(Object.keys(STYLE_LABEL) as PlatformStyle[]).map((s) => (
              <button key={s} className={style === s ? 'on' : ''} onClick={() => setStyle(s)}>
                {STYLE_LABEL[s]}
              </button>
            ))}
          </div>
          <button className="btn" onClick={generate}>
            🤖 Generuj AI
          </button>
        </div>
      </div>
      <div className="modal-body program-grid">
        <div className="col">
          <label className="field">
            Hasło wyborcze
            <input className="input" value={slogan} maxLength={60} onChange={(e) => setSlogan(e.target.value)} />
          </label>
          <label className="field">
            Manifest — opisz poglądy własnymi słowami
            <textarea className="textarea" style={{ minHeight: 220 }} value={manifesto} onChange={(e) => setManifesto(e.target.value)} placeholder="Np. Obniżymy podatki dla klasy średniej, wprowadzimy publiczną opiekę zdrowotną i zainwestujemy w zieloną energię…" />
          </label>
          <button className="btn" onClick={analyze}>
            🔎 Analizuj tekst i ustaw stanowiska
          </button>
          {detected && <div className="info-box small">{detected}</div>}
          <div className="tiny muted">Stanowiska (suwaki) decydują o tym, jak głosują wyborcy w każdym stanie. Teksty są widoczne w grze i w podsumowaniu.</div>
        </div>
        <div className="col issue-editor">
          {ISSUES.map((iss) => {
            const v = positions[iss.id];
            return (
              <div key={iss.id} className="issue-row">
                <div className="spread">
                  <span style={{ fontWeight: 600 }}>
                    {iss.icon} {iss.label}
                  </span>
                  <span className="tiny" style={{ color: v < -10 ? '#93c5fd' : v > 10 ? '#fca5a5' : 'var(--text-2)' }}>
                    {positionLabel(v)} ({v > 0 ? '+' : ''}
                    {v})
                  </span>
                </div>
                <input type="range" min={-100} max={100} step={5} value={v} onChange={(e) => setPositions((p) => ({ ...p, [iss.id]: Number(e.target.value) }))} />
                <div className="spread tiny muted">
                  <span>{iss.left}</span>
                  <span>{iss.right}</span>
                </div>
                <input className="input small" value={platform[iss.id] ?? ''} placeholder="Własny opis stanowiska (opcjonalnie)" onChange={(e) => setPlatform((p) => ({ ...p, [iss.id]: e.target.value }))} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>
          Anuluj
        </button>
        <button className="btn primary" onClick={() => onSave({ positions, platform, manifesto, slogan })}>
          Zapisz program
        </button>
      </div>
    </Modal>
  );
}
