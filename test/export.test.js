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
