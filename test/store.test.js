// Tests for store CRUD helpers (addListItem, removeListItem, updateListItem)
// and subscribe / emit resilience — the subscriber-isolation guarantee that
// keeps a throwing renderer from silently starving all subsequent subscribers.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyBrief,
  getState,
  replaceState,
  setState,
  addListItem,
  removeListItem,
  updateListItem,
  subscribe,
  newId,
} from "../src/store.js";

function reset() {
  replaceState(emptyBrief());
}

// ── addListItem ──────────────────────────────────────────────────────────────

test("addListItem appends an item to the named list", () => {
  reset();
  const item = { id: newId(), text: "Ship MVP" };
  addListItem("goals", item);
  const goals = getState().goals;
  assert.equal(goals.length, 1);
  assert.equal(goals[0].text, "Ship MVP");
});

test("addListItem does not mutate sibling lists", () => {
  reset();
  addListItem("goals", { id: newId(), text: "Goal" });
  assert.deepEqual(getState().deliverables, []);
  assert.deepEqual(getState().risks, []);
  assert.deepEqual(getState().nextSteps, []);
  assert.deepEqual(getState().timeline, []);
});

test("addListItem accumulates multiple items in insertion order", () => {
  reset();
  addListItem("deliverables", { id: "d1", text: "Alpha" });
  addListItem("deliverables", { id: "d2", text: "Beta" });
  addListItem("deliverables", { id: "d3", text: "Gamma" });
  const ids = getState().deliverables.map((d) => d.id);
  assert.deepEqual(ids, ["d1", "d2", "d3"]);
});

test("addListItem strips unknown fields through the sanitize pass", () => {
  reset();
  addListItem("goals", { id: "g1", text: "Keep", hidden: "drop-me", score: 99 });
  const item = getState().goals[0];
  assert.equal(item.text, "Keep");
  assert.equal(Object.prototype.hasOwnProperty.call(item, "hidden"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(item, "score"), false);
});

test("addListItem accepts timeline items with a date field", () => {
  reset();
  addListItem("timeline", { id: "t1", date: "2026-09-01", text: "Kickoff" });
  const row = getState().timeline[0];
  assert.equal(row.date, "2026-09-01");
  assert.equal(row.text, "Kickoff");
});

// ── removeListItem ───────────────────────────────────────────────────────────

test("removeListItem removes the item matching the given id", () => {
  reset();
  addListItem("deliverables", { id: "d1", text: "Alpha" });
  addListItem("deliverables", { id: "d2", text: "Beta" });
  removeListItem("deliverables", "d1");
  const items = getState().deliverables;
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "d2");
});

test("removeListItem is a no-op when the id does not exist", () => {
  reset();
  addListItem("risks", { id: "r1", text: "Risk A" });
  removeListItem("risks", "nonexistent");
  assert.equal(getState().risks.length, 1);
  assert.equal(getState().risks[0].id, "r1");
});

test("removeListItem leaves the list empty when the last item is removed", () => {
  reset();
  addListItem("nextSteps", { id: "n1", text: "Only step" });
  removeListItem("nextSteps", "n1");
  assert.deepEqual(getState().nextSteps, []);
});

// ── updateListItem ───────────────────────────────────────────────────────────

test("updateListItem patches only the matched item and leaves others untouched", () => {
  reset();
  addListItem("nextSteps", { id: "n1", text: "First" });
  addListItem("nextSteps", { id: "n2", text: "Second" });
  updateListItem("nextSteps", "n1", { text: "Updated first" });
  const items = getState().nextSteps;
  assert.equal(items[0].text, "Updated first");
  assert.equal(items[1].text, "Second");
});

test("updateListItem is a no-op when the id does not exist", () => {
  reset();
  addListItem("goals", { id: "g1", text: "Unchanged" });
  updateListItem("goals", "ghost-id", { text: "Should not appear" });
  assert.equal(getState().goals.length, 1);
  assert.equal(getState().goals[0].text, "Unchanged");
});

test("updateListItem can update a timeline row's date field", () => {
  reset();
  addListItem("timeline", { id: "t1", date: "2026-01-01", text: "Kickoff" });
  updateListItem("timeline", "t1", { date: "2026-02-15" });
  assert.equal(getState().timeline[0].date, "2026-02-15");
  assert.equal(getState().timeline[0].text, "Kickoff");
});

// ── subscribe / emit resilience ──────────────────────────────────────────────

test("subscribe calls the listener immediately with current state", () => {
  reset();
  setState({ title: "already-set" });
  let seen = null;
  const unsub = subscribe((s) => {
    seen = s.title;
  });
  assert.equal(seen, "already-set");
  unsub();
});

test("subscribe returns an unsubscribe function that stops future emissions", () => {
  reset();
  let callCount = 0;
  // skip the initial immediate call
  let initial = true;
  const unsub = subscribe(() => {
    if (initial) { initial = false; return; }
    callCount++;
  });
  setState({ title: "one" });
  assert.equal(callCount, 1);
  unsub();
  setState({ title: "two" });
  assert.equal(callCount, 1, "listener must not fire after unsubscribe");
});

test("a subscriber that throws does not prevent later subscribers from firing", () => {
  reset();

  // First subscriber: passes its initial call, then throws on all subsequent emissions.
  let initial1 = true;
  const unsub1 = subscribe(() => {
    if (initial1) { initial1 = false; return; }
    throw new Error("deliberate subscriber error");
  });

  // Second subscriber: records the title it receives on emissions.
  let received = null;
  let initial2 = true;
  const unsub2 = subscribe((s) => {
    if (initial2) { initial2 = false; return; }
    received = s.title;
  });

  setState({ title: "after-throw" });

  assert.equal(
    received,
    "after-throw",
    "second subscriber must still fire even though the first one threw",
  );

  unsub1();
  unsub2();
});

test("newId returns a non-empty string each call", () => {
  const a = newId();
  const b = newId();
  assert.equal(typeof a, "string");
  assert.ok(a.length > 0);
  assert.notEqual(a, b, "consecutive newId calls should not collide");
});
