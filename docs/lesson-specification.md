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

## Buttons and navigation

- Show one main action button at a time. It changes from Check to Continue
  after a correct answer; retries use the same button. Never show a separate
  Continue alongside a question action button.
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
- Report assessed skills through the shared progress API.

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

## Per-lesson brief (fill in)

- Title / slug:
- One skill / existing skill ID:
- Learn method and worked example:
- Try it questions:
- Practice questions:
- Check question:
- Correct answers and three or four options for each:
- Planned maximum score:
- Additional agreed requirements:
- Checks performed / remaining limitations:

## Deferred test work

When authorised, add this lesson's solver to the full-run suite and add maths
checks for its answers. Current lesson: `convert-a-fraction-to-a-percentage`.
Do not treat this note as authorisation to change or run tests.
