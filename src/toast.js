// In-app toast helpers. The toast doubles as an ARIA live region so
// screen readers hear the same confirmation that sighted users see.
//
// Why a separate module: `announce` touches the DOM, but `ariaForToast`
// is a pure mapping from kind to ARIA attributes — and that mapping is
// where the accessibility contract actually lives. Splitting it out
// keeps the contract unit-testable without a DOM.

const VISIBLE_MS = 1600;

export function ariaForToast(kind) {
  // Errors interrupt the screen reader queue so a failed copy/export
  // isn't silently lost while the user moves on. Info uses the polite
  // status pattern so success messages queue behind anything the user
  // is currently hearing.
  if (kind === "error") {
    return { role: "alert", "aria-live": "assertive" };
  }
  return { role: "status", "aria-live": "polite" };
}

export function announce(message, { kind = "info", el } = {}) {
  if (!el) return;
  const attrs = ariaForToast(kind);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  // Set text last so the live region announces the final message with
  // the correct role already in place.
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(announce._t);
  announce._t = setTimeout(() => el.classList.remove("is-visible"), VISIBLE_MS);
}
