// A realistic sample brief a freelancer might receive. Generic on purpose
// so it reads well for any kind of small agency, SaaS, or consulting work.
import { replaceState, newId } from "./store.js";

function soon(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export function buildSampleBrief() {
  return {
    title: "Harbor Coffee Co. — Website refresh",
    client: "Harbor Coffee Co.",
    owner: "Alex Rivera",
    dueDate: soon(42),
    rawNotes:
      "Call with Priya (30 mins). They're opening 2 new shops in Q3, the " +
      "current site looks 'tired' and doesn't reflect the new brand. Need " +
      "online ordering that ties into Square. Mentioned their mailing list " +
      "has ~4k subscribers they want to keep. Priya is not technical; Dan " +
      "(ops) will be the day-to-day point of contact. Budget roughly the " +
      "same as last year's campaign. No hard deadline yet but 'before the " +
      "new shop opens' which is ~6 weeks out.",
    summary:
      "Replace Harbor Coffee's outdated marketing site with a faster, " +
      "mobile-first experience that reflects the refreshed brand and " +
      "supports online ordering ahead of the Q3 store openings.",
    goals: [
      { id: newId(), text: "Reflect the 2026 brand identity across every page" },
      { id: newId(), text: "Enable online ordering with Square integration" },
      { id: newId(), text: "Retain existing mailing list and grow sign-ups by 20%" },
    ],
    deliverables: [
      { id: newId(), text: "Information architecture + sitemap (approved)" },
      { id: newId(), text: "5 core page designs — home, menu, shops, story, contact" },
      { id: newId(), text: "Responsive frontend build with CMS for menu updates" },
      { id: newId(), text: "Square ordering flow wired end-to-end" },
      { id: newId(), text: "Analytics, consent banner, and handover document" },
    ],
    risks: [
      { id: newId(), text: "Square API rate limits during peak ordering hours" },
      { id: newId(), text: "Brand assets may not be finalised before design sprint" },
      { id: newId(), text: "Mailing list migration could break existing automations" },
    ],
    timeline: [
      { id: newId(), date: soon(7), text: "Kick-off + content audit complete" },
      { id: newId(), date: soon(14), text: "Design concepts presented" },
      { id: newId(), date: soon(28), text: "Production build in staging" },
      { id: newId(), date: soon(35), text: "QA, content load, client sign-off" },
      { id: newId(), date: soon(42), text: "Launch — ahead of Q3 store opening" },
    ],
    nextSteps: [
      { id: newId(), text: "Alex: send statement of work for Priya's signature" },
      { id: newId(), text: "Dan: share current Square account access + menu data" },
      { id: newId(), text: "Alex: book design kick-off workshop for next Tuesday" },
    ],
  };
}

export function loadSampleBrief() {
  replaceState(buildSampleBrief());
}
