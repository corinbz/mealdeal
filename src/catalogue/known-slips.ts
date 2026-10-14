/**
 * What the morning self-checks (#37) report that was looked at and is right
 * as it is: a real price change, a difference in mapping that is meant, a
 * unit price that does not follow from the pack for a good reason. Each says
 * why, and the report names any it no longer finds, so an entry does not
 * outlive its reason.
 */

import type { KnownSlip } from "./self-checks.ts";

export const KNOWN_SLIPS: readonly KnownSlip[] = [];
