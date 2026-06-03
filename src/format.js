// Shared, framework-free formatting helpers used by both the preview and
// the Markdown export so the two surfaces never disagree on how a date renders.

export function formatDate(iso) {
  // Reject non-string inputs up front. The store normalizes dueDate and
  // timeline.date to strings, so anything else here is a programming error;
  // failing closed avoids leaking coerced output like "42T00:00:00" or
  // returning the raw non-string and breaking the "always a string" contract.
  if (typeof iso !== "string") return "";
  // Trim centrally so callers don't each have to: only the dueDate path
  // pre-trims today, while timeline rows pass raw `row.date`. Without this,
  // a whitespace-padded value like " 2026-01-15 " becomes Invalid Date and
  // gets echoed back as the raw fallback — surfacing the padding in output
  // and (worse) rendering a whitespace-only label for a whitespace-only date.
  const trimmed = iso.trim();
  if (!trimmed) return "";
  try {
    const d = new Date(trimmed + "T00:00:00");
    // `toLocaleDateString` on an Invalid Date returns the literal string
    // "Invalid Date" instead of throwing — guard explicitly so a malformed
    // date falls back to the raw input rather than leaking into output.
    if (Number.isNaN(d.getTime())) return trimmed;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return trimmed;
  }
}
