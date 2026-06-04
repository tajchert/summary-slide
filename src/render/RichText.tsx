import type { CSSProperties } from "react";
import type { RichText as RichTextValue } from "../schema/slide";
import { richTextToCss } from "./styleResolve";

interface Props {
  value: RichTextValue;
  baseStyle?: CSSProperties;
  /** Dot-path to this field in the card content, e.g. "content.value". Used by inline editing (Task 12). */
  editPath?: string;
  as?: "div" | "span";
}

export function RichText({ value, baseStyle, as: Tag = "div" }: Props) {
  return <Tag style={{ ...baseStyle, ...richTextToCss(value) }}>{value.text}</Tag>;
}
