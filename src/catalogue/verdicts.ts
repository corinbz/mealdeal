/**
 * Verdicts: which Ingredient a Product is, or that it is none, found by a
 * person looking at it (scripts/check-mappings.ts). A Verdict outranks what
 * the Product's name, shelf and twins say (mapping.ts), lends its Ingredient
 * to its twins as any mapping does, and teaches the classifier, which learns
 * from what the catalogue ends up with. The second opinions stop listing a
 * Product once it has one.
 *
 * Verdicts on Products drawn at random ("sample") are the Gold Set: how often
 * the vocabulary alone, and the classifier, agree with them says how often
 * each is right. Those on Products picked because something looked wrong
 * ("opinion", "report") say nothing of that: they were picked for being hard.
 *
 * The file is data the checking script writes, one Verdict a line; it is
 * reviewed and committed like code.
 */

import { readFileSync, writeFileSync } from "node:fs";

/** Why a Product was looked at: drawn at random, listed by a second opinion, or reported by a shopper (Klopt niet). */
export type VerdictSource = "sample" | "opinion" | "report";

export interface Verdict {
  readonly chain: string;
  readonly ref: string;
  /**
   * Its name when it was looked at. A Verdict holds only while the name is
   * the same, so a Chain reusing a ref, or renaming a Product, has it looked
   * at again rather than given an Ingredient meant for another.
   */
  readonly name: string;
  /** The Ingredient it is, or null for none. */
  readonly is: string | null;
  readonly from: VerdictSource;
  /** The day it was looked at. */
  readonly on: string;
  /**
   * What the person wanted fixed beyond this Product, such as an Ingredient
   * the vocabulary lacks; taken off once the vocabulary is fixed.
   */
  readonly note?: string;
}

export const VERDICTS_FILE = new URL("./verdicts.json", import.meta.url);

/** Names compared as a person reads them: case and spacing aside. */
export const sameName = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, " ").trim() === b.toLowerCase().replace(/\s+/g, " ").trim();

export function readVerdicts(file: URL | string = VERDICTS_FILE): Verdict[] {
  return JSON.parse(readFileSync(file, "utf8")) as Verdict[];
}

/** As the file keeps them: by Chain and ref, one a line, so a diff shows each one added. */
export function verdictsJson(verdicts: readonly Verdict[]): string {
  const sorted = [...verdicts].sort((a, b) => a.chain.localeCompare(b.chain) || a.ref.localeCompare(b.ref));
  const line = (v: Verdict) => JSON.stringify({ chain: v.chain, ref: v.ref, name: v.name, is: v.is, from: v.from, on: v.on, ...(v.note ? { note: v.note } : {}) });
  return sorted.length ? "[\n" + sorted.map((v) => "  " + line(v)).join(",\n") + "\n]\n" : "[]\n";
}

export function writeVerdicts(verdicts: readonly Verdict[], file: URL | string = VERDICTS_FILE): void {
  writeFileSync(file, verdictsJson(verdicts));
}

export const VERDICTS: readonly Verdict[] = readVerdicts();
