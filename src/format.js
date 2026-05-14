// Shared, framework-free formatting helpers used by both the preview and
// the Markdown export so the two surfaces never disagree on how a date renders.

export function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T00:00:00");
    // `toLocaleDateString` on an Invalid Date returns the literal string
    // "Invalid Date" instead of throwing — guard explicitly so a malformed
    // date falls back to the raw input rather than leaking into output.
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
