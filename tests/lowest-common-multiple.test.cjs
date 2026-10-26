const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, contentDir } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const Q = loadScript(path.join(contentDir, 'lowest-common-multiple/lcm.js'), ['primeFactors', 'shared', 'hcf', 'lcm', 'diagramTiles', 'tileWidget', 'product', 'matchingWidget', 'examples', 'checks', 'types', 'generate', 'pick', 'learnScreens'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const gcd = ([a, b]) => b ? gcd([b, a % b]) : a;
const generated = Q.types.flatMap(type => ['choice', 'number', ...(['match', 'build'].includes(type) ? ['custom'] : [])].flatMap(mode => Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0)))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
test('lowest-common-multiple: every numeric answer and prime decomposition is correct for 200 seeds per type and mode', () => {
    for (const q of questions.filter(q => q.pair && q.input !== 'custom')) {
        assert.equal(Number(q.answer ?? q.options.find(o => o.correct).label), q.pair[0] * q.pair[1] / gcd(q.pair));
        assert.equal(Q.lcm(q.pair), q.pair[0] * q.pair[1] / gcd(q.pair));
        assert.equal(Q.product(Q.diagramTiles(q.pair).map(tile => tile.value)), Q.lcm(q.pair));
        for (const n of q.pair) assert.equal(Q.product(Q.primeFactors(n)), n);
    }
});
test('lowest-common-multiple: every choice has four distinct answers, exactly one correct, and individual feedback', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4);
        assert.equal(q.options.filter(o => o.correct).length, 1);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, 4);
        assert.ok(q.options.every(o => o.feedback));
    }
});
test('lowest-common-multiple: typed mistake rules are wrong and every number question has a fallback', () => {
    for (const q of questions.filter(q => q.input === 'number')) {
        assert.ok(q.rules.length && q.fallback);
        for (const rule of q.rules) { assert.notEqual(Number(rule.value), Number(q.answer)); assert.ok(rule.feedback); }
    }
});
test('lowest-common-multiple: matching checks repeated primes, incomplete pairs, no shared primes and malformed matches', () => {
    for (const q of questions.filter(q => q.input === 'custom' && q.prompt.startsWith('Match'))) {
        const primes = q.pair.map(Q.primeFactors);
        const used = [[], []];
        primes[0].forEach((value, a) => {
            const b = primes[1].findIndex((v, index) => v === value && !used[1].includes(index));
            if (b >= 0) { used[0].push(a); used[1].push(b); }
        });
        assert.equal(q.widget.mark({ used, none: !used[0].length }).correct, true);
        if (used[0].length) {
            assert.equal(q.widget.mark({ used, none: true }).correct, false);
            assert.equal(q.widget.answerText({ used, none: true }), 'No shared primes');
            assert.equal(q.widget.mark({ used: used.map(indices => indices.slice(1)) }).correct, false);
            assert.equal(q.widget.mark({ used: [[99], [99]] }).correct, false);
        }
        assert.equal(q.widget.isEmpty(null), true);
    }
    const widget = Q.matchingWidget([8, 15]);
    assert.equal(widget.mark({ none: true }).correct, true);
    assert.equal(widget.mark(null).correct, false);
});
test('lowest-common-multiple: sessions are seeded, have six items and mix two choices, two numbers and two custom activities', () => {
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, 6);
        assert.deepEqual(items.map(i => i.mode), ['choice', 'number', 'choice', 'number', 'custom', 'custom']);
        assert.deepEqual(JSON.parse(JSON.stringify(items)), JSON.parse(JSON.stringify(Q.pick(seededRandom(seed)))));
    }
});
test('lowest-common-multiple: Learn teaches factors, prime factors, repeated matches, multiplication and no-match cases', () => {
    const text = Q.learnScreens.flatMap(s => s.lines).join(' ');
    for (const keyword of ['factor', 'prime', 'overlap', 'repeated', 'Multiply', 'no primes match', 'every tile', 'common multiple']) assert.ok(text.toLowerCase().includes(keyword.toLowerCase()));
    assert.equal(Q.learnScreens[0].title, 'What LCM means');
    assert.deepEqual(Array.from(Q.shared([24, 36])), [2, 2, 3]);
    for (const fn of [Q.examples, Q.checks]) {
        const questions = fn();
        assert.ok(questions.filter(q => q.input === 'choice').length >= 2);
        assert.ok(questions.filter(q => q.input === 'number').length >= 2);
    }
});

test('lowest-common-multiple: fixed explanations and worked examples give the LCM, not the HCF', () => {
    const [jo, ben] = Q.checks();
    assert.equal(jo.options.find(option => option.correct).label, 'No. The LCM is 2 × 2 × 3 × 3 = 36.');
    assert.equal(ben.options.find(option => option.correct).label, 'No. Multiply every tile: 2 × 5 × 2 × 3 = 60.');
    assert.equal(Q.lcm([12, 18]), 36);
    assert.equal(Q.lcm([20, 30]), 60);
    assert.equal(Q.lcm([24, 36]), 72);
    assert.equal(Q.lcm([8, 15]), 120);
});

test('lowest-common-multiple: tile builder includes both sides and counts each shared tile once', () => {
    for (const q of questions.filter(q => q.input === 'custom' && q.prompt.startsWith('Choose'))) {
        const tiles = Q.diagramTiles(q.pair);
        const picked = tiles.map(tile => tile.id);
        assert.equal(new Set(picked).size, picked.length);
        assert.equal(q.widget.mark({ picked }).correct, true);
        assert.equal(q.widget.mark({ picked: picked.slice(1) }).correct, false);
        assert.equal(q.widget.mark({ picked: [...picked, picked[0]] }).correct, false);
        assert.equal(q.widget.mark({ picked: ['unknown'] }).correct, false);
        assert.equal(q.widget.isEmpty(null), true);
        assert.ok(q.widget.answerText({ picked }).endsWith(`= ${Q.lcm(q.pair)}`));
        const overlap = tiles.filter(tile => tile.zone === 'shared').map(tile => tile.id);
        assert.equal(q.widget.mark({ picked: overlap }).correct, false);
        assert.ok(q.widget.mark({ picked: overlap }).feedback.includes('overlap'));
    }
});
