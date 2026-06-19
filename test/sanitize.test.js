import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyBrief,
  getState,
  replaceState,
  sanitizeBrief,
  setState,
} from "../src/store.js";

test("sanitizeBrief returns an empty brief when input is null or wrong type", () => {
  for (const bad of [null, undefined, 42, "string", true]) {
    const result = sanitizeBrief(bad);
    assert.deepEqual(result.goals, []);
    assert.deepEqual(result.deliverables, []);
    assert.deepEqual(result.timeline, []);
    assert.equal(result.title, "");
    assert.equal(result.summary, "");
  }
});

test("sanitizeBrief fills in missing scalar fields with empty strings", () => {
  const result = sanitizeBrief({ title: "Real title" });
  assert.equal(result.title, "Real title");
  assert.equal(result.client, "");
  assert.equal(result.owner, "");
  assert.equal(result.dueDate, "");
  assert.equal(result.rawNotes, "");
  assert.equal(result.summary, "");
});

test("sanitizeBrief coerces non-string scalars back to empty strings", () => {
  const result = sanitizeBrief({
    title: 123,
    client: { name: "Acme" },
    owner: ["a"],
    dueDate: false,
    rawNotes: null,
    summary: undefined,
  });
  for (const key of ["title", "client", "owner", "dueDate", "rawNotes", "summary"]) {
    assert.equal(result[key], "", `${key} should be coerced to ""`);
  }
});

test("sanitizeBrief drops non-array list values", () => {
  const result = sanitizeBrief({
    goals: "not an array",
    deliverables: { 0: "nope" },
    risks: 5,
    nextSteps: null,
    timeline: "still not an array",
  });
  assert.deepEqual(result.goals, []);
  assert.deepEqual(result.deliverables, []);
  assert.deepEqual(result.risks, []);
  assert.deepEqual(result.nextSteps, []);
  assert.deepEqual(result.timeline, []);
});

test("sanitizeBrief filters non-object list items and assigns ids when missing", () => {
  const result = sanitizeBrief({
    goals: [
      { id: "keep-1", text: "Ship MVP" },
      { text: "Needs id" },
      null,
      "not an object",
      42,
    ],
  });
  assert.equal(result.goals.length, 2);
  assert.equal(result.goals[0].id, "keep-1");
  assert.equal(result.goals[0].text, "Ship MVP");
  assert.equal(result.goals[1].text, "Needs id");
  assert.ok(result.goals[1].id, "missing id should be replaced with a generated one");
  assert.notEqual(result.goals[1].id, "");
});

test("sanitizeBrief keeps timeline date field and defaults non-strings to empty", () => {
  const result = sanitizeBrief({
    timeline: [
      { id: "t1", date: "2026-01-15", text: "Kickoff" },
      { id: "t2", date: 20260201, text: "Bad date type" },
      { id: "t3", text: "No date" },
    ],
  });
  assert.equal(result.timeline.length, 3);
  assert.equal(result.timeline[0].date, "2026-01-15");
  assert.equal(result.timeline[1].date, "");
  assert.equal(result.timeline[2].date, "");
});

test("emptyBrief returns a fresh object each call (no shared references)", () => {
  const a = emptyBrief();
  const b = emptyBrief();
  a.goals.push({ id: "x", text: "mutated" });
  assert.deepEqual(b.goals, [], "mutating one empty brief must not leak into another");
});

test("sanitizeBrief drops unknown top-level keys from imported input", () => {
  // An imported brief may carry fields from a future schema version, a
  // typo, or a hand-edited file. Keep state lean — and the next export
  // honest — by ignoring anything outside the known schema.
  const result = sanitizeBrief({
    title: "Real",
    evilNote: "x".repeat(1000),
    __unused: true,
    nested: { also: "ignored" },
  });
  assert.equal(result.title, "Real");
  assert.equal(Object.prototype.hasOwnProperty.call(result, "evilNote"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "__unused"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "nested"), false);
});

test("sanitizeBrief refuses to copy values inherited from the prototype chain", () => {
  // Only own properties are part of a brief — an object that inherits a
  // "title" from a deliberately crafted prototype must not silently
  // contribute that value to state.
  const ancestor = { title: "INHERITED" };
  const child = Object.create(ancestor);
  child.client = "Acme";
  const result = sanitizeBrief(child);
  assert.equal(result.title, "");
  assert.equal(result.client, "Acme");
});

test("sanitizeBrief strips an own __proto__ property without polluting Object.prototype", () => {
  // JSON.parse('{"__proto__":{...}}') creates "__proto__" as an own data
  // property (no prototype write), but that property would otherwise
  // survive into state and surface in the next export. The allowlist
  // filter drops it; verify the engine's prototype is also untouched.
  const malicious = JSON.parse(
    '{"title":"T","__proto__":{"polluted":"yes"}}',
  );
  const result = sanitizeBrief(malicious);
  assert.equal(result.title, "T");
  assert.equal(
    Object.prototype.hasOwnProperty.call(result, "__proto__"),
    false,
    "own __proto__ must not leak into sanitized state",
  );
  assert.equal(({}).polluted, undefined, "global Object.prototype must remain clean");
});

test("sanitizeBrief rejects array roots so importing a bare list never aliases as a brief", () => {
  // A JSON file that decodes to an array (a common shape from "export
  // my list of items") shouldn't half-load as a brief — fall all the
  // way back to the empty shape.
  const result = sanitizeBrief([{ title: "ignored" }]);
  assert.equal(result.title, "");
  assert.deepEqual(result.goals, []);
});

test("setState sanitizes untrusted patches before persisting state", () => {
  // setState is exported for UI modules and devtools-style debugging, so it
  // needs the same allowlist/type defenses as imported JSON. Otherwise a
  // rogue data-field attribute or hand-written patch could survive into the
  // next JSON/Markdown export even though replaceState is locked down.
  replaceState(emptyBrief());
  setState({
    title: "Safe title",
    summary: { html: "<script>" },
    secretToken: "should not be exported",
    goals: [
      { id: "g1", text: "Keep goal", hidden: "drop me" },
      "not a goal object",
    ],
  });

  const result = getState();
  assert.equal(result.title, "Safe title");
  assert.equal(result.summary, "");
  assert.equal(Object.prototype.hasOwnProperty.call(result, "secretToken"), false);
  assert.deepEqual(result.goals, [{ id: "g1", text: "Keep goal" }]);
  assert.match(result.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
