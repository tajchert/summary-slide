import { Link } from "react-router";

export function NotFoundPage({ message = "Page not found" }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-neutral-100">
      <p className="text-xl">{message}</p>
      <Link to="/" className="mt-4 text-blue-400 hover:underline">Back to start</Link>
    </div>
  );
}
