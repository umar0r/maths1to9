// Keep the original format and guided-target checks on the shared definitions.
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
const Q = loadScript(path.join(root, 'content/significant-figures/significant-figures.js'), ['examples', 'checks', 'guided', 'learnScreens'], { window });
const { tidyNumber } = window.Maths1to9LessonEngine;
for (const q of [...Q.examples(), ...Q.checks()]) {
    if (q.input === 'number') assert.notEqual(tidyNumber(q.answer), null, q.prompt);
    if (q.options) {
        assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4, q.prompt);
    }
    if (!q.number) continue;
    const indexes = [...q.number].map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
    const significant = indexes.slice(indexes.findIndex(i => q.number[i] !== '0'));
    assert.equal(q.target, significant[q.n - 1], q.prompt);
    assert.equal(q.decider, indexes[indexes.indexOf(q.target) + 1], q.prompt);
}
const accuracy = Q.checks().find(q => q.answer === '15.0');
assert.equal(accuracy.exact, true);
assert.equal(tidyNumber('15.0'), accuracy.answer);
assert.notEqual(tidyNumber('15'), accuracy.answer);
assert.notEqual(tidyNumber('15.00'), accuracy.answer);
assert.equal(new Set(Q.learnScreens.map(q => q.title)).size, Q.learnScreens.length);
assert.equal(Q.guided.length, 4);
console.log('Significant figures: answers, distractors, digit targets, exact accuracy and unique Learn screens passed.');
