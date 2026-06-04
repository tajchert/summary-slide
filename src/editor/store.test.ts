import { describe, it, expect, beforeEach } from "vitest";
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

  it("addCard on a full grid is a no-op (returns false)", () => {
    const full = blankDocument();
    full.cards = [{ id: "big", type: "headline", grid: { x: 0, y: 0, w: 12, h: 6 },
      content: { text: { text: "x" } } }];
    const s2 = createEditorStore(full, "test-2");
    expect(s2.getState().addCard("stat")).toBe(false);
    expect(s2.getState().doc.cards).toHaveLength(1);
  });
});
