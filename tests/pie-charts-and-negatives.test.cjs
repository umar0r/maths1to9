const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
for (const file of ['pie-charts/pie-chart.js', 'place-value/place-value.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../content', file), 'utf8'), { window });
}
const P = window.PieCharts, V = window.PlaceValue, E = window.Maths1to9LessonEngine;
const value = text => Number(String(text).replace('−', '-'));
const answer = q => value(q.answer ?? q.options.find(option => option.correct).label);
const seeds = Array.from({ length: 500 }, (_, i) => Math.imul(i, 2654435761) >>> 0);
const serialise = q => JSON.stringify(q, (key, value) => typeof value === 'function' ? undefined : value);

for (const type of ['read-count', 'read-from-known', 'negCoolest', 'negSymbol', 'negGreatest', 'negOrder']) {
    test(`${type}: 500 full-range seeds have independently correct answers and stable cards`, () => {
        const generator = type.startsWith('read-') ? P.generate : V.generate;
        for (const seed of seeds) {
            const q = generator({ type }, E.seededRandom(seed));
            assert.equal(serialise(q), serialise(generator({ type }, E.seededRandom(seed))), `seed ${seed}`);
            if (q.options) {
                assert.equal(q.options.length, 4);
                assert.equal(new Set(q.options.map(o => o.label)).size, 4);
                assert.equal(q.options.filter(o => o.correct).length, 1);
                assert.ok(q.options.every(o => o.feedback.trim()));
            }
            if (type.startsWith('read-')) {
                const counts = Array.from(q.data, row => row.count), n = counts.reduce((a, b) => a + b);
                assert.ok(n <= 540 && counts.every(c => Number.isInteger(c) && c > 0));
                assert.ok(counts.every(c => Number.isInteger(c * 360 / n)));
                const expected = counts[q.index];
                assert.equal(answer(q), expected);
                for (const o of q.options || []) {
                    assert.ok(Number.isInteger(value(o.label)) && value(o.label) > 0);
                    assert.equal(value(o.label) === expected, Boolean(o.correct));
                }
                if (type === 'read-from-known') assert.notEqual(counts[q.index], counts[q.knownIndex]);
            } else if (type === 'negOrder') {
                const nums = Array.from(q.values, value), sorted = [...nums].sort((a, b) => a - b).map(n => String(n).replace('-', '−'));
                assert.equal(q.widget.mark(sorted).correct, true);
                assert.equal(q.widget.mark([...sorted].reverse()).correct, false);
                assert.ok(nums.filter(n => n < 0).length >= 2 && nums.some(n => n > 0));
            } else if (type === 'negSymbol') {
                const [a, b] = q.values;
                assert.equal(q.options.find(o => o.correct).label, `${String(a).replace('-', '−')} ${a < b ? '<' : '>'} ${String(b).replace('-', '−')}`);
                const magnitudeSign = Math.abs(a) < Math.abs(b) ? '<' : '>';
                const magnitudeComparison = `${String(a).replace('-', '−')} ${magnitudeSign} ${String(b).replace('-', '−')}`;
                assert.ok(q.options.some(o => !o.correct && o.label === magnitudeComparison), 'Ignoring minus signs must produce the sign-flip distractor.');
            } else {
                const nums = Array.from(q.values);
                assert.equal(answer(q), type === 'negCoolest' ? Math.min(...nums) : Math.max(...nums));
                assert.ok(nums.every(n => Number.isInteger(n * 10)));
                if (type === 'negCoolest') {
                    assert.equal(new Set(nums).size, 4);
                    assert.ok(nums.every(n => n >= -12 && n <= 9));
                    assert.ok(nums.filter(n => n < 0).length >= 2 && nums.some(n => n > 0));
                    for (const o of q.options) assert.equal(value(o.label) === Math.min(...nums), Boolean(o.correct));
                } else {
                    assert.ok(q.rules.every(rule => value(rule.value) !== answer(q) && rule.feedback));
                    assert.ok(q.fallback && q.feedback);
                }
            }
        }
    });
}
test('compareDecimals: existing decimal results are unchanged and negatives sort exactly', () => {
    const positives = ['0', '0.000', '0.1', '0.10', '0.09', '0.809', '2.508', '2.54', '1,000.02', '999.99', '12345678901234567890.12'];
    // Independent old algorithm on non-negative decimals, without Number precision loss.
    const old = (a, b) => {
        const parse = s => { const [w, d = ''] = s.replace(/,/g, '').split('.'); return [BigInt(w + d), d.length]; };
        const [x, xp] = parse(a), [y, yp] = parse(b), left = x * 10n ** BigInt(yp), right = y * 10n ** BigInt(xp);
        return left < right ? -1 : left > right ? 1 : 0;
    };
    for (const a of positives) for (const b of positives) assert.equal(V.compareDecimals(a, b), old(a, b));
    for (const a of ['-12', '−7', '-2', '-0.9', '-0.4', '-0.1', '-0', '0', '3']) {
        for (const b of ['-11', '-7', '-0.7', '-0.1', '0', '2']) assert.equal(V.compareDecimals(a, b), Math.sign(value(a) - value(b)) || 0);
    }
});
test('new skills receive exactly two Practice and two Check questions, with matching assessment types', () => {
    for (const [slug, Q, types, skill, tryCount] of [
        ['pie-charts', P, ['read-count', 'read-from-known'], 'interpret-pie-charts', 7],
        ['place-value', V, ['negCoolest', 'negGreatest', 'negSymbol', 'negOrder'], 'order-negative-numbers', 9]
    ]) {
        const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content', slug, 'lesson.json')));
        for (const type of types) {
            if (type === 'negSymbol') assert.deepEqual(lesson.assessment.question_types[type], [skill, 'inequality-symbols']);
            else assert.equal(lesson.assessment.question_types[type], skill);
        }
        for (const seed of seeds) {
            const items = Q.pick(E.seededRandom(seed));
            assert.equal(items.length, 8);
            assert.equal(items.filter(item => types.includes(item.type)).length, 2);
        }
        assert.equal(Q.checks().length, 7);
        assert.equal(Q.checks().filter(q => types.includes(q.questionType)).length, 2);
        assert.equal(Q.examples().length, tryCount);
    }
});
