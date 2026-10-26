const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, contentDir } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const Q = loadScript(path.join(contentDir, 'highest-common-factor/hcf.js'), ['primeFactors', 'shared', 'hcf', 'product', 'matchingWidget', 'examples', 'checks', 'types', 'generate', 'pick', 'learnScreens'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const gcd = ([a, b]) => b ? gcd([b, a % b]) : a;
const generated = Q.types.flatMap(type => ['choice', 'number', ...(type === 'match' ? ['custom'] : [])].flatMap(mode => Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0)))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
test('highest-common-factor: every numeric answer and prime decomposition is correct for 200 seeds per type and mode', () => {
    for (const q of questions.filter(q => q.pair && q.input !== 'custom')) {
        assert.equal(Number(q.answer ?? q.options.find(o => o.correct).label), gcd(q.pair));
        assert.equal(Q.hcf(q.pair), gcd(q.pair));
        for (const n of q.pair) assert.equal(Q.product(Q.primeFactors(n)), n);
    }
});
test('highest-common-factor: every choice has four distinct answers, exactly one correct, and individual feedback', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4);
        assert.equal(q.options.filter(o => o.correct).length, 1);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, 4);
        assert.ok(q.options.every(o => o.feedback));
    }
});
test('highest-common-factor: typed mistake rules are wrong and every number question has a fallback', () => {
    for (const q of questions.filter(q => q.input === 'number')) {
        assert.ok(q.rules.length && q.fallback);
        for (const rule of q.rules) { assert.notEqual(Number(rule.value), Number(q.answer)); assert.ok(rule.feedback); }
    }
});
test('highest-common-factor: matching checks repeated primes, incomplete pairs, no shared primes and malformed matches', () => {
    for (const q of questions.filter(q => q.input === 'custom')) {
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
test('highest-common-factor: sessions are seeded, have six items and mix two choices, two numbers and two custom activities', () => {
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, 6);
        assert.deepEqual(items.map(i => i.mode), ['choice', 'number', 'choice', 'number', 'custom', 'custom']);
        assert.deepEqual(JSON.parse(JSON.stringify(items)), JSON.parse(JSON.stringify(Q.pick(seededRandom(seed)))));
    }
});
test('highest-common-factor: Learn teaches factors, prime factors, repeated matches, multiplication and no-match cases', () => {
    const text = Q.learnScreens.flatMap(s => s.lines).join(' ');
    for (const keyword of ['factor', 'prime', 'overlap', 'repeated', 'Multiply', 'HCF is 1']) assert.ok(text.toLowerCase().includes(keyword.toLowerCase()));
    assert.equal(Q.learnScreens[0].title, 'What HCF means');
    assert.deepEqual(Array.from(Q.shared([24, 36])), [2, 2, 3]);
    for (const fn of [Q.examples, Q.checks]) {
        const questions = fn();
        assert.ok(questions.filter(q => q.input === 'choice').length >= 2);
        assert.ok(questions.filter(q => q.input === 'number').length >= 2);
    }
});

test('highest-common-factor: fixed explanation choices keep the right repeated factors', () => {
    const [maya, sam] = Q.checks();
    assert.equal(maya.options.find(option => option.correct).label, 'No. The HCF is 2 × 2 × 3 = 12.');
    assert.equal(gcd([36, 60]), 12);
    assert.equal(sam.options.find(option => option.correct).label, 'Take out the 3. HCF = 8');
    assert.equal(gcd([24, 40]), 8);
    assert.equal(Q.primeFactors(40).includes(3), false);
});
