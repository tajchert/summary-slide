import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { SlideDocument } from "../schema/slide";
import { slideDocumentSchema } from "../schema/slide";
import { fetchSlide } from "../lib/api";
import { SlideRenderer } from "../render/SlideRenderer";

export function RenderPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<SlideDocument | null>(null);

  useEffect(() => {
    if (!id) return;
    // Parity with SharePage: validate + never hang silently. On failure the export
    // worker's waitForSelector times out and returns its 502 — no render-ready signal.
    fetchSlide(id)
      .then((d) => {
        const parsed = d ? slideDocumentSchema.safeParse(d) : null;
        setDoc(parsed?.success ? parsed.data : null);
      })
      .catch(() => setDoc(null));
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    (async () => {
      await document.fonts?.ready;
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.onload = () => res();
                img.onerror = () => res();
              })
        )
      );
      document.body.setAttribute("data-render-ready", "true");
    })();
  }, [doc]);

  if (!doc) return null;
  return (
    <div style={{ width: doc.canvas.width, height: doc.canvas.height, overflow: "hidden" }}>
      <SlideRenderer doc={doc} />
    </div>
  );
}
