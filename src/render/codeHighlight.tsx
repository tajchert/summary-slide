import type { ReactNode } from "react";
import Prism from "prismjs";
// Grammar side-effect imports. Core already ships markup/css/clike/javascript;
// swift + typescript extend clike/javascript respectively.
import "prismjs/components/prism-swift";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

// Prevent Prism from auto-highlighting the document on load (we only tokenize).
Prism.manual = true;

export type CodeLanguage = "swift" | "typescript" | "javascript" | "python" | "json" | "bash";

/**
 * Token-type → inline color, per theme mode (Xcode-inspired). Inline styles — never a
 * Prism CSS theme — so the editor canvas, share preview, headless export and Quick PNG
 * capture all render identically through the single render path.
 */
const TOKEN_COLORS: Record<"light" | "dark", Record<string, string>> = {
  dark: {
    keyword: "#ff7ab2", string: "#ff8170", number: "#d0bf69", boolean: "#ff7ab2",
    comment: "#7f8c98", function: "#67b7a4", "class-name": "#d0a8ff", builtin: "#d0a8ff",
    operator: "#a8b3c0", punctuation: "#a8b3c0", property: "#6bdfff", constant: "#6bdfff",
  },
  light: {
    keyword: "#ad3da4", string: "#d12f1b", number: "#272ad8", boolean: "#ad3da4",
    comment: "#707f8c", function: "#3e8087", "class-name": "#703daa", builtin: "#703daa",
    operator: "#56636f", punctuation: "#56636f", property: "#0f68a0", constant: "#0f68a0",
  },
};

type PrismToken = string | Prism.Token;

function tokenColor(token: Prism.Token, colors: Record<string, string>): string | undefined {
  if (colors[token.type]) return colors[token.type];
  const aliases = Array.isArray(token.alias) ? token.alias : token.alias ? [token.alias] : [];
  for (const a of aliases) if (colors[a]) return colors[a];
  return undefined;
}

function renderTokens(tokens: PrismToken[], colors: Record<string, string>, keyPrefix = ""): ReactNode[] {
  return tokens.map((tok, i) => {
    if (typeof tok === "string") return tok;
    const color = tokenColor(tok, colors);
    const inner: PrismToken[] = Array.isArray(tok.content)
      ? (tok.content as PrismToken[])
      : [tok.content as PrismToken];
    return (
      <span key={`${keyPrefix}${i}`} style={color ? { color } : undefined}>
        {renderTokens(inner, colors, `${keyPrefix}${i}-`)}
      </span>
    );
  });
}

/** Synchronous Prism tokenize → inline-styled React spans. Falls back to plain text. */
export function highlightCode(code: string, language: CodeLanguage, mode: "light" | "dark"): ReactNode {
  const grammar = Prism.languages[language];
  if (!grammar) return code;
  return renderTokens(Prism.tokenize(code, grammar), TOKEN_COLORS[mode]);
}
