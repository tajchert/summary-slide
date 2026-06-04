import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { nanoid } from "nanoid";
import { blankDocument } from "../schema/slide";
import { loadDoc } from "../lib/storage";
import { createEditorStore } from "./store";
import { EditorStoreContext } from "./EditorContext";
import { EditorCanvas } from "./EditorCanvas";
import { Palette } from "./Palette";
import { Inspector } from "./Inspector";
import { TopBar } from "./TopBar";

export function EditorPage() {
  const [params] = useSearchParams();
  const requestedId = params.get("d");

  const { store, corrupt } = useMemo(() => {
    if (requestedId) {
      const doc = loadDoc(requestedId);
      if (doc) return { store: createEditorStore(doc, requestedId), corrupt: false };
      return { store: createEditorStore(blankDocument(), requestedId), corrupt: true };
    }
    return { store: createEditorStore(blankDocument(), nanoid(8)), corrupt: false };
  }, [requestedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || (e.target as HTMLElement).isContentEditable) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = e.key.toLowerCase(); // caps-lock safe
      if (key === "z" && !e.shiftKey) { e.preventDefault(); store.getState().undo(); }
      if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); store.getState().redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  return (
    <EditorStoreContext.Provider value={store}>
      <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
        {corrupt && (
          <div className="bg-amber-600 px-4 py-1 text-sm">
            Couldn't load that slide (corrupt or outdated) — started fresh.
          </div>
        )}
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <aside className="w-44 shrink-0 overflow-y-auto border-r border-neutral-800" data-pane="palette">
            <Palette />
          </aside>
          <main className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-neutral-900 p-6" data-pane="canvas">
            <EditorCanvas />
          </main>
          <aside className="w-80 shrink-0 overflow-y-auto border-l border-neutral-800" data-pane="inspector">
            <Inspector />
          </aside>
        </div>
      </div>
    </EditorStoreContext.Provider>
  );
}
