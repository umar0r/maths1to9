const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content/significant-figures/lesson.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'content/significant-figures/lesson.json')));
const ctx = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('    const normalise ='), source.indexOf('    const engine =')) + source.slice(source.indexOf('    function matches('), source.indexOf('    function advance(')), ctx);
for (const q of [...data.guided, ...data.practice, ...data.check]) {
    assert(ctx.matches(q, q.answer), q.prompt);
    if (q.options) assert.equal(q.options.filter(x => ctx.matches(q, x)).length, 1, q.prompt);
    const match = q.prompt.match(/^Round ([\d,.]+) to (\d) significant/);
    if (match) assert.equal(Number(q.answer), Number(Number(match[1].replaceAll(',', '')).toPrecision(Number(match[2]))), q.prompt);
}
for (const q of data.guided) {
    const indexes = [...q.number].map((c,i) => /[0-9]/.test(c) ? i : -1).filter(i => i >= 0);
    const significant = indexes.slice(indexes.findIndex(i => q.number[i] !== '0'));
    assert.equal(q.target, significant[Number(q.accuracy[0])-1]);
    assert.equal(q.decider, indexes[indexes.indexOf(q.target)+1]);
}
const accuracy = data.check.find(q => q.answer === '15.0');
assert(!ctx.matches(accuracy, '15'));
assert(!ctx.matches(accuracy, '15.00'));
assert(ctx.matches(accuracy, '15.0'));
assert.equal(new Set(data.learn.map(q => q.id)).size, data.learn.length);
assert.equal(data.guided.length, 6);
console.log('Significant figures: all answers, distractors, digit targets, accuracy and learning hashes passed.');
