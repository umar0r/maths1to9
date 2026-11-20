const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript } = require('./helpers/lessons.cjs');
const folder = path.join(contentDir, 'adding-decimal-numbers');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const Q = loadScript(path.join(folder, 'decimal-addition.js'),
    ['columnSteps', 'cardProblem', 'checks', 'practiceTypes', 'generate', 'pick'], { window });
loadScript(path.join(folder, 'interactive.js'), ['screens', 'tryItProblems'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const lesson = JSON.parse(fs.readFileSync(path.join(folder, 'lesson.json')));
const numeric = text => Math.round(Number(text.replace(/£/g, '').replace('−', '-')) * 100);
const seeds = [0, 0xffffffff, 0x80000000];
let seed = 0x9e3779b9;
while (seeds.length < 200) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    if (!seeds.includes(seed)) seeds.push(seed);
}
const generated = seeds.flatMap(seed => Q.pick(seededRandom(seed)).map(item => Q.generate(item, seededRandom(item.seed))));
const answerFor = q => {
    const v = q.values;
    switch (q.questionType) {
    case 'add-different-lengths': case 'money-card': return v.a + v.b;
    case 'subtract-exchange': case 'subtract-card': return v.a - v.b;
    case 'add-then-subtract': return v.a + v.b - v.c;
    case 'money-in-out': return v.balance - v.payment + v.refund;
    case 'change': return v.paid - v.cost;
    case 'price-difference': return v.northLarge - v.northSmall;
    case 'missing-addend': return v.total - v.a - v.b;
    case 'missing-refund': return v.after - v.balance;
    default: throw Error(q.questionType);
    }
};

test('decimals: 200 seeds per kind have exact integer-cent answers and distinct mistakes', () => {
    assert.equal(generated.length, 2000);
    for (const q of generated) {
        const answer = answerFor(q);
        assert.equal(numeric(q.answer), answer, q.prompt);
        assert.ok(answer > 0);
        assert.equal(lesson.assessment.question_types[q.questionType], 'decimal-add-subtract');
        if (q.options) {
            assert.equal(q.options.length, 4);
            assert.equal(q.options.filter(o => o.correct).length, 1);
            assert.equal(numeric(q.options.find(o => o.correct).label), answer);
            assert.equal(new Set(q.options.map(o => numeric(o.label))).size, 4);
            assert.equal(new Set(q.options.map(o => o.feedback)).size, 4);
            assert.ok(q.options.every(o => o.feedback));
        }
        if (q.rules) {
            assert.ok(q.feedback && q.fallback);
            assert.equal(new Set([answer, ...q.rules.map(r => numeric(r.value))]).size, q.rules.length + 1);
            assert.ok(q.rules.every(r => r.feedback));
        }
    }
});

test('decimals: ordered sessions repeat from all 32-bit seeds and mix cards, choices and typing', () => {
    const inputs = ['custom', 'choice', 'number', 'custom', 'choice', 'number', 'custom', 'choice', 'number', 'number'];
    for (const seed of seeds) {
        const items = Q.pick(seededRandom(seed));
        assert.deepEqual(items.map(i => i.type), Q.practiceTypes);
        assert.equal(items.length, 10);
        items.forEach((item, index) => {
            const first = Q.generate(item, seededRandom(item.seed));
            const again = Q.generate(item, seededRandom(item.seed));
            assert.equal(first.input, inputs[index]);
            assert.equal(JSON.stringify(first), JSON.stringify(again));
        });
    }
});

test('decimals: generated ranges and required exchanges are preserved', () => {
    for (const q of generated) {
        const v = q.values;
        if (q.questionType === 'add-different-lengths' || q.questionType === 'subtract-exchange') {
            assert.ok(v.a >= 110 && v.a <= 3990 && v.a % 10 === 0);
            assert.ok(v.b >= 11 && v.b <= 999 && v.b % 10 !== 0);
        }
        if (q.questionType === 'subtract-exchange' || q.questionType === 'subtract-card') {
            assert.ok(Q.columnSteps(v.a, v.b, '−').some(step => step.outgoing));
        }
        if (q.questionType === 'subtract-card') {
            assert.ok(Math.floor(v.a / 100) > Math.floor(v.b / 100));
            assert.ok(Math.floor(v.a / 10) % 10 < Math.floor(v.b / 10) % 10);
            assert.ok(v.a % 10 >= v.b % 10);
        }
        if (q.questionType === 'money-card') {
            assert.ok([v.a, v.b].every(n => n >= 50 && n <= 999));
            assert.ok(Q.columnSteps(v.a, v.b, '+').some(step => step.outgoing));
        }
        if (q.questionType === 'money-in-out') {
            assert.ok(v.balance >= 10000 && v.balance <= 99999 && v.balance > v.payment);
            assert.ok(v.payment >= 2000 && v.payment <= 19999);
            assert.ok(v.refund >= 500 && v.refund <= 4999);
        }
        if (q.questionType === 'change') {
            assert.ok([500, 1000, 2000].includes(v.paid) && v.paid > v.cost);
            assert.ok(v.cost >= 50 && v.cost <= 999);
        }
        if (q.questionType === 'price-difference') assert.ok(Object.values(v).every(n => n >= 50 && n <= 999));
        if (q.questionType === 'missing-addend') assert.equal(v.total % 100, 0);
    }
});

test('decimals: card digits, tens, first wrong column and incomplete answers are checked', () => {
    for (const q of generated.filter(q => q.widget)) {
        const answer = answerFor(q);
        const keys = ['hundredths', 'tenths', 'units', ...(answer >= 1000 ? ['tens'] : [])];
        const value = { digits: Object.fromEntries(keys.map((key, i) => [key, String(Math.floor(answer / 10 ** i) % 10)])), active: null };
        assert.equal(q.widget.isEmpty(value), false);
        assert.equal(q.widget.mark(value).correct, true);
        assert.equal(numeric(q.widget.answerText(value)), answer);
        assert.equal(q.cardProblem.showCarry(value.digits), false);
        for (const key of keys) {
            const wrong = { digits: { ...value.digits, [key]: String((Number(value.digits[key]) + 1) % 10) } };
            assert.equal(q.widget.mark(wrong).correct, false);
            assert.match(q.widget.mark(wrong).feedback, new RegExp(`Check the ${key}:`));
            delete wrong.digits[key];
            assert.equal(q.widget.isEmpty(wrong), true);
        }
        assert.match(q.widget.mark({ digits: {} }).feedback, /Check the hundredths:/);
    }
});

test('decimals: four approved Check questions test understanding with separate mistake feedback', () => {
    const checks = Q.checks();
    assert.equal(checks.length, 4); // Umar explicitly approved four for this lesson.
    assert.deepEqual(checks.map(q => q.questionType), ['line-up-points', 'zeros-fill-gaps', 'carry-one', 'receipt-operations']);
    for (const q of checks) {
        assert.equal(q.input, 'choice');
        assert.equal(q.options.length, 4);
        assert.equal(q.options.filter(o => o.correct).length, 1);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, 4);
        assert.ok(q.options.every(o => o.feedback));
        assert.equal(lesson.assessment.question_types[q.questionType], 'decimal-add-subtract');
    }
    assert.match(checks[0].options.find(o => o.correct).label, /8 is tenths.*4 is hundredths/);
    assert.match(checks[1].options.find(o => o.correct).label, /no hundredths/);
    assert.equal(checks[2].options.find(o => o.correct).label, 'Write 0 in the tenths and add 1 to the units.');
    assert.equal(checks[3].options.find(o => o.correct).label, '2.40 + 1.35 − 0.50');
});


test('decimals: non-money questions omit trailing decimal zeros; money keeps two places', () => {
    for (const q of generated) {
        for (const text of [q.prompt, ...(q.options || []).map(o => o.label)]) {
            for (const money of text.matchAll(/£(\d+(?:\.\d+)?)/g)) assert.match(money[1], /^\d+\.\d{2}$/);
            for (const match of text.matchAll(/(£?)(\d+\.\d+)/g)) {
                if (match[1]) assert.match(match[2], /^\d+\.\d{2}$/);
                else assert.doesNotMatch(match[2], /0$/);
            }
        }
        if (['add-different-lengths', 'subtract-exchange', 'add-then-subtract', 'missing-addend'].includes(q.questionType)) {
            if (q.questionType !== 'missing-addend') assert.notEqual(q.values.b % 10, 0);
            else assert.notEqual(q.values.a % 10, 0);
            const onePlace = q.questionType === 'missing-addend' ? q.values.b : q.values.a;
            assert.notEqual(Math.floor(onePlace / 10) % 10, 0);
        }
        if (q.widget && q.questionType !== 'money-card') {
            assert.doesNotMatch(q.cardProblem.a, /\.\d*0$/);
            assert.doesNotMatch(q.cardProblem.b, /\.\d*0$/);
        }
    }
});
