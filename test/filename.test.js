import { test } from "node:test";
import assert from "node:assert/strict";
import { safeFilename } from "../src/export.js";

const STAMP = /\d{4}-\d{2}-\d{2}/;

test("safeFilename falls back to 'brief' when title is missing or whitespace", () => {
  assert.match(safeFilename({}, "md"), new RegExp(`^brief-${STAMP.source}\\.md$`));
  assert.match(safeFilename({ title: "   " }, "json"), new RegExp(`^brief-${STAMP.source}\\.json$`));
});

test("safeFilename slugifies a real title (lowercased, non-alnum → dashes)", () => {
  const name = safeFilename({ title: "Harbor Coffee Co. — Site Refresh!" }, "md");
  assert.match(name, new RegExp(`^harbor-coffee-co-site-refresh-${STAMP.source}\\.md$`));
});

test("safeFilename strips leading and trailing punctuation from the slug", () => {
  const name = safeFilename({ title: "!!! hello world !!!" }, "md");
  assert.match(name, new RegExp(`^hello-world-${STAMP.source}\\.md$`));
});

test("safeFilename truncates long titles without leaving a trailing dash", () => {
  // 30× "ab " → "ab-ab-ab-..." which would otherwise slice mid-separator.
  const name = safeFilename({ title: "ab ".repeat(30) }, "md");
  const stem = name.replace(new RegExp(`-${STAMP.source}\\.md$`), "");
  assert.ok(stem.length <= 60, `stem should be ≤ 60 chars, got ${stem.length}`);
  assert.doesNotMatch(stem, /-$/, "stem should not end with a dash");
});

test("safeFilename strips diacritics so accented letters survive the slug", () => {
  // Without NFD normalization the ASCII filter would drop "é" entirely,
  // turning "café" into "caf" — a confusing rename for the user.
  const name = safeFilename({ title: "Café Résumé — Naïve Façade" }, "md");
  assert.match(name, new RegExp(`^cafe-resume-naive-facade-${STAMP.source}\\.md$`));
});
