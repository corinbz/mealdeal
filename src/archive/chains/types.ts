import type { Client } from "../http.ts";
import type { ArchivedResponse, Sink } from "../sink.ts";

export interface RunContext {
  readonly client: Client;
  readonly sink: Sink;
  /** Dirk prices are per-Store, so every Chain run takes the Stores to cover. */
  readonly storeIds: readonly number[];
  /** Cap on product steps, for smoke-testing without walking a catalogue. */
  readonly maxProductSteps: number | undefined;
  readonly log: (message: string) => void;
}

export interface Chain {
  readonly name: string;
  readonly endpoint: string;
  readonly headers: Readonly<Record<string, string>>;
  run(context: RunContext): Promise<void>;
}

/**
 * Accumulates request/response pairs for one step.
 *
 * GraphQL errors are archived rather than thrown away. A validation error is
 * itself a fact about the Chain's schema on a given day -- it is how we would
 * learn that a field we depend on has been renamed -- and the step is marked
 * failed in the manifest so the run reports it without losing the evidence.
 */
export function createRecorder(client: Client) {
  const records: ArchivedResponse[] = [];
  const errors: string[] = [];

  return {
    async request(
      label: string,
      query: string,
      variables?: Record<string, unknown>,
    ): Promise<unknown> {
      const response = await client.request(label, query, variables);
      records.push({
        seq: records.length,
        at: new Date().toISOString(),
        label,
        variables,
        status: response.status,
        body: response.raw,
      });

      const payload = response.json as { errors?: { message?: string }[] } | null;
      if (payload?.errors?.length) {
        const message = payload.errors
          .map((e) => e.message ?? "unknown")
          .join("; ");
        errors.push(`${label}: ${message}`);
      }
      return response.json;
    },
    /**
     * A GET, archived with its query parameters in place of variables. A JSON
     * endpoint has no GraphQL errors to collect; the Chain's run decides what
     * an unusable answer looks like and notes it as the step's failure.
     */
    async get(
      label: string,
      path: string,
      params: Readonly<Record<string, string | number>> = {},
    ): Promise<unknown> {
      const response = await client.get(path, params);
      records.push({
        seq: records.length,
        at: new Date().toISOString(),
        label,
        variables: { path, ...params },
        status: response.status,
        body: response.raw,
      });
      return response.json;
    },
    /** A JSON POST, archived with the body sent in place of variables. */
    async post(label: string, path: string, body: Record<string, unknown>): Promise<unknown> {
      const response = await client.post(path, body);
      records.push({
        seq: records.length,
        at: new Date().toISOString(),
        label,
        variables: { path, ...body },
        status: response.status,
        body: response.raw,
      });
      return response.json;
    },
    records,
    errors,
  };
}

export type Recorder = ReturnType<typeof createRecorder>;
