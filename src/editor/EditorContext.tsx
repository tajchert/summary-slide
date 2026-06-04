import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { EditorState } from "./store";
import type { EditorStore } from "./store";

export const EditorStoreContext = createContext<EditorStore | null>(null);

export function useEditor<T>(selector: (s: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor outside EditorStoreContext");
  return useStore(store, selector);
}

export function useEditorStore(): EditorStore {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore outside EditorStoreContext");
  return store;
}
