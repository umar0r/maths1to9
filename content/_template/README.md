# Lesson template

Copy this folder to `content/<slug>/`. Set the slug and title in
`lesson.json` and `index.php`, add the lesson and its existing skill ID to
`curriculum.json` and the relevant collection, then work through every
`CHANGE:` marker. **Delete README.md from the copy**: the build publishes
all files in a lesson folder. Remove unused optional video configuration.

Read [the lesson specification](../../docs/lesson-specification.md),
[scoring rules](../../docs/lesson-scoring.md) and
[shared component API](../../docs/shared-lesson-components.md) first.
The doubling content is an example of wiring, not a finished lesson brief.

## Files

- `index.php`: page shell, slug, current shared asset versions and lesson
  script versions. KaTeX tags are commented out; enable them only if needed
  and render whole expressions, including their left side.
- `lesson.json`: exactly Learn, Try it, Practice and Check; navigation,
  skill mapping, Practice length, fixed Check and summary. `_change` notes
  are ignored by the engine; replace or remove them before delivery.
- `interactive.js`: three saved Learn screens and two guided examples.
  Replace the counter visual with the lesson's own visual. Keep it during
  the activity and in the read-only completed examples.
- `questions.js`: seeded Practice through the shared question-set runner,
  and fixed Check through the shared question card, followed by results
  and a short summary. Add lesson CSS only for its own visual.

## Shared behaviour

Cards take `choice`, `number` or `custom` (a lesson-drawn answer with
`render`, `isEmpty`, `mark` and `answerText`); the widget lives in the
lesson's own files.

Use shared section state, question cards, results and score panels rather
than copying their code. Practice generators receive seeded `random`:
pass it to `randomInt` and `shuffle`, and save types and seeds, never text.
Map every generator type to its existing skill in `lesson.json`.
`question_bank.session_length` defaults here to 5; `ready_score` is optional.

The engine owns the single main action and the opt-in Back control.
Questions use Check → Try again → Continue. Wrong choice options remain
unavailable on retry. Earlier screens are read-only with Next; Back only
changes the view. Learn completes on reaching its last screen. The last
screen of the lesson says All lessons and returns to `../../` on both PHP
and static sites. Never add a second question action or a local Back link.

Finished Practice offers Practise again: fresh seeds, unchanged points,
new skill evidence, and the five most recent earlier sessions retained.
It never resets Check or lesson completion. Revisits show saved work.

## Skill assessment and points

Replace `REPLACE_WITH_SKILL_ID` with a real skill from `content/skills.json`,
listed for this lesson in `curriculum.json`. Map only question types that
actually assess it. For example:

```json
"assessment": { "question_types": { "sample": "find-hcf" } }
```

The shared card sends every scored attempt to `recordAssessment()` using
its stable question ID and type; the engine resolves skills and mastery.
Keep the same ID on retry. Guided cards use `scored: false` and report
completed steps with `setSectionProgress()`; their planned IDs live in
`score_activities`. Change those entries if the number of examples changes.

The default header circle shows points against the fixed planned maximum.
Learning activities earn 5 once; assessed answers earn 10 first time or 5
when corrected. Register all planned activities before interaction. Going
back, reloading and navigation never award points themselves.

## Saved progress and Start over

`useSectionState()` keeps answers, phases and cursors through the shared
progress store. Learn uses `learn`; cards use their section ID
(`interactive` or `comparison`). Practice is saved by the runner under
`question-bank`. Bump each section's version when its content changes and
provide an `upgrade()` for compatible old saves; return null for unknown
versions instead of throwing or showing answers against different content.

The existing Start over resets the whole lesson. Progress uses localStorage
behind an adapter today; accounts can use the same load/save/remove/list
interface with `Maths1to9Progress.use(serverAdapter, userId)`.
The homepage reads these records for lesson status.

## Hash links

Sections: `#explanation`, `#interactive`, `#question-bank`, `#comparison`.
Screens: `#learn-1`…`#learn-3`, `#try-it-1`…`#try-it-3`,
`#question-bank-question-1`… (runner), `#check-1`… (fixed questions).
`#summary` opens the completed Check's retained results and summary.
Locked links fall back to the screen actually available and replace the
address. Hashes never complete unanswered work or award points.

## Optional video

Keep `explanation.video` only when a video exists. Set `youtube_id` (a
privacy-enhanced youtube-nocookie embed) or `mp4: "./video.mp4"`, optionally
`poster: "./poster.jpg"`, plus title and caption. It appears above Learn.

## Delivery

Follow the verification checklist in the lesson specification, including
old saves when migrating, keyboard and 375 px layouts, wrong-then-right
answers, reloads, finished work, Practise again and both test suites.
Bump changed lesson asset versions, build dist and verify All lessons on
both sites. New lessons need a registered browser solver before claiming
that the full-run suite covers them.
