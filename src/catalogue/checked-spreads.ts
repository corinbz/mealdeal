/**
 * Differences between Chains over SPREAD_CHECK (prototype/resolve.js) that
 * were looked at and found real. Until one is listed here, Bladeren holds it
 * back under "Nog niet gecontroleerd" and the morning coverage report names
 * it: such a difference is more often a wrong match or a slipped unit than a
 * bargain.
 *
 * An entry names the Product that is cheapest, not the Ingredient, so when
 * another Product becomes the cheapest it is unchecked again. The report says
 * when an entry no longer applies to anything, so it can go.
 */

import type { CheckedSpread } from "./spreads.ts";

export const CHECKED_SPREADS: readonly CheckedSpread[] = [];
