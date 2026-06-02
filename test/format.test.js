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

test("formatDate returns an empty string for non-string inputs", () => {
  // Callers feed strings (the store normalizes them), so a non-string is a
  // programming mistake. Fail closed rather than coerce to "42T00:00:00"
  // or echo a Date object back through the raw-input fallback.
  assert.equal(formatDate(42), "");
  assert.equal(formatDate(new Date("2026-01-15")), "");
  assert.equal(formatDate({}), "");
  assert.equal(formatDate(true), "");
});

test("formatDate always returns a string regardless of input shape", () => {
  for (const input of ["", "2026-01-15", "not-a-date", 42, null, undefined, {}, true]) {
    assert.equal(typeof formatDate(input), "string");
  }
});
