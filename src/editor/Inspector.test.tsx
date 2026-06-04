import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inspector } from "./Inspector";
import { EditorStoreContext } from "./EditorContext";
import { createEditorStore } from "./store";
import { blankDocument } from "../schema/slide";

function setup(addType?: "stat" | "headline") {
  const store = createEditorStore(blankDocument(), "t");
  if (addType) store.getState().addCard(addType);
  render(
    <EditorStoreContext.Provider value={store}>
      <Inspector />
    </EditorStoreContext.Provider>
  );
  return store;
}

describe("Inspector", () => {
  it("shows slide settings when nothing is selected", () => {
    setup();
    expect(screen.getByText(/slide settings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/accent/i)).toBeInTheDocument();
  });

  it("edits stat value text", async () => {
    const store = setup("stat");
    const input = screen.getByLabelText(/^value$/i);
    await userEvent.clear(input);
    await userEvent.type(input, "120Hz");
    const card = store.getState().doc.cards[0];
    expect(card.type === "stat" && card.content.value.text).toBe("120Hz");
  });

  it("applies text styling (size) to a field", async () => {
    const store = setup("stat");
    await userEvent.click(screen.getAllByRole("button", { name: /style/i })[0]);
    const size = screen.getByLabelText(/size/i);
    await userEvent.clear(size);
    await userEvent.type(size, "120");
    const card = store.getState().doc.cards[0];
    expect(card.type === "stat" && card.content.value.size).toBe(120);
  });

  it("sets a card background override", async () => {
    const store = setup("headline");
    await userEvent.selectOptions(screen.getByLabelText(/background/i), "solid");
    const card = store.getState().doc.cards[0];
    expect(card.style?.background?.type).toBe("solid");
  });

  it("delete button removes the card", async () => {
    const store = setup("headline");
    await userEvent.click(screen.getByRole("button", { name: /delete card/i }));
    expect(store.getState().doc.cards).toHaveLength(0);
  });
});
