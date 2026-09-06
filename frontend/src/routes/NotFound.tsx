import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">Page not found</h1>
      <Link to="/" className="mt-4 text-sm font-medium text-accent">
        Back to watchlist
      </Link>
    </div>
  );
}
