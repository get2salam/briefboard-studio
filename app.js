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

function bindToolbar() {
  const handlers = {
    "load-sample": () => loadSampleBrief(),
    reset: () => {
      const hasContent = Object.values(getState()).some((v) =>
        Array.isArray(v) ? v.length : typeof v === "string" && v.trim(),
      );
      if (hasContent && !confirm("Start a fresh brief? Your current one will be cleared.")) {
        return;
      }
      replaceState(emptyBrief());
    },
  };
  document.querySelectorAll("[data-action]").forEach((btn) => {
    const action = btn.dataset.action;
    if (handlers[action]) btn.addEventListener("click", handlers[action]);
  });
}

function boot() {
  hydrateFromStorage();
  bindScalarFields();
  mountLists();
  mountPreview();
  bindToolbar();
  subscribe((state) => {
    syncScalarFields(state);
    showSaveIndicator();
  });
  // Expose for quick debugging from devtools.
  window.__briefboard = { getState };
}

document.addEventListener("DOMContentLoaded", boot);
