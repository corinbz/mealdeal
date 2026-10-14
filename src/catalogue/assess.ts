/**
 * Whether a freshly built catalogue may replace the published one.
 *
 * The morning refresh ingests a single day into a throwaway database, so
 * ingest's own volume alarm never fires: a Chain's first run has nothing to
 * compare against, and in a throwaway database every run is the first. The
 * published catalogue is the only memory the refresh has, so the comparison
 * happens here instead. A Chain changing its API shape looks exactly like a
 * smaller catalogue, and publishing it would quietly empty Basket comparison.
 */

/** The parts of scripts/catalogue-from-db.ts's output this reads. */
export interface Catalogue {
  readonly chains: readonly { readonly id: string; readonly observedAt: string | null }[];
  readonly catalogue: Readonly<Record<string, readonly unknown[]>>;
}

export interface Expectation {
  /** The day swept, which every Chain's prices must come from. */
  readonly date: string;
  readonly chains: readonly string[];
  /** Fail below this share of the published catalogue's comparable Products. */
  readonly minRatio: number;
}

/** One line per reason not to publish; empty when it may. */
export function assessCatalogue(built: Catalogue, published: Catalogue | null, expect: Expectation): string[] {
  const problems: string[] = [];
  for (const id of expect.chains) {
    const chain = built.chains.find((c) => c.id === id);
    if (!chain) { problems.push(`${id} is missing from the catalogue`); continue; }
    if (chain.observedAt !== expect.date) {
      problems.push(`${id} prices are from ${chain.observedAt ?? "no day"}, not ${expect.date}`);
    }
    const count = built.catalogue[id]?.length ?? 0;
    if (count === 0) { problems.push(`${id} has no comparable Products`); continue; }

    const before = published?.chains.find((c) => c.id === id);
    if (!before) continue;
    if (before.observedAt && before.observedAt > expect.date) {
      problems.push(`the published ${id} prices are from ${before.observedAt}, newer than ${expect.date}`);
    }
    const previous = published!.catalogue[id]?.length ?? 0;
    if (count < previous * expect.minRatio) {
      problems.push(
        `${id} has ${count} comparable Products, under ${expect.minRatio * 100}% of the ${previous} published — ` +
          `a Chain changing its API shape looks exactly like this`,
      );
    }
  }
  return problems;
}

/** Reads the `window.CATALOGUE = {...};` script the basket page loads. */
export function parseCatalogueScript(text: string): Catalogue {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (!text.includes("window.CATALOGUE =") || start < 0 || end < start) {
    throw new Error("not a catalogue script: no window.CATALOGUE assignment");
  }
  return JSON.parse(text.slice(start, end + 1)) as Catalogue;
}
