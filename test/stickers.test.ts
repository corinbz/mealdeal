import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VOCABULARY } from "../src/ingredients/vocabulary.ts";
import "../prototype/images.js";

/**
 * Stickers (#32, #44): every Ingredient has a drawing of its own, and the
 * contact sheet, prototype/stickers.html, shows each under its main aisle,
 * so a new Ingredient is drawn and checked by eye before it ships.
 */

const IMAGES = (globalThis as unknown as { IMAGES: { drawn: string[] } }).IMAGES;

test("every Ingredient in the vocabulary has its own sticker", () => {
  const drawn = new Set(IMAGES.drawn);
  assert.deepEqual(VOCABULARY.map((d) => d.id).filter((id) => !drawn.has(id)), []);
});

test("the contact sheet shows every Ingredient once, under its main aisle", () => {
  const html = readFileSync(new URL("../prototype/stickers.html", import.meta.url), "utf8");
  const literal = html.slice(html.indexOf("const GROUPS = ") + "const GROUPS = ".length, html.indexOf("];\n", html.indexOf("const GROUPS = ")) + 1);
  // An array literal of strings in the page's own script, read as one.
  const groups = new Function("return " + literal)() as [string, string[]][];
  const shown = groups.flatMap(([aisle, ids]) => ids.map((id) => [id, aisle]));
  assert.deepEqual(shown.map(([id, aisle]) => `${id} ${aisle}`).sort(), VOCABULARY.map((d) => `${d.id} ${d.aisles[0]}`).sort());
});
