export interface Quote {
  symbol: string;
  price: number;
  volume: number;
  /** Exchange/source event time — NOT ingestion time. */
  sourceTimestamp: string; // ISO
  source: string;
}

export interface MarketDataProvider {
  readonly name: string;
  fetchQuote(symbol: string): Promise<Quote>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: "RATE_LIMIT" | "TIMEOUT" | "MALFORMED" | "UPSTREAM" | "NOT_FOUND"
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
