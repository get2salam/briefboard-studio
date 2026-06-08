// Tiny observable store. One source of truth + a subscribe() function.
// Everything that renders the UI is a subscriber — no framework needed.

const STORAGE_KEY = "briefboard:v1";
const SCHEMA_VERSION = 1;

export const emptyBrief = () => ({
  version: SCHEMA_VERSION,
  title: "",
  client: "",
  owner: "",
  dueDate: "",
  rawNotes: "",
  summary: "",
  goals: [],
  deliverables: [],
  risks: [],
  timeline: [], // items shaped { id, date, text }
  nextSteps: [],
  updatedAt: null,
});

let state = emptyBrief();
const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  state = { ...state, ...patch, updatedAt: new Date().toISOString() };
  persist();
  emit();
}

export function updateField(field, value) {
  setState({ [field]: value });
}

export function updateListItem(listKey, id, patch) {
  const next = state[listKey].map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  );
  setState({ [listKey]: next });
}

export function addListItem(listKey, item) {
  const next = [...state[listKey], item];
  setState({ [listKey]: next });
}

export function removeListItem(listKey, id) {
  const next = state[listKey].filter((item) => item.id !== id);
  setState({ [listKey]: next });
}

export function replaceState(next) {
  // Route every replacement through sanitizeBrief so the sample loader, a
  // future JSON import, and any console-driven swap all converge on the
  // same normalized shape. Without this, replaceState was a quiet bypass
  // for the type/allowlist guards every other write goes through.
  state = { ...sanitizeBrief(next), updatedAt: new Date().toISOString() };
  persist();
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(state);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Storage may be full or disabled (private mode) — fall back silently.
    console.warn("[briefboard] could not persist to localStorage:", err);
  }
}

const SCALAR_STRING_FIELDS = [
  "title",
  "client",
  "owner",
  "dueDate",
  "rawNotes",
  "summary",
];
const SIMPLE_LIST_FIELDS = ["goals", "deliverables", "risks", "nextSteps"];

// Allowlist of top-level keys we ever store on state. Any other key on an
// imported brief is dropped on the floor — this keeps unknown fields from
// bloating the exported JSON and, more importantly, strips the own
// "__proto__" property that JSON.parse creates for `{"__proto__":...}`
// payloads (spread already refuses to set the real prototype, but the
// stray own property would otherwise survive into state and exports).
const ALLOWED_TOP_LEVEL_KEYS = [
  "version",
  "title",
  "client",
  "owner",
  "dueDate",
  "rawNotes",
  "summary",
  "goals",
  "deliverables",
  "risks",
  "timeline",
  "nextSteps",
  "updatedAt",
];

function sanitizeListItem(item, isTimeline) {
  if (!item || typeof item !== "object") return null;
  const id = typeof item.id === "string" && item.id ? item.id : newId();
  const text = typeof item.text === "string" ? item.text : "";
  if (isTimeline) {
    const date = typeof item.date === "string" ? item.date : "";
    return { id, date, text };
  }
  return { id, text };
}

function sanitizeList(value, isTimeline) {
  if (!Array.isArray(value)) return [];
  return value.map((i) => sanitizeListItem(i, isTimeline)).filter(Boolean);
}

function pickAllowed(input) {
  // Copy only known, own properties — never values from up the prototype
  // chain. JSON.parse only creates own properties, but a programmatic
  // caller could hand us an object that inherits a "title" or "goals"
  // from its prototype, and silently consuming that would be surprising.
  const safe = {};
  for (const key of ALLOWED_TOP_LEVEL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      safe[key] = input[key];
    }
  }
  return safe;
}

// Normalize a parsed brief so the UI never has to defend against
// missing fields, wrong types, list items without ids, or unknown
// top-level keys smuggled in via an imported JSON file.
export function sanitizeBrief(input) {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? pickAllowed(input)
      : {};
  const merged = { ...emptyBrief(), ...source };
  for (const key of SCALAR_STRING_FIELDS) {
    if (typeof merged[key] !== "string") merged[key] = "";
  }
  for (const key of SIMPLE_LIST_FIELDS) {
    merged[key] = sanitizeList(merged[key], false);
  }
  merged.timeline = sanitizeList(merged.timeline, true);
  return merged;
}

// 256 KB is far above any realistic hand-written brief (a maxed-out one
// in the UI is single-digit KB) and well below the V8 string-length /
// JSON.parse comfort zone. Cap the input up front so a stray multi-MB
// file dropped into a future importer is rejected before it can balloon
// memory or stall parsing.
export const MAX_IMPORT_BYTES = 256 * 1024;

// Safely turn an untrusted JSON string — a dropped file, a pasted blob,
// the contents of an `.json` export shared between machines — into a
// fully-sanitized brief. Returns a discriminated union so callers can
// surface a precise message rather than a generic "import failed".
export function parseImportedBrief(rawText) {
  if (typeof rawText !== "string") {
    return { ok: false, error: "Imported value must be text." };
  }
  if (rawText.length > MAX_IMPORT_BYTES) {
    const kb = Math.round(MAX_IMPORT_BYTES / 1024);
    return {
      ok: false,
      error: `Imported brief is larger than ${kb} KB.`,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Imported brief must be a JSON object." };
  }
  return { ok: true, brief: sanitizeBrief(parsed) };
}

export function hydrateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    state = sanitizeBrief(parsed);
    emit();
    return true;
  } catch (err) {
    console.warn("[briefboard] could not read localStorage:", err);
    return false;
  }
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
