import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StartPage } from "./StartPage";

const renderStart = () => render(<MemoryRouter><StartPage /></MemoryRouter>);

describe("StartPage template gallery", () => {
  it("shows a source link for templates that have one, opening in a new tab", () => {
    renderStart();
    const src = screen.getByRole("link", { name: "Windows Light source" });
    expect(src).toHaveAttribute("href",
      "https://blogs.windows.com/windowsexperience/2026/10/07/building-windows-for-hybrid-intelligence/");
    expect(src).toHaveAttribute("target", "_blank");
    expect(src).toHaveAttribute("rel", "noopener noreferrer");
    // never nested inside the open-template link (<a> in <a> is invalid HTML)
    expect(src.parentElement!.closest("a")).toBeNull();
  });

  it("templates without a source get no source link", () => {
    renderStart();
    expect(screen.getByRole("link", { name: "Apple Bento Dark" })).toHaveAttribute("href", "/edit?t=apple-bento-dark");
    expect(screen.queryByRole("link", { name: "Apple Bento Dark source" })).toBeNull();
  });
});
