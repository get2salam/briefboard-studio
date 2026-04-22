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
  state = { ...emptyBrief(), ...next, updatedAt: new Date().toISOString() };
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

export function hydrateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    // Merge onto a fresh empty brief so newly-added fields get sensible defaults.
    state = { ...emptyBrief(), ...parsed };
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
