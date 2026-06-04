import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { nanoid } from "nanoid";
import { blankDocument } from "../schema/slide";
import { loadDoc } from "../lib/storage";
import { createEditorStore } from "./store";
import { EditorStoreContext } from "./EditorContext";
import { EditorCanvas } from "./EditorCanvas";

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

  return (
    <EditorStoreContext.Provider value={store}>
      <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
        {corrupt && (
          <div className="bg-amber-600 px-4 py-1 text-sm">
            Couldn't load that slide (corrupt or outdated) — started fresh.
          </div>
        )}
        <div className="h-12 shrink-0 border-b border-neutral-800" data-pane="topbar" />
        <div className="flex min-h-0 flex-1">
          <aside className="w-44 shrink-0 overflow-y-auto border-r border-neutral-800" data-pane="palette" />
          <main className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-neutral-900 p-6" data-pane="canvas">
            <EditorCanvas />
          </main>
          <aside className="w-80 shrink-0 overflow-y-auto border-l border-neutral-800" data-pane="inspector" />
        </div>
      </div>
    </EditorStoreContext.Provider>
  );
}
