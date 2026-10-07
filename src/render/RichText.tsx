import { useContext } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { RichText as RichTextValue } from "../schema/slide";
import { richTextToCss, SLIDE_SERIF_FONT_FAMILY } from "./styleResolve";
import { parseEmphasis } from "./emphasis";
import { InlineEditContext, InlineEditCardContext } from "../editor/EditorContext";
import { EditableText } from "../editor/EditableText";

interface Props {
  value: RichTextValue;
  baseStyle?: CSSProperties;
  /** Dot-path to this field in the card content, e.g. "content.value". Used by inline editing (Task 12). */
  editPath?: string;
  as?: "div" | "span";
}

// Weight 400 + no tracking: the serif italic is a contrast face, never bold/tight.
const SERIF_ITALIC: CSSProperties = {
  fontFamily: SLIDE_SERIF_FONT_FAMILY, fontStyle: "italic", fontWeight: 400, letterSpacing: 0,
};

function renderText(value: RichTextValue): ReactNode {
  if (value.emphasis !== "serif-italic") return value.text;
  return parseEmphasis(value.text).map((seg, i) =>
    seg.em ? <em key={i} style={SERIF_ITALIC}>{seg.text}</em> : seg.text);
}

export function RichText({ value, baseStyle, editPath, as: Tag = "div" }: Props) {
  const commit = useContext(InlineEditContext);
  const cardId = useContext(InlineEditCardContext);
  const style = { ...baseStyle, ...richTextToCss(value) };
  if (commit && cardId && editPath) {
    // Editing shows the raw string (markers included); display shows the styled runs.
    return (
      <Tag style={style}>
        <EditableText text={value.text} display={renderText(value)}
          onCommit={(text) => commit(cardId, editPath, text)} />
      </Tag>
    );
  }
  return <Tag style={style}>{renderText(value)}</Tag>;
}
