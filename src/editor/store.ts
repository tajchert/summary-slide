import { createStore } from "zustand/vanilla";
import type { Card, CardType, GridRect, SlideDocument } from "../schema/slide";
import { firstFreeCell, defaultSpan } from "./gridUtils";
import { newCard } from "./newCard";
import { saveDoc } from "../lib/storage";

const MAX_HISTORY = 100;
/** Commits sharing a coalesce key within this idle window merge into one undo step. */
const COALESCE_MS = 1000;

export interface EditorState {
  doc: SlideDocument;
  localId: string;
  selectedCardId: string | null;
  past: SlideDocument[];
  future: SlideDocument[];
  selectCard: (id: string | null) => void;
  addCard: (type: CardType) => boolean;
  /** `coalesceKey`: pass for continuous inputs (typing, color drags) so a burst is one undo step. */
  updateCard: (id: string, mutate: (card: Card) => void, coalesceKey?: string) => void;
  moveResizeCard: (id: string, grid: GridRect) => void;
  removeCard: (id: string) => void;
  setTheme: (patch: Partial<SlideDocument["theme"]>, coalesceKey?: string) => void;
  setTitle: (title: string, coalesceKey?: string) => void;
  setDoc: (doc: SlideDocument) => void;
  undo: () => void;
  redo: () => void;
}

export function createEditorStore(initial: SlideDocument, localId: string) {
  // Per-store debounce timer so multiple stores (tests, future multi-editor) don't cancel each other.
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const persistDebounced = (id: string, doc: SlideDocument) => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveDoc(id, doc), 300);
  };

  // Last keyed commit; a same-key commit within COALESCE_MS replaces it instead of pushing history.
  let lastKeyed: { key: string; at: number } | null = null;

  return createStore<EditorState>()((set, get) => {
    /** Record current doc into history, then apply producer to a deep copy. */
    const commit = (produce: (doc: SlideDocument) => void, coalesceKey?: string) => {
      const prev = get().doc;
      const next = structuredClone(prev);
      produce(next);
      const now = Date.now();
      const merge = coalesceKey !== undefined && lastKeyed?.key === coalesceKey
        && now - lastKeyed.at < COALESCE_MS;
      lastKeyed = coalesceKey === undefined ? null : { key: coalesceKey, at: now };
      set(merge
        ? { doc: next, future: [] }
        : { doc: next, past: [...get().past, prev].slice(-MAX_HISTORY), future: [] });
      persistDebounced(get().localId, next);
    };

    return {
      doc: initial,
      localId,
      selectedCardId: null,
      past: [],
      future: [],

      selectCard: (id) => set({ selectedCardId: id }),

      addCard: (type) => {
        const span = defaultSpan(type);
        const cell = firstFreeCell(get().doc.cards.map((c) => c.grid), span.w, span.h)
          ?? firstFreeCell(get().doc.cards.map((c) => c.grid), 1, 1);
        if (!cell) return false;
        const card = newCard(type, cell);
        commit((doc) => { doc.cards.push(card); });
        set({ selectedCardId: card.id });
        return true;
      },

      updateCard: (id, mutate, coalesceKey) => commit((doc) => {
        const card = doc.cards.find((c) => c.id === id);
        if (card) mutate(card);
      }, coalesceKey),

      moveResizeCard: (id, grid) => commit((doc) => {
        const card = doc.cards.find((c) => c.id === id);
        if (card) card.grid = grid;
      }),

      removeCard: (id) => {
        commit((doc) => { doc.cards = doc.cards.filter((c) => c.id !== id); });
        if (get().selectedCardId === id) set({ selectedCardId: null });
      },

      setTheme: (patch, coalesceKey) => commit((doc) => { Object.assign(doc.theme, patch); }, coalesceKey),
      setTitle: (title, coalesceKey) => commit((doc) => { doc.title = title; }, coalesceKey),
      setDoc: (doc) => commit((d) => { Object.assign(d, doc); }),

      undo: () => {
        const { past, doc, future, selectedCardId } = get();
        if (past.length === 0) return;
        lastKeyed = null;
        const prev = past[past.length - 1];
        set({
          doc: prev,
          past: past.slice(0, -1),
          future: [doc, ...future],
          // drop selection if the restored doc no longer contains the card
          selectedCardId: prev.cards.some((c) => c.id === selectedCardId) ? selectedCardId : null,
        });
        persistDebounced(get().localId, prev);
      },

      redo: () => {
        const { past, doc, future, selectedCardId } = get();
        if (future.length === 0) return;
        lastKeyed = null;
        const next = future[0];
        set({
          doc: next,
          past: [...past, doc],
          future: future.slice(1),
          selectedCardId: next.cards.some((c) => c.id === selectedCardId) ? selectedCardId : null,
        });
        persistDebounced(get().localId, next);
      },
    };
  });
}

export type EditorStore = ReturnType<typeof createEditorStore>;
