import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { highlightCode } from "./codeHighlight";

afterEach(cleanup);

describe("highlightCode", () => {
  it("preserves the exact source text", () => {
    const code = 'let session = LanguageModelSession()\nlet x = 42 // answer';
    const { container } = render(<pre>{highlightCode(code, "swift", "dark")}</pre>);
    expect(container.textContent).toBe(code);
  });

  it("colors keywords differently from plain text", () => {
    const { container } = render(<pre>{highlightCode("let x = 42", "swift", "dark")}</pre>);
    const spans = Array.from(container.querySelectorAll("span"));
    const keyword = spans.find((s) => s.textContent === "let");
    expect(keyword).toBeDefined();
    expect(keyword!.style.color).not.toBe("");
  });

  it("uses different palettes for light and dark mode", () => {
    const pick = (mode: "light" | "dark") => {
      const { container } = render(<pre>{highlightCode("let x = 1", "swift", mode)}</pre>);
      const kw = Array.from(container.querySelectorAll("span")).find((s) => s.textContent === "let");
      const color = kw!.style.color;
      cleanup();
      return color;
    };
    expect(pick("dark")).not.toBe(pick("light"));
  });

  it("highlights every supported language without throwing", () => {
    const samples = {
      swift: 'func greet() { print("hi") }',
      typescript: "const n: number = 1;",
      javascript: "const n = 1;",
      python: "def greet():\n    return 1",
      json: '{ "a": [1, 2] }',
      bash: "echo hello | wc -l",
    } as const;
    for (const [lang, code] of Object.entries(samples)) {
      const { container } = render(
        <pre>{highlightCode(code, lang as keyof typeof samples, "dark")}</pre>);
      expect(container.textContent).toBe(code);
      cleanup();
    }
  });
});
