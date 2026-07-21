# CCA-F Exam Prep — Full Synthesis & App Plan

Everything needed to (a) understand the **Claude Certified Architect – Foundations** exam and (b) build a practice web app for it. Synthesized from the official blueprint, the two leading GitHub study repos, several passers' write-ups, and community threads (July 2026).

---

## 1. The exam at a glance

| Fact | Value |
|---|---|
| Full name | Claude Certified Architect – Foundations (CCA-F / CCAR-F) |
| Format | 60 **scenario-based** multiple-choice questions |
| Time | 120 minutes (~2 min/question) |
| Scoring | Scaled **0–1000**, **pass = 720** |
| Negative marking | **None** — answer every question, never leave blanks |
| Delivery | Skilljar (Anthropic Academy) + Pearson VUE, online-proctored or test center |
| Cost | Free for partner-company employees (first 5,000/partner), else $99–$125 |
| Validity | 12 months |
| Launched | 2026-03-12 |

**Structure quirk:** the exam draws **4 of 6 scenario sets** (~15 Q each):
1. Customer Support Resolution Agent
2. Code Generation with Claude Code
3. Multi-Agent Research System
4. Developer Productivity with Claude
5. Claude Code for Continuous Integration
6. Structured Data Extraction

Mastering all six buys a buffer — you can afford to lose your weakest domain.

**~30% of questions are concept-based; ~70% are real-world problem-solving** (per a passer). Study the concepts, but drill the judgment.

---

## 2. Domain weights (build mastery tracking against these)

| # | Domain | Weight |
|---|---|---|
| 1 | Agentic Architecture & Orchestration | **27%** |
| 2 | Claude Code Configuration & Workflows | 20% |
| 3 | Prompt Engineering & Structured Output | 20% |
| 4 | Tool Design & MCP Integration | 18% |
| 5 | Context Management & Reliability | 15% |

> Note: some guides fold **Reliability / Safety / Evaluation** into Domain 5, so expect eval/escalation/provenance questions there. Every domain must clear the bar independently — an 85% average with one weak domain can still fail.

---

## 3. The crown jewels — how the exam wants you to *think*

The exam gives you a **broken agentic system + 4 plausible fixes**; you pick the one a good architect would actually choose. These five principles (from a 843/1000 passer) resolve the majority of scenario questions:

1. **Constrain, don't add.** "More tools / more agents / bigger context window / fine-tune it" is almost always the *wrong* answer.
2. **Prompts suggest; systems enforce.** If a rule must *always* hold (money, compliance, ordering, safety) → enforce in **code or a hook**, not by asking the model nicely.
3. **Fix the earliest layer.** Most wrong answers are reasonable fixes applied *too late* in the pipeline. Trace the failure upstream.
4. **Match the fix to the failure:**
   - vague rule → explicit criteria
   - inconsistent output → few-shot examples
   - invalid JSON → schema / structured output
   - valid-but-wrong output → semantic validation
5. **Don't collapse states; escalate on policy, not vibes.** "Tool failed" ≠ "found nothing." Escalate on explicit policy/workflow triggers — **never** on sentiment analysis or model self-confidence.

**Meta-tells:** the correct answer usually *feels* reasonable, efficient, and balanced — not the most aggressive or the "guaranteed/maximal" option. "Fine-tune the model" and "tell it to be more careful" are essentially never correct — you're building a *reliable system around a fallible model*.

---

## 4. Per-domain concept bank (the load-bearing facts)

### Domain 1 — Agentic Architecture & Orchestration (27%)
- **Agent vs workflow:** fixed/known/ordered steps → deterministic **workflow** (prompt chaining). Open-ended path → **agent**. Don't over-architect a one-shot task.
- **Patterns:** routing (classify→dispatch) · orchestrator-worker (workers return **summaries**, not raw context) · evaluator-optimizer (generate→critique→refine, needs clear criteria) · parallelization/sectioning.
- **Subagents have isolated context** — they inherit NOTHING from the coordinator. All needed info must be passed explicitly in the prompt (or via files). "Analyze the findings" with no findings passed = the single most-tested trap.
- **Completion signal:** `stop_reason == "end_turn"` is the ONLY reliable "done." Never parse assistant text or rely on iteration limits.
- **Hub-and-spoke / coordinator** owns all inter-agent comms, routing, and error handling (observability).
- **Hooks = 100% deterministic; prompts = ~90% probabilistic.** Financial/compliance/ordering → hooks, not prompts.
- First fix for wrong tool selection among similar tools → **improve tool descriptions** before routing classifiers or consolidation.

### Domain 2 — Claude Code Configuration & Workflows (20%)
- **Scope:** `~/.claude/` = personal, machine-local, NOT shared via VCS. `<project>/.claude/` (or repo-root `CLAUDE.md`) = team, versioned. Team conventions must be project-scoped.
- **Hooks:** `PreToolUse` runs before a tool and can **block/deny** it (the enforcement point). `PostToolUse` runs after (e.g. auto-format). Deterministic; use for guarantees, not vibes.
- **Path-scoped rules:** `.claude/rules/` with YAML frontmatter `paths: ["**/*.test.tsx"]` → load conventions only for matching files (saves context).
- **Slash commands** live in `.claude/commands/` (project or personal).
- **Planning mode** for large/multi-file/refactor work (e.g. 45+ files, architectural decisions); direct execution for clear single-file fixes.
- **CI/CD:** headless `claude -p "<prompt>"` (omitting `-p` hangs pipelines); `--output-format json` / `stream-json` for machine-readable output.
- **Extensibility, don't conflate:** slash commands = user-invoked prompt shortcuts; hooks = deterministic shell automation on events; **subagents = separate/isolated context** for delegated work.
- Independent **review instance** (no generation context) catches issues self-review misses.

### Domain 3 — Prompt Engineering & Structured Output (20%)
- **Few-shot (2–4 pairs) beats textual description** for shaping behavior. Vague "be more conservative" without examples is ineffective.
- **Structured output:** define a **tool schema** and read its arguments — don't ask for JSON in prose and hope. Regex-on-freetext is the wrong answer.
- **Schema design:** make fields optional/nullable when the source may lack data (**required fields force hallucination**). Add `"other"`/`"unclear"` enums + detail fields rather than failing on unexpected values.
- **`tool_choice`:** `auto` (text or tool) · `any` (must call *some* tool) · `{type:"tool",name}` (that specific tool) · `none` (forbid).
- **Extended thinking** for multi-step reasoning/math/analysis (budgeted scratchpad before answering).
- **Retries** fix format/validation errors; they **fail when the required info is simply absent** from the source.
- **XML-style tags** to delimit prompt sections (`<document>`, `<instructions>`, `<examples>`).
- **Prompt caching:** mark a stable prefix (system + tools + long context) with `cache_control`; must be at the front and identical across calls; big discount + lower latency on cache reads.
- **Message structure (KNOW THE CORRECT VERSION — see §6 gotcha):** roles are `user` and `assistant`. **Tool results are `user`-role messages containing a `tool_result` content block — there is no `tool` role.**

### Domain 4 — Tool Design & MCP Integration (18%)
- **Tool descriptions are the model's primary selection mechanism** — treat them like a mini-prompt. Minimal/overlapping descriptions → misrouting. Renaming/clarifying is cheaper than a classifier.
- **MCP primitives:** **tools** (model-invoked actions) · **resources** (readable context/data) · **prompts** (reusable templates). Choosing tool-vs-resource is an architect-level call: actionable function → tool; informational reference → resource.
- **Transports:** local same-machine → **stdio** (subprocess over stdin/stdout); remote/shared → **streamable HTTP**.
- **Structured errors:** return `errorCategory` (transient/validation/business/permission), `isRetryable`, human-readable description, ideally suggested alternatives — never a raw stack trace or silent failure.
- **Empty result ≠ error.** Zero rows = successful empty result; conflating it with failure causes bad retry loops.
- **Trim tool output** — returning 40 fields when 5 matter wastes context (trim via hooks). Cap agents at **4–5 role-relevant tools**.
- **MCP scope:** `.mcp.json` in VCS = team standard; `~/.claude.json` = personal experiments.
- Irreversible actions (deletes) → enforce with a **code-level guard / PreToolUse hook / confirmation**, not prompt wording; keep tools narrowly scoped.

### Domain 5 — Context Management & Reliability (15%)
- **Long conversations:** compact/summarize older turns, keep recent turns verbatim. The window is finite — nothing manages it for free.
- **Progressive-summarization risk:** numbers, percentages, dates degrade to "about/roughly" under compression — preserve exact values explicitly.
- **Lost-in-the-middle:** models reliably use the **start and end** of context and miss the middle — put critical findings there.
- **Context isolation via subagents:** worker burns tokens in its own window, returns a distilled summary, coordinator's window stays clean — how multi-agent scales beyond one window.
- **Escalation triggers (policy, not vibes):** explicit human request, policy gap, inability to progress. **Avoid** sentiment analysis and self-rated confidence.
- **Provenance / coverage annotations:** mark well-supported conclusions vs gaps from unavailable data — transparent degradation, never silent suppression.
- **Stratified/segmented accuracy** (by doc-type + field), never a single aggregate % (97% overall can hide a broken field). Never use aggregate-only accuracy for review-reduction decisions.
- **Passing large artifacts between agents:** write to a **file/store** the next stage reads explicitly — don't assume inheritance, don't paste the full payload into every prompt.
- **Batch API:** ~50% cheaper, up to 24h, **no SLA** — great for overnight; wrong for blocking pre-merge checks.

---

## 5. Instant-elimination rules (put these in the app's "tricks" surface)

An answer is almost certainly **wrong** if it:
- Adds tools / agents / context / fine-tuning to solve a reliability problem (violates "constrain, don't add").
- Enforces a money/safety/compliance rule via **prompt wording** instead of a hook/code gate.
- Uses **sentiment or model confidence** as an escalation trigger.
- Reports **aggregate-only accuracy** to make a review/quality decision.
- Reaches for a **routing classifier** before improving tool descriptions.
- Parses **assistant text** (instead of `stop_reason`) to detect completion.
- Treats an **empty result as an error** (or a tool failure as "nothing found").
- Puts critical info in the **middle** of a long context.

---

## 6. Gotchas / tips / tricks

- **⚠️ Message-role correction:** a popular guide (paullarionov, issue #39 open) wrongly lists **`tool` as a message role.** There are only `user` and `assistant`. Tool results = a `user`-role message with a `tool_result` content block. Also, a `system` message *can* appear inline in the `messages` array (for mid-conversation instructions without invalidating the cached top-level `system` prefix) with strict placement rules — must follow a user/assistant turn, **cannot sit between a `tool_use` block and its `tool_result`** (→ 400), and later system messages take precedence. Know this cold; message structure is testable.
- **The AI-authored answer tell (tiebreaker only):** because the bank was written with Claude, correct answers skew to **slots A/B** and are often the **longest** option. Position gets shuffled on the real exam, but *length* can survive. Use only to break a genuine tie — a passer warns the tells largely vanish on the real thing, and the third-party banks that over-encode this will mislead you.
- **Third-party question banks vary in quality** — some encode reasoning that *contradicts* Anthropic guidance. Use them to drill recall, not to learn principles. Learn principles from the official guide + Anthropic docs.
- **The "guaranteed/maximal" trap:** the most aggressive or absolute option is usually wrong; correct answers feel balanced.
- **No negative marking** — never leave a blank; guess if you must.
- **Score-movement reality check (one passer's arc):** first mock 766 → early attempts 720–750 → method change → consistent 820+ → official practice 950 → real exam 843. Budget ~2 weeks / ~60 hours if coming from an adjacent field; 15–20h if already fluent with Claude Code/API/MCP.

---

## 7. Source library (deep links + what each is good for)

**Official (authoritative — learn principles here):**
- Certification page: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification (has the official **Exam Guide PDF** + official practice exam — study the guide first, save the official practice exam for last)
- Anthropic Academy (Skilljar) courses: https://anthropic.skilljar.com/ — *Building with the Claude API*, *Intro to MCP* + *Advanced Topics*, *Claude Code in Action*, *Intro to Subagents / Agent Skills*
- Anthropic docs: https://docs.anthropic.com/ · MCP spec: https://modelcontextprotocol.io · "Building Effective Agents" (agent-vs-workflow taxonomy) · Anthropic Cookbook: https://github.com/anthropics/anthropic-cookbook

**GitHub study repos (deep-dived):**
- **paullarionov/claude-certified-architect** — 13-chapter written guide in 15 languages + PDF/EPUB + **Anki deck** (`anki/`) + `practical_test_en.html` (60-Q). Actively maintained/community-corrected. *Primary reading + flashcards.* Caveat: issue #39 message-role error (see §6).
- **Connectry-io/connectrylab-architect-cert-mcp** (`npm i -g connectry-architect-mcp`) — MCP server = adaptive tutor: 390 Q, SM-2 spaced repetition, 30 handouts, 6 TS reference projects, capstone, scored mocks, **deterministic grading / zero sycophancy**. *Best interactive drill.* Caveat: last updated 2026-03 (static, may drift).
- **hong-chu/claude-certified-architect-foundations-llm-wiki** — Obsidian vault of takeaways + pitfalls; point an agent at it to be quizzed.

**Free mock exams (drill recall):**
- `claude-certified-architect-mock-exam-cyberskill.vercel.app` — rated **hardest & most exam-accurate** by multiple passers.
- `claudecertificationguide.com/mock-exam` — medium.
- `certsafari.com` — medium, hundreds of questions.
- Preporato.com (Architect/Developer/Associate sets) — vendor, multi-layer validated banks + flashcards + hands-on projects.

**Passer write-ups (the "how to think" gold):**
- 843/1000 in 2 weeks — the 5 principles in §3: https://medium.com/@yeesun.chu/how-i-passed-the-claude-certified-architect-foundations-cca-f-exam-in-2-weeks-6b967e6effb4
- 985/1000, playbook + mock (zintaen): r/ClaudeAI thread `1to0xfc`
- Community reception thread (skeptic vs "real depth like AWS SA"): r/ClaudeAI `1uqvxxm`

---

## 8. What the app should do (feature spec)

Build a static client-side SPA (see `AGENTS.md` for stack + port). Core:

1. **Exam mode** — 60 Q, 120-min countdown, no feedback until submit, scored 0–1000 (720 pass), 4-of-6 scenario sets sampled, per-domain result at the end.
2. **Study mode** — instant feedback + full explanation per question. A **Hint** button that surfaces the relevant §3 principle or §4 concept *without* revealing the answer (progressive: nudge → concept → near-give).
3. **Explanations** — for every question, why the right answer wins AND why each distractor fails (the §4/§5 reasoning), plus which §5 elimination rule applies.
4. **Domain mastery dashboard** — accuracy per domain vs the 720 bar, weighted per §2; flag weak domains; "you'd pass/fail" verdict that requires every domain above bar, not just the average.
5. **Tips & Tricks reference** — browsable surface of §3 (5 principles), §5 (elimination rules), §6 (gotchas). This is a study tool in its own right.
6. **Redo-missed + spaced repetition** — re-drill only missed questions; bonus SM-2 scheduling like Connectry.
7. **Progress persistence** — `localStorage`, no accounts/server/telemetry.

**Question authoring (see `AGENTS.md` content rules):** scenario-based, deterministic key, randomized option order, comparable-length distractors that are *real* mistakes, domain-tagged, each with hint + explanation. Seed `data/questions.json` from the concepts in §4–§6; expand toward ~200 over time. Do NOT reproduce copyrighted official exam questions — write original scenarios that teach the same principles.

---

## 9. Build sequence (suggested)

1. Scaffold Vite+React+TS+Tailwind, pin port 5837, set up `data/questions.json` loader + types.
2. Author ~30 seed questions across all 5 domains (5–7 each) using §4–§6; validate the answer key.
3. Question runner (study mode: feedback + hint + explanation).
4. Exam mode (timer, sampling, scoring 0–1000, per-domain breakdown).
5. Mastery dashboard + Tips/Tricks reference pages.
6. Redo-missed / spaced repetition + localStorage persistence.
7. Expand the bank; polish; deploy static.
