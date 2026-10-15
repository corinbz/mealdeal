/**
 * Writes this week's digest (#22) from a published catalogue. See
 * src/digest/compose.ts for what it may and may not claim.
 *
 *   DIGEST_STAPLES="500 g rundergehakt
 *   1 l halfvolle melk" node scripts/digest.ts --catalogue catalogue.js \
 *     --site https://<project>.pages.dev/ --disable-url <workflow page> --out digest.json
 *
 * Staples are one per line, written as on the basket page.
 */

import { readFile, writeFile } from "node:fs/promises";
import { parseCatalogueScript } from "../src/catalogue/format.ts";
import { composeDigest } from "../src/digest/compose.ts";

function usage(): never {
  console.error("Usage: DIGEST_STAPLES=... node scripts/digest.ts --catalogue <file> --site <url> --disable-url <url> --out <file>");
  process.exit(2);
}

const argv = process.argv.slice(2);
let catalogue = "", site = "", disableUrl = "", out = "";
for (let i = 0; i < argv.length; i++) {
  const next = argv[i + 1] ?? "";
  switch (argv[i]) {
    case "--catalogue": catalogue = next; i++; break;
    case "--site": site = next; i++; break;
    case "--disable-url": disableUrl = next; i++; break;
    case "--out": out = next; i++; break;
    default: usage();
  }
}
const staples = (process.env.DIGEST_STAPLES ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
if (!catalogue || !site || !disableUrl || !out) usage();
if (!staples.length) {
  console.error("No staples: set DIGEST_STAPLES, one per line, e.g. \"500 g rundergehakt\".");
  process.exit(1);
}

const data = parseCatalogueScript(await readFile(catalogue, "utf8"));
const digest = composeDigest(data, staples, site, disableUrl);
await writeFile(out, JSON.stringify(digest));
console.log(`${digest.subject} (${staples.length} staples)\n\n${digest.text}`);
