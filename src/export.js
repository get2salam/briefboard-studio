// Markdown serializer and export/download helpers.
import { getState } from "./store.js";
import { formatDate } from "./format.js";

function section(heading, body) {
  if (!body) return "";
  return `## ${heading}\n\n${body}\n\n`;
}

function bulletList(items) {
  const nonEmpty = items.filter((i) => (i.text || "").trim());
  if (!nonEmpty.length) return "";
  return nonEmpty.map((i) => `- ${i.text.trim()}`).join("\n");
}

function timelineBlock(items) {
  const nonEmpty = items.filter((i) => (i.text || "").trim() || i.date);
  if (!nonEmpty.length) return "";
  const sorted = [...nonEmpty].sort((a, b) => {
    // Both-undated must return 0 so the comparator stays antisymmetric;
    // returning 1 in both directions is invalid per the sort contract and
    // can reorder rows the user typed in a specific sequence.
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
  return sorted
    .map((i) => {
      // Trim text to match bulletList, and drop the em-dash separator when
      // the row has only a date — otherwise the output ends with a dangling
      // "— " that looks like a formatting bug to the reader.
      const text = (i.text || "").trim();
      const label = i.date ? formatDate(i.date) : "TBD";
      return text ? `- **${label}** — ${text}` : `- **${label}**`;
    })
    .join("\n");
}

export function toMarkdown(state = getState()) {
  const lines = [];
  const title = (state.title || "").trim() || "Untitled brief";
  lines.push(`# ${title}`);
  lines.push("");

  const metaBits = [];
  // Trim before checking truthiness so a whitespace-only field doesn't
  // emit an empty "**Client:** " line — matches the list/section behavior.
  const client = (state.client || "").trim();
  const owner = (state.owner || "").trim();
  const dueDate = (state.dueDate || "").trim();
  if (client) metaBits.push(`**Client:** ${client}`);
  if (owner) metaBits.push(`**Owner:** ${owner}`);
  if (dueDate) metaBits.push(`**Target date:** ${formatDate(dueDate)}`);
  if (metaBits.length) {
    lines.push(metaBits.join("  \n"));
    lines.push("");
  }

  let body = "";
  if ((state.summary || "").trim()) {
    body += section("Summary", state.summary.trim());
  }
  body += section("Goals", bulletList(state.goals || []));
  body += section("Deliverables", bulletList(state.deliverables || []));
  body += section("Timeline", timelineBlock(state.timeline || []));
  body += section("Risks & open questions", bulletList(state.risks || []));
  body += section("Next steps", bulletList(state.nextSteps || []));

  if ((state.rawNotes || "").trim()) {
    body += section("Raw notes", state.rawNotes.trim());
  }

  return (lines.join("\n") + "\n" + body).trimEnd() + "\n";
}

export async function copyMarkdownToClipboard(state = getState()) {
  const md = toMarkdown(state);
  try {
    await navigator.clipboard.writeText(md);
    return true;
  } catch {
    // Fallback: use a hidden textarea with execCommand for older browsers.
    const ta = document.createElement("textarea");
    ta.value = md;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

export function safeFilename(state, ext) {
  // Normalize to NFD and strip combining marks so accented characters
  // contribute their base letter ("café" → "cafe") instead of being dropped
  // by the ASCII-only filter below, which would otherwise yield "caf".
  const raw = (state.title || "brief")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  // Truncate first, then strip edge dashes: otherwise a long title like
  // "ab ab ab ..." can slice to "ab-ab-...-" and leave a trailing dash.
  const slug = raw
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  const stem = slug || "brief";
  const stamp = new Date().toISOString().slice(0, 10);
  return `${stem}-${stamp}.${ext}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJson(state = getState()) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, safeFilename(state, "json"));
}

export function exportMarkdown(state = getState()) {
  const blob = new Blob([toMarkdown(state)], {
    type: "text/markdown;charset=utf-8",
  });
  triggerDownload(blob, safeFilename(state, "md"));
}
