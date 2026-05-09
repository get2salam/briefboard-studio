import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeBrief, emptyBrief } from "../src/store.js";

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
