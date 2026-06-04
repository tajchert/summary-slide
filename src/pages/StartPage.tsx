import { useRef, useState, useLayoutEffect } from "react";
import { Link } from "react-router";
import { listRecents } from "../lib/storage";
import { templates } from "../templates";
import { SlideRenderer } from "../render/SlideRenderer";
import type { Template } from "../templates";

function Thumb({ template }: { template: Template }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.18);

  useLayoutEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(el.clientWidth / 1920);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <Link
      key={template.id}
      to={`/edit?t=${template.id}`}
      className="group overflow-hidden rounded-xl border border-neutral-800 hover:border-neutral-500"
    >
      <div ref={cellRef} className="relative aspect-video overflow-hidden">
        <div style={{ position: "absolute", width: 1920, height: 1080 }}>
          <SlideRenderer doc={template.doc} scale={scale} />
        </div>
      </div>
      <div className="border-t border-neutral-800 px-3 py-2 text-sm text-neutral-300 group-hover:text-white">
        {template.name}
      </div>
    </Link>
  );
}

export function StartPage() {
  const recents = listRecents();
  return (
    <div className="min-h-screen bg-neutral-950 px-8 py-12 text-neutral-100">
      <h1 className="text-3xl font-bold tracking-tight">Summary Slide</h1>
      <p className="mt-1 text-neutral-400">Keynote-style feature summaries, exportable as crisp PNGs.</p>
      <div className="mt-8">
        <Link to="/edit" className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500">
          Start blank
        </Link>
      </div>
      <h2 className="mt-12 text-lg font-semibold">Templates</h2>
      <div className="mt-4 grid grid-cols-2 gap-6 lg:grid-cols-3" data-section="templates">
        {templates.map((t) => (
          <Thumb key={t.id} template={t} />
        ))}
      </div>
      {recents.length > 0 && (
        <>
          <h2 className="mt-12 text-lg font-semibold">Recent slides</h2>
          <ul className="mt-4 space-y-2">
            {recents.map((r) => (
              <li key={r.localId}>
                <Link to={`/edit?d=${r.localId}`} className="text-blue-400 hover:underline">
                  {r.title}
                </Link>
                <span className="ml-2 text-sm text-neutral-500">
                  {new Date(r.updatedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
