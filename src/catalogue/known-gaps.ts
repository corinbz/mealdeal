/**
 * Ingredients a Chain really does not sell, so the coverage report (#35)
 * stops listing them. Each says why, and the report names any the Chain sells
 * after all, so an entry does not outlive its reason.
 */

import type { KnownGap } from "./coverage.ts";

export const KNOWN_GAPS: readonly KnownGap[] = [
  { chain: "aldi", ingredient: "zure room", why: "no zure room or sour cream in Aldi's range (checked 2026-10-14, #33)" },
  { chain: "aldi", ingredient: "witte bonen", why: "only witte bonen in tomatensaus, no plain ones (checked 2026-10-14, #33)" },
  { chain: "dirk", ingredient: "gehakt/half-om-half", why: "Dirk's only half-om-half is organic and filed with cold cuts (checked 2026-10-14, #33)" },
];
