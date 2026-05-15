import { test } from "node:test";
import assert from "node:assert/strict";
import { isBriefEmpty } from "../src/preview.js";
import { sanitizeBrief } from "../src/store.js";

function brief(overrides = {}) {
  return sanitizeBrief(overrides);
}

test("isBriefEmpty is true for a freshly initialized brief", () => {
  assert.equal(isBriefEmpty(brief()), true);
});

test("isBriefEmpty treats whitespace-only scalars as empty", () => {
  assert.equal(
    isBriefEmpty(brief({ title: "   ", client: "\t", summary: "\n" })),
    true,
  );
});

test("isBriefEmpty is false when any scalar field has real content", () => {
  assert.equal(isBriefEmpty(brief({ title: "Kickoff" })), false);
  assert.equal(isBriefEmpty(brief({ rawNotes: "call notes" })), false);
});

test("isBriefEmpty ignores list rows whose text is empty or whitespace", () => {
  assert.equal(
    isBriefEmpty(brief({ goals: [{ id: "a", text: "   " }] })),
    true,
  );
});

test("isBriefEmpty is false when a simple list has a non-empty row", () => {
  assert.equal(
    isBriefEmpty(brief({ deliverables: [{ id: "d", text: "Ship MVP" }] })),
    false,
  );
});

test("isBriefEmpty treats a timeline row with only a date as content", () => {
  // Regression: this used to return true, which made renderBrief show the
  // empty-state placeholder even though renderTimeline would have rendered
  // the dated rows.
  assert.equal(
    isBriefEmpty(brief({ timeline: [{ id: "t", date: "2026-01-15", text: "" }] })),
    false,
  );
});
