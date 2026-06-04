import type { Card, SlideDocument } from "../../schema/slide";
import { SLIDE_MONO_FONT_FAMILY } from "../styleResolve";
import { RichText } from "../RichText";
import { highlightCode } from "../codeHighlight";

type CodeCardType = Extract<Card, { type: "code" }>;

export function CodeCard({ card, theme }: { card: CodeCardType; theme: SlideDocument["theme"] }) {
  const { code, language, title } = card.content;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: 16, padding: 32 }}>
      {code ? (
        // Uncolored tokens (whitespace, unmatched punctuation) inherit `color`
        // from the card wrapper set by resolveCardStyle — keep that cascade intact.
        <pre style={{ margin: 0, fontFamily: SLIDE_MONO_FONT_FAMILY, fontSize: 24,
          lineHeight: 1.5, whiteSpace: "pre-wrap", overflow: "hidden", maxWidth: "100%" }}>
          {highlightCode(code, language, theme.mode)}
        </pre>
      ) : (
        <div style={{ fontSize: 28, opacity: 0.4 }}>Add code</div>
      )}
      {title && <RichText value={title} editPath="content.title"
        baseStyle={{ fontSize: 28, fontWeight: 600, textAlign: "center" }} />}
    </div>
  );
}
