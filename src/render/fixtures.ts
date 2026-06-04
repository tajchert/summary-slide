import type { SlideDocument } from "../schema/slide";
import { blankDocument } from "../schema/slide";

export function kitchenSinkDocument(): SlideDocument {
  const doc = blankDocument();
  doc.title = "Kitchen sink";
  doc.cards = [
    { id: "stat1", type: "stat", grid: { x: 0, y: 0, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "48MP" }, caption: { text: "Fusion camera" } } },
    { id: "head1", type: "headline", grid: { x: 2, y: 0, w: 4, h: 1 },
      content: { text: { text: "Spotlight actions and quick keys",
        gradient: { from: "#ff5555", to: "#55aaff", angle: 90 } } } },
    { id: "img1", type: "image", grid: { x: 6, y: 0, w: 3, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Video Boost" }, placement: "center-pill" } } },
    { id: "icon1", type: "icon", grid: { x: 9, y: 0, w: 3, h: 2 },
      style: { background: { type: "solid", color: "#2c2c2e" } },
      content: { icon: { kind: "emoji", value: "📞" }, label: { text: "Phone" }, layout: "left" } },
    { id: "hero1", type: "hero", grid: { x: 2, y: 1, w: 4, h: 4 },
      style: { background: { type: "gradient", from: "#1a2980", to: "#26d0ce", angle: 135 } },
      content: { title: { text: "macOS" } } },
    { id: "list1", type: "list", grid: { x: 6, y: 2, w: 3, h: 3 },
      content: { title: { text: "Smart experiences" }, marker: "bullet",
        items: [{ text: "Wi-Fi 7" }, { text: "Lossless audio" }, { text: "Advanced ISP" }] } },
    { id: "stat2", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      style: { textColor: "#ffd60a" },
      content: { value: { text: "2x", size: 120 }, caption: { text: "faster CPU" } } },
    { id: "head2", type: "headline", grid: { x: 9, y: 2, w: 3, h: 2 },
      content: { text: { text: "All-day battery life", align: "center" } } },
    { id: "icon2", type: "icon", grid: { x: 0, y: 4, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "🚀" }, label: { text: "Games" }, layout: "top" } },
    { id: "img2", type: "image", grid: { x: 6, y: 5, w: 6, h: 1 },
      content: { src: "", fit: "cover" } },
    { id: "icon3", type: "icon", grid: { x: 9, y: 4, w: 3, h: 1 },
      content: { icon: { kind: "emoji", value: "📶" }, label: { text: "Wi-Fi 7" }, layout: "left" } },
    { id: "head3", type: "headline", grid: { x: 2, y: 5, w: 4, h: 1 },
      content: { text: { text: "All-new design", size: 36 } } },
  ];
  return doc;
}
