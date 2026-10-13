import { assertNoBannedFields } from "./guard.ts";

/**
 * A Chain has refused us at the edge rather than at the application. Akamai
 * answers this way, and it is the one failure we must never retry: repeating
 * a request that was just denied is how a transient block becomes a durable
 * one. The run aborts and keeps whatever it had already written.
 */
export class EdgeDenied extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(
      `Denied at the edge (HTTP ${status}). Aborting the run rather than ` +
        `retrying. Body began: ${body.slice(0, 200)}`,
    );
    this.name = "EdgeDenied";
    this.status = status;
  }
}

export class RequestFailed extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(`HTTP ${status}. Body began: ${body.slice(0, 300)}`);
    this.name = "RequestFailed";
    this.status = status;
  }
}

export interface Response {
  /**
   * The response body exactly as it arrived, unparsed. This is what gets
   * archived: Dirk returns prices as `1.5400`, and parsing to a JS number
   * would silently discard the trailing zeros the Chain chose to send. An
   * archive that has already rounded its prices is not an archive.
   */
  readonly raw: string;
  /** The same body parsed, used only to drive traversal. Never archived. */
  readonly json: unknown;
  readonly status: number;
}

export interface ClientOptions {
  readonly endpoint: string;
  readonly headers: Readonly<Record<string, string>>;
  /** Minimum gap between the start of one request and the next. */
  readonly minIntervalMs: number;
  readonly maxRetries: number;
  readonly timeoutMs: number;
}

export interface Stats {
  requests: number;
  retries: number;
  rawBytes: number;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Edge denials do not announce themselves with a tidy JSON error, so we match
 * on the shapes Akamai actually returns -- an `errors.edgesuite.net`
 * reference, an "Access Denied" page, or its bot-manager cookie names.
 */
function looksLikeEdgeDenial(status: number, body: string): boolean {
  if (status === 403) return true;
  return (
    /errors\.edgesuite\.net/i.test(body) ||
    /<title>\s*Access Denied/i.test(body) ||
    /\b_abck\b|\bbm_sz\b/.test(body)
  );
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A GraphQL client that makes one request at a time, paced.
 *
 * Both Chains' endpoints are unauthenticated and neither asked us for a key,
 * which is precisely why the traffic should stay modest and attributable: the
 * research found Dirk had left schema introspection enabled, i.e. a gateway
 * that was not hardened for public exposure and could be hardened at any
 * time. There is no concurrency option on purpose. The archiver is not in a
 * hurry -- it has all day, every day.
 *
 * Node's fetch speaks HTTP/1.1, which is load-bearing here: Jumbo's edge
 * rejected every HTTP/2 request from this machine with a stream INTERNAL_ERROR
 * while answering the identical request over HTTP/1.1. Do not "upgrade" this
 * to an HTTP/2-capable client without retesting Jumbo.
 */
export function createClient(options: ClientOptions) {
  const stats: Stats = { requests: 0, retries: 0, rawBytes: 0 };
  let chain: Promise<unknown> = Promise.resolve();
  let lastStartedAt = 0;

  async function send(
    label: string,
    query: string,
    variables: Record<string, unknown> | undefined,
  ): Promise<Response> {
    assertNoBannedFields(query, label);

    const body = JSON.stringify(
      variables === undefined ? { query } : { query, variables },
    );

    for (let attempt = 0; ; attempt++) {
      const wait = Math.max(0, lastStartedAt + options.minIntervalMs - Date.now());
      if (wait > 0) await sleep(wait);
      lastStartedAt = Date.now();

      let status = 0;
      let raw = "";
      try {
        stats.requests++;
        const response = await fetch(options.endpoint, {
          method: "POST",
          headers: { ...options.headers, "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(options.timeoutMs),
        });
        status = response.status;
        raw = await response.text();
        stats.rawBytes += raw.length;

        if (looksLikeEdgeDenial(status, raw)) throw new EdgeDenied(status, raw);

        if (!response.ok && !RETRYABLE_STATUSES.has(status)) {
          throw new RequestFailed(status, raw);
        }
        if (response.ok) {
          return { raw, json: JSON.parse(raw) as unknown, status };
        }
      } catch (error) {
        // An edge denial and a definite 4xx are both final. Everything else
        // -- timeouts, resets, 5xx, 429 -- gets backed off and retried.
        if (error instanceof EdgeDenied || error instanceof RequestFailed) throw error;
        if (attempt >= options.maxRetries) throw error;
      }

      if (attempt >= options.maxRetries) {
        throw new RequestFailed(status, raw);
      }
      stats.retries++;
      const backoff = options.minIntervalMs * 2 ** attempt + Math.random() * 500;
      await sleep(backoff);
    }
  }

  return {
    /** Queues a request behind every earlier one, so only one is ever in flight. */
    request(
      label: string,
      query: string,
      variables?: Record<string, unknown>,
    ): Promise<Response> {
      const queued = chain.then(() => send(label, query, variables));
      // Keep the queue alive even when a request rejects, so a later caller's
      // own error handling still runs in order.
      chain = queued.catch(() => undefined);
      return queued;
    },
    stats(): Stats {
      return { ...stats };
    },
  };
}

export type Client = ReturnType<typeof createClient>;
