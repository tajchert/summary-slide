import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface Props {
  text: string;
  style?: CSSProperties;
  onCommit: (text: string) => void;
}

/** Double-click to edit in place. className "editable-text" is RGL's draggableCancel. */
export function EditableText({ text, style, onCommit }: Props) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  // cancelled flag: set on Escape so the blur handler does not commit
  const cancelled = useRef(false);

  // Focus the freshly-mounted editing span and place the caret at the end.
  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [editing]);

  if (!editing) {
    return (
      <span
        key="display"
        // Share the "editable-text" class so RGL's draggableCancel keeps the
        // text from starting a card drag — otherwise the drag handler swallows
        // the dblclick that enters edit mode.
        className="editable-text"
        style={style}
        contentEditable={false}
        suppressContentEditableWarning
        onDoubleClick={() => { cancelled.current = false; setEditing(true); }}
      >
        {text}
      </span>
    );
  }
  return (
    <span
      key="editing"
      ref={ref}
      className="editable-text"
      contentEditable
      suppressContentEditableWarning
      style={{ ...style, outline: "1px dashed rgba(255,255,255,0.5)", cursor: "text" }}
      onBlur={() => {
        setEditing(false);
        if (!cancelled.current) {
          onCommit(ref.current?.textContent ?? "");
        }
        cancelled.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelled.current = true;
          setEditing(false);
        }
        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); }
      }}
    >
      {text}
    </span>
  );
}
