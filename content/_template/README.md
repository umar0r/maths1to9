# Lesson template

Copy this folder, rename it to your lesson slug, then work through the
`CHANGE:` markers in each file. Everything wiring-related (the single
morphing answer button, section gating, engine hooks) is already done —
you only replace content.

## The three moving parts

1. **`lesson.json`** — titles, method steps, worked examples. The engine
   renders these directly.
2. **`interactive.js`** — your Try It questions and any bespoke Learn /
   Method visuals. Contains the single-button state machine.
3. **`questions.js`** — the endless Practice generators. Contains the
   same single-button machine per question card.

## The single answer button

One button per question, three phases:

| phase       | label          | click does            |
|-------------|----------------|-----------------------|
| `answering` | Check          | marks the answer      |
| `wrong`     | Try again      | resets the question   |
| `correct`   | Continue / Next question | advances    |

It is disabled until an option is selected. Never add a second
Check/Next button.

## Section gating

The lesson-level forward button is not shown until the current
section is complete. Two events control it:

```js
// when your activity mounts:
document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
    detail: { sectionId: 'interactive' }
}));

// when the pupil finishes it:
document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
    detail: { sectionId: 'interactive' }
}));
```

Section ids the engine knows: `explanation` (Learn), `method`,
`interactive` (Try it), `worked-examples`, `question-bank` (Practice).
Sections that never dispatch a gate are ungated (e.g. Worked examples),
and older lessons that predate gating keep working unchanged.

Practice completes after `QUESTIONS_TO_COMPLETE` checked questions
(default 5), which unlocks "Finish lesson".

## Skill assessment

Map each stable Practice generator name to the skill it genuinely
assesses in `lesson.json`:

```json
"assessment": {
    "question_types": {
        "sample": "place-value",
        "compare": ["order-numbers", "inequality-symbols"]
    }
}
```

When an answer is checked, `questions.js` calls the shared
`Maths1to9Lesson.recordAssessment()` function with the generator name,
the question id and whether the answer was correct. The lesson engine
resolves the skill id from `lesson.json`; the question bank must not
store skill ids or calculate mastery itself. Keep the same question id
when a pupil retries so first-try accuracy remains honest.

Only map skills assessed by Practice. A skill taught in the lesson but
not tested by its question bank remains in `curriculum.json` and must
not be added to the assessment map.

## Lesson video (optional)

Add a `video` object inside `explanation` (or at the top level of
`lesson.json`) and the engine renders it at the top of Learn — before
the text, so a teacher screen-sharing can play it without scrolling:

```json
"explanation": {
    "video": {
        "youtube_id": "dQw4w9WgXcQ",
        "title": "Place value in 3 minutes",
        "caption": "Watch first, then read the ideas below."
    }
}
```

For a self-hosted file use `"mp4": "./video.mp4"` (plus optional
`"poster": "./poster.jpg"`) instead of `youtube_id`. YouTube embeds use
the privacy-enhanced `youtube-nocookie.com` domain. Delete the block if
the lesson has no video.

## Saved progress

`assets/js/progress.js` saves each pupil's position (section reached,
sections unlocked, finished flag) on every section change and restores
it when they reopen the lesson, with a "Start over" option. Storage is
localStorage today behind an adapter interface; when user accounts
exist, implement the same four methods (`load` / `save` / `remove` /
`list`) against your API and call
`Maths1to9Progress.use(serverAdapter, userId)` — nothing else changes.
The homepage reads the same records to show Continue / Completed badges
on lesson cards (`assets/js/home-progress.js`).
