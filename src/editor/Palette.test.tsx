import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Palette } from "./Palette";
import { EditorStoreContext } from "./EditorContext";
import { createEditorStore } from "./store";
import { blankDocument } from "../schema/slide";

describe("Palette", () => {
  it("renders six card tiles and adds a card on click", async () => {
    const store = createEditorStore(blankDocument(), "t");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    expect(screen.getAllByRole("button")).toHaveLength(9);
    await userEvent.click(screen.getByRole("button", { name: "Stat" }));
    expect(store.getState().doc.cards).toHaveLength(1);
    expect(store.getState().doc.cards[0].type).toBe("stat");
  });

  it("shows a message when the grid is full", async () => {
    const doc = blankDocument();
    doc.cards = [{ id: "big", type: "headline", grid: { x: 0, y: 0, w: 12, h: 6 },
      content: { text: { text: "x" } } }];
    const store = createEditorStore(doc, "t2");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Icon" }));
    expect(store.getState().doc.cards).toHaveLength(1);
    expect(screen.getByText(/grid is full/i)).toBeInTheDocument();
  });

  it("adds an iconRow card", async () => {
    const store = createEditorStore(blankDocument(), "t3");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Icon row" }));
    expect(store.getState().doc.cards[0].type).toBe("iconRow");
  });

  it("adds a code card", async () => {
    const store = createEditorStore(blankDocument(), "t5");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(store.getState().doc.cards[0].type).toBe("code");
  });

  it("adds a statGroup card", async () => {
    const store = createEditorStore(blankDocument(), "t4");
    render(
      <EditorStoreContext.Provider value={store}>
        <Palette />
      </EditorStoreContext.Provider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Stat group" }));
    expect(store.getState().doc.cards[0].type).toBe("statGroup");
  });
});
