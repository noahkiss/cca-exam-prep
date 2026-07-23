# CCA Exam Prep — Web App

A practice/study web app for the **Claude Certified Architect – Foundations (CCA-F)** certification. Build a single-page app that gives a full scenario-based practice exam with inline hints, per-question explanations, gotchas/tips, and per-domain mastery tracking.

**This file is the operating brief. The full synthesis — exam blueprint, the 5 exam-thinking principles, per-domain concepts, gotchas, question-writing rules, and the source list — lives in [`plan.md`](./plan.md). Read `plan.md` before building anything.**

## What we're building

A static, client-side SPA (no backend needed) that a candidate uses to drill for the exam:

- **Full practice exam** — 60 questions, 120-minute timer, scored 100–1000, pass at 720, scenario-based multiple-choice.
- **Study mode** — instant feedback + explanation per question; a **hint** button that nudges toward the right reasoning *without* giving the answer.
- **Per-domain mastery** — track accuracy against the 5 domains at their real weights (see `plan.md`); surface weak domains. The real exam has **no per-domain cut score** (pass/fail is the total scaled score), so this is a **study diagnostic**, not a second gate — the app must show whether each domain is above the bar without claiming the exam requires it.
- **Gotchas / tips / tricks surface** — a browsable reference of the traps and heuristics from `plan.md` (the 5 principles, the message-role correction, the "constrain don't add" rule, etc.).
- **Spaced repetition / redo-missed** — let the user re-drill only missed questions; bonus: SM-2-style scheduling.
- **Progress persistence** — `localStorage` (no accounts, no server, no telemetry).

## Tech (recommended, not mandatory)

- **Vite + React + TypeScript + Tailwind**, built as a static site. Questions live in `data/*.json`, loaded at runtime — content stays separate from code so the bank is easy to extend.
- Fully client-side, no backend.
- **Pin the dev server to port `5837`** in `vite.config.ts` (`server.port`) — do not use Vite's default 5173.

## Deployment — Cloudflare Worker

The goal is a **publicly shareable app deployed on Cloudflare as a Worker** (using Workers Static Assets to serve the built SPA), and a **public repo** so collaborators can use both the app and the source.

- Build the SPA (`vite build` → `dist/`) and serve it via a Worker with a `wrangler.toml` (`assets` binding pointing at `dist/`, SPA fallback to `index.html`).
- Deploy with `wrangler deploy`; ship a `wrangler.toml` in the repo so anyone can `wrangler deploy` their own copy.
- Keep it 100% static/client-side — no secrets, no server state, nothing environment-specific. Everything runs in the browser (`localStorage` for progress).
- Document the build + deploy steps in the README so collaborators can fork, run locally, and deploy their own instance.

## Content rules (critical — see `plan.md` for the full version)

- Questions must be **scenario-based** ("here's a broken agentic system + 4 plausible fixes, pick the architect's choice"), not trivia.
- **Every question carries, as schema fields:** correct answer, `hint`, `explanation` (why right wins + why each distractor fails), `domain`, `eliminationRule`, and a **`tip`** (the trick/gotcha/helpful-to-know for that question) that cross-links to the reference section. See the full schema in `plan.md` §8 — the tips/tricks are part of the schema, not optional.
- Ship a dedicated **"Get a step ahead" reference section** on the site (separate from the quiz) covering the 5 exam-thinking principles, instant-elimination rules, and gotchas — see `plan.md` §3/§5/§6 + feature #5.
- Model question/explanation format on the **open-source examples** listed in `plan.md` §7 (each annotated with how current it is); don't copy their text.
- **Avoid the tell:** do NOT let the correct answer always be the longest option or always land in slot A/B (a documented flaw in AI-generated banks). Randomize option order at render time; write distractors of comparable length.
- Distractors must be **plausible real engineering mistakes**, not absurd filler.
- Grading is **deterministic** (fixed answer key), never LLM-judged.
- **Off-blueprint content is kept, not dropped — flag it.** Topics the official Exam Guide's Out-of-Scope list rules out (MCP transports, `cache_control` placement) carry `examScope: 'supplementary'`. Supplementary content is excluded from exam draws, from scoring, and from mastery math, and renders with a visible "Not on the exam" badge. Absent = `blueprint`. Never add a supplementary question to make the bank look bigger — the exam bank must stand on its own at ≥60 items (enforced by the validator).
- **Key on behaviour, never on a brand name.** The guide tests routing/chaining/parallel *behaviour* but never uses the "Building Effective Agents" pattern names (`orchestrator-worker`, `evaluator-optimizer` — zero hits). A question whose answer hinges on recognising a name is off-blueprint even when the concept is not.

## Conventions

- Owned repo: this `CLAUDE.md` is just `@AGENTS.md`; keep operational guidance here in `AGENTS.md`, keep the deep brief in `plan.md`.
- Keep a `STATUS.local.md` (gitignored) with current build state + next steps.
- Commit atomically; work on `main`.
- Intended to be a **public repo shared with collaborators** — keep it generic and self-contained; no secrets, no private/internal references.
