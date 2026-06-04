import { useContext } from "react";
import type { CSSProperties } from "react";
import type { RichText as RichTextValue } from "../schema/slide";
import { richTextToCss } from "./styleResolve";
import { InlineEditContext, InlineEditCardContext } from "../editor/EditorContext";
import { EditableText } from "../editor/EditableText";

interface Props {
  value: RichTextValue;
  baseStyle?: CSSProperties;
  /** Dot-path to this field in the card content, e.g. "content.value". Used by inline editing (Task 12). */
  editPath?: string;
  as?: "div" | "span";
}

export function RichText({ value, baseStyle, editPath, as: Tag = "div" }: Props) {
  const commit = useContext(InlineEditContext);
  const cardId = useContext(InlineEditCardContext);
  const style = { ...baseStyle, ...richTextToCss(value) };
  if (commit && cardId && editPath) {
    return (
      <Tag style={style}>
        <EditableText text={value.text} onCommit={(text) => commit(cardId, editPath, text)} />
      </Tag>
    );
  }
  return <Tag style={style}>{value.text}</Tag>;
}
