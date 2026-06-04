import { nanoid } from "nanoid";
import type { Card, CardType, GridRect } from "../schema/slide";

export function newCard(type: CardType, grid: GridRect): Card {
  const id = nanoid(8);
  switch (type) {
    case "stat": return { id, type, grid, content: {
      value: { text: "2x" }, caption: { text: "faster" } } };
    case "headline": return { id, type, grid, content: {
      text: { text: "New headline" } } };
    case "image": return { id, type, grid, content: { src: "", fit: "cover" } };
    case "icon": return { id, type, grid, content: {
      icon: { kind: "emoji", value: "✨" }, label: { text: "Feature" }, layout: "top" } };
    case "hero": return { id, type, grid, content: { title: { text: "Product" } } };
    case "list": return { id, type, grid, content: {
      title: { text: "Highlights" }, items: [{ text: "First" }, { text: "Second" }], marker: "bullet" } };
    case "iconRow": return { id, type, grid, content: {
      items: [
        { icon: { kind: "emoji", value: "📷" }, label: { text: "0.5x" } },
        { icon: { kind: "emoji", value: "📷" }, label: { text: "2x" } },
      ] } };
    case "statGroup": return { id, type, grid, content: {
      stats: [
        { prefix: { text: "Up to" }, value: { text: "16-core" }, caption: { text: "CPU" } },
        { prefix: { text: "Up to" }, value: { text: "40-core" }, caption: { text: "GPU" } },
      ], layout: "column" } };
    case "code": return { id, type, grid, content: {
      code: 'let session = LanguageModelSession()\nlet response = try await\n  session.respond(to: "Tell a joke")',
      language: "swift" } };
  }
}
