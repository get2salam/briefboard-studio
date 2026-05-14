// Live preview renderer. Pure function of state -> DOM.
// Uses document.createElement + textContent throughout — never innerHTML —
// so user input is never interpreted as HTML.
import { subscribe } from "./store.js";
import { formatDate } from "./format.js";

const LABELS = {
  goals: "Goals",
  deliverables: "Deliverables",
  risks: "Risks & open questions",
  nextSteps: "Next steps",
};

export function isBriefEmpty(state) {
  const lists = ["goals", "deliverables", "risks", "timeline", "nextSteps"];
  const hasList = lists.some((k) =>
    (state[k] || []).some((i) => (i.text || "").trim()),
  );
  const hasScalar = [
    state.title,
    state.client,
    state.owner,
    state.dueDate,
    state.rawNotes,
    state.summary,
  ].some((v) => (v || "").trim());
  return !hasList && !hasScalar;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function renderEmptyState(previewEl) {
  // Friendly, welcoming prompt that invites the user to start typing.
  // Chosen over a skeleton to reduce visual noise on first open.
  while (previewEl.firstChild) previewEl.removeChild(previewEl.firstChild);
  const wrap = el("div", { class: "brief-empty" });
  wrap.appendChild(
    el("strong", { text: "Your brief will appear here." }),
  );
  wrap.appendChild(
    el("span", {
      text: "Fill in a project title or load the sample to see it rendered.",
    }),
  );
  previewEl.appendChild(wrap);
}

function renderMeta(state) {
  const parts = [];
  if (state.client) {
    parts.push(
      el(
        "span",
        {},
        el("span", { class: "meta-label", text: "Client:" }),
        " ",
        state.client,
      ),
    );
  }
  if (state.owner) {
    parts.push(
      el(
        "span",
        {},
        el("span", { class: "meta-label", text: "Owner:" }),
        " ",
        state.owner,
      ),
    );
  }
  if (state.dueDate) {
    parts.push(
      el(
        "span",
        {},
        el("span", { class: "meta-label", text: "Target:" }),
        " ",
        formatDate(state.dueDate),
      ),
    );
  }
  if (!parts.length) return null;
  const meta = el("p", { class: "brief-meta" });
  parts.forEach((p) => meta.appendChild(p));
  return meta;
}

function renderSimpleList(listKey, items) {
  const nonEmpty = items.filter((i) => (i.text || "").trim());
  if (!nonEmpty.length) return null;
  const frag = document.createDocumentFragment();
  frag.appendChild(el("h3", { text: LABELS[listKey] }));
  const ul = el("ul");
  nonEmpty.forEach((item) => {
    ul.appendChild(el("li", { text: item.text }));
  });
  frag.appendChild(ul);
  return frag;
}

function renderTimeline(items) {
  const nonEmpty = items.filter((i) => (i.text || "").trim() || i.date);
  if (!nonEmpty.length) return null;
  const frag = document.createDocumentFragment();
  frag.appendChild(el("h3", { text: "Timeline" }));
  const sorted = [...nonEmpty].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
  sorted.forEach((item) => {
    const row = el("div", { class: "timeline-row" });
    row.appendChild(
      el("span", {
        class: "timeline-date",
        text: item.date ? formatDate(item.date) : "—",
      }),
    );
    row.appendChild(el("span", { text: item.text || "" }));
    frag.appendChild(row);
  });
  return frag;
}

export function renderBrief(state, previewEl) {
  if (isBriefEmpty(state)) {
    renderEmptyState(previewEl);
    return;
  }
  while (previewEl.firstChild) previewEl.removeChild(previewEl.firstChild);

  const title = (state.title || "").trim() || "Untitled brief";
  previewEl.appendChild(el("h2", { class: "brief-title", text: title }));

  const meta = renderMeta(state);
  if (meta) previewEl.appendChild(meta);

  if ((state.summary || "").trim()) {
    previewEl.appendChild(el("h3", { text: "Summary" }));
    previewEl.appendChild(
      el("p", { class: "brief-summary", text: state.summary.trim() }),
    );
  }

  const goals = renderSimpleList("goals", state.goals || []);
  if (goals) previewEl.appendChild(goals);

  const deliverables = renderSimpleList("deliverables", state.deliverables || []);
  if (deliverables) previewEl.appendChild(deliverables);

  const timeline = renderTimeline(state.timeline || []);
  if (timeline) previewEl.appendChild(timeline);

  const risks = renderSimpleList("risks", state.risks || []);
  if (risks) previewEl.appendChild(risks);

  const nextSteps = renderSimpleList("nextSteps", state.nextSteps || []);
  if (nextSteps) previewEl.appendChild(nextSteps);
}

export function mountPreview() {
  const previewEl = document.querySelector("[data-preview]");
  if (!previewEl) return;
  subscribe((state) => renderBrief(state, previewEl));
}
