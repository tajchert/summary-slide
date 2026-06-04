import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditableText } from "./EditableText";

describe("EditableText", () => {
  it("renders plain text until double-clicked, then commits on blur", () => {
    const onCommit = vi.fn();
    render(<EditableText text="48MP" onCommit={onCommit} />);
    const el = screen.getByText("48MP");
    expect(el.isContentEditable).toBe(false);
    fireEvent.doubleClick(el);
    const editable = screen.getByText("48MP");
    expect(editable).toHaveAttribute("contenteditable", "true");
    editable.textContent = "50MP";
    fireEvent.blur(editable);
    expect(onCommit).toHaveBeenCalledWith("50MP");
  });

  it("Escape cancels without committing", () => {
    const onCommit = vi.fn();
    render(<EditableText text="48MP" onCommit={onCommit} />);
    fireEvent.doubleClick(screen.getByText("48MP"));
    const editable = screen.getByText("48MP");
    editable.textContent = "junk";
    fireEvent.keyDown(editable, { key: "Escape" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("48MP").isContentEditable).toBe(false);
  });
});
