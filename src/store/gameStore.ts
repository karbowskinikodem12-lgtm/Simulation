// Global UI store. The engine mutates a structured clone of the game state; the store swaps it in
// and recomputes the derived snapshot, so React components can subscribe to plain immutable data.

import { create } from 'zustand';
import type { CandidateSetup, DebateApproach, DebateStrategy, GameSettings, GameState, IssueId, NewsItem, ScheduleKind, SocialStrategy } from '../engine/types';
import { createGame, GAME_VERSION } from '../engine/setup';
import { advanceDay, chooseDebateStrategy, chooseEventOption, concludeDebate, playDebateRound } from '../engine/simulation';
import { addToSchedule, buyMedia, openOffice, removeFromSchedule, type MediaBuy } from '../engine/actions';
import { computeSnapshot, type Snapshot } from '../engine/voterModel';

export type Screen = 'menu' | 'setup' | 'campaign' | 'election' | 'results';
export type MapMode = 'projection' | 'winprob' | 'presence' | 'lean';
export type Speed = 0 | 1 | 2 | 3;
export type LeftTab = 'overview' | 'polls' | 'media' | 'economy' | 'finance';

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
  leftTab: LeftTab;
  /** Major news item currently shown as a full-width "BREAKING" banner. */
  breaking: NewsItem | null;
  lastNewsId: string | null;

  setScreen(s: Screen): void;
  newGame(setups: CandidateSetup[], settings: GameSettings): void;
  tick(): void;
  setSpeed(s: Speed): void;
  selectState(code: string | null): void;
  setMapMode(m: MapMode): void;
  toggleLog(v?: boolean): void;
  toggleHelp(v?: boolean): void;
  toast(text: string, kind?: Toast['kind']): void;
  setLeftTab(t: LeftTab): void;
  dismissBreaking(): void;

  schedule(kind: ScheduleKind, opts?: { state?: string; issue?: IssueId }): void;
  unschedule(actionId: string): void;
  runMedia(buy: MediaBuy): boolean;
  setSocialStrategy(s: SocialStrategy): void;
  debateStrategy(s: DebateStrategy): void;
  debateClose(): void;
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
    leftTab: 'overview',
    breaking: null,
    lastNewsId: null,

    setScreen: (screen) => set({ screen }),

    newGame(setups, settings) {
      const game = createGame(setups, settings);
      set({ game, snap: computeSnapshot(game), screen: 'campaign', speed: 0, selectedState: null, mapMode: 'projection', showHelp: settings.playerIndex !== null, lastNewsId: game.news[0]?.id ?? null, breaking: null, leftTab: 'overview' });
      persist(game);
    },

    tick() {
      const g0 = get().game;
      if (!g0 || g0.phase !== 'campaign') return;
      mutate((g) => advanceDay(g));
      const g = get().game!;
      // Surface the most important new headline as an animated banner.
      const last = get().lastNewsId;
      const fresh: NewsItem[] = [];
      for (const n of g.news) {
        if (n.id === last) break;
        fresh.push(n);
      }
      const major = fresh.find((n) => n.severity === 'major');
      set({ lastNewsId: g.news[0]?.id ?? last, ...(major ? { breaking: major } : {}) });
      if (g.pendingEvent || g.liveDebate) set({ speed: 0 });
      if (g.phase === 'election') {
        set({ speed: 0, screen: 'election' });
        persist(g);
      } else if (g.day % 5 === 0) persist(g);
    },

    setSpeed: (speed) => set({ speed }),
    setLeftTab: (leftTab) => set({ leftTab }),
    dismissBreaking: () => set({ breaking: null }),
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

    runMedia(buy) {
      const pid = get().game?.playerId;
      if (!pid) return false;
      const err = mutate((g) => buyMedia(g, pid, buy));
      report(err, buy.channel === 'canvass' ? 'Program door-to-door ruszył' : 'Kampania reklamowa wystartowała');
      return !err;
    },

    setSocialStrategy(strategy) {
      const pid = get().game?.playerId;
      if (!pid) return;
      mutate((g) => {
        g.candidates.find((c) => c.id === pid)!.social.strategy = strategy;
      });
    },

    debateStrategy(st) {
      mutate((g) => chooseDebateStrategy(g, st));
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
      mutate((g) => concludeDebate(g));
    },

    debateClose() {
      mutate((g) => concludeDebate(g));
      set({ lastNewsId: get().game?.news[0]?.id ?? null });
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
        if (game.version !== GAME_VERSION) {
          get().toast('Zapis pochodzi z poprzedniej wersji gry — rozpocznij nową kampanię', 'err');
          return false;
        }
        const screen: Screen = game.phase === 'campaign' ? 'campaign' : 'results';
        set({ game, snap: computeSnapshot(game), screen, speed: 0, selectedState: null, lastNewsId: game.news[0]?.id ?? null, breaking: null });
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
