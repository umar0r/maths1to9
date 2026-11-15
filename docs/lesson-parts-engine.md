# Lesson parts: engine spec and tests

Branch: `codex/lesson-parts` from **`origin/main`** (written against
`e80c6773`). This is an engine job, not a lesson. It touches shared files,
so every stage runs the **full** browser suite on the branch **and** on
`origin/main`, and compares.

## 1. What we want

Some topics are best taught one tiny idea at a time. BIDMAS is the first:
teach Brackets fully (Learn, Try it, Practice), then Indices fully, then
Division and Multiplication, and so on. Only at the end do pupils get
mixed BIDMAS questions, then the Check.

So a **parts lesson** runs:

```
Part 1:  Learn → Try it → Practice
Part 2:  Learn → Try it → Practice
...
Part N:  Learn → Try it → Practice
End:     Mixed Practice → Check
```

What repeats is the **kind** of section, never the content. Each part's
Learn, Try it and Practice are about that part's one idea only, and each
part's Practice has its own generator (Brackets Practice only asks about
brackets). The mixed Practice at the end has its own generator that
makes new sums using every idea. The Check is one Check for the whole
lesson, as now.

**Every lesson that exists today must work exactly as it does now.**
Parts are opt-in: only a `lesson.json` with a `parts` array uses them.

## 2. Why the engine needs work

Today the engine treats a section's id as its kind. The ids
`explanation`, `interactive`, `question-bank` and `comparison` are written
straight into the code, so there can only ever be one of each. Places on
`e80c6773` (line numbers are a guide only):

| Line | What it decides by id |
|---|---|
| 368–369 | feedback look (Try it cream, Practice / Check bubble) |
| 683, 715 | locked Practice cards; hiding the saved answer |
| 932–933, 942 | confetti, rocket, Try it auto-continue |
| 959, 977 | answer activity ids; "is this Practice?" |
| 1117 | "Start Check" label after Practice |
| 1360 | finding the Check |
| 1515–1650 | building the section list (one of each) |
| 2388, 2766, 2794, 2914, 3145, 4286, 4675, 4703, 5042 | gating and completing sections |
| 3529, 3569, 3785 | score and progress maths |
| 3919, 3988–3996 | question-set container ids; Practice / Check activity matching |

## 3. The design

### 3.1 Section kind

Add one function, `sectionKind(sectionId)`, that returns the base kind:

- `explanation`, `interactive`, `question-bank`, `comparison`, and the
  other existing ids, return themselves.
- A part section id is `<kind>--<partId>`, e.g. `interactive--brackets`.
  `sectionKind('interactive--brackets')` returns `interactive`.
- Add `sectionPart(sectionId)`, which returns `'brackets'` for the
  example above and `null` for a normal section.

Every place in section 2 that asks "is this Try it / Practice / Check?"
asks `sectionKind(id) === ...` instead of `id === ...`. For every
existing lesson `sectionKind(id) === id`, so nothing changes for them.

Only the decisions about **kind** change. Anything that is really about
**this one section** (saves, scores, hashes, Back, Reset, positions) keeps
using the full section id, so two Try its never share anything.

### 3.2 `lesson.json` for a parts lesson

```json
{
  "layout": "parts",
  "parts": [
    {
      "id": "brackets",
      "label": "Brackets",
      "explanation":   { "hide_eyebrow": true, "hide_heading": true },
      "interactive":   { "hide_eyebrow": true, "hide_heading": true },
      "question_bank": { "hide_eyebrow": true, "hide_heading": true, "session_length": 4 }
    },
    { "id": "indices", "label": "Indices", "...": "same shape" }
  ],
  "question_bank": { "hide_eyebrow": true, "hide_heading": true, "session_length": 6 },
  "comparison":    { "...": "as now: five questions and the summary" }
}
```

- The engine requires at least two parts. Author lessons with at most
  five parts and short, one-word labels of about eight characters or
  fewer so the stage bar fits on phones. Part ids are lowercase letters,
  digits and hyphens, unique, and never contain `--`.
- Each part must have all three of `explanation`, `interactive` and
  `question_bank`. If one is missing, the engine shows the normal
  "lesson could not load" error and logs which part is wrong. It never
  quietly skips a section.
- The top-level `question_bank` is the mixed Practice. The top-level
  `comparison` is the Check. Both are required in a parts lesson.
- A parts lesson does **not** use top-level `explanation` or
  `interactive`. If they are there, the lesson fails to load with a
  clear error.
- `section_order` and `navigation_stages` are not used in a parts lesson;
  the engine builds both (3.3, 3.5). If either is there, fail with a
  clear error.

### 3.3 Section list

Add a pure function `planSections(lesson)` that returns the ordered list
of `{ id, kind, part, label }` and is exported on
`Maths1to9LessonEngine` so unit tests can call it without a browser.
`createSectionDefinitions` uses it.

For the example above:

```
explanation--brackets, interactive--brackets, question-bank--brackets,
explanation--indices,  interactive--indices,  question-bank--indices,
question-bank, comparison
```

For every lesson without `parts`, `planSections` returns exactly the ids,
in exactly the order, that the engine produces today.

### 3.4 What a lesson's own code sees

A part's sections are drawn by the lesson's `interactive.js` and
`questions.js`, as now. They need to know which part they are drawing.

- Engine section gate and complete events carry
  `{ sectionId, kind, part }`. Existing lesson scripts that dispatch
  `{ sectionId }` still work.
- `api.getSection(sectionId)` returns `{ id, kind, part, config }`, where
  `config` is that part's block from `lesson.json` (or the top-level block
  for the mixed Practice and the Check).
- `api.runQuestionSet(sectionId, config)` works for any section whose kind
  is `question-bank` or `comparison`. Its container id is
  `<slug>-questions--<partId>` for a part's Practice, and stays
  `<slug>-questions` / `<slug>-comparison` for the mixed Practice and the
  Check.
- Answer activity ids for a part's Practice are
  `question-bank--<partId>:<session>:<n>`; the existing
  `${sectionId}:${session}:${n}` pattern already gives this once the
  kind check at line 959 uses `sectionKind`.
- Hash routes: a part's screens use `<partId>-learn-<n>`,
  `<partId>-try-it-<n>` and `<partId>-practice-<n>`. The mixed Practice
  and the Check keep `practice-<n>`, `check-<n>` and `summary`.
- The Learn and Try it modules pass `learn:<partId>` and
  `interactive:<partId>` to `useSectionState`. The question set uses the
  full section id as its save key.
- The engine awaits each part's `Maths1to9Interactives[slug]` mount and
  then `Maths1to9QuestionSets[slug]` before opening the initial hash.
  See [Parts lessons](shared-lesson-components.md#parts-lessons).

### 3.5 Navigation stages

The engine builds the stages itself for a parts lesson: one stage per
part (label = the part's `label`, sections = its three), then
**Mix** (the mixed Practice) and **Check**. A stage is locked until the
pupil reaches its first section. Parts use the in-page stage bar so all
stages stay visible on phones.

At 375 px all the stage buttons must fit without overlapping or a
sideways scroll. With five parts that is seven buttons. If they don't
fit with the existing styles, **stop and ask** with a screenshot; don't
invent a new layout.

### 3.6 Behaviour by kind (same rules as today)

- Feedback look, confetti and rocket follow the kind: part Practice and
  mixed Practice get confetti; Try it is the cream bubble; Check gets the
  rocket.
- Practice of every kind: no marking until Check (rule 22).
- After a part's last Try it example, Continue goes straight to that
  part's Practice (rule 20).
- Both part and mixed Practice end on the last answered card. There is
  no Practice summary. The last part Practice card shows **Continue**
  (into the next Learn or Mixed Practice). The last mixed Practice card
  shows **Start Check**. The Check summary ends with **All lessons**.
- Back works on every screen, including across a join: Back from Part 2
  Learn screen 1 shows Part 1's last Practice card exactly as the pupil
  left it. Reset resets only the card on screen.
- Reload or coming back later lands on the screen the pupil left, in
  the right part, with every part's work kept.

### 3.7 Scoring

- Each part's Learn, Try it and Practice reserve their activities exactly
  as a normal Learn, Try it and Practice do, under their own section ids.
- The planned maximum score is the sum over every section. Never
  hard-code it.
- Going Back and forward, reloading, or redoing a card never awards the
  same activity twice.

### 3.8 Skill progress

A parts lesson tracks one skill (the lesson's skill), as now. Part
Practice and mixed Practice answers both count as Practice evidence for
that skill through the existing `assessment.question_types` mapping. No
per-part skills.

## 4. The test lesson

Build a small, fake two-part lesson used **only by tests**:
`tests/fixtures/parts-lesson/` (`index.html`, `lesson.json`,
`interactive.js`, `questions.js`). It must not be in `content/`, so
`build.sh` never publishes it and the homepage never sees it. Load the
shared files with relative paths (`../../../assets/...`). If the test
server can't serve that folder, **stop and ask**.

Content (simple on purpose; it tests the engine, not maths teaching):

- **Part `apples`** (label "Apples"): Learn has 2 screens, each with one
  tap to do. Try it has 2 typed examples. Practice has a generator that
  makes "How many apples? 3 + 4" sums, `session_length` 3, every card
  tagged `data-part="apples"`.
- **Part `pears`** (label "Pears"): the same shape, with pears and
  subtraction, tagged `data-part="pears"`.
- **Mixed Practice**: `session_length` 4, generator draws from both and
  tags each card with its part.
- **Check**: 2 multiple choice questions (four options each) and a
  summary.

The solver lives in `tests/ui/solvers/fixtures/`. The fixture list in
`engine-runs.spec.cjs` runs it at desktop and mobile widths.

## 5. Tests to build

### 5.1 Unit tests (`npm test`)

New file `tests/lesson-parts.test.cjs`:

1. `sectionKind` and `sectionPart` for `interactive`,
   `interactive--brackets`, `question-bank--a-b`, `comparison`.
2. `planSections` on the fixture returns the 8 ids in the order in 3.3.
3. **No change for existing lessons:** for every `content/*/lesson.json`,
   `planSections` returns the same ids in the same order as a snapshot.
   Make the snapshot by running the same code on `origin/main`
   (`tests/fixtures/section-plans.json`). If any lesson differs, the test
   fails and names it.
4. Bad parts lessons fail with a clear error, one test each: one part
   only; duplicate part id; part id with `--`; a part missing
   `interactive`; top-level `interactive` present; `navigation_stages`
   present; no top-level `comparison`.
5. Navigation groups for the fixture: Apples, Pears, Mix, Check, each with
   the right section ids.
6. Planned maximum score for the fixture equals the sum of each section's
   reserved activities.
7. Each part's Practice generator, run with 20 random 32-bit seeds, only
   makes cards for its own part; the mixed generator, over the same
   seeds, makes cards from both parts. The same seed always gives the
   same cards.

### 5.2 Browser tests (`npm run test:ui`)

New file `tests/ui/lesson-parts.spec.cjs`, run against the fixture, at
desktop width and at 375 px with touch on:

1. **Order.** Pressing through gives Apples Learn → Apples Try it →
   Apples Practice → Pears Learn → Pears Try it → Pears Practice →
   Mix → Check, and the hash matches each screen.
2. **Separate saves.** Answer Apples Try it example 1 with `7`. Go on to
   Pears Try it and answer example 1 with `2`. Reload. Go Back to Apples
   Try it example 1: it still shows `7`. Pears still shows `2`.
3. **Resume.** Stop on Pears Learn screen 2, do a full page load: it
   opens on Pears Learn screen 2, with the Apples stage unlocked.
4. **Back across the join.** From Pears Learn screen 1, Back shows the
   last Apples Practice card, answered and locked as the pupil left it.
   Back is never greyed out after the first screen.
5. **Reset is local.** Reset on Pears Try it example 1 clears only that
   card; Apples Try it and Pears example 2 are untouched.
6. **Deep links.** Loading `#pears-try-it-1` before Pears is unlocked
   opens the furthest unlocked screen, not Pears. After unlocking, it
   opens Pears Try it example 1.
7. **Right practice.** Every Apples Practice card has
   `data-part="apples"`; every Pears card `data-part="pears"`; the Mix has
   at least one of each.
8. **Button labels.** End of Apples Practice: Continue. End of Mix:
   Start Check. End of Check: All lessons, which goes to the homepage.
9. **Feedback by kind.** Try it feedback is the cream bubble; a right
   answer in a part Practice and in the Mix shows confetti; the Check
   shows the rocket. No Practice card shows feedback before Check.
10. **Points never double.** Finish Apples, go Back to its first Learn
    screen, press forward again to Pears: the points are unchanged.
    Reload: unchanged.
11. **Stages at 375 px.** All four stage buttons are visible on one row,
    none overlap, and the page has no sideways scroll. Locked stages
    can't be tapped.
12. **Full run.** The engine-runs test finishes the fixture with every
    activity done and full marks.
13. **No console errors** in any of the above.

### 5.3 Regression

Run the full browser suite on the branch and on `origin/main`, and
report both pass/fail lists. If an existing test passes on the baseline
and fails on the branch, **stop and ask**. Record baseline-only failures
in the comparison.

## 6. Stages

Build one stage, test it, commit, push, report, then **wait** for review
before the next. Run `npm test` and the full `npm run test:ui` on branch
and `origin/main` at the end of every stage.

1. **Kinds, no visible change.** `sectionKind`, `sectionPart`,
   `planSections` (normal lessons only); every check in section 2 uses
   the kind. Unit tests 5.1 #1 and #3 (with the snapshot). Nothing a
   pupil sees changes.
2. **Parts: Learn and Try it.** Parse `parts` (with the errors in 3.2),
   build the section list, events with `kind` and `part`,
   `getSection`, hashes, saves, Back across the join. Fixture with
   Learn and Try it only, temporarily without Practice. Unit tests
   #2, #4; browser tests #1–#6 for the parts built so far.
3. **Parts: Practice, Mix, Check, scoring.** Part Practice containers,
   mixed Practice, Check, button labels, feedback by kind, scoring.
   Finish the fixture and its solver. Unit tests #6, #7; browser tests
   #7–#10, #12, #13.
4. **Navigation stages.** Built stages, locking, 375 px. Unit test #5,
   browser test #11. Screenshots at desktop and 375 px.
5. **Docs.** A "Parts lessons" section in
   `docs/shared-lesson-components.md`: the `lesson.json` shape, the
   events, `getSection`, hash and save-key names, and a short "how to
   write `interactive.js` for parts" with code from the fixture. Bump
   the engine `?v=` everywhere it is loaded. `./build.sh`, commit
   `dist/`.

## 7. Don't

- Don't change how any existing lesson looks or behaves.
- Don't add a second engine file or a wrapper around the engine. The
  work goes in `lesson-engine.js`.
- Don't build the BIDMAS lesson. It gets its own spec once this is merged.
- Don't touch `content/` except to bump `?v=` numbers in stage 5.
- Don't weaken or delete any existing test.

## 8. Report (each stage)

- Commit hash and branch.
- `npm test` result.
- Full `npm run test:ui` pass/fail list on the branch and on
  `origin/main`, and the difference.
- Which tests from section 5 now exist and pass.
- Screenshots (stage 4: desktop and 375 px stage buttons).
- Anything you couldn't do, and every "stop and ask".
