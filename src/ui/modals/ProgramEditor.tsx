import { useState } from 'react';
import type { CandidateSetup, IssueId, Positions } from '../../engine/types';
import { ISSUES, ISSUE_BY_ID, positionLabel } from '../../data/issues';
import { analyzeProgramText, bucketOf, generatePlatform, platformLine, STYLE_LABEL, type PlatformStyle } from '../../engine/platform';
import { createRng, randomSeed } from '../../engine/rng';
import { Modal } from '../components/common';
import { useT } from '../../i18n/useT';

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
  const { t, loc, lang } = useT();

  const generate = () => {
    const p = generatePlatform(candidate.party, candidate.profile, style, randomSeed(), lang);
    setPositions(p.positions);
    setPlatform(p.platform);
    setManifesto(p.manifesto);
    setSlogan(p.slogan);
    setDetected(t('AI wygenerowało nowy program na podstawie partii i profilu kandydata.', 'AI generated a new platform based on the party and candidate profile.'));
  };

  const analyze = () => {
    const r = analyzeProgramText(manifesto, platform, positions);
    setPositions(r.positions);
    // Keep per-issue descriptions consistent with stances that changed bucket.
    const rng = createRng(randomSeed());
    setPlatform((p) => {
      const next = { ...p };
      for (const d of r.detected) if (d.mentioned && bucketOf(d.value) !== bucketOf(positions[d.issue])) next[d.issue] = platformLine(d.issue, d.value, rng, lang);
      return next;
    });
    const found = r.detected.filter((d) => d.mentioned);
    setDetected(
      found.length
        ? `${t('Rozpoznane stanowiska', 'Detected positions')}: ${found.map((d) => `${loc(ISSUE_BY_ID[d.issue].label)} (${loc(positionLabel(d.value)).toLowerCase()})`).join(', ')}.`
        : t(
            'Nie rozpoznano jednoznacznych stanowisk — użyj konkretnych sformułowań (np. „obniżka podatków”, „Medicare for All”, „mur na granicy”) albo ustaw suwaki ręcznie.',
            'No clear positions detected — use specific phrases (e.g. “tax cuts”, “Medicare for All”, “border wall”) or set the sliders manually.',
          ),
    );
  };

  return (
    <Modal wide onClose={onClose}>
      <div className="modal-head spread">
        <div>
          <div className="tiny muted display" style={{ letterSpacing: '0.1em' }}>
            {t('Program wyborczy', 'Campaign platform')}
          </div>
          <h2 className="display" style={{ fontSize: 24 }}>
            {title}
          </h2>
        </div>
        <div className="row">
          <div className="segmented">
            {(Object.keys(STYLE_LABEL) as PlatformStyle[]).map((s) => (
              <button key={s} className={style === s ? 'on' : ''} onClick={() => setStyle(s)}>
                {loc(STYLE_LABEL[s])}
              </button>
            ))}
          </div>
          <button className="btn" onClick={generate}>
            🤖 {t('Generuj AI', 'Generate with AI')}
          </button>
        </div>
      </div>
      <div className="modal-body program-grid">
        <div className="col">
          <label className="field">
            {t('Hasło wyborcze', 'Campaign slogan')}
            <input className="input" value={slogan} maxLength={60} onChange={(e) => setSlogan(e.target.value)} />
          </label>
          <label className="field">
            {t('Manifest — opisz poglądy własnymi słowami', 'Manifesto — describe your views in your own words')}
            <textarea className="textarea" style={{ minHeight: 220 }} value={manifesto} onChange={(e) => setManifesto(e.target.value)} placeholder={t('Np. Obniżymy podatki dla klasy średniej, wprowadzimy publiczną opiekę zdrowotną i zainwestujemy w zieloną energię…', 'E.g. We will cut taxes for the middle class, introduce a public health option and invest in green energy…')} />
          </label>
          <button className="btn" onClick={analyze}>
            🔎 {t('Analizuj tekst i ustaw stanowiska', 'Analyze the text and set positions')}
          </button>
          {detected && <div className="info-box small">{detected}</div>}
          <div className="tiny muted">
            {t('Stanowiska (suwaki) decydują o tym, jak głosują wyborcy w każdym stanie. Teksty są widoczne w grze i w podsumowaniu.', 'Positions (sliders) decide how voters in each state vote. The texts appear in the game and in the summary.')}
          </div>
        </div>
        <div className="col issue-editor">
          {ISSUES.map((iss) => {
            const v = positions[iss.id];
            return (
              <div key={iss.id} className="issue-row">
                <div className="spread">
                  <span style={{ fontWeight: 600 }}>
                    {iss.icon} {loc(iss.label)}
                  </span>
                  <span className="tiny" style={{ color: v < -10 ? '#93c5fd' : v > 10 ? '#fca5a5' : 'var(--text-2)' }}>
                    {loc(positionLabel(v))} ({v > 0 ? '+' : ''}
                    {v})
                  </span>
                </div>
                <input type="range" min={-100} max={100} step={5} value={v} onChange={(e) => setPositions((p) => ({ ...p, [iss.id]: Number(e.target.value) }))} />
                <div className="spread tiny muted">
                  <span>{loc(iss.left)}</span>
                  <span>{loc(iss.right)}</span>
                </div>
                <input className="input small" value={platform[iss.id] ?? ''} placeholder={t('Własny opis stanowiska (opcjonalnie)', 'Your own description of the position (optional)')} onChange={(e) => setPlatform((p) => ({ ...p, [iss.id]: e.target.value }))} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>
          {t('Anuluj', 'Cancel')}
        </button>
        <button className="btn primary" onClick={() => onSave({ positions, platform, manifesto, slogan })}>
          {t('Zapisz program', 'Save platform')}
        </button>
      </div>
    </Modal>
  );
}
