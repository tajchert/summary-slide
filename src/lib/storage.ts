import { slideDocumentSchema } from "../schema/slide";
import type { SlideDocument } from "../schema/slide";

const DOC_PREFIX = "summary-slide:doc:";
const RECENTS_KEY = "summary-slide:recents";

export interface RecentEntry { localId: string; title: string; updatedAt: number }

export function saveDoc(localId: string, doc: SlideDocument): void {
  localStorage.setItem(DOC_PREFIX + localId, JSON.stringify(doc));
  const recents = listRecents().filter((r) => r.localId !== localId);
  recents.unshift({ localId, title: doc.title, updatedAt: Date.now() });
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, 20)));
}

/** Returns null for missing or corrupt/outdated docs (caller offers "start fresh"). */
export function loadDoc(localId: string): SlideDocument | null {
  const raw = localStorage.getItem(DOC_PREFIX + localId);
  if (!raw) return null;
  try {
    const parsed = slideDocumentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function listRecents(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]") as RecentEntry[];
  } catch {
    return [];
  }
}
