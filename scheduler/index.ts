/**
 * The scheduler Worker's entry: the runtime treats every export here as a
 * handler, so the rest lives in dispatch.ts. See there for why it exists.
 */

import { dispatch, SCHEDULE, type Env } from "./dispatch.ts";

export default {
  async scheduled(controller: { readonly cron: string }, env: Env): Promise<void> {
    const job = SCHEDULE[controller.cron];
    if (!job) throw new Error(`No workflow for cron "${controller.cron}"`);
    if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not set: run the scheduler.yml workflow");
    await dispatch(job, env.GITHUB_TOKEN);
    console.log(`Started ${job.workflow}${job.inputs ? ` ${JSON.stringify(job.inputs)}` : ""}`);
  },
};
