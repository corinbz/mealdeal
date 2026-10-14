/**
 * The basket page's own reading of typed items, prototype/words.js, loaded
 * here so that the Ingredient mapping and the digest read words exactly as the
 * page does.
 * It is a plain browser script, not a module, because the page must still work
 * opened straight from disk, so it is evaluated rather than imported.
 */

import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

export type ComparisonUnit = "kg" | "l" | "piece";

export interface Parsed {
  readonly text: string;
  readonly noun: string;
  readonly quantity: number;
  readonly unit: ComparisonUnit;
  readonly guessed: boolean;
}

export interface Words {
  wordsOf(noun: string): string[];
  nameWords(name: string): string[];
  matches(words: readonly string[], names: readonly string[]): boolean;
  parse(text: string, tally: (words: string[]) => Record<ComparisonUnit, number>): Parsed | null;
}

const source = readFileSync(new URL("../prototype/words.js", import.meta.url), "utf8");
const context: { MealdealWords?: Words } = {};
runInNewContext(source, context);
export const words: Words = context.MealdealWords!;
