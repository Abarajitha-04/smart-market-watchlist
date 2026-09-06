import { ProviderError, type MarketDataProvider, type Quote } from "../types.js";

/**
 * Real data source. Deliberately isolated behind the same interface as
 * MockProvider so business logic never talks to a vendor-specific shape —
 * see decision log: "Never scatter vendor-specific API calls through
 * business logic."
 *
 * Symbol format: plain symbols ("AAPL", "MSFT") are assumed US exchanges,
 * which is Twelve Data's default. Indian (and other non-US) equities need
 * an explicit exchange, so we accept "SYMBOL:EXCHANGE" (e.g.
 * "RELIANCE:NSE", "TCS:BSE") as the watchlist symbol string — that full
 * string is also what's stored as the symbol key everywhere else in the
 * system, so a stock is never ambiguous between exchanges.
 */
export class TwelveDataProvider implements MarketDataProvider {
  readonly name = "twelvedata";

  constructor(private apiKey: string, private baseUrl = "https://api.twelvedata.com") {}

  private parseSymbol(symbol: string): { ticker: string; exchange?: string } {
    const [ticker, exchange] = symbol.split(":");
    return exchange ? { ticker, exchange } : { ticker };
  }

  async fetchQuote(symbol: string): Promise<Quote> {
    const { ticker, exchange } = this.parseSymbol(symbol);
    const params = new URLSearchParams({ symbol: ticker, apikey: this.apiKey });
    if (exchange) params.set("exchange", exchange);
    const url = `${this.baseUrl}/quote?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        throw new ProviderError(`Twelve Data timed out for ${symbol}`, "TIMEOUT");
      }
      throw new ProviderError(`Twelve Data request failed for ${symbol}: ${String(err)}`, "UPSTREAM");
    }

    if (res.status === 429) {
      throw new ProviderError("Twelve Data rate limit hit", "RATE_LIMIT");
    }
    if (!res.ok) {
      throw new ProviderError(`Twelve Data returned ${res.status} for ${symbol}`, "UPSTREAM");
    }

    const body = await res.json().catch(() => {
      throw new ProviderError(`Twelve Data returned malformed JSON for ${symbol}`, "MALFORMED");
    });

    if (body?.status === "error" || body?.code === 404) {
      throw new ProviderError(`Unknown symbol: ${symbol} (${body?.message ?? "no message"})`, "NOT_FOUND");
    }

    const price = Number(body.close ?? body.price);
    const volume = Number(body.volume ?? 0);

    if (!Number.isFinite(price) || price <= 0) {
      // Never let a zero/negative/missing price corrupt the baseline —
      // reject the write, caller keeps last-known-good.
      throw new ProviderError(`Twelve Data returned invalid price for ${symbol}: ${body.close}`, "MALFORMED");
    }

    // Twelve Data's `timestamp` is exchange time (seconds since epoch).
    const sourceTimestamp = body.timestamp
      ? new Date(Number(body.timestamp) * 1000).toISOString()
      : new Date().toISOString();

    return {
      // Store the full "SYMBOL:EXCHANGE" form the user added, not just the
      // bare ticker — keeps NSE RELIANCE and any future US RELIANCE (if it
      // existed) from colliding under the same symbol key.
      symbol,
      price,
      volume: Number.isFinite(volume) ? volume : 0,
      sourceTimestamp,
      source: "twelvedata",
    };
  }
}
