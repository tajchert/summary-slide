import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createEditorStore } from "./store";
import { blankDocument } from "../schema/slide";

describe("editor store", () => {
  let store: ReturnType<typeof createEditorStore>;
  beforeEach(() => {
    store = createEditorStore(blankDocument(), "test-local-id");
  });

  it("addCard places card at first free cell and selects it", () => {
    store.getState().addCard("stat");
    const s = store.getState();
    expect(s.doc.cards).toHaveLength(1);
    expect(s.doc.cards[0].type).toBe("stat");
    expect(s.doc.cards[0].grid).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(s.selectedCardId).toBe(s.doc.cards[0].id);
  });

  it("updateCard patches content immutably", () => {
    store.getState().addCard("headline");
    const id = store.getState().doc.cards[0].id;
    store.getState().updateCard(id, (card) => {
      if (card.type === "headline") card.content.text.text = "Hello";
    });
    const card = store.getState().doc.cards[0];
    expect(card.type === "headline" && card.content.text.text).toBe("Hello");
  });

  it("moveResizeCard updates grid", () => {
    store.getState().addCard("stat");
    const id = store.getState().doc.cards[0].id;
    store.getState().moveResizeCard(id, { x: 4, y: 2, w: 3, h: 2 });
    expect(store.getState().doc.cards[0].grid).toEqual({ x: 4, y: 2, w: 3, h: 2 });
  });

  it("removeCard deletes and clears selection", () => {
    store.getState().addCard("icon");
    const id = store.getState().doc.cards[0].id;
    store.getState().removeCard(id);
    expect(store.getState().doc.cards).toHaveLength(0);
    expect(store.getState().selectedCardId).toBeNull();
  });

  it("undo/redo restores document snapshots", () => {
    store.getState().addCard("stat");
    store.getState().addCard("icon");
    expect(store.getState().doc.cards).toHaveLength(2);
    store.getState().undo();
    expect(store.getState().doc.cards).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().doc.cards).toHaveLength(0);
    store.getState().redo();
    expect(store.getState().doc.cards).toHaveLength(1);
  });

  it("undo clears selection when the selected card no longer exists", () => {
    store.getState().addCard("stat");
    expect(store.getState().selectedCardId).not.toBeNull();
    store.getState().undo();
    expect(store.getState().selectedCardId).toBeNull();
  });

  it("undo with empty history is a no-op", () => {
    expect(() => store.getState().undo()).not.toThrow();
    expect(store.getState().doc.cards).toHaveLength(0);
  });

  it("setTheme records history", () => {
    store.getState().setTheme({ mode: "light" });
    expect(store.getState().doc.theme.mode).toBe("light");
    store.getState().undo();
    expect(store.getState().doc.theme.mode).toBe("dark");
  });

  describe("coalesced commits (continuous inputs: typing, color drags)", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const headline = () => {
      store.getState().addCard("headline");
      return store.getState().doc.cards[0].id;
    };
    const setText = (id: string, text: string, key?: string) =>
      store.getState().updateCard(id, (c) => { if (c.type === "headline") c.content.text.text = text; }, key);
    const text = () => {
      const c = store.getState().doc.cards[0];
      return c?.type === "headline" ? c.content.text.text : undefined;
    };

    it("same key in quick succession is one undo step", () => {
      const id = headline();
      for (const t of ["H", "He", "Hel", "Hell", "Hello"]) { setText(id, t, "k"); vi.advanceTimersByTime(100); }
      expect(text()).toBe("Hello");
      store.getState().undo();
      expect(text()).toBe("New headline");
    });

    it("a pause longer than the window starts a new step", () => {
      const id = headline();
      setText(id, "A", "k");
      vi.advanceTimersByTime(1500);
      setText(id, "AB", "k");
      store.getState().undo();
      expect(text()).toBe("A");
    });

    it("a different key, or a keyless commit, starts a new step", () => {
      const id = headline();
      setText(id, "A", "k1");
      setText(id, "AB", "k2");
      setText(id, "ABC");
      setText(id, "ABCD");
      store.getState().undo();
      expect(text()).toBe("ABC");
      store.getState().undo();
      expect(text()).toBe("AB");
      store.getState().undo();
      expect(text()).toBe("A");
    });

    it("undo breaks a run: typing again after undo is a fresh step", () => {
      const id = headline();
      setText(id, "A", "k");
      store.getState().undo();
      setText(id, "B", "k");
      expect(store.getState().future).toHaveLength(0);
      store.getState().undo();
      expect(text()).toBe("New headline");
    });

    it("setTheme and setTitle coalesce by key too", () => {
      store.getState().setTheme({ accent: "#111111" }, "accent");
      store.getState().setTheme({ accent: "#222222" }, "accent");
      store.getState().setTitle("A", "title");
      store.getState().setTitle("AB", "title");
      store.getState().undo();
      expect(store.getState().doc.title).toBe("Untitled slide");
      expect(store.getState().doc.theme.accent).toBe("#222222");
      store.getState().undo();
      expect(store.getState().doc.theme.accent).toBe("#0a84ff");
    });
  });

  it("addCard on a full grid is a no-op (returns false)", () => {
    const full = blankDocument();
    full.cards = [{ id: "big", type: "headline", grid: { x: 0, y: 0, w: 12, h: 6 },
      content: { text: { text: "x" } } }];
    const s2 = createEditorStore(full, "test-2");
    expect(s2.getState().addCard("stat")).toBe(false);
    expect(s2.getState().doc.cards).toHaveLength(1);
  });
});
