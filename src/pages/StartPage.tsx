import { Link } from "react-router";
import { listRecents } from "../lib/storage";

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
      <div className="mt-4 grid grid-cols-2 gap-6 lg:grid-cols-3" data-section="templates" />
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
