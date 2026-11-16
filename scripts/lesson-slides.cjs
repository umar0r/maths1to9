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
 * Maths, worked out here rather than asked of the lesson.
 * ------------------------------------------------------------------ */

const placeNames = {
    6: 'millions', 5: 'hundred-thousands', 4: 'ten-thousands', 3: 'thousands',
    2: 'hundreds', 1: 'tens', 0: 'ones', '-1': 'tenths', '-2': 'hundredths',
    '-3': 'thousandths', '-4': 'ten-thousandths', '-5': 'hundred-thousandths',
    '-6': 'millionths'
};

const clean = text => String(text).replace(/[,\u00a0\s]/g, '').replace(/…|\.\.\./g, '');
const numberOf = text => Number(clean(text));
const fixed = (value, places) => Number(value.toFixed(places));

// 1250 -> "1,250", as the lesson writes numbers on screen.
function spaced(text) {
    const [whole, fraction] = String(text).split('.');
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
}

// Round to 10^power, keeping the zeros that show how accurate the answer is.
function roundToPower(value, power) {
    const [whole, fraction = ''] = clean(value).split('.');
    const digits = BigInt((whole || '0') + fraction);
    const drop = fraction.length + power;
    let kept;
    if (drop <= 0) {
        kept = digits * 10n ** BigInt(-drop);
    } else {
        const unit = 10n ** BigInt(drop);
        kept = digits / unit;
        if ((digits % unit) * 2n >= unit) kept += 1n;
    }
    const answer = kept.toString();
    if (power >= 0) return answer + '0'.repeat(power);
    const places = -power;
    const padded = answer.padStart(places + 1, '0');
    return `${padded.slice(0, padded.length - places)}.${padded.slice(-places)}`;
}

// Round to n significant figures, keeping leading zeros and the final zeros.
function roundSig(value, n) {
    const [whole, fraction = ''] = clean(value).split('.');
    const digits = whole + fraction;
    const first = digits.search(/[1-9]/);
    if (first < 0) throw new Error(`No significant figures in ${value}`);
    const significant = digits.slice(first);
    let kept = significant.slice(0, n).padEnd(n, '0');
    let power = whole.length - first - n;
    if (Number(significant[n] || '0') >= 5) {
        kept = String(Number(kept) + 1);
        if (kept.length > n) {
            kept = kept.slice(0, n);
            power += 1;
        }
    }
    if (power >= 0) return kept + '0'.repeat(power);
    const point = kept.length + power;
    return point <= 0 ? `0.${'0'.repeat(-point)}${kept}` : `${kept.slice(0, point)}.${kept.slice(point)}`;
}

const round = (value, kind, accuracy) =>
    kind === 'sig' ? roundSig(value, accuracy) : roundToPower(value, kind === 'decimal' ? -accuracy : accuracy);

function countSignificant(value) {
    return clean(value).replace(/\./g, '').replace(/^0+/, '').length;
}

// Where the digit to keep and the digit to look at sit in the number, and the
// name of each digit's place ("7 (ones)").
function digitPositions(value, kind, accuracy) {
    const text = clean(value);
    const digitIndexes = [...text].map((digit, index) => /[0-9]/.test(digit) ? index : -1).filter(index => index >= 0);
    const point = text.includes('.') ? text.indexOf('.') : text.length;
    let keep;
    let look;
    if (kind === 'sig') {
        const start = digitIndexes.findIndex(index => text[index] !== '0');
        const significant = digitIndexes.slice(start);
        keep = significant[accuracy - 1];
        look = significant[accuracy];
    } else {
        const power = kind === 'decimal' ? -accuracy : accuracy;
        keep = power >= 0 ? point - 1 - power : point - power;
        look = digitIndexes[digitIndexes.indexOf(keep) + 1];
    }
    const label = index => index === undefined ? ''
        : `${text[index]} (${placeNames[point - index - (index < point ? 1 : 0)]})`;
    return { keep, look, label };
}

// The number being rounded and the place asked for, read from the words on
// screen: "Round 4,276 to 2 decimal places", "A path is 532 m long. Round its
// length to the nearest 10 metres", "0.730 → 3 significant figures".
function readRounding(text) {
    const phrase = text.match(/(nearest whole number|nearest million|nearest [\d,]+|\d+ decimal places?|\d+ significant figures?)/i);
    if (!phrase) return null;
    const words = phrase[0].toLowerCase();
    let kind = 'nearest';
    let accuracy;
    if (words.startsWith('nearest whole')) accuracy = 0;
    else if (words.startsWith('nearest million')) accuracy = 6;
    else if (words.startsWith('nearest')) accuracy = words.replace(/[^\d]/g, '').length - 1;
    else {
        kind = words.includes('decimal') ? 'decimal' : 'sig';
        accuracy = Number(words.match(/\d+/)[0]);
    }
    const named = text.match(/round(?:ed|s)?\s+(?:it\s+|this\s+|the\s+(?:number|length)\s+)?(\d[\d,]*(?:\.\d*)?)/i);
    if (named) return { number: clean(named[1]).replace(/\.$/, ''), kind, accuracy };
    const arrow = text.match(/(\d[\d,]*(?:\.\d*)?)\s*(?:≈|→|->)/);
    if (arrow) return { number: clean(arrow[1]), kind, accuracy };
    const found = text.replace(phrase[0], ' ').match(/\d[\d,]*(?:\.\d+)?/);
    return found ? { number: clean(found[0]), kind, accuracy } : null;
}

// The last "a ÷ b" the example has said, e.g. "131 ÷ 18 = 7.277…".
function readDivision(text) {
    const matches = [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*÷\s*(\d[\d,]*(?:\.\d+)?)/g)];
    if (!matches.length) return null;
    const [, total, size] = matches.at(-1);
    return { total: numberOf(total), size: numberOf(size) };
}

/* ------------------------------------------------------------------ *
 * Working out the answer from what is on screen.
 * ------------------------------------------------------------------ */

// A note of what this worked example has said so far: later steps often leave
// the numbers out ("What is the charge?").
const newMemory = () => ({ texts: [], answers: [] });

const lastPrice = text => {
    const match = text.match(/(?:costs?|sells for|charges?)\s*£(\d+(?:\.\d+)?)/i);
    return match ? numberOf(match[1]) : null;
};
const firstAmount = text => {
    const match = text.match(/£(\d+(?:\.\d+)?)/);
    return match ? numberOf(match[1]) : null;
};

// Word problems from Try it and Practice. Each branch reads the words on
// screen (and the numbers the example has already used) and gives the answer.
function wordProblem(text, memory) {
    const all = [...memory.texts, text].join(' ');
    const division = readDivision(all);
    const last = memory.answers.at(-1);
    const numbers = [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(match => numberOf(match[0]));
    const price = lastPrice(all);

    if (/have no rack/.test(text) && division && last !== undefined) return division.total - last * division.size;
    if (/smallest number of racks/.test(text) && division) return Math.ceil(division.total / division.size);
    const each = text.match(/How much do (\d+) [a-z]+ cost/i);
    if (each && price !== null) return fixed(Number(each[1]) * price, 2);
    if (/How many more [a-z]+ does it need/i.test(text) && numbers.length >= 2) return numbers[0] - numbers[1];
    if (/How much money is left/i.test(text) && numbers.length >= 2) {
        return fixed(numbers.slice(1).reduce((left, value) => left - value, numbers[0]), 2);
    }
    if (/How many centimetres is that/i.test(text)) return fixed(numbers[0] * 100, 2);
    if (/How much cord is left, in centimetres/i.test(text) && division) return fixed(division.total - last * division.size, 2);
    if (/What is the charge/i.test(text) && last !== undefined && price !== null) return fixed(last * price, 2);
    const sales = text.match(/How much money do (\d+) sales bring in/i);
    if (sales && price !== null) return fixed(Number(sales[1]) * price, 2);
    if (/least number of items .*more than/i.test(text) && division) return Math.floor(division.total / division.size) + 1;
    if (/How much change .* in pence/i.test(text) && last !== undefined && price !== null) {
        return Math.round((firstAmount(all) - last * price) * 100);
    }
    if (/pence are left over/i.test(text)) {
        const spent = text.match(/cost £(\d+(?:\.\d+)?)/);
        const had = text.match(/£(\d+(?:\.\d+)?)/);
        if (spent && had) return Math.round((numberOf(had[1]) - numberOf(spent[1])) * 100);
    }
    if (/boots cost now/i.test(text) && numbers.length >= 2) return numbers[0] - numbers[1];
    if (/full days will the ink last/i.test(text)) {
        const rate = text.match(/(\d+) ml a day/);
        if (rate && last !== undefined) return Math.floor(last / Number(rate[1]));
    }
    if (/millilitres of ink is that/i.test(text) && last !== undefined) {
        const bottle = all.match(/(\d+)\s?ml bottle/);
        if (bottle) return last * Number(bottle[1]);
    }
    if (/How much money does the club get/i.test(text) && last !== undefined && price !== null) return fixed(last * price, 2);
    if (/How many full pieces/i.test(text) && division) return Math.floor(division.total / division.size);
    if (/How many full packets/i.test(text) && division) return Math.floor(division.total / division.size);
    if (/How many blocks are charged/i.test(text) && division) return Math.ceil(division.total / division.size);
    if (/How many weeks must/i.test(text) && division) return Math.ceil(division.total / division.size);
    if (/kits are needed/i.test(text) && division) return Math.ceil(division.total / division.size);
    if (/How many (bags|bottles|trophies|prints) can/i.test(text) && division) return Math.floor(division.total / division.size);
    if (division && /smallest|needed|must|at least|least/i.test(text)) return Math.ceil(division.total / division.size);
    if (division && /full|greatest|can buy|can cut|can they|can it|can the/i.test(text)) return Math.floor(division.total / division.size);
    return null;
}

// The answer to the question on screen, as a string.
function solveQuestion(text, memory) {
    const tidy = text.replace(/\s+/g, ' ').trim();

    const figures = tidy.match(/How many significant figures does ([\d.,]+) show/i);
    if (figures) return String(countSignificant(figures[1]));

    const correction = tidy.match(/([\d][\d,]*(?:\.\d+)?) rounds to [\d.,]+ at (\d+) decimal places?/i);
    if (correction) return roundToPower(correction[1], -Number(correction[2]));

    const rounding = readRounding(tidy);
    if (rounding) return round(rounding.number, rounding.kind, rounding.accuracy);

    const worked = wordProblem(tidy, memory);
    if (worked !== null && worked !== undefined && Number.isFinite(worked)) return String(fixed(worked, 2));
    return null;
}

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
            slider: Boolean([...document.querySelectorAll('input[type=range]')].find(element => visible(element) && !element.disabled)),
            digitTaps: [...document.querySelectorAll('.significant-digits[role=group] button')].filter(visible).length,
            ends: [...document.querySelectorAll('.rounding-end')].filter(visible).length,
            road: Boolean([...document.querySelectorAll('.rounding-road svg')].find(element => visible(element) && element.getAttribute('aria-disabled') === 'false')),
            options: [...document.querySelectorAll('.question-card-options button')].filter(visible).length,
            input: Boolean([...document.querySelectorAll('.question-card input[type=text]')].find(visible))
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

async function chooseOption(page, options, answer) {
    const labels = (await options.allInnerTexts()).map(label => label.replace(/\s+/g, ' ').trim());
    const plain = String(answer);
    const shown = spaced(answer);
    let index = labels.indexOf(shown);
    if (index < 0) index = labels.indexOf(plain);
    if (index < 0) index = labels.findIndex(label => label.includes(shown) || label.includes(plain));
    if (index < 0) index = labels.findIndex(label => Math.abs(numberOf(label.replace(/\(.*\)/, '')) - Number(plain)) < 1e-9);
    if (index < 0) throw new Error(`No option matches "${shown}". Options: ${labels.join(' | ')}`);
    await options.nth(index).click();
    return labels[index];
}

// Learn: tap the digit the screen asks for.
async function tapDigit(page, info) {
    const words = [info.prompt, ...info.paragraphs].join(' ');
    const askLast = /last significant figure/i.test(words);
    const rounding = readRounding(info.prompt) ?? readRounding(words);
    if (rounding) {
        const positions = digitPositions(rounding.number, rounding.kind, rounding.accuracy);
        const index = askLast ? positions.keep : positions.look;
        if (index !== undefined) {
            const button = page.locator(`.significant-digits[role=group] button[aria-label="${positions.label(index)}"]`);
            if (await button.count()) await button.first().click();
            else await page.locator('.significant-digits[role=group]').locator(':scope > *').nth(index).click();
            return positions.label(index);
        }
    }
    // A screen that asks for the last significant figure of the number it shows.
    if (!askLast) return null;
    const row = page.locator('.significant-digits[role=group]').first();
    const shown = (await row.innerText()).replace(/\s+/g, '');
    const last = [...shown].reduce((found, character, index) => /[0-9]/.test(character) ? index : found, -1);
    if (last < 0) return null;
    await row.locator(':scope > *').nth(last).click();
    return `${shown[last]} of ${shown}`;
}

// Learn: tap the end of the number line the number rounds to.
async function tapEnd(page, info) {
    const values = await page.locator('.rounding-end').evaluateAll(nodes => nodes.map(node => Number(node.dataset.end)));
    if (!values.length) return null;
    const low = Math.min(...values);
    const high = Math.max(...values);
    const words = [info.heading, ...info.paragraphs].join(' ');
    const division = readDivision(words);
    const question = info.paragraphs.at(-1) ?? '';
    let target;
    if (division && /rack|helmet|troph|piece|cord|divide/i.test(words)) {
        // Enough of something rounds up; what you can only pay for whole rounds down.
        const down = /full pieces|can they buy/i.test(question);
        target = down ? Math.floor(division.total / division.size) : Math.ceil(division.total / division.size);
    } else {
        const label = await page.locator('.rounding-line').first().getAttribute('aria-label');
        const shown = label?.match(/\d[\d,]*(?:\.\d+)?/) ?? readRounding(words)?.number?.match(/\d[\d,]*(?:\.\d+)?/);
        if (!shown) return null;
        const start = numberOf(shown[0]);
        target = start - low >= high - start ? high : low;
    }
    if (!values.includes(target)) return null;
    await page.locator(`.rounding-end[data-end="${target}"]`).first().click();
    return String(target);
}

// Try it: move the number along the line with the slider.
async function moveSlider(page) {
    const slider = page.locator('input[type=range]').first();
    await slider.focus();
    await slider.press('End');
    return slider.inputValue();
}

// Try it: drive the car to the nearer sign with a real mouse drag.
async function driveCar(page) {
    const road = page.locator('.rounding-road svg').first();
    const start = Number(await road.getAttribute('aria-valuenow'));
    const low = Number(await road.getAttribute('aria-valuemin'));
    const high = Number(await road.getAttribute('aria-valuemax'));
    const target = start < (low + high) / 2 ? low : high;
    const signs = page.locator('.rounding-road .rounding-road__sign');
    // SVG text has no innerText, so read its textContent.
    const labels = (await signs.locator('.rounding-value').evaluateAll(nodes => nodes.map(node => node.textContent.trim()))).map(numberOf);
    const signIndex = labels.indexOf(target);
    if (signIndex < 0) return null;

    async function dragTo(x) {
        const car = await page.locator('.rounding-road__car').first().boundingBox();
        const sign = await signs.nth(signIndex).boundingBox();
        const middle = car.y + car.height / 2;
        await page.mouse.move(car.x + car.width / 2, middle);
        await page.mouse.down();
        await page.mouse.move(x, middle, { steps: 12 });
        await page.mouse.up();
        await settle(page, 200);
    }

    const sign = await signs.nth(signIndex).boundingBox();
    await dragTo(sign.x + sign.width / 2);
    let now = Number(await road.getAttribute('aria-valuenow'));
    if (now !== target) {
        // Nudge by the exact number of miles still to go.
        const centres = await signs.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x + node.getBoundingClientRect().width / 2));
        const perMile = (Math.max(...centres) - Math.min(...centres)) / (high - low);
        await dragTo(sign.x + sign.width / 2 + (target - now) * perMile);
        now = Number(await road.getAttribute('aria-valuenow'));
    }
    return now === target ? String(target) : null;
}

// One screen: the "before" shot, the answer, the "after" shot. Leaves the page
// on the answered screen; the walk presses the main button afterwards.
async function captureScreen(page, width, index, section, number, info, memory) {
    const record = {
        section, label: LABELS[section], number,
        heading: info.summary ? 'Your practice results' : info.heading,
        prompt: info.prompt,
        before: null, after: null, answered: false, skipped: null, given: null
    };
    const name = side => `${width}/${String(index).padStart(2, '0')}-${section}-${number}-${side}.png`;
    record.before = name('before');
    if (!fast) await page.screenshot({ path: path.join(out, record.before), fullPage: true });
    if (info.feedback) throw new Error(`A feedback box was already showing when ${record.label} ${record.number} opened`);

    let given;
    if (info.digitTaps) given = await tapDigit(page, info);
    else if (info.ends) given = await tapEnd(page, info);
    else if (info.slider) given = await moveSlider(page);
    else if (info.road) given = await driveCar(page);

    if (given !== undefined && given !== null) {
        await settle(page);
        // A road screen waits for Check before it says whether the car is right.
        const main = page.locator(MAIN).first();
        if (await main.count() && (await main.innerText()).trim() === 'Check') {
            await main.click();
            await settle(page, 600);
            const marked = await readScreen(page);
            if (/Try again/.test(marked.main?.label ?? '')) {
                throw new Error(`The answer "${given}" was marked wrong at ${record.label} ${record.number}. ${marked.feedback}`);
            }
        }
        record.answered = true;
        record.given = given;
        record.after = name('after');
        if (!fast) await page.screenshot({ path: path.join(out, record.after), fullPage: true });
        return record;
    }

    if (!info.prompt) {
        record.skipped = section === 'practice' && info.summary
            ? 'results page, nothing to answer'
            : 'nothing to answer on this screen';
        return record;
    }

    const words = info.prompt || info.paragraphs.join(' ');
    const answer = solveQuestion(words, memory);
    if (answer === null) {
        record.skipped = `could not work out the answer from "${words}"`;
        return record;
    }
    const options = page.locator('.question-card-options button:visible');
    const input = page.locator('.question-card input[type=text]:visible').first();
    if (await options.count()) record.given = await chooseOption(page, options, answer);
    else if (await input.count()) {
        await input.fill(answer);
        record.given = answer;
    } else {
        record.skipped = 'no answer box on this screen';
        return record;
    }
    await settle(page, 200);
    await page.locator(MAIN).first().click();       // Check
    await settle(page, 600);

    const after = await readScreen(page);
    if (/Try again/.test(after.main?.label ?? '')) {
        throw new Error(`"${record.given}" was marked wrong at ${record.label} ${record.number} (${words}). ${after.feedback}`);
    }
    record.answered = true;
    memory.texts.push(words);
    memory.answers.push(Number(answer));

    if (after.hash === info.hash && after.heading === info.heading) {
        record.after = name('after');
        if (!fast) await page.screenshot({ path: path.join(out, record.after), fullPage: true });
        return record;
    }
    // The card moved on by itself: go back to see the answer and its feedback.
    const back = page.getByRole('button', { name: 'Previous screen', exact: true });
    if (await back.count() && await back.isEnabled()) {
        await back.click();
        await settle(page, 500);
        record.after = name('after');
        if (!fast) await page.screenshot({ path: path.join(out, record.after), fullPage: true });
    }
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
    const memory = newMemory();
    let example = null;

    await page.goto(lessonUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-screen-heading]');
    await settle(page, 600);

    for (let step = 0; step < 240; step++) {
        const info = await readScreen(page);
        if (info.main?.label === 'All lessons') {
            records.push(await captureScreen(page, width, records.length + 1, 'end', 1,
                { ...info, heading: info.heading || 'Your completed Check' }, null));
            break;
        }
        const section = SECTIONS[info.sectionId];
        const number = section ? screenNumber(section, info.hash) : null;
        if (!section || number === null) {
            throw new Error(`Stopped at an unexpected place: ${info.hash || '(no hash)'} "${info.heading}"`);
        }

        const exampleNumber = /^Example (\d+) of/.exec(info.heading)?.[1];
        if (exampleNumber !== undefined && exampleNumber !== example) {
            example = exampleNumber;
            Object.assign(memory, newMemory());
        }

        const record = await captureScreen(page, width, records.length + 1, section, number, info, memory);
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
                section: record.section, label: record.label, number: record.number,
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
    return { lesson: slug, generated: new Date().toISOString(), seed: SEED, widths: Object.keys(SIZES), counts, screens };
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
