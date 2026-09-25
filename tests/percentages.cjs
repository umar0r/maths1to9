const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content/percentages-of-amounts/lesson.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'content/percentages-of-amounts/lesson.json')));
const ctx = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('    const normalise ='), source.indexOf('    const engine =')) + source.slice(source.indexOf('    function matches('), source.indexOf('    function advance(')), ctx);
for (const q of [...data.guided.flatMap(x => x.steps), ...data.practice, ...data.check]) {
    assert(ctx.matches(q, q.answer), q.prompt);
    assert(!ctx.matches(q, ''), q.prompt);
    if (q.options) assert.equal(q.options.filter(x => ctx.matches(q, x)).length, 1, q.prompt);
    const match = q.prompt.match(/find ([\d.]+)% of £?([\d.]+)/i);
    if (match) assert(Math.abs(Number(q.answer) - Number(match[1]) * Number(match[2]) / 100) < 1e-9, q.prompt);
}
assert(ctx.matches({answer:'8.7'}, '8.70'));
assert(!ctx.matches({answer:'0.07'}, '0.7'));
assert(!ctx.matches({answer:'12'}, '12abc'));
assert.equal(new Set(data.learn.map(q => q.id)).size, data.learn.length);
console.log('Percentages: answers, distractors, percentage calculations, decimal equivalence and learning hashes passed.');
for (const example of data.guided) for(const row of example.rows || []) {
    assert(ctx.matches(row,row.answer));
    assert(Math.abs(Number(row.answer)-example.whole*row.percent/100)<1e-8);
}
console.log('Working lines: all percentage amounts and accepted answers passed.');
