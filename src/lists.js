// List editors for goals, deliverables, risks, timeline, and next steps.
// One renderer handles all of them — timeline is the only shape with an extra date field.
import {
  getState,
  subscribe,
  addListItem,
  removeListItem,
  updateListItem,
  newId,
} from "./store.js";

const TIMELINE_KEY = "timeline";

function makeItem(listKey) {
  if (listKey === TIMELINE_KEY) {
    return { id: newId(), date: "", text: "" };
  }
  return { id: newId(), text: "" };
}

function buildRow(listKey, item) {
  const li = document.createElement("li");
  li.dataset.id = item.id;

  if (listKey === TIMELINE_KEY) {
    const date = document.createElement("input");
    date.type = "date";
    date.className = "date-input";
    date.value = item.date || "";
    date.setAttribute("aria-label", "Milestone date");
    date.addEventListener("input", () => {
      updateListItem(listKey, item.id, { date: date.value });
    });
    li.appendChild(date);
  } else {
    const dot = document.createElement("span");
    dot.className = "bullet-dot";
    dot.setAttribute("aria-hidden", "true");
    li.appendChild(dot);
  }

  const text = document.createElement("input");
  text.type = "text";
  text.value = item.text || "";
  text.placeholder = placeholderFor(listKey);
  text.setAttribute("aria-label", `${labelFor(listKey)} text`);
  text.addEventListener("input", () => {
    updateListItem(listKey, item.id, { text: text.value });
  });
  // Enter adds a sibling row below — quick capture friendly.
  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addListItem(listKey, makeItem(listKey));
      focusLastRow(listKey);
    }
    if (e.key === "Backspace" && text.value === "") {
      const list = getState()[listKey];
      if (list.length > 1) {
        e.preventDefault();
        removeListItem(listKey, item.id);
        focusLastRow(listKey);
      }
    }
  });
  li.appendChild(text);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-item";
  remove.setAttribute("aria-label", `Remove ${labelFor(listKey)}`);
  remove.textContent = "\u00d7";
  remove.addEventListener("click", () => removeListItem(listKey, item.id));
  li.appendChild(remove);

  return li;
}

function placeholderFor(listKey) {
  switch (listKey) {
    case "goals":
      return "What outcome does the client want?";
    case "deliverables":
      return "What concrete thing will you ship?";
    case "risks":
      return "What could block or derail this?";
    case "timeline":
      return "Milestone — e.g. Design review complete";
    case "nextSteps":
      return "The next action, and who owns it";
    default:
      return "";
  }
}

function labelFor(listKey) {
  return listKey.replace(/([A-Z])/g, " $1").toLowerCase();
}

function focusLastRow(listKey) {
  // After the store re-renders, focus the text input in the last row.
  queueMicrotask(() => {
    const list = document.querySelector(`[data-list="${listKey}"]`);
    if (!list) return;
    const last = list.querySelector("li:last-child input[type='text']");
    if (last) last.focus();
  });
}

function renderList(listKey, items) {
  const list = document.querySelector(`[data-list="${listKey}"]`);
  if (!list) return;

  // Preserve focus across re-renders: remember which row/column was focused.
  const active = document.activeElement;
  const focusedId = active?.closest("li")?.dataset.id;
  const focusedWasDate = active?.classList.contains("date-input");
  const selectionStart = active?.selectionStart ?? null;
  const selectionEnd = active?.selectionEnd ?? null;

  // Replace contents without innerHTML — safer and explicit.
  while (list.firstChild) list.removeChild(list.firstChild);
  items.forEach((item) => list.appendChild(buildRow(listKey, item)));

  if (focusedId) {
    const restored = list.querySelector(`li[data-id="${focusedId}"]`);
    if (restored) {
      const target = focusedWasDate
        ? restored.querySelector(".date-input")
        : restored.querySelector("input[type='text']");
      if (target) {
        target.focus();
        if (
          target.type === "text" &&
          selectionStart !== null &&
          selectionEnd !== null
        ) {
          try {
            target.setSelectionRange(selectionStart, selectionEnd);
          } catch {
            /* setSelectionRange rejects some input types — ignore */
          }
        }
      }
    }
  }
}

export function mountLists() {
  // + Add buttons
  document.querySelectorAll("[data-add]").forEach((btn) => {
    const listKey = btn.dataset.add;
    btn.addEventListener("click", () => {
      addListItem(listKey, makeItem(listKey));
      focusLastRow(listKey);
    });
  });

  const keys = ["goals", "deliverables", "risks", "timeline", "nextSteps"];
  subscribe((state) => {
    keys.forEach((k) => renderList(k, state[k] || []));
  });
}
