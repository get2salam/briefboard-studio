import { test } from "node:test";
import assert from "node:assert/strict";
import { toMarkdown } from "../src/export.js";
import { sanitizeBrief } from "../src/store.js";

function brief(overrides = {}) {
  return sanitizeBrief(overrides);
}

test("toMarkdown falls back to 'Untitled brief' when title is empty or whitespace", () => {
  assert.match(toMarkdown(brief()), /^# Untitled brief\n/);
  assert.match(toMarkdown(brief({ title: "   " })), /^# Untitled brief\n/);
});

test("toMarkdown emits a meta block only when at least one meta field is set", () => {
  const md = toMarkdown(brief({ title: "T", client: "Acme", owner: "Sam" }));
  assert.match(md, /\*\*Client:\*\* Acme/);
  assert.match(md, /\*\*Owner:\*\* Sam/);
  assert.doesNotMatch(toMarkdown(brief({ title: "T" })), /\*\*Client:\*\*/);
});

test("toMarkdown omits meta lines whose values are whitespace-only", () => {
  // Regression: a bare truthy check would emit "**Client:** " with a
  // trailing space and no value, leaving a visibly empty meta row.
  const md = toMarkdown(
    brief({ title: "T", client: "   ", owner: "\t", dueDate: " " }),
  );
  assert.doesNotMatch(md, /\*\*Client:\*\*/);
  assert.doesNotMatch(md, /\*\*Owner:\*\*/);
  assert.doesNotMatch(md, /\*\*Target date:\*\*/);
});

test("toMarkdown trims surrounding whitespace from emitted meta values", () => {
  const md = toMarkdown(brief({ title: "T", client: "  Acme  " }));
  assert.match(md, /\*\*Client:\*\* Acme\n/);
});

test("toMarkdown skips list sections whose items are all empty or whitespace", () => {
  const md = toMarkdown(
    brief({
      title: "T",
      goals: [{ id: "a", text: "  " }, { id: "b", text: "" }],
      deliverables: [{ id: "c", text: "Real deliverable" }],
    }),
  );
  assert.doesNotMatch(md, /## Goals/);
  assert.match(md, /## Deliverables\n\n- Real deliverable/);
});

test("toMarkdown sorts timeline by date and puts undated items last as TBD", () => {
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [
        { id: "1", date: "", text: "Later" },
        { id: "2", date: "2026-03-01", text: "March" },
        { id: "3", date: "2026-01-15", text: "January" },
      ],
    }),
  );
  const jan = md.indexOf("January");
  const mar = md.indexOf("March");
  const tbd = md.indexOf("TBD");
  assert.ok(jan > 0 && jan < mar && mar < tbd, "expected order: Jan < Mar < TBD");
});

test("toMarkdown trims bullet text and emits exactly one trailing newline", () => {
  const md = toMarkdown(
    brief({ title: "T", nextSteps: [{ id: "n", text: "  Ship it  " }] }),
  );
  assert.match(md, /- Ship it\n/);
  assert.ok(md.endsWith("\n") && !md.endsWith("\n\n"), "should end with single \\n");
});

test("toMarkdown falls back to raw dueDate when the value is not a valid date", () => {
  const md = toMarkdown(brief({ title: "T", dueDate: "not-a-date" }));
  assert.match(md, /\*\*Target date:\*\* not-a-date/);
  assert.doesNotMatch(md, /Invalid Date/);
});

test("toMarkdown preserves input order among multiple undated timeline rows", () => {
  // Regression: the sort comparator used to return 1 for both (a,b) and
  // (b,a) when neither had a date, an antisymmetry violation that could
  // shuffle the user's typing order on some engines.
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [
        { id: "1", date: "", text: "First undated" },
        { id: "2", date: "", text: "Second undated" },
        { id: "3", date: "", text: "Third undated" },
      ],
    }),
  );
  const first = md.indexOf("First undated");
  const second = md.indexOf("Second undated");
  const third = md.indexOf("Third undated");
  assert.ok(first > 0 && first < second && second < third, "undated rows must keep input order");
});

test("toMarkdown falls back to raw timeline date when the value is not a valid date", () => {
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [{ id: "x", date: "bogus", text: "Kickoff" }],
    }),
  );
  assert.match(md, /- \*\*bogus\*\* — Kickoff/);
  assert.doesNotMatch(md, /Invalid Date/);
});
