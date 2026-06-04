import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inspector } from "./Inspector";
import { EditorStoreContext } from "./EditorContext";
import { createEditorStore } from "./store";
import { blankDocument } from "../schema/slide";
import type { CardType } from "../schema/slide";

function setup(addType?: CardType) {
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

  it("iconRow: edits item label, adds and removes items", async () => {
    const store = setup("iconRow");
    const input = screen.getByLabelText(/label \(optional\) 1/i);
    await userEvent.clear(input);
    await userEvent.type(input, "MagSafe");
    let card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items[0].label?.text).toBe("MagSafe");

    await userEvent.click(screen.getByRole("button", { name: /\+ add item/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: /remove item 1/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items).toHaveLength(2);
  });

  it("icon: setting caption text stores it; clearing removes it", async () => {
    const store = setup("icon");
    const input = screen.getByLabelText(/caption \(optional\)/i);
    await userEvent.type(input, "sound system");
    let card = store.getState().doc.cards[0];
    expect(card.type === "icon" && card.content.caption?.text).toBe("sound system");

    await userEvent.clear(input);
    card = store.getState().doc.cards[0];
    expect(card.type === "icon" && card.content.caption).toBeUndefined();
  });

  it("iconRow: hides remove button on the last item", async () => {
    const store = setup("iconRow");
    // default card has 2 items: remove one, then the remove button disappears
    await userEvent.click(screen.getByRole("button", { name: /remove item 2/i }));
    const card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /remove item/i })).not.toBeInTheDocument();
  });

  it("statGroup: edits a stat value, toggles layout, adds and removes stats", async () => {
    const store = setup("statGroup");
    const input = screen.getByLabelText(/value 1/i);
    await userEvent.clear(input);
    await userEvent.type(input, "40-core");
    let card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.stats[0].value.text).toBe("40-core");

    await userEvent.selectOptions(screen.getByLabelText(/layout/i), "row");
    card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.layout).toBe("row");

    await userEvent.click(screen.getByRole("button", { name: /\+ add stat/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.stats).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: /remove stat 3/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove stat 2/i }));
    card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.stats).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /remove stat/i })).not.toBeInTheDocument();
  });

  it("code: edits source via textarea and switches language", async () => {
    const store = setup("code");
    const textarea = screen.getByLabelText(/^code$/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "print(1)");
    let card = store.getState().doc.cards[0];
    expect(card.type === "code" && card.content.code).toBe("print(1)");

    await userEvent.selectOptions(screen.getByLabelText(/language/i), "python");
    card = store.getState().doc.cards[0];
    expect(card.type === "code" && card.content.language).toBe("python");
  });

  it("statGroup: disables add at 6 stats", async () => {
    const store = setup("statGroup");
    const addBtn = screen.getByRole("button", { name: /\+ add stat/i });
    for (let k = 0; k < 4; k++) await userEvent.click(addBtn);
    const card = store.getState().doc.cards[0];
    expect(card.type === "statGroup" && card.content.stats).toHaveLength(6);
    expect(addBtn).toBeDisabled();
  });

  it("iconRow: disables + Add item at 12 items", async () => {
    const store = createEditorStore(blankDocument(), "t");
    store.getState().addCard("iconRow");
    const id = store.getState().doc.cards[0].id;
    store.getState().updateCard(id, (c) => {
      if (c.type === "iconRow") {
        while (c.content.items.length < 12) c.content.items.push({ icon: { kind: "emoji", value: "✨" } });
      }
    });
    render(
      <EditorStoreContext.Provider value={store}>
        <Inspector />
      </EditorStoreContext.Provider>
    );
    const addButton = screen.getByRole("button", { name: /\+ add item/i });
    expect(addButton).toBeDisabled();
    await userEvent.click(addButton);
    const card = store.getState().doc.cards[0];
    expect(card.type === "iconRow" && card.content.items).toHaveLength(12);
  });
});
