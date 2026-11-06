# Slide overview: see every slide of a lesson at once

Read `AGENTS.md` first. This is a tool for Umar, not a lesson. Pupils must
never see it.

## What Umar wants

A page that shows every slide of one lesson at once as small pictures, like
the page view in Word or the Cmd+Tab app switcher. He uses it to check the
lesson's flow without clicking through it.

Open it at:

```
http://localhost/maths1to9/editor/overview.php?lesson=negative-numbers
```

In a worktree, the same path works under that worktree's folder. Use relative
links so it works in both places.

## Why it goes in `editor/`

`build.sh` only publishes `assets/`, `vendor/`, `content/` and the rendered
pages. The `editor/` folder is not published, so a tool there can't reach the
live site. Don't put any part of this tool in `content/` or `assets/` unless
this spec says so.

## What to build

1. **`editor/overview.php`** reads `lesson` from the address. Check it against
   the real folders in `content/`, so it can only ever open a real lesson. If
   it's missing or wrong, show a plain list of lesson links.
2. **Slide list.** Every Learn, Try it, Practice and Check slide, in lesson
   order, grouped under those four names with a slide count.
3. **Thumbnails.** One small live picture per slide, in a grid that wraps to
   fit the window. Each is an `<iframe>` of the real lesson page at that slide,
   scaled down with CSS so it looks like a mini page. Don't build a copy of the
   lesson, or it will drift from the real thing. The iframes load one at a time
   as they scroll into view, so a long lesson doesn't freeze the browser.
4. **Labels.** Under each thumbnail, the slide's address, e.g. `#learn-4`.
5. **Open a slide.** Clicking a thumbnail opens the real slide in a new tab.
6. **Size control.** A small/medium/large setting on the overview page. This
   is the tool's own control, so rule 4 (one button) doesn't apply here.

## The one change to shared code

Slides past the pupil's progress are locked, so an iframe can't reach them, and
opening slides would otherwise write to the browser's saved progress.

Add an overview mode to the lesson page, in its own commit:

- It only switches on when the address has `?overview` **and** the host is
  `localhost`. On any other host it does nothing.
- All slides open, whatever the progress.
- Nothing is saved: no progress, no score, no dot positions. Umar's real saved
  progress must be exactly the same after using the overview.
- The site header, stage dots and main button can stay. Don't hide them.

Lessons that keep their own locks in `interactive.js` or `questions.js` need to
respect this too. If that means changing more than a few lessons, **stop and
ask**, and suggest doing `negative-numbers` first.

Practice questions are made from a random seed, so the overview shows whatever
that seed gives. That's fine.

## Not in this job

- **Reordering slides.** Umar said it isn't needed. Slide order lives in each
  lesson's code, so reordering would mean writing code from a web page. Don't
  start it. If it looks easy, say so in the report and stop.
- Editing slide text.
- Anything on the live site.

## Before you start

- Branch from `origin/main`. Call it `codex/slide-overview`.
- Check the live site is untouched by building and looking in `dist/`.

## Tests

- Unit test: `dist/` contains no `overview.php` and no `editor/` folder.
- Browser test on `negative-numbers`: the overview shows one thumbnail per
  slide, and a locked slide appears in it.
- Browser test: saved progress in `localStorage` is identical before and after
  loading the overview.
- Browser test: `?overview` on a non-localhost host does nothing. If that can't
  be tested with the test server, say so in the report.
- This touches a shared file, so run the full `npm run test:ui` on your branch
  and on `origin/main`, and compare.

## Checks by hand

- Open the overview for `negative-numbers`. Every slide shows, in order.
- Open it for two other lessons, including one with a graph.
- Click a thumbnail and check the right slide opens in a new tab.
- Finish a slide in the normal lesson, then open the overview, then go back.
  Your place and score haven't changed.
- Run `./build.sh` and check nothing from this tool is in `dist/`.

## Report

Commit hash, test results compared with `main`, how long the overview takes to
load for the longest lesson, and which lessons needed changes for the locks.
Then stop. Don't merge.
