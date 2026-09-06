import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Matches the backend's own 20s ingestion cadence (see server.ts
// POLL_INTERVAL_MS) — polling faster would just re-fetch the same data.
const POLL_INTERVAL_MS = 20_000;

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: api.getWatchlist,
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useAddSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => api.addSymbol(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useRemoveSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => api.removeSymbol(symbol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useEvidence(symbol: string | undefined) {
  return useQuery({
    queryKey: ["evidence", symbol],
    queryFn: () => api.getEvidence(symbol as string),
    enabled: Boolean(symbol),
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: api.getStatus,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: api.getHealth,
    refetchInterval: 30_000,
    retry: 1,
  });
}
