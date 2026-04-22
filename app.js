// Entry point. Wires the DOM to the store and renders the preview.
import {
  getState,
  subscribe,
  updateField,
  hydrateFromStorage,
  replaceState,
  emptyBrief,
} from "./src/store.js";
import { mountLists } from "./src/lists.js";
import { mountPreview } from "./src/preview.js";
import { loadSampleBrief } from "./src/sample.js";
import {
  copyMarkdownToClipboard,
  exportJson,
  exportMarkdown,
} from "./src/export.js";

function showSaveIndicator() {
  const el = document.querySelector("[data-save-indicator]");
  if (!el) return;
  el.classList.add("is-dirty");
  el.textContent = "Saving…";
  clearTimeout(showSaveIndicator._t);
  showSaveIndicator._t = setTimeout(() => {
    el.classList.remove("is-dirty");
    el.textContent = "Saved locally";
  }, 400);
}

function bindScalarFields() {
  const fields = document.querySelectorAll("[data-field]");
  fields.forEach((el) => {
    const key = el.dataset.field;
    el.addEventListener("input", () => {
      updateField(key, el.value);
      showSaveIndicator();
    });
  });
}

function syncScalarFields(state) {
  document.querySelectorAll("[data-field]").forEach((el) => {
    const key = el.dataset.field;
    const value = state[key] ?? "";
    if (document.activeElement !== el && el.value !== value) {
      el.value = value;
    }
  });
}

function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("is-visible"), 1600);
}

function bindToolbar() {
  const handlers = {
    "load-sample": () => {
      loadSampleBrief();
      toast("Sample brief loaded");
    },
    reset: () => {
      const hasContent = Object.values(getState()).some((v) =>
        Array.isArray(v) ? v.length : typeof v === "string" && v.trim(),
      );
      if (hasContent && !confirm("Start a fresh brief? Your current one will be cleared.")) {
        return;
      }
      replaceState(emptyBrief());
      toast("Blank brief ready");
    },
    "copy-md": async () => {
      const ok = await copyMarkdownToClipboard();
      toast(ok ? "Markdown copied" : "Copy failed — try export instead");
    },
    "export-json": () => {
      exportJson();
      exportMarkdown();
      toast("Exported as .json and .md");
    },
  };
  document.querySelectorAll("[data-action]").forEach((btn) => {
    const action = btn.dataset.action;
    if (handlers[action]) btn.addEventListener("click", handlers[action]);
  });
}

function bindShortcuts() {
  document.addEventListener("keydown", async (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    // Ctrl/Cmd+S: copy brief as Markdown (we don't have a native save,
    // so we intercept the familiar shortcut to do the closest thing).
    if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      const ok = await copyMarkdownToClipboard();
      toast(ok ? "Markdown copied" : "Copy failed — try export");
    }
    // Ctrl/Cmd+E: export both formats.
    if (e.key.toLowerCase() === "e") {
      e.preventDefault();
      exportJson();
      exportMarkdown();
      toast("Exported as .json and .md");
    }
  });
}

function boot() {
  hydrateFromStorage();
  bindScalarFields();
  mountLists();
  mountPreview();
  bindToolbar();
  bindShortcuts();
  subscribe((state) => {
    syncScalarFields(state);
    showSaveIndicator();
  });
  // Expose for quick debugging from devtools.
  window.__briefboard = { getState };
}

document.addEventListener("DOMContentLoaded", boot);
