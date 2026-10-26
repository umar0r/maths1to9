// Maths checks for simplifying-fractions: every answer is recomputed from the
// numbers in the question, in both choice and typed modes, and the strict
// simplest-form boxes accept only the fully simplified fraction.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings, wrongSums } = require('./helpers/lessons.cjs');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
loadScript(path.join(__dirname, '../content/simplifying-fractions/fractions.js'), [], { window });
const S = window.SimplifyingFractions;
const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/simplifying-fractions/lesson.json'), 'utf8'));
const { seededRandom } = window.Maths1to9LessonEngine;

const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const parse = text => {
    const m = String(text).replace(/−/g, '-').trim().match(/^(-?\d+)\/(\d+)$/);
    return m && [Number(m[1]), Number(m[2])];
};
const same = (x, y) => x && y && x[0] * y[1] === y[0] * x[1];
const simplest = ([top, bottom]) => [top / gcd(top, bottom), bottom / gcd(top, bottom)];
const fractionsIn = text => String(text).replace(/−/g, '-').match(/-?\d+\/\d+/g) || [];
const answerOf = q => q.input === 'choice' ? q.options.find(option => option.correct).label
    : q.input === 'custom' ? q.widget.answerText(q.widget.correctValue()) : q.answer;

const generated = S.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => ({
        seed, mode, q: S.generate({ type, mode }, seededRandom(Math.imul(seed + 1, 2654435761) >>> 0))
    }))));
const fixed = [...S.examples().map(q => ({ seed: 'Try it', q })), ...S.checks().map(q => ({ seed: 'Check', q }))];
const all = [...generated, ...fixed];
const ofType = type => all.filter(({ q }) => q.questionType === type);
const where = (q, seed) => `${q.prompt} (${seed})`;

test('every Practice type is generated in both modes and mapped to a skill', () => {
    for (const type of S.practiceTypes) {
        assert.ok(generated.some(({ q, mode }) => q.questionType === type && mode === 'choice' && q.input === 'choice'), `${type} choice`);
        assert.ok(generated.some(({ q, mode }) => q.questionType === type && mode === 'number' && q.input !== 'choice'), `${type} typed`);
        assert.ok(lesson.assessment.question_types[type], `${type} has no skill mapping`);
    }
});

test('choice questions have four distinct options, one correct, each with its own feedback', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'choice')) {
        assert.equal(q.options.length, 4, where(q, seed));
        assert.equal(q.options.filter(option => option.correct).length, 1, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.label)).size, 4, `duplicate options ${where(q, seed)}`);
        assert.equal(new Set(q.options.map(option => option.feedback)).size, 4, `repeated feedback ${where(q, seed)}`);
    }
});

test('typed number questions have an answer, wrong mistake rules and a fallback', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'number')) {
        assert.ok(q.answer !== undefined && q.fallback, where(q, seed));
        for (const rule of q.rules) {
            const wrong = parse(rule.value) ?? [Number(rule.value), 1];
            const right = parse(q.answer) ?? [Number(q.answer), 1];
            assert.ok(!same(wrong, right), `rule ${rule.value} equals the answer ${where(q, seed)}`);
        }
    }
});

test('gaps: the missing top uses the same multiplier as the bottom', () => {
    for (const type of ['equivalentGap', 'reverseGap', 'equalOrNot']) {
        for (const { seed, q } of ofType(type).filter(({ q }) => q.input === 'number' || type !== 'equalOrNot')) {
            const m = q.prompt.match(/□\/(\d+)/);
            const [given] = fractionsIn(q.prompt.replace(/□\/\d+/, '')).map(parse);
            const bottom = Number(m[1]);
            assert.equal(bottom % given[1], 0, where(q, seed));
            assert.equal(Number(answerOf(q)), given[0] * bottom / given[1], where(q, seed));
        }
    }
});

test('equalOrNot: the chosen statement is true', () => {
    for (const { seed, q } of ofType('equalOrNot').filter(({ q }) => q.input === 'choice')) {
        const [first, second] = fractionsIn(q.prompt).map(parse);
        const diff = first[0] * second[1] - second[0] * first[1];
        const sign = diff > 0 ? '>' : diff < 0 ? '<' : '=';
        assert.ok(answerOf(q).includes(` ${sign} `), where(q, seed));
    }
});

test('spotEquivalent: the answer has the same value; wrong options do not', () => {
    for (const { seed, q } of ofType('spotEquivalent')) {
        const [given] = fractionsIn(q.prompt).map(parse);
        assert.ok(same(parse(answerOf(q)), given), where(q, seed));
        assert.notDeepEqual(parse(answerOf(q)), given, `answer repeats the question ${where(q, seed)}`);
        for (const option of q.options?.filter(o => !o.correct) ?? []) assert.ok(!same(parse(option.label), given), `${option.label} ${where(q, seed)}`);
        if (q.input === 'number') assert.equal(q.fractions, true, where(q, seed));
    }
});

test('simplifying: the answer is the fully simplified fraction of the one shown', () => {
    for (const type of ['simplifyOneStep', 'simplifyFully', 'shadedFraction']) {
        for (const { seed, q } of ofType(type)) {
            const shown = type === 'shadedFraction' ? [q.picture.top, q.picture.bottom] : fractionsIn(q.prompt).map(parse)[0];
            const answer = parse(answerOf(q));
            assert.deepEqual(answer, simplest(shown), where(q, seed));
            assert.ok(gcd(...shown) > 1, `${shown} was already simplified ${where(q, seed)}`);
            for (const option of q.options?.filter(o => !o.correct) ?? []) {
                assert.notDeepEqual(parse(option.label), answer, `${option.label} ${where(q, seed)}`);
            }
        }
    }
});

test('shadedFraction: the picture shows the parts the question counts', () => {
    for (const { seed, q } of ofType('shadedFraction')) {
        const svg = S.barSvg(q.picture.top, q.picture.bottom);
        assert.equal((svg.match(/#62c5bc/g) || []).length, q.picture.top, where(q, seed));
        assert.equal((svg.match(/<rect[^>]*fill="(#62c5bc|#fff)"/g) || []).length, q.picture.bottom, where(q, seed));
    }
});

test('fullySimplified: the answer has no common factor; every wrong option does', () => {
    for (const { seed, q } of ofType('fullySimplified')) {
        assert.equal(gcd(...parse(answerOf(q))), 1, where(q, seed));
        for (const option of q.options?.filter(o => !o.correct) ?? []) assert.ok(gcd(...parse(option.label)) > 1, `${option.label} ${where(q, seed)}`);
    }
});

test('validDivisor: choices divide both or not; the typed answer is the highest common factor', () => {
    for (const { seed, q } of ofType('validDivisor')) {
        const [, top, bottom] = q.prompt.match(/(\d+) and (\d+)/).map(Number);
        if (q.input === 'choice') {
            for (const option of q.options) {
                const n = Number(option.label);
                assert.equal(top % n === 0 && bottom % n === 0, option.correct, `${option.label} ${where(q, seed)}`);
            }
        } else assert.equal(Number(q.answer), gcd(top, bottom), where(q, seed));
    }
});

test('spotTheMistake: the shown step really makes that mistake, and the correction is right', () => {
    const changes = {
        'They subtracted 1 instead of dividing.': (m) => m.wrongTop === m.top - 1 && m.wrongBottom === m.bottom - 1,
        'They divided the top but not the bottom.': (m) => m.wrongTop < m.top && m.wrongBottom === m.bottom,
        'They divided the top and bottom by different numbers.': (m) => m.top / m.wrongTop !== m.bottom / m.wrongBottom,
        'They stopped before the fraction was fully simplified.': (m) => same([m.wrongTop, m.wrongBottom], [m.top, m.bottom]) && gcd(m.wrongTop, m.wrongBottom) > 1
    };
    for (const { seed, q } of ofType('spotTheMistake')) {
        const m = q.model;
        assert.ok(q.prompt.includes(`${m.top}/${m.bottom} to ${m.wrongTop}/${m.wrongBottom}`), where(q, seed));
        assert.deepEqual([m.a, m.b], simplest([m.top, m.bottom]), where(q, seed));
        if (q.input === 'choice') assert.ok(changes[answerOf(q)](m), `${answerOf(q)} ${where(q, seed)}`);
        else assert.equal(answerOf(q), `${m.a}/${m.b}`, where(q, seed));
    }
});

test('the simplest-form boxes accept only the fully simplified fraction', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'custom')) {
        const { widget } = q;
        const right = widget.correctValue();
        assert.equal(widget.mark(right).correct, true, where(q, seed));
        assert.deepEqual(S.correctValue(q), right);
        const [a, b] = [Number(right.top), Number(right.bottom)];
        for (const k of [2, 3]) {
            const unfinished = widget.mark({ top: String(a * k), bottom: String(b * k) });
            assert.equal(unfinished.correct, false, `${a * k}/${b * k} accepted ${where(q, seed)}`);
            assert.match(unfinished.feedback, /not fully simplified/, where(q, seed));
        }
        for (const bad of [{ top: '', bottom: '' }, { top: '0', bottom: '3' }, { top: '2', bottom: '0' }, { top: '1.5', bottom: '3' }, null]) {
            assert.equal(widget.mark(bad).correct, false, `${JSON.stringify(bad)} ${where(q, seed)}`);
        }
        assert.equal(widget.mark({ top: String(b), bottom: String(a + b) }).correct, false, where(q, seed));
        assert.equal(widget.isEmpty({ top: '2', bottom: '' }), true);
        assert.equal(widget.isEmpty(right), false);
        assert.equal(widget.answerText(right), `${a}/${b}`);
    }
});

test('text has no broken values, tidy numbers and correct worked sums', () => {
    for (const { seed, q } of all) {
        for (const text of allStrings({ ...q, picture: undefined, model: undefined, widget: undefined })) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/, `${text} ${where(q, seed)}`);
            assert.doesNotMatch(text, /\d\.\d{9,}/, `${text} ${where(q, seed)}`);
            assert.doesNotMatch(text, /(?:^|[\s(=,])-\d/, `hyphen used as a minus sign in "${text}"`);
        }
        // Wrong options are deliberate mistakes, and a blank (□) marks a sum
        // for the pupil to finish, so only the rest must add up.
        const told = [q.prompt, q.feedback, q.fallback, answerOf(q),
            ...(q.options || []).map(option => option.feedback), ...(q.rules || []).map(rule => rule.feedback)];
        for (const text of told.filter(text => text && !String(text).includes('□'))) {
            assert.deepEqual(wrongSums(text), [], `${text} ${where(q, seed)}`);
        }
    }
});

test('the correct option is not always in the same place after shuffling', () => {
    const positions = new Set(generated.filter(({ q }) => q.input === 'choice').slice(0, 300)
        .map(({ q, seed }) => S.prepare(q, seededRandom(seed + 7)).options.findIndex(option => option.correct)));
    assert.ok(positions.size > 2, `answer positions: ${[...positions]}`);
});

test('a session has six questions from different types, mixing choice and typed, and repeats from its seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const items = S.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length ?? 6);
        assert.equal(new Set(items.map(item => item.type)).size, items.length, `seed ${seed}`);
        assert.ok(items.some(item => item.mode === 'choice') && items.some(item => item.mode === 'number'), `seed ${seed}`);
        assert.deepEqual(S.pick(seededRandom(seed)), items, `seed ${seed} is not repeatable`);
    }
});

test('Try it and Check each mix choice and typed questions', () => {
    for (const set of [S.examples(), S.checks()]) {
        assert.ok(set.filter(q => q.input === 'choice').length >= 2);
        assert.ok(set.filter(q => q.input !== 'choice').length >= 2);
    }
    assert.equal(S.checks().length, 5);
    assert.ok(S.examples().length <= 12);
});

test('Learn teaches every method the questions use, and its sums are right', () => {
    const learn = S.learnScreens.flatMap(screen => [screen.title, ...screen.lines, ...screen.maths]).join(' ').toLowerCase();
    for (const word of ['equivalent', 'multiply the top and bottom', 'divide the top and bottom', 'common factor',
        'highest common factor', 'fully simplified', 'simplest form', 'same bottom', 'subtracting', 'only the top']) {
        assert.ok(learn.includes(word), `Learn never mentions "${word}"`);
    }
    for (const screen of S.learnScreens) {
        for (const text of [...screen.lines, ...screen.maths]) {
            if (/≠|not equal|gives 4\/4/.test(text)) continue; // named mistakes
            assert.deepEqual(wrongSums(text), [], text);
        }
    }
});
