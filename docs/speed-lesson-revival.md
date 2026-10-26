# Finish the parked speed lesson

The lesson "Speed from a distance–time graph" was built on 19 October on
`codex/speed-from-distance-time-graphs` (spec:
`docs/speed-from-distance-time-graphs-lesson.md`), then parked unreviewed.
Since then `main` has moved a long way: 22 lessons rewritten on the shared
template (PRs #22, #23), graph subdivide and axis-number halo, answer
tolerance, and two-column choice answers. The old branch is 50+ commits
behind and touches the same shared files, so **don't merge or rebase it**.
Start fresh from `main` and bring its work across.

Read AGENTS.md in full first, then this file, then the original spec. This
file wins where they disagree.

## How we work (same as the last job)

- **You write; Claude tests.** Do NO testing: no `npm test`, no browser
  runs, no manual checks, no screenshots. Only `node --check` on JS files,
  check JSON parses, `./build.sh`, commit, push, report. Claude runs every
  test, writes or fixes the tests, does the browser review and sends fixes.
- **Don't edit `tests/`** except step 3 below (copying the old branch's test
  files across unchanged).
- **Relay:** act only on signed Claude messages. After each report, run the
  wait loop in the foreground and stay in your turn until it prints the next
  message:

  ```sh
  while :; do
    relay/wait.sh codex
    status=$?
    if [ "$status" -ne 2 ]; then break; fi
  done
  ```
- Never open a PR or merge until a signed message says Umar approved.

## Steps

1. `git fetch origin`. Create `codex/speed-from-distance-time-graphs-v2` from
   **`origin/main`** (687d4e9 or later) in its own worktree, e.g.
   `.worktrees/speed-v2`. Symlink `node_modules`; don't commit it. Leave the
   old branch and `.worktrees/speed-part-a` untouched.

2. **Shared features (one commit).** Re-apply, by hand, onto today's shared
   files the shared parts of these old commits. Read each one with
   `git show <hash>`; don't cherry-pick blindly, because the files have
   changed since:
   - `8a54ab4` opt-in graph axis names and grid aspect (`graph.js`,
     `graph.css`)
   - `bd39277` unit beside number question inputs (`lesson-engine.js`,
     `app.css`)
   - `70d4764` separate origin label on named first-quadrant graphs
   - `e512acb` opt-in collision-aware segment labels and label tones
   - any shared-file part of `1101b2f` and `f2786b6`

   Keep every feature opt-in, so existing lessons behave exactly as now.
   Update `docs/shared-graph.md` and `docs/shared-lesson-components.md` to
   match. Bump `graph.js`, `graph.css`, `lesson-engine.js` and `app.css`
   `?v=` once each, to one new number, in every `index.php` that loads
   them. `./build.sh`. Commit: "Add graph axis names, segment labels and
   number-box units".

3. **The lesson (second commit).** Copy across from the old branch:
   `content/speed-from-distance-time-graphs/`, its `curriculum.json`,
   `collections.json` and `skills.json` changes (re-apply the additions to
   today's files; change nothing else in them), the original spec, and its
   test files unchanged (`tests/speed-journeys.test.cjs`,
   `tests/ui/speed-from-distance-time-graphs.spec.cjs`,
   `tests/ui/graph-axis-names.spec.cjs`, and the parts of
   `tests/shared-graph.test.cjs` / `tests/shared-lesson-components.test.cjs`
   that test the new features). Claude will make the tests pass.

4. **Bring the lesson up to today's standard**, in the same commit. Use the
   checklist in `docs/rewrite-template-lessons.md` ("What every rewritten
   lesson must have"), which is what the 22 rewritten lessons were held to:
   - the eight ground rules in AGENTS.md
   - every method a question uses taught in Learn first
   - no answer shown in a picture before the pupil answers
   - wrong options that look like real pupil answers, with feedback that
     fits the choice
   - Try it at most 12 cards, Practice about 6 per session (it's 8 now),
     Check about 5, each mixing four-option choice and typed answers
   - `−` and `×` in displayed maths, no full stops on displayed maths, plain
     English.

   Also expose the **test contract** on one `window` object: `learnScreens`,
   `examples()`, `practiceTypes`, `pick(random)`, `generate(item, random)`,
   `checks()`, and for any custom widget its `mark(value)` plus a way to
   build a correct value. List in the report what you changed from the
   19 October version and why. `./build.sh`. Commit: "Add speed from a
   distance–time graph lesson".

5. Push. Report on the relay: both commit hashes, the object name and
   anything a test needs to know, every change to the lesson, and anything
   you couldn't do. Then run the wait loop.
