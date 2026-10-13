# Lesson specification

Use this specification when creating or changing a lesson. Read it alongside
`docs/lesson-scoring.md` and the most recent lesson that follows these rules.
User instructions take precedence. Add future agreed requirements here.

## Structure and content

- Teach one clearly stated skill; register its existing skill ID in
  `content/curriculum.json` and add the lesson to the relevant collection.
- Use exactly four sections: **Learn, Try it, Practice, Check**.
- Put the method and worked example inside Learn, rather than adding sections.
- Give three or four distinct answer options for every multiple-choice question,
  with exactly one correct answer.
- Verify every question, option, explanation and worked calculation. Use
  sensible rounding for decimal distractors; avoid accidental truncation.
- Keep lesson content and saved progress under a stable, matching slug.
- Make wrong options real misconceptions, with feedback that explains them.
- Practice generators use the seeded `random` they are given, including for
  shuffling, so saved questions rebuild with the same numbers on reload.

## Shared components

- New lessons use the lesson engine and shared components: section state,
  question card, question set, results list, score panel, back button and
  helpers. Copy `content/_template/` and follow
  `docs/shared-lesson-components.md` for the API.
- A lesson that needs its own renderer (`data-lesson-renderer="custom"`)
  needs the user's approval first.
- Don't copy shared code into a lesson. If the lesson needs behaviour the
  engine doesn't have, propose an engine change.

## Buttons and navigation

- Show one main action button at a time. The question card uses
  Check → Try again after a wrong answer → Continue after a correct answer.
  Never show a separate Continue alongside a question action button.
- Use the engine-owned subtle "‹ Back" control at the top, enabled through
  `navigation.back_button`. It only changes the view, never answers, points
  or completion. Lessons never add their own back links.
- The last screen's main button says **All lessons** and reaches the homepage;
  Continue is for moving to another screen or section inside the lesson.
- Disable Check until an answer is selected. Give useful feedback for errors,
  allow correction, and keep the same question ID on retry.
- Keep section hash links open for direct testing. Navigation must never award
  points or mark an unanswered activity complete.
- Finish only after all required activities are completed. All lessons must
  return to the homepage on both the PHP site and the built `dist/` site.
  Use `../../` for lesson return links, including JavaScript navigation; do not
  target `../../index.php`, which does not exist in the static build.

## Score and persistence

- Use the shared engine scoring rules and an always-visible header score circle.
- For custom lessons, use the existing `.rounding-score` wrapper containing
  `.practice-progress-ring` and the earned-points span. Keep the accessible
  earned/maximum label on the wrapper so existing checks recognise it.
- The circle displays earned points against the fixed planned maximum, never
  section numbers. Register all planned activities before interaction.
- Correct first answers earn 10 points; corrected answers earn 5. Learning
  activities earn 5 once. Record every assessed attempt with stable IDs.
- Preserve first-attempt accuracy, score, position and completion on reload.
  Repeated clicks, revisits and reloads must not award duplicate points.
- Keep the pupil's work. Save every answer (what they chose or typed, right
  first time, phase) so a reload returns to the same question in the same
  state. A finished section shows the completed work read-only, never an empty
  "complete" card. See `docs/retain-completed-work.md`.
- Report assessed skills through the shared progress API.
- Finished Practice offers Practise again: a new seeded session, keeping the
  five most recent earlier sessions. Points stay unchanged; answers still
  count as skill evidence. It never resets Check or lesson completion.

## Delivery and verification

- Leave existing tests unchanged unless the user authorises test work. Do not
  weaken tests to accommodate inconsistent lesson markup.
- Check JavaScript/PHP syntax and JSON validity.
- Check desktop and phone layouts: three or four options, one main action, visible score,
  readable content, no overflow and no JavaScript errors.
- Verify a full correct run, one wrong-then-correct run, reload persistence,
  deep links, completion and the All lessons destination. Verify the final
  button on the built `dist/` site and confirm it reaches the homepage without
  a 404.
- Check homepage listing, curriculum skill ID, asset paths and cache versions.
- Run `./build.sh` before delivery of static-site changes and verify the lesson
  and updated assets exist in `dist/`. Report if the build cannot be completed.
- State exactly which checks ran and any remaining limitations. Do not claim
  the full-run suite covers a lesson unless its solver is registered.

### How much to run each round

`npm test` takes seconds: run it every round. The browser suite takes
minutes, so match it to the round:

- **First build, or any round that changes a shared file** (`lesson-engine.js`, `app.css`, `progress.js`, `graph.js`,
  `graph.css`, the template): run the full `npm run test:ui` and compare
  with `main`, and do every browser check in the lesson spec.
- **Fix rounds that change only the lesson's own files:** run just its
  browser tests (`node tests/runner/run-all.cjs --ui --only <slug>`), and
  check in the browser only what the fix touched, at desktop and 375 px.
  Don't rerun `main` or the PHP and `dist/` full runs.
- Say in the report which kind of round it was and what ran.
- The reviewer runs the full suite on the final commit before approving the
  merge, so a fix round never skips it altogether.

## Per-lesson brief (fill in)

- Title / slug:
- One skill / existing skill ID:
- Learn method and worked example:
- Try it questions:
- Practice questions:
- Practice generators and their question types:
- Ready score (optional):
- Check question:
- Correct answers and three or four options for each:
- Planned maximum score:
- Additional agreed requirements:
- Checks performed / remaining limitations:

## Deferred test work

When authorised, add this lesson's solver to the full-run suite and add maths
checks for its answers. Current lesson: `convert-a-fraction-to-a-percentage`.
Do not treat this note as authorisation to change or run tests.
