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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/rate-of-change-graphs/rates.js'), 'utf8'), { window });
const R = window.RateOfChangeGraphs, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/rate-of-change-graphs/lesson.json'), 'utf8'));
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return R.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['fastest', 'trend', 'flat-meaning'];
const TYPED_TYPES = ['change', 'rate-up', 'rate-down'];

// Everything about a card's graph, worked out again from its corners.
function sections(graph) {
    return graph.corners.slice(1).map(([t2, v2], i) => {
        const [t1, v1] = graph.corners[i];
        return { from: t1, to: t2, start: v1, end: v2, time: t2 - t1, change: v2 - v1, rate: (v2 - v1) / (t2 - t1) };
    });
}
function valueAt(graph, time) {
    const found = sections(graph).find(s => time >= s.from && time <= s.to);
    return found.start + (time - found.from) * found.rate;
}
// The section a card asks about, as one combined stretch of the graph.
function asked(graph) {
    const [from, to] = graph.section;
    const start = valueAt(graph, from), end = valueAt(graph, to);
    return { from, to, start, end, time: to - from, change: end - start, rate: (end - start) / (to - from) };
}
const numbersIn = text => (String(text).match(/\d+/g) || []).map(Number);
// "Weeks 2 to 4", "week 0 to 2": the section an option names.
const sectionIn = text => { const m = /(\d+) to (?:\w+ )?(\d+)/.exec(text); return m && [Number(m[1]), Number(m[2])]; };

function assertOptions(q, where) {
    assert.equal(q.input, 'choice', where);
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(o => o.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(o => o.correct).length, 1, `${where}: one right option`);
    assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(o => assert.ok(o.feedback && o.feedback.length > 5, `${where}: feedback for ${o.label}`));
}
function assertTyped(q, answer, where) {
    assert.equal(q.input, 'number', where);
    assert.equal(Number(q.answer), answer, `${where}: answer`);
    assert.ok(q.unit, `${where}: a unit beside the box`);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    const values = (q.rules || []).map(r => Number(r.value));
    assert.ok(!values.includes(answer), `${where}: no rule matches the right answer`);
    assert.equal(new Set(values).size, values.length, `${where}: rules are all different`);
    (q.rules || []).forEach(r => assert.ok(r.feedback, `${where}: rule ${r.value} has feedback`));
}
const correctLabel = q => q.options.find(o => o.correct).label;

test('the three fixed graphs have the rates in the spec', () => {
    assert.deepEqual(plain(sections(R.plantA).map(s => s.rate)), [2, 6, 0, 2]);
    assert.deepEqual(plain(sections(R.tank).map(s => s.rate)), [-10, 0, -30]);
    assert.deepEqual(plain(sections(R.plantB).map(s => s.rate)), [6, 0, 3]);
    for (const graph of [R.plantA, R.tank, R.plantB]) {
        graph.corners.forEach(([, v]) => assert.equal(v % graph.step, 0, `${graph.context}: ${v} sits on a grid line`));
        assert.ok(Math.max(...graph.corners.map(([, v]) => v)) <= graph.maxValue);
        const lines = graph.maxValue / graph.step;
        assert.ok(lines >= 6 && lines <= 12, `${graph.context}: ${lines} grid lines up the side`);
    }
});

test('Learn has six screens and teaches every method the questions use', () => {
    assert.equal(R.learnScreens.length, 6);
    const text = JSON.stringify(R.learnScreens);
    for (const idea of ['gradient', 'steepest', 'Flat', 'Change in height', 'Time taken', '12 ÷ 2 = 6 cm per week',
        'per minute', 'loses 10 litres', '20 ÷ 2 = 10']) assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    for (const screen of R.learnScreens) for (const line of screen.maths || []) {
        assert.ok(!/\.$/.test(line), `no full stop on displayed maths: ${line}`);
        assert.ok(!/ - |\*/.test(line), `proper − and × signs: ${line}`);
    }
    // Screen 1's readout example (week 3) is on the line.
    assert.equal(valueAt(R.plantA, 3), 14);
});

test('Try it has 8 cards, 4 choice and 4 typed, each answer worked out from Plant A', () => {
    const cards = R.examples();
    assert.equal(cards.length, 8);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    assert.equal(cards.filter(q => q.input === 'number').length, 4);
    cards.forEach((q, i) => {
        const where = `Try it ${i + 1}`;
        assert.deepEqual(plain(q.graph.corners), plain(R.plantA.corners), where);
        if (q.input === 'choice') assertOptions(q, where);
    });
    const parts = sections(R.plantA);
    const steepest = parts.reduce((a, b) => (b.rate > a.rate ? b : a));
    assert.deepEqual(sectionIn(correctLabel(cards[0])), [steepest.from, steepest.to]);
    const flat = parts.find(s => s.rate === 0);
    assert.deepEqual(sectionIn(correctLabel(cards[1])), [flat.from, flat.to]);
    assertTyped(cards[2], valueAt(R.plantA, 6), 'Try it 3');
    assertTyped(cards[3], valueAt(R.plantA, 8), 'Try it 4');
    assertTyped(cards[4], asked(cards[4].graph).change, 'Try it 5');
    assert.equal(Number(correctLabel(cards[5])), asked(cards[5].graph).time);
    assertTyped(cards[6], asked(cards[6].graph).rate, 'Try it 7');
    assert.equal(parts[0].rate, parts[3].rate, 'Try it 8: weeks 0–2 and 6–8 grow at the same rate');
    // Each card's prompt names the weeks it asks about.
    for (const q of [cards[4], cards[5], cards[6]]) assert.deepEqual(numbersIn(q.prompt).slice(-2), plain(q.graph.section));
});

test('Check has 5 cards on Plant B, 2 choice and 3 typed, each answer worked out from the graph', () => {
    const cards = R.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    assert.equal(cards.filter(q => q.input === 'number').length, 3);
    cards.forEach((q, i) => {
        assert.deepEqual(plain(q.graph.corners), plain(R.plantB.corners), `Check ${i + 1}`);
        if (q.input === 'choice') assertOptions(q, `Check ${i + 1}`);
    });
    const parts = sections(R.plantB);
    const steepest = parts.reduce((a, b) => (b.rate > a.rate ? b : a));
    assert.deepEqual(sectionIn(correctLabel(cards[0])), [steepest.from, steepest.to]);
    assertTyped(cards[1], asked(cards[1].graph).rate, 'Check 2');
    assert.equal(asked(cards[2].graph).rate, 0, 'Check 3 asks about the flat section');
    assert.ok(correctLabel(cards[2]).includes(`${asked(cards[2].graph).start} cm`) && /0 cm per week/.test(correctLabel(cards[2])));
    assertTyped(cards[3], asked(cards[3].graph).rate, 'Check 4');
    assertTyped(cards[4], asked(cards[4].graph).change, 'Check 5');
    // Ben's mistake (final height ÷ time) is caught by a rule.
    assert.ok(cards[1].rules.some(r => Number(r.value) === asked(cards[1].graph).end / asked(cards[1].graph).time));
});

test('lesson.json maps every question type to gradient-as-rate and plans 6 Practice questions', () => {
    assert.equal(lesson.question_bank.session_length, 6);
    const types = new Set([...R.examples(), ...R.checks()].map(q => q.questionType).concat(R.practiceTypes));
    const mapped = JSON.stringify(lesson.assessment);
    for (const type of R.practiceTypes) assert.ok(mapped.includes(`"${type}"`), `${type} is mapped`);
    assert.ok(!mapped.includes('proportion-graphs'));
    assert.ok(types.size >= 6);
});

test('seeded sessions ask each Practice type once, mixing choice and typed', () => {
    assert.deepEqual(plain([...R.practiceTypes].sort()), [...CHOICE_TYPES, ...TYPED_TYPES].sort());
    for (let seed = 0; seed < 200; seed++) {
        const items = R.pick(E.seededRandom(seed));
        assert.equal(items.length, 6);
        assert.deepEqual(plain(items.map(i => i.type).sort()), plain([...R.practiceTypes].sort()));
        assert.equal(items.filter(i => CHOICE_TYPES.includes(i.type)).length, 3);
        assert.deepEqual(plain(items), plain(R.pick(E.seededRandom(seed))));
    }
});

test('every generated graph follows the spec rules (200 seeds per type)', () => {
    for (const type of R.practiceTypes) for (let seed = 0; seed < 200; seed++) {
        const where = `${type} seed ${seed}`;
        const q = generated(type, seed);
        assert.deepEqual(plain(q), plain(generated(type, seed)), `${where}: same seed, same question`);
        const g = q.graph, parts = sections(g);
        assert.equal(q.questionType, type);
        assert.ok(parts.length === 3 || parts.length === 4, `${where}: 3 or 4 sections`);
        assert.deepEqual(plain(g.corners[0]).slice(0, 1), [0]);
        g.corners.forEach(([t, v]) => {
            assert.ok(Number.isInteger(t) && Number.isInteger(v), `${where}: whole-number corners`);
            assert.ok(v >= 0 && v <= 100 && v <= g.maxValue, `${where}: value ${v} in range`);
            assert.equal(v % g.step, 0, `${where}: ${v} sits on a grid line`);
        });
        const lines = g.maxValue / g.step;
        assert.ok(lines >= 6 && lines <= 12, `${where}: ${lines} grid lines`);
        parts.forEach(s => {
            assert.ok(s.time >= 1 && s.time <= 3, `${where}: section length`);
            assert.ok(Number.isInteger(s.rate), `${where}: whole-number rate`);
        });
        assert.ok(parts.some(s => s.rate === 0), `${where}: a flat section`);
        if (g.context === 'plant height') assert.ok(parts.every(s => s.rate >= 0), `${where}: plants don't shrink`);
        if (g.context === 'water in a tank') assert.ok(parts.every(s => s.rate <= 0), `${where}: the tank only empties`);
        assert.ok(g.section, `${where}: asks about one stretch`);
        assert.ok(parts.some(s => s.from === g.section[0]) && parts.some(s => s.to === g.section[1]), `${where}: stretch starts and ends at corners`);
    }
});

test('every generated question has the right answer, four options or distinct rules (200 seeds per type)', () => {
    const shapes = new Set(), contextsSeen = new Set();
    for (const type of R.practiceTypes) for (let seed = 0; seed < 200; seed++) {
        const where = `${type} seed ${seed}`;
        const q = generated(type, seed);
        const g = q.graph, parts = sections(g), s = asked(g);
        contextsSeen.add(g.context);
        if (CHOICE_TYPES.includes(type)) assertOptions(q, where);
        else assert.equal(q.input, 'number', where);
        if (type === 'fastest') {
            assert.equal(parts.length, 4, `${where}: four sections, one per option`);
            const speeds = parts.map(p => Math.abs(p.rate));
            const best = speeds.indexOf(Math.max(...speeds));
            assert.equal(speeds.filter(v => v === speeds[best]).length, 1, `${where}: one strictly steepest section`);
            assert.deepEqual(sectionIn(correctLabel(q)), [parts[best].from, parts[best].to], where);
            assert.deepEqual(plain(g.section), [parts[best].from, parts[best].to]);
            const labelled = q.options.map(o => sectionIn(o.label).join('-')).sort();
            assert.deepEqual(plain(labelled), plain(parts.map(p => `${p.from}-${p.to}`).sort()), `${where}: the options are the four sections`);
            const highest = parts.reduce((a, b) => (Math.max(b.start, b.end) > Math.max(a.start, a.end) ? b : a));
            assert.ok(highest.rate !== 0 && highest !== parts[best], `${where}: the highest section is a real distractor`);
        } else if (type === 'trend') {
            const shape = s.rate > 0 ? 'increasing' : s.rate < 0 ? 'decreasing' : 'staying the same';
            shapes.add(shape);
            assert.ok(correctLabel(q).includes(shape), `${where}: ${correctLabel(q)} should say ${shape}`);
            assert.ok(q.options.some(o => /zero/i.test(o.label) && !o.correct));
            assert.deepEqual(numbersIn(q.prompt).slice(-2), plain(g.section), `${where}: prompt names the section`);
        } else if (type === 'flat-meaning') {
            assert.equal(s.rate, 0, `${where}: asks about the flat section`);
            assert.ok(numbersIn(q.prompt).includes(s.start), `${where}: prompt uses the flat value`);
            assert.ok(numbersIn(correctLabel(q)).includes(s.start) && /\b0\b/.test(correctLabel(q)), `${where}: right option`);
        } else {
            assert.deepEqual(numbersIn(q.prompt).slice(-2), plain(g.section), `${where}: prompt names the section`);
            assert.ok(s.time >= (type === 'change' ? 1 : 2), `${where}: section length`);
            if (type === 'change') { assert.ok(s.change > 0 && s.start >= 1); assertTyped(q, s.change, where); }
            if (type === 'rate-up') { assert.ok(s.rate > 0); assertTyped(q, s.rate, where); }
            if (type === 'rate-down') {
                assert.ok(s.rate < 0 && g.context !== 'plant height');
                assertTyped(q, -s.rate, where);
            }
            if (type !== 'change') assert.ok(q.unit.includes(' per '), `${where}: rate unit ${q.unit}`);
        }
    }
    assert.deepEqual([...shapes].sort(), ['decreasing', 'increasing', 'staying the same'], 'trend asks about every shape');
    assert.deepEqual([...contextsSeen].sort(), ['plant height', 'savings', 'temperature', 'water in a tank'], 'every context is used');
});

test('money is written £60, not 60 £, and sentences read correctly', () => {
    const texts = [];
    for (const type of R.practiceTypes) for (let seed = 0; seed < 200; seed++) {
        const q = generated(type, seed);
        texts.push(q.prompt, q.feedback, q.fallback, ...(q.options || []).flatMap(o => [o.label, o.feedback]),
            ...(q.rules || []).map(r => r.feedback));
    }
    for (const text of texts.filter(Boolean)) {
        assert.ok(!/\d £|\d£/.test(text), `money written as £n: "${text}"`);
        assert.ok(!/does the savings|the savings (is|stays|goes|changes)\b/.test(text), `"savings" is plural: "${text}"`);
    }
});
