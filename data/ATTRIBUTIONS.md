# Question Bank Attributions

The practice questions in [`questions.json`](./questions.json) come from three origins:

| Origin | `source` tag | Count | License |
|---|---|---|---|
| Original (written for this project) | *(no `source` field)* | 36 | This repo's license |
| Connectry Labs — ConnectryLab Architect Cert MCP | `connectry-mit` | 146 | MIT |
| Neerajkr7 — CCA Foundations Exam Practice | `neerajkr7-mit` | 51 | MIT |

Every imported question carries a `source` field identifying its origin. Original
questions have no `source` field.

## Imported sources (MIT-licensed)

### 1. Connectry Labs — `connectrylab-architect-cert-mcp`
- Repository: https://github.com/Connectry-io/connectrylab-architect-cert-mcp
- License: MIT — `Copyright (c) 2026 Connectry LABS`
- Imported from: `src/data/questions/domain-{1..5}.json`

### 2. Neerajkr7 — `cca-foundations-exam-practice`
- Repository: https://github.com/Neerajkr7/cca-foundations-exam-practice
- License: MIT — `Copyright (c) 2026` (repository owner: Neerajkr7)
- Imported from: `src/App.jsx` (`ALL_QUESTIONS`)

## How imported questions were adapted / enhanced

Imported items were transformed to fit this project's `Question` schema
(see `src/types.ts`). Adaptations include:

- **Schema mapping** — remapped each source's domain code to our five domain codes
  (`arch`/`cc`/`pe`/`mcp`/`ctx`); options normalized to a 4-element array; the correct
  answer stored as an index.
- **Explanations** — Connectry's `explanation` + `whyWrongMap` were merged into a single
  `explanation` field (why the right answer wins **and** why each distractor fails);
  Neeraj's combined explanation was kept.
- **Added value-add fields** — we authored `hint`, `eliminationRule`, `tip`, and
  `principle` (a cross-link into our "Get a step ahead" reference) for every imported
  question. These are original to this project.
- **Scenario-set tagging** — each question was tagged with one of the six exam scenario
  sets for authentic 4-of-6 exam sampling.
- **De-biasing** — option order was permuted to keep the correct-answer index balanced
  across the bank. Distractors were also rewritten to comparable length, because in the
  imported material the correct option was the longest one in ~88% of items — a known tell
  in AI-authored banks that survives shuffling. Across the bank the correct option is now
  the longest in 17% of questions (random baseline 25%). Option order is additionally
  shuffled at render time.
- **Correctness review** — every imported question was checked against current Anthropic
  documentation and this project's exam-thinking principles. Items with a wrong or
  ambiguous answer key were re-keyed or dropped rather than shipped.

## MIT License

Both imported sources are distributed under the MIT License. The MIT permission notice
(reproduced for each source's copyright holder above) is as follows:

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
