/**
 * Starts the morning's archive on time (#2). GitHub's own cron started the
 * archive 5 hours late on 2026-10-14 and 2026-10-15, and never fired the 08:00
 * watch at all: its scheduler is best effort. Cloudflare's Cron Triggers fire
 * on the minute, so this Worker starts both runs the way a person would by
 * hand, through GitHub's workflow_dispatch API. It does nothing else: the
 * archive itself still runs on GitHub's runners or the owner's Pi (#24).
 *
 * The crons are in wrangler.toml and must match SCHEDULE.
 * See "When a morning is missed" in docs/archive.md.
 */

export const REPO = "corinbz/mealdeal";

export interface Dispatch {
  readonly workflow: string;
  readonly inputs?: Readonly<Record<string, string>>;
}

/** Which workflow each cron starts. */
export const SCHEDULE: Readonly<Record<string, Dispatch>> = {
  // 06:30 in Amsterdam in summer, 05:30 in winter: after Dirk's ~04:01 refresh.
  "30 4 * * *": { workflow: "archive.yml", inputs: { chain: "all" } },
  // Re-runs any Chain still missing or incomplete, and goes red if one is.
  "0 8 * * *": { workflow: "archive-watch.yml" },
};

export interface Env {
  /** A fine-grained token for REPO with Actions read and write, set by scheduler.yml. */
  readonly GITHUB_TOKEN?: string;
}

const ATTEMPTS = 3;

/** Starts one workflow run on main. Throws unless GitHub accepted it. */
export async function dispatch(
  job: Dispatch,
  token: string,
  fetcher: typeof fetch = fetch,
  wait: (ms: number) => Promise<unknown> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<void> {
  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${job.workflow}/dispatches`;
  let last = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetcher(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "mealdeal-scheduler",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main", inputs: job.inputs ?? {} }),
      });
      if (response.status === 204) return;
      last = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
      // A refused token or an unknown workflow will not fix itself in a minute.
      if (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 422) break;
    } catch (error) {
      last = (error as Error).message;
    }
    if (attempt < ATTEMPTS) await wait(30_000 * attempt);
  }
  throw new Error(`Could not start ${job.workflow}: ${last}`);
}
