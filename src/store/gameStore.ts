// Global UI store. The engine mutates a structured clone of the game state; the store swaps it in
// and recomputes the derived snapshot, so React components can subscribe to plain immutable data.

import { create } from 'zustand';
import type { AdKind, CandidateSetup, DebateApproach, GameSettings, GameState, IssueId, ScheduleKind } from '../engine/types';
import { createGame, GAME_VERSION } from '../engine/setup';
import { advanceDay, chooseEventOption, concludeDebate, playDebateRound } from '../engine/simulation';
import { addToSchedule, launchAd, openOffice, removeFromSchedule } from '../engine/actions';
import { computeSnapshot, type Snapshot } from '../engine/voterModel';

export type Screen = 'menu' | 'setup' | 'campaign' | 'election' | 'results';
export type MapMode = 'projection' | 'winprob' | 'presence' | 'lean';
export type Speed = 0 | 1 | 2 | 3;

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'err' | 'info';
}

const SAVE_KEY = 'road-to-270-save';

interface Store {
  screen: Screen;
  game: GameState | null;
  snap: Snapshot | null;
  speed: Speed;
  selectedState: string | null;
  mapMode: MapMode;
  toasts: Toast[];
  showLog: boolean;
  showHelp: boolean;

  setScreen(s: Screen): void;
  newGame(setups: CandidateSetup[], settings: GameSettings): void;
  tick(): void;
  setSpeed(s: Speed): void;
  selectState(code: string | null): void;
  setMapMode(m: MapMode): void;
  toggleLog(v?: boolean): void;
  toggleHelp(v?: boolean): void;
  toast(text: string, kind?: Toast['kind']): void;

  schedule(kind: ScheduleKind, opts?: { state?: string; issue?: IssueId }): void;
  unschedule(actionId: string): void;
  runAd(opts: { scope: string; kind: AdKind; days: number; issue?: IssueId; targetId?: string }): boolean;
  buildOffice(code: string): void;
  chooseEvent(i: number): void;
  debatePick(a: DebateApproach): void;
  debateFinish(): void;
  toggleAutopilot(): void;

  hasSave(): boolean;
  loadSave(): boolean;
  save(): void;
  quitToMenu(): void;
}

let toastId = 0;

function persist(game: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch {
    /* storage unavailable or full — saving is a convenience only */
  }
}

export const useGame = create<Store>((set, get) => {
  /** Run an engine mutation on a cloned state and publish the result. */
  function mutate<T>(fn: (g: GameState) => T): T | undefined {
    const current = get().game;
    if (!current) return undefined;
    const g = structuredClone(current);
    const out = fn(g);
    set({ game: g, snap: computeSnapshot(g) });
    return out;
  }

  function report(err: string | null | undefined, ok: string) {
    if (err) get().toast(err, 'err');
    else get().toast(ok, 'ok');
  }

  return {
    screen: 'menu',
    game: null,
    snap: null,
    speed: 0,
    selectedState: null,
    mapMode: 'projection',
    toasts: [],
    showLog: false,
    showHelp: false,

    setScreen: (screen) => set({ screen }),

    newGame(setups, settings) {
      const game = createGame(setups, settings);
      set({ game, snap: computeSnapshot(game), screen: 'campaign', speed: 0, selectedState: null, mapMode: 'projection', showHelp: settings.playerIndex !== null });
      persist(game);
    },

    tick() {
      const g0 = get().game;
      if (!g0 || g0.phase !== 'campaign') return;
      mutate((g) => advanceDay(g));
      const g = get().game!;
      if (g.pendingEvent || g.liveDebate) set({ speed: 0 });
      if (g.phase === 'election') {
        set({ speed: 0, screen: 'election' });
        persist(g);
      } else if (g.day % 5 === 0) persist(g);
    },

    setSpeed: (speed) => set({ speed }),
    selectState: (selectedState) => set({ selectedState }),
    setMapMode: (mapMode) => set({ mapMode }),
    toggleLog: (v) => set((s) => ({ showLog: v ?? !s.showLog })),
    toggleHelp: (v) => set((s) => ({ showHelp: v ?? !s.showHelp })),

    toast(text, kind = 'info') {
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, kind }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
    },

    schedule(kind, opts) {
      const pid = get().game?.playerId;
      if (!pid) return;
      const err = mutate((g) => addToSchedule(g, pid, kind, opts));
      report(err, 'Dodano do harmonogramu');
    },

    unschedule(actionId) {
      const pid = get().game?.playerId;
      if (!pid) return;
      mutate((g) => removeFromSchedule(g, pid, actionId));
    },

    runAd(opts) {
      const pid = get().game?.playerId;
      if (!pid) return false;
      const err = mutate((g) => launchAd(g, pid, opts));
      report(err, 'Kampania reklamowa wystartowała');
      return !err;
    },

    buildOffice(code) {
      const pid = get().game?.playerId;
      if (!pid) return;
      const err = mutate((g) => openOffice(g, pid, code));
      report(err, 'Otwarto biuro terenowe');
    },

    chooseEvent(i) {
      mutate((g) => chooseEventOption(g, i));
    },

    debatePick(a) {
      mutate((g) => playDebateRound(g, a));
    },

    debateFinish() {
      const slotId = get().game?.liveDebate?.slotId;
      mutate((g) => concludeDebate(g));
      const g = get().game;
      const slot = g?.debates.find((d) => d.id === slotId);
      if (g && slot?.winner) {
        const w = g.candidates.find((c) => c.id === slot.winner)!;
        get().toast(`${slot.title}: wygrywa ${w.name} (${slot.flashPoll?.[w.id]}% w sondażu CNN-style)`, w.isPlayer ? 'ok' : 'err');
      }
    },

    toggleAutopilot() {
      const pid = get().game?.playerId;
      if (!pid) return;
      mutate((g) => {
        const c = g.candidates.find((x) => x.id === pid)!;
        c.autopilot = !c.autopilot;
      });
    },

    hasSave() {
      try {
        return !!localStorage.getItem(SAVE_KEY);
      } catch {
        return false;
      }
    },

    loadSave() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const game = JSON.parse(raw) as GameState;
        if (game.version !== GAME_VERSION) return false;
        const screen: Screen = game.phase === 'campaign' ? 'campaign' : 'results';
        set({ game, snap: computeSnapshot(game), screen, speed: 0, selectedState: null });
        return true;
      } catch {
        return false;
      }
    },

    save() {
      const g = get().game;
      if (g) {
        persist(g);
        get().toast('Gra zapisana', 'ok');
      }
    },

    quitToMenu() {
      const g = get().game;
      if (g) persist(g);
      set({ screen: 'menu', speed: 0 });
    },
  };
});

/** Convenience selectors. */
export const usePlayer = () => useGame((s) => s.game?.candidates.find((c) => c.id === s.game?.playerId) ?? null);
