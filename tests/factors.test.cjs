const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, contentDir } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const Q = loadScript(path.join(contentDir, 'factors/factors.js'), ['pairs', 'factors', 'rowModel', 'rowWidget', 'examples', 'checks', 'types', 'generate', 'pick', 'learnScreens'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const expectedFactors = number => Array.from({ length: number }, (_, index) => index + 1).filter(value => number % value === 0);
const generated = Q.types.flatMap(type => ['choice', 'number', ...(type === 'equal-rows' ? ['custom'] : [])].flatMap(mode => Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0)))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];

test('factors: every pair and complete factor list is correct, including square factors once', () => {
    for (let number = 1; number <= 200; number++) {
        assert.deepEqual(Array.from(Q.factors(number)), expectedFactors(number));
        for (const [first, second] of Q.pairs(number)) { assert.equal(first * second, number); assert.ok(first <= second); }
        assert.equal(Q.pairs(number).length, Math.ceil(expectedFactors(number).length / 2));
    }
});
test('factors: every numeric answer is correct for 200 seeds of every type in choice and typed modes', () => {
    for (const question of questions.filter(question => ['count', 'missing', 'remainder'].includes(question.kind))) {
        const expected = question.kind === 'count' ? expectedFactors(question.number).length
            : question.kind === 'missing' ? question.number / question.divisor : question.number % question.divisor;
        const answer = question.input === 'choice' ? question.options.find(option => option.correct).label : question.answer;
        assert.equal(Number(answer), expected, question.prompt);
    }
});
test('factors: choices have exactly four distinct options, one correct answer and individual feedback', () => {
    for (const question of questions.filter(question => question.options)) {
        assert.equal(question.options.length, 4, question.prompt);
        assert.equal(new Set(question.options.map(option => option.label)).size, 4, question.prompt);
        assert.equal(question.options.filter(option => option.correct).length, 1);
        assert.equal(new Set(question.options.map(option => option.feedback)).size, 4, question.prompt);
        if (question.kind === 'list') assert.equal(question.options.find(option => option.correct).label, expectedFactors(question.number).join(', '));
        if (question.kind === 'square') assert.equal(question.options.find(option => option.correct).label, `Stop and list ${question.divisor} once.`);
        if (question.kind === 'reason') assert.equal(question.options.find(option => option.correct).label, question.number % question.divisor === 0 ? 'Yes, the division is exact.' : 'No, there is a remainder.');
        if (question.kind === 'missed-square') assert.equal(question.options.find(option => option.correct).label, '4');
    }
});
test('factors: typed mistake rules are wrong and every typed card has feedback and fallback', () => {
    for (const question of questions.filter(question => question.input === 'number')) {
        assert.ok(question.feedback && question.fallback && question.rules.length);
        const method = question.kind === 'remainder' ? 'left over' : question.kind === 'missing' ? 'Divide' : 'count';
        assert.ok(question.fallback.includes(method), question.prompt);
        for (const rule of question.rules) { assert.notEqual(Number(rule.value), Number(question.answer)); assert.ok(rule.feedback); }
    }
});
test('factors: equal rows accept exactly the allowed divisors and retain a clear answer', () => {
    for (const question of questions.filter(question => question.input === 'custom')) {
        let correct = 0;
        for (let rows = 2; rows <= 6; rows++) {
            const result = question.widget.mark({ rows });
            assert.equal(result.correct, question.number % rows === 0);
            if (result.correct) { correct++; assert.equal(question.widget.answerText({ rows }), `${rows} × ${question.number / rows} = ${question.number}`); }
        }
        assert.ok(correct > 0);
        for (const value of [null, { rows: 1 }, { rows: 7 }, { rows: '3' }, { rows: 3.5 }]) assert.equal(question.widget.mark(value).correct, false);
        assert.equal(question.widget.isEmpty(null), true);
    }
});
test('factors: counter layouts preserve every counter and keep all circles inside the picture', () => {
    for (let number = 1; number <= 60; number++) for (const rows of [null, 1, 2, 3, 4, 5, 6]) {
        const model = Q.rowModel(number, rows);
        assert.equal(model.positions.length, number);
        for (const point of model.positions) {
            assert.ok(point.x >= 9 && point.x + 9 <= model.width);
            assert.ok(point.y >= 9 && point.y + 9 <= model.height);
        }
        if (rows) {
            assert.equal(model.perRow, Math.floor(number / rows));
            assert.equal(model.remainder, number % rows);
            assert.equal(model.positions.filter(point => point.leftover).length, number % rows);
        }
    }
});
test('factors: seeded six-question sessions mix choice, typed and equal-row answers', () => {
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, 6);
        assert.deepEqual(items.map(item => item.mode), ['choice', 'number', 'choice', 'number', 'custom', 'number']);
        assert.deepEqual(JSON.parse(JSON.stringify(items)), JSON.parse(JSON.stringify(Q.pick(seededRandom(seed)))));
    }
});
test('factors: Learn teaches every question method before questions, with two choices and two typed answers per section', () => {
    const text = Q.learnScreens.flatMap(screen => screen.lines).join(' ').toLowerCase();
    for (const keyword of ['factor pair', 'remainder', 'divide', 'once', 'same', 'middle', 'multiples', 'six factors']) assert.ok(text.includes(keyword));
    for (const make of [Q.examples, Q.checks]) {
        assert.ok(make().filter(question => question.input === 'choice').length >= 2);
        assert.ok(make().filter(question => question.input === 'number').length >= 2);
    }
    assert.equal(Q.checks().length, 5);
    assert.equal(Q.learnScreens[0].title, 'What a factor means');
});
