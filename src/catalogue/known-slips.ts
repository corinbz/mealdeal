/**
 * What the morning self-checks (#37) report that was looked at and is right
 * as it is: a real price change, a difference in mapping that is meant, a
 * unit price that does not follow from the pack for a good reason. Each says
 * why, and the report names any it no longer finds, so an entry does not
 * outlive its reason.
 */

import type { KnownSlip } from "./self-checks.ts";

export const KNOWN_SLIPS: readonly KnownSlip[] = [
  { check: "unit", chain: "aldi", ref: "1226434", why: "Verse spareribs, ca. 600 g: weighed, so Aldi's price per kg stands over the stated weight's (checked 2026-10-14, #37)" },
  { check: "unit", chain: "jumbo", ref: "747038KGR", why: "Cheddar ca. 125 g: weighed, so Jumbo's price per kg stands over the stated weight's (checked 2026-10-14, #37)" },
];
