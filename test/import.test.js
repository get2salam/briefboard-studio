import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImportedBrief, MAX_IMPORT_BYTES } from "../src/store.js";

test("parseImportedBrief rejects non-string input with a typed error", () => {
  // The caller (a file reader, a paste handler, etc.) hands us text. A
  // non-string here is a programming mistake — refuse early instead of
  // letting JSON.parse coerce it into a misleading shape.
  for (const bad of [null, undefined, 42, {}, [], true]) {
    const result = parseImportedBrief(bad);
    assert.equal(result.ok, false);
    assert.match(result.error, /text/i);
  }
});

test("parseImportedBrief rejects input larger than MAX_IMPORT_BYTES before parsing", () => {
  // Cap the input up front so a multi-MB file dropped into the importer
  // can't balloon memory or stall JSON.parse before we even know whether
  // the payload is shaped like a brief.
  const huge = "x".repeat(MAX_IMPORT_BYTES + 1);
  const result = parseImportedBrief(huge);
  assert.equal(result.ok, false);
  assert.match(result.error, /larger than/i);
});

test("parseImportedBrief reports a friendly error for invalid JSON", () => {
  const result = parseImportedBrief("{ not really json");
  assert.equal(result.ok, false);
  assert.match(result.error, /JSON/);
});

test("parseImportedBrief rejects non-object JSON roots", () => {
  // A JSON file that decodes to a string, number, array, or null is
  // syntactically valid JSON but structurally not a brief — refuse it
  // here so callers don't have to repeat the shape check.
  for (const rawText of ['"just a string"', "42", "true", "null", "[1,2,3]"]) {
    const result = parseImportedBrief(rawText);
    assert.equal(result.ok, false, `expected failure for ${rawText}`);
    assert.match(result.error, /object/i);
  }
});

test("parseImportedBrief sanitizes a valid imported brief", () => {
  const rawText = JSON.stringify({
    title: "Imported brief",
    client: "Acme",
    goals: [
      { id: "g1", text: "Real goal" },
      "not an object — should be dropped",
    ],
  });
  const result = parseImportedBrief(rawText);
  assert.equal(result.ok, true);
  assert.equal(result.brief.title, "Imported brief");
  assert.equal(result.brief.client, "Acme");
  assert.equal(result.brief.goals.length, 1);
  assert.equal(result.brief.goals[0].text, "Real goal");
});

test("parseImportedBrief strips unknown top-level keys from the imported payload", () => {
  const rawText = JSON.stringify({
    title: "T",
    secretToken: "should-not-survive-import",
    unknownField: 99,
  });
  const result = parseImportedBrief(rawText);
  assert.equal(result.ok, true);
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.brief, "secretToken"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.brief, "unknownField"),
    false,
  );
});

test("parseImportedBrief defuses a __proto__ payload without polluting Object.prototype", () => {
  // JSON.parse turns a "__proto__" key into an own data property — the
  // engine doesn't pollute the prototype here, but a sloppier sanitizer
  // could let the own property survive into state and back out into the
  // next export. End-to-end check that neither happens.
  const rawText = '{"title":"T","__proto__":{"polluted":"yes"}}';
  const result = parseImportedBrief(rawText);
  assert.equal(result.ok, true);
  assert.equal(result.brief.title, "T");
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.brief, "__proto__"),
    false,
  );
  assert.equal(({}).polluted, undefined);
});
