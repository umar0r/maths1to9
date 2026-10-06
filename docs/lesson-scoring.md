# Shared lesson scoring

`assets/js/lesson-engine.js` owns the scoring rules:

- Learning, review, guided-step and exploration activities: 5 points once.
- Correct first answer: 10 points.
- An initially incorrect answer corrected later: 5 points.

Standard engine lessons automatically record section completion, completed steps reported through `setSectionProgress()`, and answers reported through `recordAssessment()`. Navigation and hash links do not award points. Progress records include `score` and `scoreActivities`; the engine restores the latter before mounting activities. The profile-facing `Maths1to9Progress.getScoreSummary()` aggregates saved lesson scores.

## Custom interactions in standard lessons

On a meaningful interaction, use a stable ID within the lesson:

```js
Maths1to9Lesson.recordActivity({
    id: 'number-line:explored',
    kind: 'explore'
});
const score = Maths1to9Lesson.getScore();
```

Reusing an ID does not add points again. Listen to `maths1to9:score-change` on `document` to refresh a custom score display; `event.detail` contains `slug` and `score`. Do not generate a new activity ID on every drag, click or render.

## Custom lesson renderers

Rounding demonstrates deriving activity evidence from existing saved state and passing it to `Maths1to9LessonEngine.calculateScore(activities)`. Include incomplete activities to calculate the full possible score. Each activity has `id`, `kind` and `completed`. Answer activities also carry `firstCorrect` and `correct`.

Alternatively, use `Maths1to9LessonEngine.createScoreTracker(savedActivities, onChange)`. Its methods are `record(activity)`, `getScore()` and `export()`. Persist `export()` using the shared progress store and pass it back on reload. Its maximum score covers registered activities, so register the planned activities with `completed: false` when a fixed maximum is needed.

## Default points display

Every standard lesson uses a compact header with an always-visible earned-points circle, including Learn and Practice. The ring shows earned points divided by the planned maximum, never the current stage number. Stage navigation continues to show completion separately. This is the default for new lessons; do not implement a stage-number circle in custom headers.

The engine reserves section activities, configured guided examples, question-bank session slots and final-check questions before rendering. Reserve additional custom activities with `score_activities` in lesson JSON (`id` and `kind`), or `recordActivity({id, kind, completed:false})` before the learner starts. Report guided progress as soon as a step is solved, including the final step. Report every assessed attempt, including corrections, with a stable question ID. Assessed progress must not also award guided points. Navigation, reloads and repeated attempts never award the same activity twice.
