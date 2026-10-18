const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { evaluate, allStrings } = require('./helpers/lessons.cjs');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/equations-of-straight-lines/equations.js'), 'utf8'), { window });
const E = window.StraightLineEquations;
const plain = value => JSON.parse(JSON.stringify(value));
const text = value => value.replace(/\u00a0/g, ' ');
const rules = form => plain(E.rearrangeRules(form));
const parse = expression => {
    const [left, right] = text(expression).split(' = ');
    const k = evaluate(left, { y: 1 }) - evaluate(left, { y: 0 });
    const d = evaluate(left, { y: 0 });
    const p = evaluate(right, { x: 1 }) - evaluate(right, { x: 0 });
    const q = evaluate(right, { x: 0 });
    return { k, d, p, q, m: p / k, c: (q - d) / k };
};
const equationIn = prompt => text(prompt).match(/(?:Look at |same as |Rewrite |on the line |on )((?:−?\d*)y[^.?]*?)(?=\.|\?| with y)/)?.[1];

test('equations-of-straight-lines formats every specified form, signs, ones and zero terms', () => {
    for (const [form, expected] of [
        [{ k: 1, d: -3, p: 2, q: 0 }, 'y − 3 = 2x'],
        [{ k: 2, d: 0, p: 4, q: 6 }, '2y = 4x + 6'],
        [{ k: 2, d: 4, p: 6, q: 0 }, '2y + 4 = 6x'],
        [E.formOf(-1, 4), 'y = −x + 4'], [E.formOf(3, 0), 'y = 3x'],
        [E.formOf(1, -2), 'y = x − 2'], [E.formOf(0, 0), 'y = 0'],
        [E.formOf(0, -4), 'y = −4']
    ]) {
        assert.equal(text(E.lineText(form)), expected);
        assert.ok(!E.lineText(form).includes(' '));
        assert.equal(E.lineHtml(form).replace(/<\/?i>/g, ''), E.lineText(form));
        assert.doesNotMatch(E.lineText(form), /\+\s*−|0x/);
    }
    for (const [m, c, expected] of [[-3, 7, 'y = 7 − 3x'], [1, -2, 'y = −2 + x'], [-1, 0, 'y = −x'], [0, 3, 'y = 3']]) {
        assert.equal(text(E.reorderedText(m, c)), expected);
        assert.ok(!E.reorderedText(m, c).includes(' '));
    }
    assert.equal(E.coordinate(-2, 3), '(−2,\u00a03)');
});

test('equations-of-straight-lines rearrange rules cover every row in order, skip inapplicable values and deduplicate', () => {
    assert.deepEqual(rules({ k: 2, d: 4, p: 6, q: 0 }).map(r => r.value), [
        { m: '-2', c: '3' }, { c: '-4' }, { c: '4' }, { m: '6' }, { c: '2' }, { m: '-3' }, { m: '3' }, { c: '-2' }
    ]);
    assert.deepEqual(rules({ k: 1, d: 0, p: -3, q: 7, reordered: true }).map(r => r.value), [
        { m: '7', c: '-3' }, { m: '3' }, { m: '-3' }, { c: '7' }
    ]);
    assert.deepEqual(rules({ k: 1, d: 4, p: 3, q: 0 }).map(r => r.value), [
        { m: '-4', c: '3' }, { c: '4' }, { m: '-3' }, { m: '3' }, { c: '-4' }
    ]);
    assert.deepEqual(rules({ k: 3, d: 0, p: 6, q: -12 }).map(r => r.value), [
        { m: '-4', c: '2' }, { c: '-12' }, { m: '6' }, { m: '-2' }, { m: '2' }, { c: '-4' }
    ]);
    const negative = rules({ k: 2, d: -4, p: -6, q: 0 });
    assert.match(text(negative[2].feedback), /add 4 to both sides, then divide every term by 2/);
    assert.match(text(negative[4].feedback), /cancel − 4, add 4/);
    assert.match(text(rules({ k: 2, d: 4, p: 6, q: 0 })[3].feedback), /6x ÷ 2 = 3x/);
    const duplicates = rules({ k: 2, d: 2, p: 4, q: 2 });
    assert.equal(duplicates.filter(r => JSON.stringify(r.value) === '{"c":"0"}').length, 1);
    assert.equal(rules(E.formOf(2, 2)).some(r => Object.keys(r.value).length === 2), false);
    assert.equal(rules(E.formOf(0, 3)).some(r => r.feedback.startsWith('Keep the sign')), false);
});

test('equations-of-straight-lines point rules cover on and off line, negative substitutions and skipped duplicates', () => {
    for (const b of [5, 6]) {
        const form = { k: 2, d: 0, p: 4, q: -2 };
        const r = plain(E.pointRules(form, [3, b]));
        assert.deepEqual(r.map(r => r.value), [{ left: String(b) }, ...(b === 6 ? [] : [{ left: '6' }]), { right: String(4 * b - 2) }, { left: String(2 * b) }, { right: '10' }]);
        const card = E.pointCard(form, [3, b]);
        assert.equal(card.answer.left, String(2 * b)); assert.equal(card.answer.right, '10');
        assert.match(card.feedback, b === 5 ? /Both sides are 10/ : /12 and 10 aren't equal/);
    }
    const negative = E.pointCard({ k: 2, d: 0, p: -4, q: 2 }, [3, -5]);
    assert.match(text(negative.rules[0].feedback), /2 × \(−5\) = −10/);
    assert.equal(E.pointRules({ k: 1, d: 0, p: 2, q: 1 }, [2, 2]).length, 2);
});

test('equations-of-straight-lines seeded sessions have the right mix, valid maths and bounded numbers in all options and feedback', () => {
    const { seededRandom } = window.Maths1to9LessonEngine;
    const seen = new Set();
    for (let seed = 0; seed < 600; seed++) {
        const items = plain(E.pick(seededRandom(seed)));
        assert.deepEqual(items, plain(E.pick(seededRandom(seed))));
        assert.equal(items.length, 8);
        assert.equal(new Set(items.filter((_, i) => i % 2 === 0).map(i => i.type)).size, 4);
        assert.deepEqual(items.filter((_, i) => i % 2).map(i => i.type).sort(), [...E.choiceTypes].sort());
        items.forEach((item, index) => {
            seen.add(item.type);
            const q = plain(E.generate(item, seededRandom(item.seed)));
            assert.deepEqual(q, plain(E.generate(item, seededRandom(item.seed))));
            assert.equal(q.input, index % 2 ? 'choice' : 'number');
            const f = parse(equationIn(q.prompt));
            assert.notEqual(Math.abs(f.m), Math.abs(f.c));
            for (const s of allStrings(q)) {
                assert.doesNotMatch(s, /\+\s*−/);
                for (const n of s.match(/−?\d+(?:\.\d+)?/g) || []) assert.ok(Math.abs(Number(n.replace('−', '-'))) <= 40, `${item.type}: ${s}`);
            }
            if (q.input === 'number') {
                assert.equal(q.fields.length, 2); assert.equal(q.fractions, true);
                Object.values(q.answer).forEach(a => assert.ok(Number.isInteger(Number(a))));
                if (item.type === 'point-sides') {
                    const [, a, b] = text(q.prompt).match(/\((−?\d+), (−?\d+)\)/);
                    const point = [a, b].map(n => Number(n.replace('−', '-')));
                    assert.notEqual(...point);
                    assert.equal(Number(q.answer.left), f.k * point[1] + f.d);
                    assert.equal(Number(q.answer.right), f.p * point[0] + f.q);
                } else { assert.equal(Number(q.answer.m), f.m); assert.equal(Number(q.answer.c), f.c); }
            } else {
                assert.equal(q.options.filter(o => o.correct).length, 1);
                assert.equal(new Set(q.options.map(o => o.label)).size, q.options.length);
                const answer = text(q.options.find(o => o.correct).label);
                if (['same-equation', 'on-its-own'].includes(item.type)) {
                    const result = parse(answer); assert.equal(result.m, f.m); assert.equal(result.c, f.c);
                    q.options.filter(o => !o.correct).forEach(o => { const wrong = parse(o.label); assert.ok(wrong.m !== f.m || wrong.c !== f.c); });
                }
                if (item.type === 'read-reordered') assert.equal(answer, `The gradient is ${E.number(f.m)} and the y-intercept is ${E.number(f.c)}.`);
                if (item.type === 'point-check') {
                    const [, a, b] = text(q.prompt).match(/\((−?\d+), (−?\d+)\)/);
                    const [x, y] = [a, b].map(n => Number(n.replace('−', '-')));
                    assert.equal(answer.startsWith('Yes.'), f.m * x + f.c === y);
                    const calculation = answer.match(/\. (.+?) = (−?\d+)/);
                    assert.equal(evaluate(calculation[1]), Number(calculation[2].replace('−', '-')));
                }
            }
        });
    }
    assert.equal(seen.size, 9);
});
