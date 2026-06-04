import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { nanoid } from "nanoid";
import type { SlideDocument } from "../schema/slide";
import { slideDocumentSchema } from "../schema/slide";
import { fetchSlide } from "../lib/api";
import { saveDoc } from "../lib/storage";
import { SlideRenderer } from "../render/SlideRenderer";
import { NotFoundPage } from "./NotFoundPage";

export function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<SlideDocument | null | "loading">("loading");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);

  // Compute a stable local id once; doc is written on Link click, not during render.
  const localId = useMemo(() => nanoid(8), []);

  useEffect(() => {
    if (!id) return;
    fetchSlide(id).then((d) => {
      const parsed = d ? slideDocumentSchema.safeParse(d) : null;
      setDoc(parsed?.success ? parsed.data : null);
    });
  }, [id]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || doc === "loading" || !doc) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / doc.canvas.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  if (doc === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Loading…
      </div>
    );
  }
  if (!doc) return <NotFoundPage message="Slide not found" />;

  return (
    <div className="min-h-screen bg-neutral-950 px-8 py-10 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{doc.title}</h1>
          <Link
            to={`/edit?d=${localId}`}
            onClick={() => saveDoc(localId, structuredClone(doc))}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Open in editor
          </Link>
        </div>
        <div
          ref={wrapRef}
          className="overflow-hidden rounded-xl"
          style={{ aspectRatio: "16 / 9" }}
        >
          <SlideRenderer doc={doc} scale={scale} />
        </div>
      </div>
    </div>
  );
}
