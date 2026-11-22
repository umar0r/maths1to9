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
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/digit-cards.js'), 'utf8'), { window });
const Q = loadScript(path.join(folder, 'decimal-addition.js'),
    ['columnSteps', 'cardProblem', 'checks', 'practiceTypes', 'generate', 'pick', 'pickSteps', 'generateStep'], { window });
loadScript(path.join(folder, 'interactive.js'), ['screens', 'tryItProblems'], { window });
loadScript(path.join(folder, 'build-it.js'), ['buildProblem', 'buildWidget'], { window });
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
    case 'add-different-lengths': case 'add-build': case 'money-card': return v.a + v.b;
    case 'subtract-exchange': case 'subtract-card': return v.a - v.b;
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
    const inputs = Array(10).fill('custom');
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
        if (['add-different-lengths', 'subtract-exchange', 'add-build'].includes(q.questionType)) {
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
    for (const q of generated.filter(q => q.widget && !q.buildProblem)) {
        const answer = answerFor(q);
        const keys = q.cardProblem.keys;
        const value = { digits: Object.fromEntries(keys.map((key, i) => [key, String(Math.floor(answer / 10 ** i) % 10)])), active: null };
        assert.equal(q.widget.isEmpty(value), false);
        assert.equal(q.widget.mark(value).correct, true);
        assert.equal(numeric(q.widget.answerText(value)), answer);
        assert.equal(q.cardProblem.showCarry(value.digits), false);
        for (const key of keys) {
            const wrong = { digits: { ...value.digits, [key]: String((Number(value.digits[key]) + 1) % 10) } };
            assert.equal(q.widget.mark(wrong).correct, false);
            assert.equal(q.widget.mark(wrong).marks[key], 'wrong');
            assert.equal(q.widget.keepValueOnRetry, true);
            assert.equal(q.widget.mark(wrong).value.marks[key], 'wrong');
            assert.equal(wrong.marks, undefined, 'checking never mutates the supplied value');
            assert.match(q.widget.mark(wrong).feedback, new RegExp(`Check the ${key}:`));
            delete wrong.digits[key];
            const optionalLeadingZero = keys.indexOf(key) >= 3 && Math.floor(answer / 10 ** keys.indexOf(key)) === 0;
            assert.equal(q.widget.isEmpty(wrong), !optionalLeadingZero);
            assert.equal(q.widget.mark(wrong).marks[key], optionalLeadingZero ? undefined : 'wrong');
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
        if (['add-different-lengths', 'subtract-exchange', 'add-build', 'missing-addend'].includes(q.questionType)) {
            if (q.questionType !== 'missing-addend') assert.notEqual(q.values.b % 10, 0);
            else assert.notEqual(q.values.a % 10, 0);
            const onePlace = q.questionType === 'missing-addend' ? q.values.b : q.values.a;
            assert.notEqual(Math.floor(onePlace / 10) % 10, 0);
        }
        if (q.cardProblem && !['money-card', 'money-in-out', 'change', 'price-difference', 'missing-refund'].includes(q.questionType)) {
            assert.doesNotMatch(q.cardProblem.a, /\.\d*0$/);
            assert.doesNotMatch(q.cardProblem.b, /\.\d*0$/);
        }
    }
});


test('decimals: build-it cards mark placement before answers and accept blank or zero padding', () => {
    const fixed = window.DecimalAddition.buildProblem('5.3', '12.46', '+', true);
    const problems = [fixed, ...generated.filter(q => q.buildProblem).map(q => q.buildProblem)];
    for (const problem of problems) {
        const widget = window.DecimalAddition.createBuildWidget(problem);
        const digits = Object.fromEntries(problem.operands.flatMap(operand => problem.keys.filter(key => operand.fields[key].required)
            .map(key => [`${operand.id}:${key}`, operand.fields[key].digit])));
        for (const key of problem.keys) digits[`answer:${key}`] = problem.answerDigits[key];
        const value = { digits, active: null };
        assert.equal(widget.isEmpty(null), true);
        assert.equal(widget.isEmpty(value), false);
        assert.equal(widget.mark(value).correct, true);
        assert.equal(numeric(widget.answerText(value)), problem.answer);
        for (const operand of problem.operands) for (const key of problem.keys) {
            const wrong = structuredClone(value);
            wrong.digits[`${operand.id}:${key}`] = operand.fields[key].required
                ? String((Number(operand.fields[key].digit) + 1) % 10) : '9';
            assert.equal(widget.mark(wrong).correct, false);
            assert.equal(widget.keepValueOnRetry, true);
            assert.equal(widget.mark(wrong).marks[`${operand.id}:${key}`], 'wrong');
            assert.equal(widget.mark(wrong).marks['answer:units'], 'right');
            assert.equal(widget.mark(wrong).value.marks[`${operand.id}:${key}`], 'wrong');
            assert.ok(widget.mark(wrong).feedback.includes(operand.text));
            wrong.digits['answer:hundredths'] = '9';
            assert.ok(!widget.mark(wrong).feedback.startsWith('Check the'), 'placement feedback must come first');
            if (!operand.fields[key].required) value.digits[`${operand.id}:${key}`] = '0';
        }
        assert.equal(widget.mark(value).correct, true);
        for (const key of problem.keys) {
            const wrong = structuredClone(value);
            wrong.digits[`answer:${key}`] = String((Number(problem.answerDigits[key]) + 1) % 10);
            assert.equal(widget.mark(wrong).correct, false);
            assert.match(widget.mark(wrong).feedback, new RegExp(`Check the ${key}:`));
            delete wrong.digits[`answer:${key}`];
            // A blank tens cell counts as 0 when the answer has no tens digit.
            const optional = key === 'tens' && problem.answer < 1000;
            assert.equal(widget.isEmpty(wrong), !optional);
            assert.equal(widget.mark(wrong).correct, optional);
        }
    }
    assert.equal(fixed.feedback, '5.30 + 12.46 = 17.76.');
    assert.equal(fixed.placementHint(fixed.operands[0], 'tenths', { 'a:tenths': '9' }), 'The 3 in 5.3 is 3 tenths.');
    assert.equal(fixed.placementHint(fixed.operands[1], 'tens', { 'b:tens': '9' }), 'The 1 in 12.46 is 1 ten.');
    assert.ok(generated.filter(q => q.questionType === 'add-build').every(q => q.values.a >= 1000 && q.buildProblem.tens));
});

test('decimals: the answer keeps a digit in every column except an unused leading tens', () => {
    const blank = value => ({ digits: value, active: null });
    // 14.1 - 6.17 = 7.93: the answer has no tens digit, so its tens cell may stay empty.
    const takeAway = window.DecimalAddition.buildProblem('14.1', '6.17', '−', true);
    const widget = window.DecimalAddition.createBuildWidget(takeAway);
    const digits = {
        'a:tens': '1', 'a:units': '4', 'a:tenths': '1',
        'b:units': '6', 'b:tenths': '1', 'b:hundredths': '7',
        'answer:units': '7', 'answer:tenths': '9', 'answer:hundredths': '3'
    };
    assert.equal(takeAway.answer, 793);
    assert.equal(widget.isEmpty(blank(digits)), false);
    const marked = widget.mark(blank(digits));
    assert.equal(marked.correct, true);
    assert.equal(marked.feedback, '14.10 − 6.17 = 7.93.');
    assert.equal(widget.answerText(blank(digits)), '7.93');
    // A 0 in that cell is still right.
    assert.equal(widget.mark(blank({ ...digits, 'answer:tens': '0' })).correct, true);
    // Every other answer column needs a digit, even when that digit is 0.
    const withoutUnits = { ...digits };
    delete withoutUnits['answer:units'];
    assert.equal(widget.isEmpty(blank(withoutUnits)), true);
    assert.equal(widget.mark(blank(withoutUnits)).correct, false);
    const underOne = window.DecimalAddition.buildProblem('1.2', '0.27', '−', true);
    const underOneWidget = window.DecimalAddition.createBuildWidget(underOne);
    const noughts = {
        'a:units': '1', 'a:tenths': '2', 'b:units': '0', 'b:tenths': '2', 'b:hundredths': '7',
        'answer:units': '0', 'answer:tenths': '9', 'answer:hundredths': '3'
    };
    assert.equal(underOne.answer, 93);
    assert.equal(underOneWidget.mark(blank(noughts)).correct, true);
    delete noughts['answer:units'];
    assert.equal(underOneWidget.isEmpty(blank(noughts)), true);
    const trailingZero = window.DecimalAddition.buildProblem('8', '0.1', '−', true);
    const trailingWidget = window.DecimalAddition.createBuildWidget(trailingZero);
    const sevenPointNine = {
        'a:units': '8', 'b:units': '0', 'b:tenths': '1', 'answer:units': '7', 'answer:tenths': '9'
    };
    assert.equal(trailingZero.answer, 790);
    assert.equal(trailingWidget.isEmpty(blank(sevenPointNine)), true);
    assert.equal(trailingWidget.mark(blank(sevenPointNine)).correct, false);
    assert.equal(trailingWidget.mark(blank({ ...sevenPointNine, 'answer:hundredths': '0' })).correct, true);
});

test('decimals: a place a number does not use may be left empty or padded with 0', () => {
    const problem = window.DecimalAddition.buildProblem('5.3', '12.46', '+', true);
    const widget = window.DecimalAddition.createBuildWidget(problem);
    const digits = {
        'a:units': '5', 'a:tenths': '3',
        'b:tens': '1', 'b:units': '2', 'b:tenths': '4', 'b:hundredths': '6',
        'answer:tens': '1', 'answer:units': '7', 'answer:tenths': '7', 'answer:hundredths': '6'
    };
    // Left empty: 5.3 has no tens and no hundredths.
    assert.equal(widget.mark({ digits, active: null }).correct, true);
    // Padded with zeros: 05.30 is the same number.
    const padded = { ...digits, 'a:tens': '0', 'a:hundredths': '0' };
    const marked = widget.mark({ digits: padded, active: null });
    assert.equal(marked.correct, true);
    assert.equal(marked.feedback, '5.30 + 12.46 = 17.76.');
    // A zero in a place the number does use is still a wrong digit.
    const displaced = { ...digits, 'a:tenths': '0' };
    assert.equal(widget.mark({ digits: displaced, active: null }).correct, false);
    assert.equal(widget.mark({ digits: displaced, active: null }).feedback, 'The 3 in 5.3 is 3 tenths.');
});

test('decimals: shared cards keep saved values, group directions, erasing and locked review', () => {
    // Exercise the public component without a browser. The lesson's UI tests
    // separately cover real mouse/touch input, animation and table layout.
    const node = () => ({
        children: [], dataset: {}, style: {}, listeners: {},
        classList: { add() {}, remove() {}, toggle() {} },
        append(child) { this.children.push(child); },
        setAttribute() {}, removeAttribute() {}, addEventListener(name, handler) { this.listeners[name] = handler; },
        removeEventListener() {}, remove() {}, focus() {}
    });
    const sharedWindow = { matchMedia: () => ({ matches: true }) };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/digit-cards.js'), 'utf8'), {
        window: sharedWindow, document: { createElement: node }
    });
    for (const advance of ['left', 'right', 'none']) {
        const host = node(), changes = [];
        const slots = ['a', 'blocked', 'b', 'c'].map(id => ({ id, group: 'row', element: node(), allowed: () => id !== 'blocked' }));
        const original = { digits: { c: '2' }, active: advance === 'left' ? 'b' : 'a' };
        const view = sharedWindow.Maths1to9DigitCards.create(host, {
            slots, groups: { row: { advance } }, value: original,
            onChange: value => changes.push(value)
        });
        host.listeners.keydown({ key: '7', preventDefault() {} });
        const saved = changes.at(-1);
        assert.equal(saved.digits[original.active], '7');
        assert.equal(saved.active, advance === 'left' ? 'a' : advance === 'right' ? 'b' : 'a');
        assert.equal(original.digits[original.active], undefined, 'input value is never mutated');
        slots[0].element.listeners.click();
        host.listeners.keydown({ key: 'Backspace', preventDefault() {} });
        assert.equal(changes.at(-1).digits.a, undefined);
        view.update({ value: saved, editable: false, phase: 'correct' });
        const count = changes.length;
        host.listeners.keydown({ key: '9', preventDefault() {} });
        assert.equal(changes.length, count, 'locked review cannot change saved work');
        assert.ok(slots.every(slot => slot.element.disabled));
        view.update({ value: null, editable: true, phase: 'answer' });
        assert.ok(slots.every(slot => slot.element.textContent === ''));
        assert.equal(changes.length, count, 'restore and Reset do not report pupil input');
    }
    const host = node(), changes = [];
    const slots = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].map(id => ({ id, group: id[0], element: node() }));
    const groups = { a: { advance: 'right', wrap: false, next: 'b' }, b: { advance: 'right', wrap: false, next: 'c' }, c: { advance: 'left' } };
    const view = sharedWindow.Maths1to9DigitCards.create(host, { slots, groups, active: 'a1', onChange: value => changes.push(value) });
    for (const active of ['a2', 'b1', 'b2', 'c2', 'c1', null]) {
        host.listeners.keydown({ key: '7', preventDefault() {} });
        assert.equal(changes.at(-1).active, active);
    }
    assert.ok(host.children[0].children.every(card => card.disabled), 'completed groups have no enabled cards without a chosen box');
    view.update({ value: null, editable: true, phase: 'answer' });
    assert.ok(host.children[0].children.every(card => !card.disabled), 'Reset restores the chosen starting box');
    const unselectedHost = node();
    sharedWindow.Maths1to9DigitCards.create(unselectedHost, { slots });
    assert.ok(unselectedHost.children[0].children.every(card => card.disabled), 'a component without a starting slot looks disabled');
});


test('decimals: ten seeded problems have sixteen saved stages, with four distinct calculation choices', () => {
    const counts = [1, 1, 1, 1, 2, 2, 1, 2, 3, 2];
    assert.equal(lesson.question_bank.session_length, 16);
    for (const seed of seeds) {
        const items = Q.pickSteps(seededRandom(seed));
        assert.equal(items.length, 16);
        assert.equal(JSON.stringify(items), JSON.stringify(Q.pickSteps(seededRandom(seed))));
        assert.equal(new Set(items.map(item => item.seed)).size, 16);
        for (let parent = 0; parent < 10; parent++) {
            const stages = items.filter(item => item.parent === parent);
            assert.equal(stages.length, counts[parent]);
            assert.equal(new Set(stages.map(item => item.problemSeed)).size, 1);
            assert.deepEqual(stages.map(item => item.step), Array.from({ length: counts[parent] }, (_, index) => index));
            assert.equal(stages[0].type, Q.practiceTypes[parent]);
        }
        for (const item of items) {
            const stage = Q.generateStep(item);
            assert.equal(stage.questionType, item.type);
            if (stage.input === 'choice') {
                assert.equal(stage.options.length, 4);
                assert.equal(stage.options.filter(choice => choice.correct).length, 1);
                assert.equal(new Set(stage.options.map(choice => choice.value)).size, 4);
                assert.equal(new Set(stage.options.map(choice => choice.feedback)).size, 4);
                for (const choice of stage.options) {
                    const parts = choice.label.match(/−|\+|\d+(?:\.\d+)?/g);
                    let total = numeric(parts[0]);
                    for (let index = 1; index < parts.length; index += 2) total += (parts[index] === '+' ? 1 : -1) * numeric(parts[index + 1]);
                    assert.equal(choice.value, total, choice.label);
                    assert.ok(choice.feedback);
                }
                const problem = Q.generate(item, seededRandom(item.problemSeed));
                assert.equal(stage.options.find(choice => choice.correct).value, answerFor(problem));
            } else if (stage.cardProblem) {
                const problem = stage.cardProblem;
                const left = numeric(problem.a), right = numeric(problem.b);
                const answer = problem.operator === '+' ? left + right : left - right;
                const value = { digits: Object.fromEntries(problem.keys.map((key, index) => [key, String(Math.floor(answer / 10 ** index) % 10)])), active: null };
                assert.equal(stage.widget.isEmpty(value), false);
                assert.equal(stage.widget.mark(value).correct, true, stage.prompt);
                assert.equal(numeric(stage.widget.answerText(value)), answer);
                for (const key of problem.keys) {
                    const wrong = { digits: { ...value.digits, [key]: String((Number(value.digits[key]) + 1) % 10) } };
                    assert.equal(stage.widget.mark(wrong).correct, false);
                    assert.match(stage.widget.mark(wrong).feedback, new RegExp(`Check the ${key}:`));
                }
                if (problem.previous) {
                    const previous = problem.previous;
                    const subtotal = previous.operator === '+' ? numeric(previous.a) + numeric(previous.b) : numeric(previous.a) - numeric(previous.b);
                    assert.equal(numeric(previous.answer), subtotal);
                    assert.equal(left, subtotal);
                }
            }
        }
    }
});
