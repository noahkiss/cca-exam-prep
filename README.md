# CCA-F Exam Prep

A free, open-source practice app for the **Claude Certified Architect – Foundations (CCA-F)** exam.

**Live:** https://cca-exam-prep.noahkiss.workers.dev

It runs entirely in your browser — no accounts, no server, no telemetry. All progress is stored in `localStorage`.

## Features

- **Study mode** — answer scenario-based questions with instant feedback, a per-question hint that nudges your reasoning without giving away the answer, and a full explanation of why the right choice wins and each distractor fails.
- **Full timed exam** — 60 questions, 120-minute timer, scored 0–1000 (pass at 720), just like the real thing.
- **Per-domain mastery** — accuracy tracked against the five exam domains at their real weights, so you can see whether *each* domain clears the bar, not just your overall average.
- **"Get a step ahead" reference** — a browsable guide to the exam-thinking principles, instant-elimination rules, and common gotchas.
- **Redo-missed + spaced repetition** — re-drill only the questions you missed, with SM-2-style scheduling.

## Tech stack

- **Vite + React + TypeScript + Tailwind v4**, built as a static SPA.
- Deployed as a **Cloudflare Worker** using Workers Static Assets.
- Fully client-side — questions load from JSON at runtime, progress persists to `localStorage`.

## Local development

```bash
npm install
npm run dev        # http://localhost:5837
npm run build      # production build -> dist/
npm run preview    # preview the production build locally
```

## Deploy your own

1. Install Wrangler: `npm install -g wrangler` (or use `npx wrangler`).
2. Create your own scoped Cloudflare API token with the **Workers Scripts: Edit** permission.
3. In `wrangler.toml`, set `name` and `account_id` to your own.
4. Build and deploy:
   ```bash
   npm run build
   npx wrangler deploy
   ```

### Continuous deployment (GitHub Actions)

A workflow at `.github/workflows/deploy.yml` deploys on every push to `main`. To enable it on your fork, set two repository secrets:

- `CLOUDFLARE_API_TOKEN` — your scoped token (Workers Scripts: Edit)
- `CLOUDFLARE_ACCOUNT_ID` — your account id

## Extending the question bank

Questions live in `data/questions.json`, one object per question following the schema in `src/types.ts` (correct answer, `hint`, `explanation`, `domain`, `eliminationRule`, and a `tip` that links to the reference section). Validate your additions with:

```bash
node scripts/validate-questions.mjs
```

## Content & disclaimer

This is original practice content. It is **not affiliated with or endorsed by Anthropic**, and it is **not official exam material**. The questions and principles are synthesized from publicly available documentation to help you practice the *kind* of reasoning the exam rewards. Study the real docs; don't treat anything here as authoritative.

## License

[MIT](./LICENSE) © 2026 Noah Kiss
