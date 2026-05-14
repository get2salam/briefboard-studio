import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../src/format.js";

test("formatDate returns empty string for empty or missing input", () => {
  assert.equal(formatDate(""), "");
  assert.equal(formatDate(undefined), "");
  assert.equal(formatDate(null), "");
});

test("formatDate falls back to the raw input when the value is not a valid date", () => {
  assert.equal(formatDate("not-a-date"), "not-a-date");
  assert.equal(formatDate("2026-13-40"), "2026-13-40");
  assert.doesNotMatch(formatDate("nonsense"), /Invalid Date/);
});

test("formatDate renders a valid ISO date as a human-readable string", () => {
  const out = formatDate("2026-01-15");
  assert.ok(out.length > 0 && out !== "2026-01-15");
  assert.doesNotMatch(out, /Invalid Date/);
});
