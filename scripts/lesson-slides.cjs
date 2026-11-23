#!/usr/bin/env node
// Pictures of every screen of one lesson, before and after the answer.
//
//   node scripts/lesson-slides.cjs <slug> [--root <checkout>] [--out <folder>]
//                                  [--width desktop|phone] [--fast]
//
// It serves the checkout with the PHP command line server, opens the lesson in
// a fresh browser (no saved progress, and a fixed set of random numbers so
// every run shows the same questions) and works through the whole lesson the
// way a pupil would, with real clicks, drags and typing: every Learn screen,
// every Try it example, all the Practice questions, all the Check questions
// and the end page.
//
// The answer to every card comes from the lesson itself, never from the words
// on screen. A small script starts before the lesson and keeps the question
// the engine was given: the option the lesson marks correct, the lesson's own
// number answer, and the widget a custom card uses. Custom widgets are filled
// by asking the widget's own mark() which value it accepts, so a new lesson
// needs no special case here.
//
// Each screen gets two pictures: "before" (as the pupil first sees it) and
// "after" (answered, with the feedback showing). The whole walk happens twice,
// at desktop (1280 wide) and phone (375 wide, touch on).
//
// Pictures go to slides/<slug>/ and slides.json lists every shot in order, so
// slides/index.php can show them. Nothing here is published by build.sh.
//
// Options:
//   --root <folder>   the checkout to serve (default: the current folder)
//   --out <folder>    where the pictures go (default: slides/<slug>/)
//   --width <name>    desktop, phone, or both (default: both)
//   --fast            do the walk but save no pictures (a quick check)

const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const slug = args.find((arg, index) => !arg.startsWith('--') && !String(args[index - 1]).startsWith('--'));
if (!slug) {
    console.error('usage: lesson-slides.cjs <slug> [--root <checkout>] [--out <folder>] [--width desktop|phone] [--fast]');
    process.exit(64);
}
const root = path.resolve(option('--root') || process.cwd());
const out = path.resolve(option('--out') || path.join(root, 'slides', slug));
const fast = args.includes('--fast');
const wantedWidths = option('--width') || 'both';
const lessonPage = path.join(root, 'content', slug, 'index.php');
if (!fs.existsSync(lessonPage)) {
    console.error(`No lesson at ${lessonPage}`);
    process.exit(66);
}
const { chromium } = require(require.resolve('@playwright/test', { paths: [root] }));
// The lesson's own name, so the page matches the lesson it came from even when
// the checkout it was walked from is somewhere else.
const lessonTitle = (() => {
    try {
        const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content', slug, 'lesson.json'), 'utf8'));
        return typeof lesson.title === 'string' && lesson.title.trim() ? lesson.title.trim() : slug;
    } catch {
        return slug;
    }
})();
const PHP = process.env.PHP_BIN || '/Applications/XAMPP/xamppfiles/bin/php';
const PORT = Number(process.env.SLIDES_PORT || 8767);
const lessonUrl = `http://127.0.0.1:${PORT}/content/${slug}/index.php`;

// One fixed seed for the whole run, so Practice picks the same questions every
// time. The browser's Math.random is replaced before any lesson script runs.
const SEED = 20261116;

const SIZES = {
    desktop: { width: 1280, height: 800 },
    phone: { width: 375, height: 812, isMobile: true, hasTouch: true }
};

const MAIN = '.lesson-controls button.button--primary:visible';
const SECTIONS = {
    explanation: 'learn',
    interactive: 'try-it',
    'question-bank': 'practice',
    comparison: 'check'
};
const LABELS = { learn: 'Learn', 'try-it': 'Try it', practice: 'Practice', check: 'Check', end: 'End' };

/* ------------------------------------------------------------------ *
 * Keeping the question the lesson gave the engine.
 *
 * Runs before any lesson script. window.Maths1to9LessonEngine is set by the
 * shared engine, so an accessor catches that assignment and wraps
 * createQuestion. Every card the engine draws then leaves behind the config
 * that made it: the correct option, the lesson's answer and the widget.
 * ------------------------------------------------------------------ */

const CAPTURE = function () {
    let engineValue;
    const copy = value => {
        try { return value === undefined ? null : JSON.parse(JSON.stringify(value)); }
        catch { return null; }
    };
    function install(engine) {
        if (!engine || engine.__slidesCapture) return;
        engine.__slidesCapture = true;
        const original = engine.createQuestion;
        if (typeof original !== 'function') return;
        window.__slides = { entries: {}, next: 0 };
        engine.createQuestion = function (container, config, ...rest) {
            const entry = {
                index: window.__slides.next++,
                input: config?.input ?? null,
                answer: config?.answer === undefined ? null : copy(config.answer),
                options: (config?.options || []).map(option => ({ label: option?.label ?? '', correct: option?.correct === true })),
                fields: Array.isArray(config?.fields) ? config.fields.map(field => ({ id: field.id, label: field.label })) : null,
                questionType: config?.questionType ?? null,
                prompt: config?.prompt ?? '',
                widget: config?.widget ?? null,
                onChange: null
            };
            const widget = entry.widget;
            if (widget && typeof widget.render === 'function' && !widget.__slidesWrapped) {
                const render = widget.render.bind(widget);
                widget.render = (host, options) => {
                    entry.onChange = options?.onChange ?? null;
                    return render(host, options);
                };
                widget.__slidesWrapped = true;
            }
            const card = original.call(this, container, config, ...rest);
            const articles = container?.querySelectorAll?.('.question-card') || [];
            const article = container?.lastElementChild?.matches?.('.question-card')
                ? container.lastElementChild : articles[articles.length - 1];
            if (article) article.dataset.slidesEntry = String(entry.index);
            window.__slides.entries[entry.index] = entry;
            return card;
        };
    }
    Object.defineProperty(window, 'Maths1to9LessonEngine', {
        configurable: true,
        get() { return engineValue; },
        set(value) { engineValue = value; install(value); }
    });
};

/* ------------------------------------------------------------------ *
 * Reading the page.
 * ------------------------------------------------------------------ */

async function readScreen(page) {
    return page.evaluate(() => {
        const visible = element => !!element && !!element.getClientRects().length &&
            getComputedStyle(element).visibility !== 'hidden' && !element.closest('[hidden]');
        const text = element => (element?.textContent || '').replace(/\s+/g, ' ').trim();
        const section = window.Maths1to9Lesson?.getCurrentSection?.();
        const main = [...document.querySelectorAll('.lesson-controls button.button--primary')].find(visible);
        const heading = [...document.querySelectorAll('[data-screen-heading]')].find(visible)
            ?? [...document.querySelectorAll('[data-screen-heading]')].at(-1);
        const prompt = [...document.querySelectorAll('.question-prompt')].find(visible);
        const root = document.querySelector(`#lesson-section-${section?.id}`) ?? document.body;
        const paragraphs = [...root.querySelectorAll('p')].filter(visible).map(text);
        const feedback = [...document.querySelectorAll('.question-feedback.is-visible')].find(visible);
        const card = [...document.querySelectorAll('.question-card')].find(visible);
        const entryIndex = card?.dataset.slidesEntry;
        const entry = entryIndex === undefined ? null : window.__slides?.entries?.[entryIndex];
        return {
            hash: window.location.hash,
            sectionId: section?.id ?? '',
            heading: text(heading),
            prompt: text(prompt),
            paragraphs,
            feedback: text(feedback),
            // Only the Practice results page has a score panel of this shape in its own section.
            summary: Boolean(root.querySelector('.practice-summary__score')),
            main: main ? { label: text(main), disabled: main.disabled } : null,
            options: [...document.querySelectorAll('.question-card-options button')].filter(visible).length,
            input: Boolean([...document.querySelectorAll('.question-card input[type=text]')].find(visible)),
            fields: Boolean([...document.querySelectorAll('.question-answer-fields input')].find(visible)),
            // A hands-on line can put its own answer on the line it draws.
            handsOn: (() => {
                const line = [...root.querySelectorAll('[data-answer]')].find(visible);
                if (!line) return null;
                return {
                    answer: Number(line.dataset.answer),
                    current: Number(((line.getAttribute('aria-label') ?? '').replace(/\u2212/g, '-')
                        .match(/dot is on\s*(-?\d+(?:\.\d+)?)/i) ?? [])[1])
                };
            })(),
            // What the lesson itself says the answer is.
            question: entry ? {
                index: entry.index,
                input: entry.input,
                answer: entry.answer,
                questionType: entry.questionType,
                options: entry.options,
                fields: entry.fields,
                hasWidget: Boolean(entry.widget),
                slots: [...card.querySelectorAll('[data-slot]')].map(slot => slot.dataset.slot)
            } : null
        };
    });
}

const settle = (page, milliseconds = 400) => page.waitForTimeout(milliseconds);

// Press the one main button and wait until the screen has actually changed.
async function advance(page, before) {
    const main = page.locator(MAIN).first();
    if (!await main.count() || !await main.isEnabled()) return false;
    await main.click();
    for (let tries = 0; tries < 40; tries++) {
        await page.waitForTimeout(100);
        const now = await readScreen(page);
        if (now.hash !== before.hash || now.heading !== before.heading || now.prompt !== before.prompt) return true;
    }
    return false;
}

/* ------------------------------------------------------------------ *
 * Doing a screen.
 * ------------------------------------------------------------------ */

// Fill a choice or typed card from the lesson's own config.
async function answerCard(page, question) {
    if (question.options?.length) {
        const index = question.options.findIndex(option => option.correct);
        if (index < 0) return null;
        const options = page.locator('.question-card-options button:visible');
        if (!await options.count()) return null;
        await options.nth(index).click();
        return question.options[index].label;
    }
    if (question.input === 'number') {
        if (question.fields) {
            const inputs = page.locator('.question-answer-fields input:visible');
            if (await inputs.count() < question.fields.length) return null;
            for (let index = 0; index < question.fields.length; index++) {
                await inputs.nth(index).fill(String(question.answer[question.fields[index].id]));
            }
            return JSON.stringify(question.answer);
        }
        const input = page.locator('.question-card input[type=text]:visible').first();
        if (!await input.count()) return null;
        await input.fill(String(question.answer));
        return String(question.answer);
    }
    if (question.input === 'custom') {
        // Ask the widget which candidate it marks correct, then hand that
        // value to the card exactly as the widget would after a pupil's tap,
        // drag or typed digit.
        return page.evaluate(index => {
            const entry = window.__slides?.entries?.[index];
            const widget = entry?.widget;
            if (!entry || !widget || typeof widget.mark !== 'function' || typeof entry.onChange !== 'function') {
                return { given: null, reason: 'the card has no widget answer to use' };
            }
            const card = document.querySelector(`.question-card[data-slides-entry="${index}"]`);
            const slots = [...(card?.querySelectorAll('[data-slot]') || [])].map(slot => slot.dataset.slot);
            const candidates = [];
            const add = value => {
                if (value === undefined) return;
                if (!candidates.some(other => JSON.stringify(other) === JSON.stringify(value))) candidates.push(value);
            };
            const answer = entry.answer;
            if (answer === null) {
                // A tap-the-point card keeps its answer in the widget only: try
                // each gap between the digits it shows.
                if (card?.querySelector('.decimal-point-row')) {
                    const digits = card.querySelectorAll('.decimal-digit').length;
                    for (let gap = 0; gap <= digits; gap++) add({ gap });
                }
                // A card that fills one mark per row (like a signs table) takes
                // a list of filled rows; the widget itself draws the values.
                for (let length = 1; length <= 8; length++) add(Array(length).fill(true));
            }
            if (answer !== null && typeof answer === 'object' && !Array.isArray(answer)) add(answer);
            else if (answer !== null) {
                const text = String(answer).replace(/,/g, '');
                const plain = text.replace(/\u2212/g, '-');
                add(text);
                add(plain);
                const number = Number(plain);
                if (Number.isFinite(number)) add(number);
                // A tap-the-point widget takes { gap: index } where the point goes.
                const digitsOnly = text.replace(/[^0-9]/g, '');
                add({ gap: text.includes('.') ? text.indexOf('.') : digitsOnly.length });
                // A card of digit slots takes { digits: { slot: digit } }. Try
                // the answer's digits against the slots it shows, from the left
                // and the right, because a table may leave leading slots empty.
                if (digitsOnly && slots.length) {
                    for (let offset = 0; offset + digitsOnly.length <= slots.length; offset++) {
                        const digits = {};
                        for (let place = 0; place < digitsOnly.length; place++) {
                            digits[slots[offset + place]] = digitsOnly[place];
                        }
                        add({ digits });
                        const padded = { ...digits };
                        for (let place = 0; place < offset; place++) padded[slots[place]] = '0';
                        add({ digits: padded });
                    }
                }
            }
            for (const candidate of candidates) {
                // The engine will not accept a value the widget calls empty.
                try { if (typeof widget.isEmpty === 'function' && widget.isEmpty(candidate)) continue; } catch {}
                let correct = false;
                try { correct = widget.mark(candidate)?.correct === true; } catch {}
                if (!correct) continue;
                try { entry.onChange(candidate); } catch { continue; }
                let given = '';
                try { given = widget.answerText?.(candidate) ?? ''; } catch {}
                return { given: String(given), reason: null };
            }
            return { given: null, reason: `the lesson's answer "${answer}" was not one the widget accepts` };
        }, question.index);
    }
    return null;
}

// A Learn screen can wait for the pupil to tap or drag something before its
// button will move on. There is no question card to fill, so use the screen's
// own controls, one at a time, until the main button is ready. This keeps the
// walk moving without knowing anything about the lesson.
// The line a hands-on screen draws says the value it wants in data-answer.
// Move the dot there with the arrow keys the line already listens for.
async function answerHandsOn(page, info) {
    const line = page.locator(`#lesson-section-${info.sectionId} [data-answer]:visible`).first();
    if (!await line.count()) return null;
    const target = Number(await line.getAttribute('data-answer'));
    if (!Number.isFinite(target)) return null;
    await line.focus();
    let current = Number.isFinite(info.handsOn?.current) ? info.handsOn.current : null;
    if (current === null) {
        for (let tries = 0; tries < 60; tries++) {
            await page.keyboard.press('ArrowRight');
            const label = (await line.getAttribute('aria-label') ?? '').replace(/\u2212/g, '-');
            const found = label.match(/dot is on\s*(-?\d+(?:\.\d+)?)/i);
            if (found) { current = Number(found[1]); break; }
        }
    }
    if (current === null) return null;
    const key = target >= current ? 'ArrowRight' : 'ArrowLeft';
    for (let step = 0; step < Math.abs(target - current); step++) await page.keyboard.press(key);
    await settle(page, 200);
    return String(target);
}

async function readyTheScreen(page, info) {
    const main = page.locator(MAIN).first();
    if (await main.count() && await main.isEnabled()) return true;
    const section = page.locator(`#lesson-section-${info.sectionId}`);
    const controls = section.locator('button:visible, [role=button]:visible, [tabindex="0"]:visible');
    // Some pages need several taps on the same card (flip every sign, turn the
    // pattern round, tap every number), so go round the controls again.
    for (let attempt = 0; attempt < 40; attempt++) {
        const count = Math.min(await controls.count(), 12);
        if (!count) return false;
        const control = controls.nth(attempt % count);
        if (!await control.isEnabled().catch(() => false)) continue;
        await control.click({ trial: false }).catch(() => {});
        await settle(page, 250);
        if (await main.count() && await main.isEnabled()) return true;
    }
    return false;
}

// One screen: the "before" shot, the answer, the "after" shot. Leaves the page
// on the answered screen; the walk presses the main button afterwards.
async function captureScreen(page, width, index, section, number, info) {
    const record = {
        section, label: LABELS[section], number,
        heading: info.summary ? 'Your practice results' : info.heading,
        prompt: info.prompt,
        before: null, after: null, answered: false, skipped: null, given: null
    };
    const name = side => `${width}/${String(index).padStart(2, '0')}-${section}-${number}-${side}.png`;
    record.before = name('before');
    if (!fast) await page.screenshot({ path: path.join(out, record.before), fullPage: true });

    if (info.handsOn) {
        const given = await answerHandsOn(page, info);
        if (!given) {
            record.skipped = `could not answer ${section} ${number}: the line did not move`;
            return record;
        }
        record.given = given;
        await settle(page, 250);
        const main = page.locator(MAIN).first();
        if (await main.count() && (await main.innerText()).trim() === 'Check') {
            await main.click();
            await settle(page, 700);
        }
        record.answered = true;
        record.after = name('after');
        if (!fast) await page.screenshot({ path: path.join(out, record.after), fullPage: true });
        return record;
    }

    if (!info.question) {
        // Learn screens and results pages: picture them and press the button.
        record.skipped = section === 'practice' && info.summary
            ? 'results page, nothing to answer'
            : 'nothing to answer on this screen';
        const readied = await readyTheScreen(page, info);
        // A Try it page the pupil works by hand: picture it after the taps too.
        if (readied && section === 'try-it') {
            record.answered = true;
            record.after = name('after');
            if (!fast) await page.screenshot({ path: path.join(out, record.after), fullPage: true });
        }
        return record;
    }

    let given;
    try {
        given = await answerCard(page, info.question);
    } catch (error) {
        record.skipped = `could not answer ${section} ${number}: ${error.message}`;
        return record;
    }
    if (!given || given.given === null) {
        const reason = given?.reason ?? 'no answer box on this screen';
        record.skipped = `could not answer ${section} ${number}: ${reason}`;
        return record;
    }
    record.given = given.given ?? given;
    await settle(page, 250);

    const main = page.locator(MAIN).first();
    if (await main.count() && (await main.innerText()).trim() === 'Check') {
        await main.click();
        await settle(page, 700);
        const marked = await readScreen(page);
        if (/Try again/.test(marked.main?.label ?? '')) {
            record.skipped = `the lesson marked "${record.given}" wrong at ${section} ${number}`;
            return record;
        }
    }
    record.answered = true;
    record.after = name('after');

    const after = await readScreen(page);
    if (after.hash !== info.hash || after.heading !== info.heading) {
        // The card moved on by itself: go back to see the answer and its feedback.
        const back = page.getByRole('button', { name: 'Previous screen', exact: true });
        if (await back.count() && await back.isEnabled()) {
            await back.click();
            await settle(page, 500);
        }
    }
    if (!fast) await page.screenshot({ path: path.join(out, record.after), fullPage: true });
    return record;
}

/* ------------------------------------------------------------------ *
 * The walk.
 * ------------------------------------------------------------------ */

function screenNumber(section, hash) {
    const patterns = {
        learn: /^#learn-(\d+)$/,
        'try-it': /^#try-it-(\d+)$/,
        practice: /^#question-bank-question-(\d+)$/,
        check: /^#check-(\d+)$/
    };
    const match = hash.match(patterns[section] ?? /^$/);
    return match ? Number(match[1]) : null;
}

async function walk(page, width, records) {
    await page.goto(lessonUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-screen-heading]');
    await settle(page, 600);

    for (let step = 0; step < 240; step++) {
        const info = await readScreen(page);
        if (info.main?.label === 'All lessons') {
            records.push(await captureScreen(page, width, records.length + 1, 'end', 1,
                { ...info, heading: info.heading || 'Your completed Check' }));
            break;
        }
        const section = SECTIONS[info.sectionId];
        const number = section ? screenNumber(section, info.hash) : null;
        if (!section || number === null) {
            throw new Error(`Stopped at an unexpected place: ${info.hash || '(no hash)'} "${info.heading}"`);
        }

        const record = await captureScreen(page, width, records.length + 1, section, number, info);
        records.push(record);
        if (!await advance(page, info)) {
            console.log(`${width}: could not move on from ${record.label} ${record.number}`);
            break;
        }
    }
}

/* ------------------------------------------------------------------ *
 * Writing slides.json.
 * ------------------------------------------------------------------ */

function buildSlides(records) {
    const screens = [];
    const byKey = new Map();
    for (const record of records) {
        const key = `${record.section}:${record.number}`;
        if (!byKey.has(key)) {
            const screen = {
                section: record.section, label: record.label, number: record.number, step: null,
                heading: record.heading, prompt: record.prompt,
                answered: record.answered, skipped: record.skipped, shots: {}
            };
            byKey.set(key, screen);
            screens.push(screen);
        }
        const screen = byKey.get(key);
        screen.answered = screen.answered || record.answered;
        screen.skipped ??= record.skipped;
        screen.heading ||= record.heading;
        screen.prompt ||= record.prompt;
        screen.shots[record.before.split('/')[0]] = { before: record.before, after: record.after };
    }
    const counts = {};
    for (const screen of screens) counts[screen.label] = (counts[screen.label] ?? 0) + 1;
    return { lesson: slug, title: lessonTitle, generated: new Date().toISOString(), seed: SEED, widths: Object.keys(SIZES), counts, screens };
}

/* ------------------------------------------------------------------ *
 * Starting up.
 * ------------------------------------------------------------------ */

async function waitForServer() {
    for (let tries = 0; tries < 60; tries++) {
        try {
            if ((await fetch(lessonUrl)).ok) return;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error(`The PHP server did not start at ${lessonUrl}`);
}

(async () => {
    fs.mkdirSync(out, { recursive: true });
    const widths = wantedWidths === 'both' ? Object.keys(SIZES) : [wantedWidths];
    const server = spawn(PHP, ['-S', `127.0.0.1:${PORT}`, '-t', root], { stdio: 'ignore' });
    const records = [];
    const problems = [];
    try {
        await waitForServer();
        const browser = await chromium.launch();
        for (const width of widths) {
            const { width: viewWidth, height, ...device } = SIZES[width];
            const context = await browser.newContext({ viewport: { width: viewWidth, height }, ...device });
            await context.addInitScript(CAPTURE);
            await context.addInitScript(seed => {
                let state = seed >>> 0;
                Math.random = () => {
                    state = (state + 0x6D2B79F5) >>> 0;
                    let value = Math.imul(state ^ (state >>> 15), state | 1);
                    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
                    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
                };
            }, SEED);
            const page = await context.newPage();
            page.on('console', message => {
                if (message.type() === 'error' && !message.location()?.url.endsWith('/favicon.ico')) {
                    problems.push(`${width}: console error: ${message.text()}`);
                }
            });
            page.on('pageerror', error => problems.push(`${width}: page error: ${error.message}`));
            const walked = [];
            await walk(page, width, walked);
            await context.close();
            for (const record of walked) {
                records.push(record);
                const note = record.skipped ? `  <-- SKIPPED: ${record.skipped}` : '';
                console.log(`${width} ${record.label.padEnd(8)} ${record.number}: ${record.heading}${record.prompt ? ` — ${record.prompt}` : ''}${note}`);
            }
        }
        await browser.close();
    } finally {
        server.kill();
    }

    const slides = buildSlides(records);
    fs.writeFileSync(path.join(out, 'slides.json'), `${JSON.stringify(slides, null, 2)}\n`);
    const summary = Object.entries(slides.counts).map(([label, count]) => `${label} ${count}`).join(', ');
    console.log(`\n${slides.screens.length} screens: ${summary}`);
    const skipped = slides.screens.filter(screen => !screen.answered);
    if (skipped.length) {
        console.log(`No "after" picture on ${skipped.length} screen(s):`);
        for (const screen of skipped) console.log(`  ${screen.label} ${screen.number}: ${screen.skipped}`);
    }
    console.log(`Pictures in ${out}`);
    if (problems.length) {
        console.log(`${problems.length} problem(s):`);
        for (const problem of problems.slice(0, 20)) console.log(`  ${problem}`);
    } else {
        console.log('No console errors.');
    }
    process.exit(problems.length ? 1 : 0);
})().catch(error => {
    console.error(error);
    process.exit(1);
});
