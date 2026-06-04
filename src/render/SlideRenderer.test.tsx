import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlideRenderer } from "./SlideRenderer";
import { kitchenSinkDocument } from "./fixtures";

describe("SlideRenderer", () => {
  it("renders all cards of the kitchen-sink doc", () => {
    const doc = kitchenSinkDocument();
    const { container } = render(<SlideRenderer doc={doc} />);
    const slide = container.firstChild as HTMLElement;
    expect(slide.style.width).toBe("1920px");
    expect(slide.style.height).toBe("1080px");
    // one positioned wrapper per card
    expect(slide.children).toHaveLength(doc.cards.length);
    expect(screen.getByText("48MP")).toBeInTheDocument();   // stat
    expect(screen.getByText("macOS")).toBeInTheDocument();  // hero
  });

  it("places cards via grid-area", () => {
    const doc = kitchenSinkDocument();
    const { container } = render(<SlideRenderer doc={doc} />);
    doc.cards.forEach((card, i) => {
      const el = (container.firstChild as HTMLElement).children[i] as HTMLElement;
      const g = card.grid;
      expect(el.style.gridArea).toBe(`${g.y + 1} / ${g.x + 1} / span ${g.h} / span ${g.w}`);
    });
  });

  it("applies theme background and scale transform", () => {
    const doc = kitchenSinkDocument();
    doc.theme.background = { type: "solid", color: "#101012" };
    const { container } = render(<SlideRenderer doc={doc} scale={0.5} />);
    const slide = container.firstChild as HTMLElement;
    expect(slide.style.background).toContain("rgb(16, 16, 18)");
    expect(slide.style.transform).toBe("scale(0.5)");
  });
});
