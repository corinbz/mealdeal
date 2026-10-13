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
    records,
    errors,
  };
}

export type Recorder = ReturnType<typeof createRecorder>;
