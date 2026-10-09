const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Custom-renderer pages also run this block, before the standard engine exits.
const window = {};
const source = fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8');
vm.runInNewContext(source, { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const { escapeHtml, shuffle, seededRandom, randomInt } = window.Maths1to9LessonEngine;

test('shared escapeHtml escapes all HTML delimiters and preserves ordinary text', () => {
    assert.equal(escapeHtml(`<b title="a&b">'hello'</b>`), '&lt;b title=&quot;a&amp;b&quot;&gt;&#39;hello&#39;&lt;/b&gt;');
    assert.equal(escapeHtml('2 × 3 − 1'), '2 × 3 − 1');
    assert.equal(escapeHtml(0), '0');
    assert.equal(escapeHtml(null), '');
});

test('shared seededRandom matches saved order-of-operations seeds exactly', () => {
    for (const original of [0, 1, 123456789, 4294967295]) {
        let seed = original;
        const random = seededRandom(original);
        const again = seededRandom(original);
        for (let index = 0; index < 100; index++) {
            seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
            const value = random();
            assert.equal(value, seed / 4294967296);
            assert.equal(value, again());
            assert.ok(value >= 0 && value < 1);
        }
    }
    assert.notEqual(seededRandom(1)(), seededRandom(2)());
});

test('shared shuffle returns a new permutation without changing the original', () => {
    const original = ['a', 'b', 'c', 'd'];
    const result = shuffle(original, () => 0);
    assert.deepEqual(Array.from(result), ['b', 'c', 'd', 'a']);
    assert.deepEqual(original, ['a', 'b', 'c', 'd']);
    assert.notEqual(result, original);
    assert.deepEqual(Array.from(shuffle([], seededRandom(1))), []);
    assert.deepEqual(Array.from(shuffle(['only'], seededRandom(1))), ['only']);
    assert.deepEqual(Array.from(shuffle(original, seededRandom(12))), Array.from(shuffle(original, seededRandom(12))));
});

test('shared randomInt includes both bounds and handles negative and singleton ranges', () => {
    assert.equal(randomInt(2, 5, () => 0), 2);
    assert.equal(randomInt(2, 5, () => 1 - Number.EPSILON), 5);
    assert.equal(randomInt(-3, -1, () => 0), -3);
    assert.equal(randomInt(-3, -1, () => 1 - Number.EPSILON), -1);
    assert.equal(randomInt(4, 4, seededRandom(1)), 4);
    const random = seededRandom(6);
    const observed = new Set(Array.from({ length: 200 }, () => randomInt(-2, 2, random)));
    assert.deepEqual([...observed].sort(), [-1, -2, 0, 1, 2]);
    assert.throws(() => randomInt(5, 2), /ordered integer bounds/);
    assert.throws(() => randomInt(0.5, 2), /ordered integer bounds/);
});
