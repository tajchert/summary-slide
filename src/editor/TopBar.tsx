import { useEffect, useState } from "react";
import { useEditor, useEditorStore } from "./EditorContext";
import { quickExport } from "./quickExport";
import { saveSlide, requestHqExport } from "../lib/api";

export function TopBar() {
  const title = useEditor((s) => s.doc.title);
  const mode = useEditor((s) => s.doc.theme.mode);
  const setTitle = useEditor((s) => s.setTitle);

  // Local draft so typing doesn't push one undo entry per keystroke; commit on blur/Enter.
  const [draftTitle, setDraftTitle] = useState(title);
  useEffect(() => setDraftTitle(title), [title]); // sync on undo/redo/doc switch
  const commitTitle = () => {
    if (draftTitle !== title) setTitle(draftTitle);
  };
  const setTheme = useEditor((s) => s.setTheme);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const store = useEditorStore();
  const [exporting, setExporting] = useState(false);
  const [hqState, setHqState] = useState<"idle" | "working" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "saving" | "copied" | "error">("idle");

  const btn = "rounded-md border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800 disabled:opacity-40";

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-800 px-3">
      <a href="/" className="text-sm text-neutral-400 hover:text-white">←</a>
      <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        aria-label="Slide title"
        className="w-56 rounded bg-transparent px-2 py-1 text-sm font-medium hover:bg-neutral-900 focus:bg-neutral-900" />
      <div className="flex-1" />
      <button className={btn} onClick={undo} disabled={!canUndo} aria-label="Undo">↩</button>
      <button className={btn} onClick={redo} disabled={!canRedo} aria-label="Redo">↪</button>
      <button className={btn} aria-label="Toggle theme"
        onClick={() => setTheme({ mode: mode === "dark" ? "light" : "dark" })}>
        {mode === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>
      <button className={btn} data-action="quick-export" disabled={exporting}
        onClick={async () => {
          setExporting(true);
          try { await quickExport(store.getState().doc, 2); }
          catch (err) { console.error("Quick export failed", err); }
          finally { setExporting(false); }
        }}>
        {exporting ? "Exporting…" : "Quick PNG"}
      </button>
      <button className={`${btn} border-blue-700 bg-blue-600 hover:bg-blue-500`} data-action="hq-export"
        disabled={hqState === "working"}
        onClick={async () => {
          setHqState("working");
          try {
            const id = await saveSlide(store.getState().doc);
            const url = await requestHqExport(id, 3);
            const a = document.createElement("a");
            a.href = url;
            const safeTitle = (store.getState().doc.title || "slide").replace(/[/\\:*?"<>|]+/g, "-").trim() || "slide";
            a.download = `${safeTitle}@3x.png`;
            a.click();
            setHqState("idle");
          } catch {
            setHqState("error");
            setTimeout(() => setHqState("idle"), 4000);
          }
        }}>
        {hqState === "working" ? "Rendering…" : hqState === "error" ? "Failed — use Quick PNG" : "HQ Export"}
      </button>
      <button
        className={btn}
        data-action="share"
        disabled={shareState === "saving"}
        onClick={async () => {
          setShareState("saving");
          try {
            const id = await saveSlide(store.getState().doc);
            await navigator.clipboard.writeText(`${location.origin}/s/${id}`);
            setShareState("copied");
            setTimeout(() => setShareState("idle"), 2000);
          } catch {
            setShareState("error");
            setTimeout(() => setShareState("idle"), 3000);
          }
        }}
      >
        {shareState === "copied" ? "Link copied!" : shareState === "error" ? "Failed — retry" : "Share"}
      </button>
    </div>
  );
}
