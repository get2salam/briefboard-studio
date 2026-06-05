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

test("toMarkdown trims timeline text so surrounding whitespace doesn't leak into the bullet", () => {
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [{ id: "x", date: "2026-01-15", text: "  Kickoff  " }],
    }),
  );
  assert.match(md, /— Kickoff\n/);
  assert.doesNotMatch(md, /—   Kickoff/);
});

test("toMarkdown drops the em-dash separator for a date-only timeline row", () => {
  // A row the user entered with only a date should render as a clean bullet,
  // not "- **Jan 15, 2026** — " with a dangling separator and trailing space.
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [{ id: "x", date: "2026-01-15", text: "   " }],
    }),
  );
  assert.doesNotMatch(md, /\*\* — \n/);
  assert.doesNotMatch(md, /\*\* — $/m);
  assert.match(md, /- \*\*[^*]+\*\*\n/);
});

test("toMarkdown collapses internal newlines in bullet text to single-line bullets", () => {
  // The in-app row is an <input type="text"> so newlines can't be typed,
  // but an imported JSON brief can carry a multi-line value. Without
  // collapsing, the bullet wraps to a second line and most Markdown
  // renderers treat it as a continuation paragraph or — if the next line
  // starts with "- " — an injected sub-bullet that the user never wrote.
  const md = toMarkdown(
    brief({
      title: "T",
      goals: [{ id: "g", text: "Line one\nLine two\n- pretend bullet" }],
    }),
  );
  assert.match(md, /- Line one Line two - pretend bullet\n/);
  assert.doesNotMatch(md, /\n- pretend bullet/);
});

test("toMarkdown collapses internal newlines in timeline text", () => {
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [{ id: "x", date: "2026-01-15", text: "Kickoff\nand intros" }],
    }),
  );
  assert.match(md, /— Kickoff and intros\n/);
  assert.doesNotMatch(md, /Kickoff\nand intros/);
});

test("toMarkdown drops bullets whose text is only newlines and whitespace", () => {
  const md = toMarkdown(
    brief({
      title: "T",
      goals: [
        { id: "a", text: "\n\n   \n" },
        { id: "b", text: "Real goal" },
      ],
    }),
  );
  assert.match(md, /## Goals\n\n- Real goal\n/);
  assert.doesNotMatch(md, /- \n/);
});

test("toMarkdown drops timeline rows whose date is whitespace and text is empty", () => {
  // Regression: a whitespace-only date is truthy but formatDate returns "",
  // so the row used to emit "- ****" — an empty bold label with no content.
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [
        { id: "a", date: "   ", text: "" },
        { id: "b", date: "2026-01-15", text: "Real" },
      ],
    }),
  );
  assert.doesNotMatch(md, /- \*\*\*\*/);
  assert.match(md, /- \*\*[^*]+\*\* — Real\n/);
});

test("toMarkdown labels a whitespace-only date as TBD when the row has text", () => {
  // Regression: i.date was checked truthy without trimming, so "   " went
  // to formatDate (which returns ""), leaving "- **** — Kickoff".
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [{ id: "x", date: "   ", text: "Kickoff" }],
    }),
  );
  assert.match(md, /- \*\*TBD\*\* — Kickoff\n/);
  assert.doesNotMatch(md, /- \*\*\*\*/);
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

test("toMarkdown escapes emphasis characters in a raw-fallback timeline date so the bold wrapper survives", () => {
  // Regression: a JSON-imported brief can carry a date string formatDate
  // can't parse (e.g. "*hack*"), which echoes back unchanged. Wrapping that
  // in **...** without escaping produced "- ***hack*** — Kickoff", which most
  // renderers parse as bold-italic and visually swallows the em-dash separator.
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [{ id: "x", date: "*hack*", text: "Kickoff" }],
    }),
  );
  assert.match(md, /- \*\*\\\*hack\\\*\*\* — Kickoff/);
  assert.doesNotMatch(md, /- \*\*\*hack\*\*\* /);
});

test("toMarkdown escapes underscore and backtick fallbacks in timeline dates too", () => {
  // Same class of bug as the asterisk case: underscores and backticks both
  // start Markdown spans, so a raw fallback containing them would either
  // cross-pair with the surrounding ** wrapper or open an unterminated code
  // span that runs through the rest of the line.
  const md = toMarkdown(
    brief({
      title: "T",
      timeline: [
        { id: "a", date: "_x_", text: "Under" },
        { id: "b", date: "`y`", text: "Tick" },
      ],
    }),
  );
  assert.match(md, /- \*\*\\_x\\_\*\* — Under/);
  assert.match(md, /- \*\*\\`y\\`\*\* — Tick/);
});
