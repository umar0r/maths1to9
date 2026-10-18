# Read this first: building a Maths1to9 lesson

You are the builder. Read this whole file before you do anything, every
time, even if you think you remember it. You don't: each chat starts
fresh.

## 1. What Maths1to9 is

- A free website of maths lessons for pupils in England studying for GCSE
  maths (ages about 14 to 16, grades 1 to 9).
- Each lesson teaches **one skill**, such as "find the gradient of a line".
- It's plain PHP, HTML, CSS and JavaScript. There's no framework and no
  database. Pupils' progress is saved in their browser.
- Locally it runs in XAMPP at `http://localhost/maths1to9/`.
- The live site is a static copy of the site in `dist/`, made by
  `./build.sh`. DigitalOcean publishes `dist/` from `main` every time
  `main` changes. If you don't rebuild and commit `dist/`, nothing changes
  on the live site.

## 2. Who does what

- **Umar** owns the site. Only Umar decides what gets merged into `main`.
- **Claude** writes the lesson spec and reviews your work.
- **You** build exactly what the spec says, on your own branch, then
  report and stop.

The spec is the job. It lives in `docs/<slug>-lesson.md`. If the spec
and this file disagree, the spec wins. If the spec looks wrong, stop and
ask; don't fix it quietly.

## 3. Words we use

| Word | Meaning |
|---|---|
| lesson | One folder in `content/<slug>/`, teaching one skill. |
| slug | The lesson's folder name, e.g. `gradient-and-intercept`. It never changes. |
| skill | An id in `content/skills.json`, e.g. `use-y-mx-c`. Progress is tracked per skill. |
| section | Every lesson has exactly four: **Learn, Try it, Practice, Check**. |
| card | One question on screen: choice (buttons), number (typed) or custom. |
| generator | Code that makes endless Practice questions from a seed. |
| engine | The shared code every lesson uses: `assets/js/lesson-engine.js`. |
| shared files | `lesson-engine.js`, `app.css`, `progress.js`, `graph.js`, `graph.css`, `content/_template/`. |
| placeholder | A `curriculum.json` entry with no folder yet. The homepage hides it. |

## 4. Where things are

```
content/<slug>/            one lesson: index.php, lesson.json,
                           interactive.js (Learn), questions.js
                           (Try it, Practice, Check), maybe a helper
                           .js and lesson.css
content/_template/         copy this to start a new lesson
content/curriculum.json    the list of lessons, in homepage order
content/skills.json        every skill
content/collections.json   routes like "Graphs"
assets/js, assets/css      shared code: don't touch unless the spec says
docs/                      specs and rules (see step 3 below)
tests/                     unit tests and browser (Playwright) tests
dist/                      the built static site; commit it
```

The best example of a finished lesson is the newest one in
`content/` that the spec names. Copy its patterns.

## 5. The rules that never change

1. **One skill per lesson.** Four sections: Learn, Try it, Practice,
   Check.
2. **One main button** at the bottom of the screen. The engine owns it
   (Check → Try again → Continue, Next, All lessons). Never add a second
   action button or your own Back link.
3. **Don't change shared files** unless the spec says so, in its own
   commit. Never patch what the engine draws from inside a lesson (no
   "find the element after render and change its text"). If the lesson
   needs something the engine doesn't have, stop and ask.
4. **Plain English** for 14-year-olds. Short sentences. One idea per
   screen. Pictures and hands-on activities, not walls of text.
5. **Multiple choice and typed answers**, mixed, in Try it, Practice and
   Check. Every wrong option is a real mistake a pupil makes, with its own
   feedback.
6. **No exam boards** (AQA, Edexcel, OCR) or their codes anywhere.
7. **Practice uses a generator**, never a fixed list. It uses the seeded
   `random` it's given, so a reload rebuilds the same questions.
8. **Save everything.** Reload, Back and coming back later show the
   pupil's work exactly as they left it. Points never count twice.
9. **Readable code** in the style of the files around it. No minified
   one-liners.
10. **Delete `README.md`** from your copy of the template. Leave no notes
    in the lesson folder: `build.sh` publishes everything in it.
11. **Never merge into `main` or push `main`.** Push only your own branch.

## 6. How to build a lesson, step by step

Do these in order. Don't skip a step because it seems obvious.

**Step 1. Read the spec.** Read `docs/<slug>-lesson.md` from top to
bottom. Write down every "stop and ask".

**Step 2. Get the code ready.**
- `git fetch origin`. Your branch starts from **`origin/main`**, not
  local `main` (local `main` is often behind).
- Make the branch the spec names, usually `codex/<slug>`.
- Check the spec's "Before you start" conditions (for example "main has
  PR #9"). If one fails, stop and say so.
- The main checkout has uncommitted files about DfE subject content
  (`content/gcse-subject-content.json`, `scripts/`,
  `docs/lesson-content-links.md`, `tests/subject-content.test.cjs`,
  `.gitignore`, `tests/lessons.test.cjs`). They aren't yours. Don't
  change, commit or delete them.
- If you work in a separate checkout or worktree, it has no
  `node_modules`. Symlink the main checkout's `node_modules` in so the
  tests can run; don't commit the symlink.

**Step 3. Read the rules, in this order:**
1. `docs/lesson-specification.md`
2. `content/_template/README.md`
3. `docs/shared-lesson-components.md`
4. `docs/custom-answer-widget.md`
5. `docs/lesson-scoring.md`
6. `docs/retain-completed-work.md`
7. `docs/shared-graph.md` (for lessons with graphs)

Then open the example lesson the spec names and see how it does each
thing.

**Step 4. Start the lesson folder.** If the spec says to use an existing
placeholder slug, use it. Copy `content/_template/` to
`content/<slug>/`. Delete the copied `README.md`. Work through every
`CHANGE:` marker.

**Step 5. Register it.** Make the `skills.json`, `curriculum.json` and
`collections.json` changes the spec lists. Change nothing else in those
files.

**Step 6. Build Learn**, screen by screen, in the order the spec gives.
After each screen, open it in the browser and check it does what the spec
says.

**Step 7. Build Try it.** The questions, the options and the feedback
are word for word from the spec.

**Step 8. Build Practice**: the generator, with the types, number ranges
and options the spec lists.

**Step 9. Build Check**: the fixed questions and the summary.

**Step 10. Bump versions.** Every file you changed is loaded with
`?v=<number>` in `index.php`. Raise the number so browsers load the new
file.

**Step 11. Test.**
- `node --check` on every JS file. Check `lesson.json` is valid JSON.
- `npm test` (unit tests, seconds).
- `npm run test:ui` (browser tests, minutes). On a **first build** or a
  round that touches a shared file, run the full suite on your branch
  **and** on `origin/main`, and compare. On a **fix round** that touches
  only the lesson, run `node tests/runner/run-all.cjs --ui --only <slug>`.
- Add the unit and browser tests the spec asks for.
- Never weaken or delete an existing test to make it pass. If one fails
  that you didn't cause, say so in the report.

**Step 12. Check it yourself in a real browser**, at desktop width and
at 375 px (phone), with touch on too. Go through every line of the
spec's Checks list. Use real clicks: the main button ignores a JavaScript
`.click()`. Do a full page load (not just a `#hash` change) after
changing code.

**Step 13. Build the static site.** Run `./build.sh` (XAMPP must be
running). Check the lesson works on the `dist/` site too, including the
last button going to the homepage.

**Step 14. Commit** in the commits the spec lists, including `dist/`
and the spec file if the spec says so. Clear messages that say what
changed. Push your branch.

**Step 15. Report and stop.** Use the spec's Report section: commit
hash, test results (yours compared with `main`), every check you did,
the planned maximum score, template findings, and anything you couldn't
do. Then **stop**. Don't start the next thing.

## 7. When to stop and ask

Stop, say what's wrong and suggest a fix, then wait, when:
- the spec says "stop and ask"
- the spec seems wrong, or two parts disagree
- the lesson needs a shared feature that doesn't exist
- a test you didn't touch starts failing because of your change
- something on the branch or in the working tree is in your way

Don't work around it and report it afterwards.

## 8. Mistakes made before (don't repeat them)

- Saying "done" or "checked" without checking in the browser.
- Running only `npm test` and skipping `npm run test:ui`.
- Option buttons without `role="group"`, so the shared highlight styles
  didn't apply.
- Re-rendering a whole activity on every slider move, so the slider lost
  focus mid-drag.
- Hard-coding the maximum score instead of letting the engine plan it.
- Leaving a `README.md` or notes in the lesson folder.
- Feedback boxes that show up empty, or show the same message twice.
- Labels on a graph sitting on top of each other at 375 px.
- Forgetting `./build.sh`, so `dist/` and the live site were out of date.
- Starting the branch from a stale local `main`.

## 9. Review rounds

After you report, Claude reviews. You'll get either an approval or a list
of fixes. For fixes: make only those changes, run the fix-round tests
(step 11), check in the browser what you touched, commit, push, report,
stop. Start a fresh chat for each round if the chat gets long.
