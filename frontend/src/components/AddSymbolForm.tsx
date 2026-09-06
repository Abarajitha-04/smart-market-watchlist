import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { useAddSymbol } from "@/hooks/useWatchlist";
import { ApiError } from "@/lib/api";

export function AddSymbolForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addSymbol = useAddSymbol();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;
    setError(null);

    addSymbol.mutate(symbol, {
      onSuccess: () => setValue(""),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          setError(`${symbol} is already on your watchlist.`);
        } else if (err instanceof ApiError && err.status === 400) {
          setError("That doesn't look like a valid symbol.");
        } else {
          setError("Couldn't add that symbol — check your connection and try again.");
        }
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a symbol — AAPL, RELIANCE:NSE..."
          className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 font-mono text-sm text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          maxLength={20}
        />
      </div>
      <button
        type="submit"
        disabled={addSymbol.isPending || !value.trim()}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {addSymbol.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add
      </button>
      {error && <p className="text-xs text-tier-high sm:ml-2">{error}</p>}
    </form>
  );
}
