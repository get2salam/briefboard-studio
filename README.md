# Briefboard Studio

**Turn messy client notes into a clean, shareable project brief — entirely in your browser.**

Briefboard Studio is a small, dependency-free web app for freelancers, consultants,
and solo builders who keep losing the thread between a client call and the
shape of the work. Paste your raw notes on the left; a structured brief — with
summary, goals, deliverables, risks, timeline, and next steps — renders live on
the right. Copy it as Markdown, export it as JSON, and get on with the work.

> Everything runs client-side. No accounts, no servers, no tracking. Your data
> lives in `localStorage` on your own machine and nowhere else.

---

## Why this exists

Every freelance project I've ever run started as a Slack thread, a voice memo,
and three bullet points on a napkin. Translating that into something a client
will actually sign off on is the boring-but-critical bit — and every tool that
tries to help wants an account, a subscription, or a team plan.

Briefboard Studio is the opposite: one HTML file, one CSS file, a few JS
modules. Open it locally or drop it on any static host. Done.

## Features

- **Structured brief template** — Summary, Goals, Deliverables, Risks,
  Timeline, and Next Steps, with a free-form Raw Notes section so nothing gets
  lost.
- **Live preview** — Typography-focused rendering updates as you type.
- **Keyboard-driven list editing** — `Enter` to add a row, `Backspace` on an
  empty row to remove it.
- **Auto-save to localStorage** — Refresh-proof. Your brief is restored when
  you come back.
- **Export** — Download the brief as both Markdown (`.md`) and JSON (`.json`)
  in one click.
- **Copy to clipboard** — Paste straight into email, Notion, Linear, or a
  Google Doc.
- **Sample brief** — Realistic example you can explore or edit to start from.
- **Dark mode** — Follows your OS preference automatically.
- **Accessible** — Semantic HTML, focus management, reduced-motion support.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl`/`Cmd` + `S` | Copy the current brief as Markdown |
| `Ctrl`/`Cmd` + `E` | Export the brief as `.md` and `.json` |
| `Enter` inside a list row | Add a new row below |
| `Backspace` on empty list row | Remove the current row |

## Running it

No build step, no bundler.

```bash
git clone https://github.com/<your-user>/briefboard-studio.git
cd briefboard-studio
# open index.html directly, or serve it locally:
python3 -m http.server 8080
# then visit http://localhost:8080
```

Any static host works too — GitHub Pages, Netlify, Cloudflare Pages, or a
folder dropped onto a VPS. There's nothing to configure.

## Project structure

```
briefboard-studio/
├── index.html          # Single-page layout, editor + preview
├── styles.css          # Token-based design system, light & dark
├── app.js              # Entry point; wires DOM to the store
├── src/
│   ├── store.js        # Tiny observable store with localStorage persistence
│   ├── lists.js        # Inline list editors (goals, deliverables, ...)
│   ├── preview.js      # Pure-function brief renderer (no innerHTML)
│   ├── sample.js       # A realistic starter brief
│   └── export.js       # Markdown serializer + file download helpers
└── README.md
```

### How the state layer works

`src/store.js` is a ~90-line observable store:

- One plain-object `state` is the single source of truth.
- `setState(patch)` merges the patch in, writes to `localStorage`, and notifies
  every subscriber.
- UI modules (`lists.js`, `preview.js`, `app.js`) each call `subscribe(fn)` and
  rebuild their chunk of the DOM from the new state.

This is effectively a hand-rolled Redux store in zero dependencies — simple
enough to read end-to-end in one sitting, predictable enough to debug from the
console with `window.__briefboard.getState()`.

### Security choices

- The preview renderer **never** uses `innerHTML`. Every user string goes
  through `textContent`, so a brief cannot inject markup into itself.
- There are no network calls. The only storage is `localStorage` on the same
  origin.
- No third-party scripts, fonts, or analytics.

## Tech

- Vanilla HTML / CSS / JavaScript (ES modules).
- No framework, no build step, no runtime dependencies.
- Works in any evergreen browser (Chrome, Firefox, Safari, Edge).

## Tests

The pure-function modules are covered by a small suite that runs on Node's
built-in test runner — no test framework, no `node_modules`:

```bash
npm test
```

Requires Node 20+. Tests live in `test/` and cover the `sanitizeBrief`
defenses around malformed `localStorage` state, `formatDate` parsing and
fallbacks, `safeFilename` slugging, `isBriefEmpty` semantics, and the
`toMarkdown` export contract.

The suite also runs in CI on every push and pull request to `main` via
[`.github/workflows/test.yml`](./.github/workflows/test.yml), across Node 20
(minimum supported) and Node 22 (current LTS).

## Roadmap ideas

These aren't promises — just directions the project could grow:

- Optional PDF export
- Import an existing `.json` brief
- Multiple saved briefs with a switcher
- Shareable read-only links via URL-encoded state
- Snippet-friendly Markdown output for Linear / Notion / Slack

Contributions welcome — keep the "no dependencies, no build step" rule and
anything small and useful is fair game.

## License

[MIT](./LICENSE)
