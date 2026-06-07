import { test } from "node:test";
import assert from "node:assert/strict";
import { ariaForToast } from "../src/toast.js";

test("info toasts use a polite status live region", () => {
  // Polite ensures success messages ("Markdown copied", "Sample brief
  // loaded") queue behind whatever the screen reader is currently
  // reading rather than cutting it off.
  assert.deepEqual(ariaForToast("info"), {
    role: "status",
    "aria-live": "polite",
  });
});

test("unspecified kind defaults to the polite status pattern", () => {
  // Callers that omit the kind should still get an accessible toast,
  // not a bare div, so the default has to be a real live region.
  assert.deepEqual(ariaForToast(), {
    role: "status",
    "aria-live": "polite",
  });
});

test("unknown kinds fall back to polite status rather than silently dropping role", () => {
  assert.deepEqual(ariaForToast("celebration"), {
    role: "status",
    "aria-live": "polite",
  });
});

test("error toasts interrupt with an assertive alert", () => {
  // A failed copy/export needs to interrupt — if the user has already
  // moved on, a polite message would be heard too late to matter.
  assert.deepEqual(ariaForToast("error"), {
    role: "alert",
    "aria-live": "assertive",
  });
});
