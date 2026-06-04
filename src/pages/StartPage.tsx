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

function GitHubLink() {
  return (
    <a
      href="https://github.com/tajchert/summary-slide"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View source on GitHub"
      title="View source on GitHub"
      className="text-neutral-500 transition-colors hover:text-white"
    >
      <svg viewBox="0 0 16 16" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    </a>
  );
}

export function StartPage() {
  const recents = listRecents();
  return (
    <div className="min-h-screen bg-neutral-950 px-8 py-12 text-neutral-100">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Summary Slide</h1>
        <GitHubLink />
      </div>
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
