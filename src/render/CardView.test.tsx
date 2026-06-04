import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardView } from "./CardView";
import { blankDocument } from "../schema/slide";
import type { Card } from "../schema/slide";

const theme = blankDocument().theme;
const base = { id: "c1", grid: { x: 0, y: 0, w: 2, h: 2 } };

const renderCard = (card: Card) => render(<CardView card={card} theme={theme} />);

describe("CardView", () => {
  it("stat renders prefix, value and caption", () => {
    renderCard({ ...base, type: "stat", content: {
      prefix: { text: "Up to" }, value: { text: "48MP" }, caption: { text: "Fusion camera" } } });
    expect(screen.getByText("Up to")).toBeInTheDocument();
    expect(screen.getByText("48MP")).toBeInTheDocument();
    expect(screen.getByText("Fusion camera")).toBeInTheDocument();
  });

  it("headline renders text with gradient style", () => {
    renderCard({ ...base, type: "headline", content: {
      text: { text: "Spotlight actions", gradient: { from: "#f55", to: "#5af", angle: 90 } } } });
    const el = screen.getByText("Spotlight actions");
    expect(el).toHaveStyle({ backgroundImage: "linear-gradient(90deg, #f55, #5af)" });
  });

  it("image renders img with object-fit and overlay text", () => {
    renderCard({ ...base, type: "image", content: {
      src: "/i/x.png", fit: "contain", overlay: { text: { text: "Video Boost" }, placement: "center-pill" } } });
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/i/x.png");
    expect(img).toHaveStyle({ objectFit: "contain" });
    expect(screen.getByText("Video Boost")).toBeInTheDocument();
  });

  it("icon renders emoji and label; layout=left renders a row", () => {
    const { container } = renderCard({ ...base, type: "icon", content: {
      icon: { kind: "emoji", value: "📞" }, label: { text: "Phone" }, layout: "left" } });
    expect(screen.getByText("📞")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect((container.firstChild!.firstChild as HTMLElement).style.flexDirection).toBe("row");
  });

  it("icon renders uploaded graphic instead of emoji", () => {
    renderCard({ ...base, type: "icon", content: {
      icon: { kind: "image", src: "/i/logo.png" }, label: { text: "Brand" }, layout: "top" } });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/i/logo.png");
  });

  it("hero renders title over optional image", () => {
    renderCard({ ...base, type: "hero", content: {
      title: { text: "macOS" }, image: "/i/bg.png", imagePlacement: "behind" } });
    expect(screen.getByText("macOS")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/i/bg.png");
  });

  it("list renders title and items with bullets", () => {
    renderCard({ ...base, type: "list", content: {
      title: { text: "Smart experiences" }, marker: "bullet",
      items: [{ text: "Wi-Fi 7" }, { text: "Lossless audio" }] } });
    expect(screen.getByText("Smart experiences")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("iconRow renders all items with labels and a group caption", () => {
    renderCard({ ...base, type: "iconRow", content: {
      items: [
        { icon: { kind: "emoji", value: "🔌" }, label: { text: "MagSafe 3" } },
        { icon: { kind: "image", src: "/i/hdmi.png" }, label: { text: "HDMI" } },
        { icon: { kind: "emoji", value: "💾" } },
      ],
      caption: { text: "Connect everything" } } });
    expect(screen.getByText("🔌")).toBeInTheDocument();
    expect(screen.getByText("MagSafe 3")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "/i/hdmi.png");
    expect(screen.getByText("HDMI")).toBeInTheDocument();
    expect(screen.getByText("💾")).toBeInTheDocument();
    expect(screen.getByText("Connect everything")).toBeInTheDocument();
  });

  it("icon renders an optional muted caption under the label", () => {
    renderCard({ ...base, type: "icon", content: {
      icon: { kind: "emoji", value: "🎧" }, label: { text: "Spatial audio" },
      caption: { text: "with dynamic head tracking" }, layout: "top" } });
    expect(screen.getByText("Spatial audio")).toBeInTheDocument();
    expect(screen.getByText("with dynamic head tracking")).toBeInTheDocument();
  });

  it("iconRow without labels or caption renders only icons", () => {
    renderCard({ ...base, type: "iconRow", content: {
      items: [{ icon: { kind: "emoji", value: "⚡" } }] } });
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });

  it("statGroup column renders stacked stats with prefix/value/caption", () => {
    const { container } = renderCard({ ...base, type: "statGroup", content: {
      layout: "column", stats: [
        { prefix: { text: "Up to" }, value: { text: "16-core" }, caption: { text: "CPU" } },
        { prefix: { text: "Up to" }, value: { text: "40-core" }, caption: { text: "GPU" } },
      ] } });
    expect(screen.getAllByText("Up to")).toHaveLength(2);
    expect(screen.getByText("16-core")).toBeInTheDocument();
    expect(screen.getByText("40-core")).toBeInTheDocument();
    expect((container.firstChild!.firstChild as HTMLElement).style.flexDirection).toBe("column");
    expect(container.querySelectorAll("[data-divider]")).toHaveLength(0);
  });

  it("statGroup row renders side-by-side stats with dividers between them", () => {
    const { container } = renderCard({ ...base, type: "statGroup", content: {
      layout: "row", stats: [
        { value: { text: '6.9"' } }, { value: { text: '6.3"' } },
      ] } });
    expect((container.firstChild!.firstChild as HTMLElement).style.flexDirection).toBe("row");
    expect(container.querySelectorAll("[data-divider]")).toHaveLength(1);
  });

  it("applies card style override on the wrapper", () => {
    const { container } = renderCard({ ...base, type: "headline",
      style: { background: { type: "solid", color: "#ff0000" }, textColor: "#00ff00" },
      content: { text: { text: "x" } } });
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.background).toContain("rgb(255, 0, 0)");
    expect(wrapper.style.color).toBe("rgb(0, 255, 0)");
  });
});
