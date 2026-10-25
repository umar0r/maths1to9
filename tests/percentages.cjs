// Retain the old answer-format and guided-calculation checks on the shared cards.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { loadScript } = require('./helpers/lessons.cjs');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const { tidyNumber, seededRandom } = window.Maths1to9LessonEngine;
const Q = loadScript(path.join(root, 'content/percentages-of-amounts/percentage-amounts.js'),
    ['examples', 'checks', 'pick', 'generate', 'learnScreens'], { window });
for (const q of [...Q.examples(), ...Q.checks(), ...Q.pick(seededRandom(42)).map(item => Q.generate(item, seededRandom(item.seed)))]) {
    if (q.input === 'number') {
        assert.notEqual(tidyNumber(q.answer), null, q.prompt);
    } else {
        assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, q.options.length, q.prompt);
    }
    const match = q.prompt.match(/find ([\d.]+)% of £?([\d.]+)/i);
    if (match) {
        const value = q.answer ?? q.options.find(o => o.correct).label;
        assert(Math.abs(Number(value) - Number(match[1]) * Number(match[2]) / 100) < 1e-9, q.prompt);
    }
}
assert.equal(Number(tidyNumber('8.70')), Number(tidyNumber('8.7')));
assert.notEqual(Number(tidyNumber('0.07')), Number(tidyNumber('0.7')));
assert.equal(tidyNumber('12abc'), null);
assert.equal(tidyNumber(''), null);
assert.equal(new Set(Q.learnScreens.map(screen => screen.title)).size, Q.learnScreens.length);
for (const index of [2, 5, 8, 11]) {
    const q = Q.examples()[index];
    assert(Math.abs(Number(q.answer) - q.whole * q.percent / 100) < 1e-9, q.prompt);
}
console.log('Percentages: valid answers, distractors, percentage calculations, decimal equivalence, unique Learn screens and guided totals passed.');
