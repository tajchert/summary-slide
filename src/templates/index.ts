import type { SlideDocument } from "../schema/slide";
import { kitchenSinkDocument } from "../render/fixtures";

export interface Template { id: string; name: string; doc: SlideDocument }

const appleBentoDark: SlideDocument = {
  version: 1,
  title: "Apple Bento Dark",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "dark", accent: "#0a84ff",
    background: { type: "solid", color: "#000000" },
    cardStyle: { radius: 28, gap: 14 },
  },
  cards: [
    // No background overrides here: cards must follow the theme so light/dark
    // switching works. Overrides are only safe when paired with a textColor.
    { id: "t1-hero", type: "hero", grid: { x: 4, y: 0, w: 4, h: 6 },
      content: { title: { text: "iPhone", size: 130 } } },
    { id: "t1-img1", type: "image", grid: { x: 0, y: 0, w: 2, h: 2 },
      content: { src: "", fit: "cover", overlay: { text: { text: "Four colors" }, placement: "corner" } } },
    { id: "t1-stat1", type: "stat", grid: { x: 2, y: 0, w: 2, h: 2 },
      content: { value: { text: "A19", gradient: { from: "#5af", to: "#a5f", angle: 90 } },
        caption: { text: "Pro chip" } } },
    { id: "t1-stat2", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      content: { value: { text: "48MP" }, caption: { text: "Fusion camera system" } } },
    { id: "t1-stat3", type: "stat", grid: { x: 2, y: 2, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "3x" }, caption: { text: "better scratch resistance" } } },
    { id: "t1-icon1", type: "icon", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { icon: { kind: "emoji", value: "🔋" }, label: { text: "All-day battery life" }, layout: "left" } },
    { id: "t1-img2", type: "image", grid: { x: 8, y: 0, w: 4, h: 2 },
      content: { src: "", fit: "cover", overlay: { text: { text: "Center Stage camera" }, placement: "corner" } } },
    { id: "t1-stat4", type: "stat", grid: { x: 8, y: 2, w: 2, h: 2 },
      content: { value: { text: "80%" }, caption: { text: "recycled titanium" } } },
    { id: "t1-stat5", type: "stat", grid: { x: 10, y: 2, w: 2, h: 2 },
      content: { value: { text: "120Hz" }, caption: { text: "ProMotion" } } },
    { id: "t1-head1", type: "headline", grid: { x: 8, y: 4, w: 4, h: 2 },
      content: { text: { text: "6.5″ Super Retina XDR display", size: 38 } } },
  ],
};

const pixelLight: SlideDocument = {
  version: 1,
  title: "Pixel Light",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "light", accent: "#1a73e8",
    background: { type: "solid", color: "#d7e3f1" },
    cardStyle: { radius: 24, gap: 16 },
  },
  cards: [
    // No background overrides (see Apple Bento note above): cards follow the
    // theme tokens so the light/dark toggle restyles the whole slide.
    { id: "t2-hero", type: "hero", grid: { x: 4, y: 2, w: 4, h: 2 },
      content: { title: { text: "Pixel 8 Pro", size: 84, weight: 500 } } },
    { id: "t2-img1", type: "image", grid: { x: 0, y: 0, w: 4, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Video Boost" }, placement: "center-pill" } } },
    { id: "t2-stat1", type: "stat", grid: { x: 4, y: 0, w: 3, h: 2 },
      content: { value: { text: "New", size: 64 }, caption: { text: "temperature sensor" } } },
    { id: "t2-img2", type: "image", grid: { x: 7, y: 0, w: 5, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Soft-touch matte finish" }, placement: "corner" } } },
    { id: "t2-stat2", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      content: { value: { text: "G3" }, caption: { text: "Google Tensor" } } },
    { id: "t2-stat3", type: "stat", grid: { x: 2, y: 2, w: 2, h: 2 },
      content: { value: { text: "2400", size: 76 }, caption: { text: "nits peak brightness" } } },
    { id: "t2-icon1", type: "icon", grid: { x: 8, y: 2, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "📶" }, label: { text: "Wi-Fi 7" }, layout: "top" } },
    { id: "t2-icon2", type: "icon", grid: { x: 10, y: 2, w: 2, h: 2 },
      content: { icon: { kind: "emoji", value: "⚡" }, label: { text: "30W Fast Charging" }, layout: "top" } },
    { id: "t2-head1", type: "headline", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { text: { text: "Fully upgraded pro-camera system", align: "left", size: 40 } } },
    { id: "t2-head2", type: "headline", grid: { x: 4, y: 4, w: 4, h: 2 },
      content: { text: { text: "Built for generative AI", size: 40 } } },
    { id: "t2-img3", type: "image", grid: { x: 8, y: 4, w: 4, h: 2 },
      content: { src: "", fit: "cover",
        overlay: { text: { text: "Pro Controls" }, placement: "center-pill" } } },
  ],
};

const specSheetDark: SlideDocument = {
  version: 1,
  title: "Spec Sheet Dark",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "dark", accent: "#e8483f",
    background: { type: "gradient", from: "#1a0a0e", to: "#2b0f14", angle: 160 },
    cardStyle: { radius: 18, gap: 14 },
  },
  cards: [
    { id: "t3-hero", type: "hero", grid: { x: 0, y: 0, w: 3, h: 2 },
      // textColor must accompany the override (gotcha #3): the dark gradient
      // stays dark when the theme flips to light, so the text must stay white.
      style: { background: { type: "gradient", from: "#3a1015", to: "#1a0a0e", angle: 135 },
        textColor: "#ffffff" },
      content: { title: { text: "Performance Reborn", size: 56,
        gradient: { from: "#ff6a5e", to: "#ffd2cd", angle: 90 } } } },
    { id: "t3-stat1", type: "stat", grid: { x: 3, y: 0, w: 3, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "2x", color: "#e8483f" },
        caption: { text: "faster CPU vs x86" } } },
    { id: "t3-stat2", type: "stat", grid: { x: 6, y: 0, w: 3, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "2x", color: "#e8483f" },
        caption: { text: "faster GPU" } } },
    { id: "t3-stat3", type: "stat", grid: { x: 9, y: 0, w: 3, h: 2 },
      content: { value: { text: "4nm" }, caption: { text: "process node" } } },
    { id: "t3-stat4", type: "stat", grid: { x: 0, y: 2, w: 3, h: 2 },
      content: { value: { text: "13B+", color: "#e8483f" }, caption: { text: "on-device AI parameters" } } },
    { id: "t3-stat5", type: "stat", grid: { x: 3, y: 2, w: 3, h: 2 },
      content: { value: { text: "75 TOPS" }, caption: { text: "total AI performance" } } },
    { id: "t3-stat6", type: "stat", grid: { x: 6, y: 2, w: 3, h: 2 },
      content: { value: { text: "136GB/s" }, caption: { text: "memory bandwidth" } } },
    { id: "t3-stat7", type: "stat", grid: { x: 9, y: 2, w: 3, h: 2 },
      content: { value: { text: "68%", color: "#e8483f" }, caption: { text: "less power vs competition" } } },
    { id: "t3-list1", type: "list", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { title: { text: "Smart user experiences" }, marker: "bullet",
        items: [{ text: "Lightning-fast 5G | Wi-Fi 7" }, { text: "Immersive lossless audio" },
          { text: "Advanced camera ISP" }] } },
    { id: "t3-list2", type: "list", grid: { x: 4, y: 4, w: 4, h: 2 },
      content: { title: { text: "Built for AI" }, marker: "bullet",
        items: [{ text: "30 tokens/sec on-device" }, { text: "Micro NPU sensing hub" },
          { text: "Chip-to-cloud security" }] } },
    { id: "t3-head1", type: "headline", grid: { x: 8, y: 4, w: 4, h: 2 },
      content: { text: { text: "Leading PC performance per watt", size: 42 } } },
  ],
};

const launchLight: SlideDocument = {
  version: 1,
  title: "Launch Light",
  canvas: { format: "16:9", width: 1920, height: 1080 },
  theme: {
    mode: "light", accent: "#0a84ff",
    background: { type: "solid", color: "#ffffff" },
    cardStyle: { radius: 26, gap: 16 },
  },
  cards: [
    { id: "t4-hero", type: "hero", grid: { x: 4, y: 1, w: 4, h: 4 },
      content: { title: { text: "Mac mini", size: 110 } } },
    { id: "t4-stat1", type: "stat", grid: { x: 0, y: 0, w: 2, h: 2 },
      content: { value: { text: "5″", size: 88 }, caption: { text: "new compact design" } } },
    { id: "t4-head1", type: "headline", grid: { x: 2, y: 0, w: 2, h: 1 },
      content: { text: { text: "macOS Sequoia", size: 32,
        gradient: { from: "#0a84ff", to: "#a55eea", angle: 90 } } } },
    { id: "t4-head2", type: "headline", grid: { x: 8, y: 0, w: 4, h: 1 },
      content: { text: { text: "Apple Intelligence", size: 36,
        gradient: { from: "#f55", to: "#5af", angle: 90 } } } },
    { id: "t4-stat2", type: "stat", grid: { x: 2, y: 1, w: 2, h: 1 },
      content: { value: { text: "⚡ TB5", size: 40 }, caption: { text: "Thunderbolt 5" } } },
    { id: "t4-stat3", type: "stat", grid: { x: 0, y: 2, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "64GB" }, caption: { text: "unified memory" } } },
    { id: "t4-stat4", type: "stat", grid: { x: 2, y: 2, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "8TB" }, caption: { text: "SSD storage" } } },
    // size 60 keeps "14-core"/"20-core" on a single line in a 2-col cell
    { id: "t4-stat5", type: "stat", grid: { x: 8, y: 1, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "14-core", size: 60 }, caption: { text: "CPU" } } },
    { id: "t4-stat6", type: "stat", grid: { x: 10, y: 1, w: 2, h: 2 },
      content: { prefix: { text: "Up to" }, value: { text: "20-core", size: 60 }, caption: { text: "GPU" } } },
    { id: "t4-head3", type: "headline", grid: { x: 0, y: 4, w: 4, h: 2 },
      content: { text: { text: "First carbon neutral Mac", size: 44 } } },
    { id: "t4-icon1", type: "icon", grid: { x: 8, y: 3, w: 4, h: 2 },
      content: { icon: { kind: "emoji", value: "🖥" }, label: { text: "Works with a variety of displays and accessories" }, layout: "left" } },
    { id: "t4-icon2", type: "icon", grid: { x: 8, y: 5, w: 4, h: 1 },
      content: { icon: { kind: "emoji", value: "🔌" }, label: { text: "Ethernet · HDMI · 3x Thunderbolt" }, layout: "left" } },
    // fills the strip above the hero (x4–7, y0)
    { id: "t4-head4", type: "headline", grid: { x: 4, y: 0, w: 4, h: 1 },
      content: { text: { text: "M4 and M4 Pro", size: 36 } } },
    // fills the strip below the hero (x4–7, y5)
    { id: "t4-icon3", type: "icon", grid: { x: 4, y: 5, w: 4, h: 1 },
      content: { icon: { kind: "emoji", value: "🖥" }, label: { text: "Supports up to three 6K displays" }, layout: "left" } },
  ],
};

export const templates: Template[] = [
  { id: "apple-bento-dark", name: "Apple Bento Dark", doc: appleBentoDark },
  { id: "pixel-light", name: "Pixel Light", doc: pixelLight },
  { id: "spec-sheet-dark", name: "Spec Sheet Dark", doc: specSheetDark },
  { id: "launch-light", name: "Launch Light", doc: launchLight },
  { id: "everything", name: "Everything (QA)", doc: kitchenSinkDocument() },
];
