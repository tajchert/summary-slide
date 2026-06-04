import type { SlideDocument } from "../schema/slide";

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json().catch(() => null) as { error?: string })?.error ?? "Upload failed");
  return ((await res.json()) as { url: string }).url;
}

export async function saveSlide(doc: SlideDocument): Promise<string> {
  const res = await fetch("/api/slides", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error("Save failed");
  return ((await res.json()) as { id: string }).id;
}

export async function fetchSlide(id: string): Promise<SlideDocument | null> {
  const res = await fetch(`/api/slides/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as SlideDocument;
}

export async function requestHqExport(id: string, scale: number): Promise<string> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, scale }),
  });
  if (!res.ok) throw new Error("Export failed");
  return ((await res.json()) as { url: string }).url;
}
