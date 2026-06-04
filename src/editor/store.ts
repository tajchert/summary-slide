import { createStore } from "zustand/vanilla";
import type { Card, CardType, GridRect, SlideDocument } from "../schema/slide";
import { firstFreeCell, defaultSpan } from "./gridUtils";
import { newCard } from "./newCard";
import { saveDoc } from "../lib/storage";

const MAX_HISTORY = 100;

export interface EditorState {
  doc: SlideDocument;
  localId: string;
  selectedCardId: string | null;
  past: SlideDocument[];
  future: SlideDocument[];
  selectCard: (id: string | null) => void;
  addCard: (type: CardType) => boolean;
  updateCard: (id: string, mutate: (card: Card) => void) => void;
  moveResizeCard: (id: string, grid: GridRect) => void;
  removeCard: (id: string) => void;
  setTheme: (patch: Partial<SlideDocument["theme"]>) => void;
  setTitle: (title: string) => void;
  setDoc: (doc: SlideDocument) => void;
  undo: () => void;
  redo: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persistDebounced(localId: string, doc: SlideDocument) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDoc(localId, doc), 300);
}

export function createEditorStore(initial: SlideDocument, localId: string) {
  return createStore<EditorState>()((set, get) => {
    /** Record current doc into history, then apply producer to a deep copy. */
    const commit = (produce: (doc: SlideDocument) => void) => {
      const prev = get().doc;
      const next = structuredClone(prev);
      produce(next);
      set({ doc: next, past: [...get().past, prev].slice(-MAX_HISTORY), future: [] });
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

      updateCard: (id, mutate) => commit((doc) => {
        const card = doc.cards.find((c) => c.id === id);
        if (card) mutate(card);
      }),

      moveResizeCard: (id, grid) => commit((doc) => {
        const card = doc.cards.find((c) => c.id === id);
        if (card) card.grid = grid;
      }),

      removeCard: (id) => {
        commit((doc) => { doc.cards = doc.cards.filter((c) => c.id !== id); });
        if (get().selectedCardId === id) set({ selectedCardId: null });
      },

      setTheme: (patch) => commit((doc) => { Object.assign(doc.theme, patch); }),
      setTitle: (title) => commit((doc) => { doc.title = title; }),
      setDoc: (doc) => commit((d) => { Object.assign(d, structuredClone(doc)); }),

      undo: () => {
        const { past, doc, future } = get();
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        set({ doc: prev, past: past.slice(0, -1), future: [doc, ...future] });
        persistDebounced(get().localId, prev);
      },

      redo: () => {
        const { past, doc, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        set({ doc: next, past: [...past, doc], future: future.slice(1) });
        persistDebounced(get().localId, next);
      },
    };
  });
}

export type EditorStore = ReturnType<typeof createEditorStore>;
