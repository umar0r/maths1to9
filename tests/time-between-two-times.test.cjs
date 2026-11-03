const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/time-between-two-times/time.js'), 'utf8'), { window });
const T = window.TimeBetween, E = window.Maths1to9LessonEngine;
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/time-between-two-times/lesson.json'), 'utf8'));
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return T.generate({ type, seed }, E.seededRandom(seed)); };
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;
const SEEDS = 500;
const ASKED = ['hop', 'minutes', 'hours-minutes', 'jumps', 'convert', 'shortest', 'calculator'];
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

// "12 ÷ 3 = 4 hours" and "3 × 4 = 12" both count as sums. Only a line whose
// left side is real arithmetic is checked, so "68 minutes = 1 hour 8 minutes"
// and clock notation like "13:36 → 14:00 = 24 minutes" are left alone.
function sumAt(text, index) {
    const boundaries = ['.', ',', '(', ';']
        .map(character => text.lastIndexOf(character, index - 1));
    const and = text.lastIndexOf(' and ', index - 1);
    const start = Math.max(...boundaries, and < 0 ? -1 : and + 4) + 1;
    const left = text.slice(start, index).trim();
    const right = text.slice(index + 1).match(/^\s*([\d.]+)\s*(…)?/);
    if (!right) return null;
    return { left, value: Number(right[1]), approximate: Boolean(right[2]) };
}

function evaluate(left, where) {
    if (!/[+−×÷*/()-]/.test(left)) return null;
    const js = left.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
        .replace(/[A-Za-z£][A-Za-z-]*/g, ' ')
        .trim();
    if (!js) return null;
    if (!/^[\d\s.+\-*/()]+$/.test(js)) return null;
    try {
        const value = Function(`"use strict"; return (${js});`)();
        return Number.isFinite(value) ? value : null;
    } catch {
        throw new Error(`${where}: cannot read "${left}"`);
    }
}

function assertSums(text, where) {
    if (!text) return;
    for (let index = text.indexOf('='); index >= 0; index = text.indexOf('=', index + 1)) {
        const sum = sumAt(text, index);
        if (!sum || sum.approximate) continue;
        const value = evaluate(sum.left, where);
        if (value === null) continue;
        assert.ok(close(value, sum.value, 0.006), `${where}: "${sum.left} = ${sum.value}"`);
    }
}

function minutesInLabel(label) {
    if (/^\+/.test(label)) {
        let total = 0;
        for (const match of label.matchAll(/\+(\d+) (min|hour|hours)/g)) {
            total += Number(match[1]) * (match[2] === 'min' ? 1 : 60);
        }
        return total;
    }
    const hours = label.match(/^(\d+) hours? (\d+) minutes?$/);
    if (hours) return Number(hours[1]) * 60 + Number(hours[2]);
    const minutes = label.match(/^(\d+) minutes?$/);
    if (minutes) return Number(minutes[1]);
    return null;
}

function realMinutes(card) {
    return T.minutesOf(card.values.end) - T.minutesOf(card.values.start);
}

function describedMinutes(card) {
    if (card.input === 'choice') {
        return minutesInLabel(card.options.find(option => option.correct).label);
    }
    if (card.fields) return Number(card.answer.hours) * 60 + Number(card.answer.minutes);
    return Number(card.answer);
}

function assertOptions(q, where) {
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(option => option.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(option => option.correct).length, 1, `${where}: one right option`);
    const feedbacks = q.options.map(option => option.feedback);
    assert.equal(new Set(feedbacks).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(option => {
        assert.ok(option.feedback, `${where}: option ${option.label} has feedback`);
        assert.notEqual(option.feedback.trim(), option.label.trim(), `${where}: feedback isn't just the label`);
    });
}

function assertTimes(card, where) {
    if (card.values === null) {
        assert.ok(!card.trips || card.trips.every(trip => TIME.test(trip.start) && TIME.test(trip.end)), `${where}: trip times`);
        return;
    }
    for (const side of ['start', 'end']) {
        assert.match(card.values[side], TIME, `${where}: ${side} is HH:MM`);
        const [, hours, minutes] = card.values[side].match(TIME);
        assert.ok(Number(hours) >= 0 && Number(minutes) <= 59, `${where}: ${side} minutes 00 to 59`);
    }
    assert.ok(realMinutes(card) > 0, `${where}: ${card.values.end} is after ${card.values.start}, same day`);
}

function assertRules(card, where) {
    const answer = card.answer;
    const used = [];
    for (const rule of card.rules) {
        assert.ok(rule.feedback, `${where}: rule feedback`);
        if (card.fields) {
            const hours = Number(rule.value.hours);
            const minutes = Number(rule.value.minutes);
            assert.ok(Number.isInteger(hours) && Number.isInteger(minutes), `${where}: rule ${JSON.stringify(rule.value)} is whole`);
            // A rule may say "8 hours 75 minutes": that is the mistake it explains.
            // Only the answer is held to 0 to 59 minutes.
            assert.ok(hours >= 0 && minutes >= 0, `${where}: rule ${JSON.stringify(rule.value)} is hours and minutes`);
            assert.ok(hours * 60 + minutes > 0, `${where}: rule ${JSON.stringify(rule.value)} isn't zero`);
            const shown = `${rule.value.hours}:${rule.value.minutes}`;
            assert.ok(!used.includes(shown), `${where}: rule ${shown} appears once`);
            used.push(shown);
            assert.notEqual(shown, `${answer.hours}:${answer.minutes}`, `${where}: rule ${shown} isn't the answer`);
        } else {
            const value = Number(rule.value);
            assert.ok(Number.isInteger(value) && value > 0, `${where}: rule ${rule.value} is a positive whole number`);
            assert.ok(!used.includes(value), `${where}: rule ${value} appears once`);
            used.push(value);
            assert.notEqual(value, Number(answer), `${where}: rule ${value} isn't the answer`);
        }
    }
    assert.ok(card.rules.length >= 1, `${where}: at least one rule`);
    assert.ok(card.fallback, `${where}: fallback`);
    assert.ok(card.feedback, `${where}: right-answer feedback`);
    assert.notEqual(card.feedback.trim(), String(card.answer), `${where}: feedback is the working, not just the answer`);
}

function assertCard(q, where) {
    const text = JSON.stringify(q);
    assert.doesNotMatch(text, /undefined|NaN|Infinity/, `${where}: no broken numbers in ${text}`);
    assert.ok(ASKED.includes(q.asked), `${where}: asked is one of the lesson's kinds`);
    assert.ok(q.questionType, `${where}: questionType`);
    assert.ok(q.values === null || (q.values && 'start' in q.values && 'end' in q.values), `${where}: values is null or has start and end`);
    assertTimes(q, where);
    if (q.input === 'choice') {
        assertOptions(q, where);
    } else {
        assert.equal(q.input, 'number', where);
        if (q.fields) {
            assert.equal(q.fractions, true, `${where}: fields need fractions: true`);
            assert.equal(JSON.stringify(q.fields.map(field => field.id)), JSON.stringify(['hours', 'minutes']), `${where}: hours then minutes`);
            assert.equal(JSON.stringify(q.fields.map(field => field.unit)), JSON.stringify(['hours', 'minutes']), `${where}: each field has its unit`);
            assert.equal(typeof q.answer, 'object', `${where}: the answer is hours and minutes`);
            const hours = Number(q.answer.hours);
            const minutes = Number(q.answer.minutes);
            assert.ok(Number.isInteger(hours) && hours >= 0, `${where}: ${hours} hours`);
            assert.ok(Number.isInteger(minutes) && minutes >= 0 && minutes <= 59, `${where}: ${minutes} minutes, 0 to 59`);
            assert.ok(hours * 60 + minutes > 0, `${where}: the answer isn't zero`);
        } else {
            assert.ok(q.unit === undefined || typeof q.unit === 'string', `${where}: unit is text`);
            const answer = Number(q.answer);
            assert.ok(Number.isInteger(answer) && answer > 0, `${where}: answer ${q.answer} is a positive whole number`);
        }
        assertRules(q, where);
    }
    if (q.values !== null) {
        assert.ok(close(describedMinutes(q), realMinutes(q)), `${where}: the answer is the time from ${q.values.start} to ${q.values.end}`);
    }
    for (const part of [q.prompt, q.feedback, q.fallback,
        ...(q.options || []).flatMap(option => [option.label, option.feedback]),
        ...(q.rules || []).map(rule => rule.feedback)]) {
        assertSums(part, where);
    }
}

test('Learn has 7 screens, Try it 10 cards, Check 6 cards', () => {
    assert.equal(T.learnScreens.length, 7);
    assert.equal(T.examples().length, 10);
    assert.equal(T.checks().length, 6);
    assert.equal(lesson.comparison.questions.length, 6);
    assert.equal(lesson.question_bank.session_length, 6);
    assert.equal(lesson.comparison.summary.points.length, 5);
    assert.equal(lesson.score_activities.length, 10);
    assert.equal(lesson.navigation.back_button, true);
    assert.deepEqual(lesson.section_order, ['explanation', 'interactive', 'question-bank', 'comparison']);
});

test('Learn 1 shows the film example before anything is asked', () => {
    const first = T.learnScreens[0];
    assert.equal(first.kind, 'compare');
    assert.equal(first.examples[0].clocks.join(' '), '10:35 13:10');
    T.learnScreens.forEach((screen, index) => {
        assert.ok(screen.title, `learn-${index + 1}: title`);
        if (index < 2) assert.equal(screen.values.length, 1, `learn-${index + 1}: nothing to change`);
        else assert.ok(screen.slider, `learn-${index + 1}: a slider`);
        assert.ok(!screen.options && !screen.answer, `learn-${index + 1}: asks nothing`);
    });
});

test('every Learn time and jump matches its line', () => {
    for (const screen of T.learnScreens.filter(each => each.kind === 'timeline')) {
        screen.arcs.forEach(arc => {
            assert.equal(T.minutesOf(screen.times[arc.to]) - T.minutesOf(screen.times[arc.from]) > 0, true,
                `${screen.title}: the ${arc.label} jump goes forwards`);
        });
        screen.steps.forEach((step, index) => {
            assert.ok(step.arcs <= screen.arcs.length, `${screen.title} step ${index + 1}: arcs`);
            for (const stop of step.stops) assert.ok(screen.times[stop], `${screen.title} step ${index + 1}: stop ${stop}`);
            for (const line of step.lines) assertSums(line.text, `${screen.title} step ${index + 1}`);
        });
    }
});

test('Try it and Check mix choice and typed cards, and every card is sound', () => {
    for (const [name, cards, each] of [['try', T.examples(), 5], ['check', T.checks(), 3]]) {
        const inputs = cards.map(card => card.input);
        assert.ok(inputs.includes('choice') && inputs.includes('number'), `${name} mixes card types`);
        assert.equal(inputs.filter(input => input === 'choice').length, each, `${name}: ${each} choice`);
        assert.equal(inputs.filter(input => input === 'number').length, each, `${name}: ${each} typed`);
        cards.forEach((card, index) => assertCard(card, `${name}-${index + 1}`));
    }
});

test('Try it is one hop, one same hour, one across, one skip, one hours and minutes', () => {
    assert.deepEqual([...T.examples().map(card => card.questionType)],
        ['try-1', 'try-2', 'try-3', 'try-4', 'try-5', 'try-6', 'try-7', 'try-8', 'try-9', 'try-10']);
    assert.deepEqual([...T.checks().map(card => card.questionType)],
        ['check-1', 'check-2', 'check-3', 'check-4', 'check-5', 'check-6']);
});

test('every question type maps to the lesson skill', () => {
    const types = [...T.practiceTypes, ...T.examples().map(card => card.questionType), ...T.checks().map(card => card.questionType)];
    for (const type of types) assert.equal(lesson.assessment.question_types[type], 'time-calculations', type);
});

test('a session has all six types once, three choice and three typed', () => {
    for (let n = 0; n < 50; n++) {
        const items = T.pick(E.seededRandom(realSeed(n)));
        assert.equal(JSON.stringify(items.map(item => item.type).sort()), JSON.stringify([...T.practiceTypes].sort()));
        const inputs = items.map(item => T.generate(item, E.seededRandom(item.seed)).input);
        assert.equal(inputs.filter(input => input === 'choice').length, 3);
    }
});

for (const type of T.practiceTypes) {
    test(`Practice ${type}: ${SEEDS} real seeds give sound cards`, () => {
        for (let n = 0; n < SEEDS; n++) assertCard(generated(type, n), `${type} seed ${n}`);
    });
    test(`Practice ${type}: the same seed rebuilds the same card`, () => {
        for (let n = 0; n < 20; n++) {
            assert.equal(JSON.stringify(generated(type, n)), JSON.stringify(generated(type, n)));
        }
    });
}

test('every generated card is the right length of time', () => {
    for (const type of T.practiceTypes) {
        for (let n = 0; n < SEEDS; n++) {
            const q = generated(type, n);
            assert.ok(q.values, `${type} seed ${n}: two times`);
            assert.ok(close(describedMinutes(q), realMinutes(q)), `${type} seed ${n}: ${q.prompt}`);
        }
    }
});

test('hours-and-minutes answers keep minutes under 60, and about half need the extra hour', () => {
    let extra = 0;
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('hours-and-minutes', n);
        const minutes = Number(q.answer.minutes);
        assert.ok(minutes >= 0 && minutes <= 59, `seed ${n}: ${minutes} minutes`);
        assert.ok(Number(q.answer.hours) >= 1, `seed ${n}: at least one hour`);
        const start = T.minutesOf(q.values.start);
        const end = T.minutesOf(q.values.end);
        if (end % 60 > start % 60) extra++;
    }
    assert.ok(extra > SEEDS * 0.4 && extra < SEEDS * 0.6, `about half need the extra hour, got ${extra}`);
});

test('calculator cards show X from 61 to 95, and the hops and lands fit', () => {
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('calculator', n);
        const match = q.prompt.match(/= (\d)\.(\d{2})\./);
        assert.ok(match, `seed ${n}: ${q.prompt}`);
        const shown = Number(match[2]);
        assert.ok(shown >= 61 && shown <= 95, `seed ${n}: X is ${shown}`);
        assert.match(q.prompt, /Sam says it's \d hours? \d+ minutes?\./, `seed ${n}: Sam's answer`);
    }
});

test('every answer and every rule lasts longer than nothing', () => {
    // A rule's hours box may hold 0 ("0 hours 25 minutes"), because one of the
    // mistakes it explains is forgetting the skip. Nothing may last 0 minutes.
    let zeroHoursRule = 0;
    for (const type of T.practiceTypes) {
        for (let n = 0; n < SEEDS; n++) {
            const q = generated(type, n);
            if (q.input !== 'number') continue;
            if (q.fields) {
                assert.ok(Number(q.answer.hours) * 60 + Number(q.answer.minutes) > 0, `${type} seed ${n}: answer`);
                for (const rule of q.rules) {
                    const total = Number(rule.value.hours) * 60 + Number(rule.value.minutes);
                    assert.ok(Number(rule.value.hours) >= 0, `${type} seed ${n}: rule ${JSON.stringify(rule.value)} hours`);
                    assert.ok(total > 0, `${type} seed ${n}: rule ${JSON.stringify(rule.value)} lasts longer than nothing`);
                    if (Number(rule.value.hours) === 0) zeroHoursRule++;
                }
            } else {
                assert.ok(Number(q.answer) > 0, `${type} seed ${n}: answer`);
            }
        }
    }
    assert.ok(zeroHoursRule > 0, 'the hours box is allowed to hold 0, as the spec says');
});

test('a choice card is shuffled but keeps one right answer', () => {
    const random = E.seededRandom(realSeed(7));
    const prepared = T.prepare(T.checks()[5], random);
    assert.equal(prepared.options.filter(option => option.correct).length, 1);
    assert.equal(new Set(prepared.options.map(option => option.label)).size, 4);
    assert.equal(T.checks()[5].options.find(option => option.correct).label, '30 minutes');
});
