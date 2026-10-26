const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { loadScript } = require('./helpers/lessons.cjs');

const folder = path.join(__dirname, '..', 'content', 'prime-factor-decomposition');
const names = ['FEEDBACK', 'feedback', 'isPrime', 'primeFactors', 'toIndexForm', 'toLatex',
    'checkSplit', 'createTree', 'splitNode', 'leaves', 'isFinished', 'markAnswer', 'validTree',
    'rowsToEntries', 'areRowsComplete', 'firstWrongPrime', 'treeWidget', 'builderWidget',
    'types', 'PRACTICE_NUMBERS', 'pick', 'generate', 'prepare', 'examples', 'checks', 'learnScreens'];
const runtime = { Maths1to9PrimeFactors: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window: runtime, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const logic = loadScript(path.join(folder, 'prime-factors.js'), names, { window: runtime });
const { seededRandom } = runtime.Maths1to9LessonEngine;
const { isPrime, primeFactors, toIndexForm, toLatex, checkSplit, createTree, splitNode, leaves, isFinished, markAnswer } = logic;
const entries = (...pairs) => pairs.map(([base, power = 1]) => ({ base, power }));
function trialPrime(n) {
    if (n < 2) return false;
    for (let d = 2; d < n; d++) if (n % d === 0) return false;
    return true;
}
function freezeTree(node) {
    if (node.children) { node.children.forEach(freezeTree); Object.freeze(node.children); }
    return Object.freeze(node);
}

test('isPrime agrees with independent trial division from 0 to 200 and rejects non-whole numbers', () => {
    for (let n = 0; n <= 200; n++) assert.equal(isPrime(n), trialPrime(n), `n=${n}`);
    for (const n of [-7, 2.5, NaN, Infinity, '7', null]) assert.equal(isPrime(n), false);
});

test('primeFactors gives a sorted prime product for every number from 2 to 500', () => {
    for (let n = 2; n <= 500; n++) {
        const factors = primeFactors(n);
        assert.equal(factors.reduce((product, factor) => product * factor, 1), n, `product for ${n}`);
        assert(factors.every(trialPrime), `prime factors for ${n}`);
        assert.deepEqual(factors, [...factors].sort((a, b) => a - b), `sorted factors for ${n}`);
    }
});

test('factorisation and tree creation reject unsupported roots instead of looping or creating invalid trees', () => {
    for (const n of [0, 1, -2, 2.5, Infinity, NaN, '60', Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => primeFactors(n), RangeError);
        assert.throws(() => createTree(n), RangeError);
    }
});

test('index form and LaTeX cover repeated factors, mixed powers, no repeats and a single prime', () => {
    for (const [n, expected, latex] of [
        [60, entries([2, 2], [3], [5]), '2^{2} \\times 3 \\times 5'],
        [72, entries([2, 3], [3, 2]), '2^{3} \\times 3^{2}'],
        [81, entries([3, 4]), '3^{4}'],
        [30, entries([2], [3], [5]), '2 \\times 3 \\times 5'],
        [17, entries([17]), '17']
    ]) {
        const factors = primeFactors(n);
        const snapshot = [...factors];
        assert.deepEqual(toIndexForm(factors), expected);
        assert.equal(toLatex(expected), latex);
        assert.deepEqual(factors, snapshot);
    }
    assert.deepEqual(toIndexForm([5, 2, 3, 2]), entries([2, 2], [3], [5]));
    assert.equal(toLatex(entries([5], [3], [2, 2])), '5 \\times 3 \\times 2^{2}');
    assert.equal(toLatex(entries([2, 1])), '2');
});

test('checkSplit validates prime, whole numbers, product and use of 1 in the required order', () => {
    for (const pair of [[2, 6], [6, 2], [3, 4]]) assert.deepEqual(checkSplit(12, ...pair), { ok: true });
    for (const [n, a, b, reason] of [
        [12, 5, 3, 'not-product'], [12, 1, 12, 'uses-one'], [12, 12, 1, 'uses-one'],
        [7, 1, 7, 'is-prime'], [7, 2.5, 3, 'is-prime'], [12, 2.5, 4.8, 'not-whole'],
        [12, 0, 12, 'not-whole'], [12, 1, 11, 'not-product'], [12, '2', 6, 'not-whole']
    ]) assert.deepEqual(checkSplit(n, a, b), { ok: false, reason });
});

test('84 tree splits immutably, retains stable IDs and finishes only when every leaf is prime', () => {
    const initial = freezeTree(createTree(84));
    assert.equal(isFinished(initial), false);
    const first = freezeTree(splitNode(initial, initial.id, 7, 12).tree);
    const sevenId = first.children[0].id;
    const twelveId = first.children[1].id;
    const second = freezeTree(splitNode(first, twelveId, 3, 4).tree);
    assert.equal(second.children[0].id, sevenId);
    assert.equal(isFinished(second), false);
    assert.deepEqual(leaves(second), [7, 3, 4]);
    const final = splitNode(second, second.children[1].children[1].id, 2, 2).tree;
    assert.equal(isFinished(final), true);
    assert.deepEqual(leaves(final), [7, 3, 2, 2]);
    assert.deepEqual(splitNode(final, sevenId, 1, 7), { error: 'is-prime' });
    assert.deepEqual(initial, { id: 'root', value: 84 });
    assert.deepEqual(leaves(first), [7, 12]);
    assert.deepEqual(leaves(second), [7, 3, 4]);
    const ids = [];
    (function walk(node) { ids.push(node.id); (node.children || []).forEach(walk); })(final);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(isFinished(createTree(17)), true);
});

test('failed splits preserve the old tree, and invalid node references have model errors', () => {
    const tree = freezeTree(createTree(12));
    assert.deepEqual(splitNode(tree, tree.id, 5, 3), { error: 'not-product' });
    assert.deepEqual(splitNode(tree, tree.id, 1, 12), { error: 'uses-one' });
    assert.deepEqual(splitNode(tree, tree.id, 2.5, 4.8), { error: 'not-whole' });
    assert.deepEqual(splitNode(tree, 'missing', 2, 6), { error: 'not-found' });
    const split = freezeTree(splitNode(tree, tree.id, 2, 6).tree);
    assert.deepEqual(splitNode(split, tree.id, 3, 4), { error: 'already-split' });
    assert.deepEqual(tree, { id: 'root', value: 12 });
});

test('marker accepts correct index form in any order and treats power 1 as an ordinary factor', () => {
    for (const factors of [entries([2, 2], [3], [5]), entries([5], [3], [2, 2])]) {
        assert.deepEqual(markAnswer(60, factors, { indexForm: true }), {
            status: 'correct', message: 'All your factors are prime, and they multiply to make 60.'
        });
    }
    assert.equal(markAnswer(30, entries([2, 1], [3], [5]), { indexForm: true }).status, 'correct');
});

test('marker asks for grouping only after the product and all prime bases are correct', () => {
    for (const factors of [entries([2, 1], [2], [3], [5]), entries([2], [2], [3], [5]), entries([2, 2], [3], [2], [5])]) {
        const target = factors.length === 4 && factors[0].power === 2 ? 120 : 60;
        assert.deepEqual(markAnswer(target, factors, { indexForm: true }), {
            status: 'not-grouped', message: 'Your prime factors are correct. Now group the repeated factors using powers.'
        });
    }
    assert.deepEqual(markAnswer(60, entries([2, 2], [3], [2]), { indexForm: true }), {
        status: 'wrong-product', message: "Your answer makes 24, not 60. Check you've included every prime, including repeats."
    });
});

test('marker distinguishes non-prime bases, missing factors, empty answers and invalid exponents', () => {
    assert.deepEqual(markAnswer(60, entries([4], [3], [5]), { indexForm: true }), {
        status: 'not-prime', message: "4 isn't prime. Split it into prime factors."
    });
    assert.deepEqual(markAnswer(60, entries([2], [3], [5]), { indexForm: true }), {
        status: 'wrong-product', message: "Your answer makes 30, not 60. Check you've included every prime, including repeats."
    });
    assert.deepEqual(markAnswer(60, [], { indexForm: true }), { status: 'empty', message: 'Add at least one factor.' });
    for (const answer of [entries([2, 0]), entries([2, -1]), entries([2, 1.5]), entries([2.5]), entries([NaN]), entries([Infinity]), [null]]) {
        assert.deepEqual(markAnswer(60, answer, { indexForm: true }), {
            status: 'invalid', message: 'Use whole numbers bigger than 0 for every factor and count.'
        });
    }
    assert.equal(markAnswer(60, entries([4], [3]), { indexForm: true }).status, 'wrong-product');
});

test('expanded prime products are correct when index form is not requested', () => {
    assert.equal(markAnswer(28, entries([2], [2], [7]), { indexForm: false }).status, 'correct');
    assert.equal(markAnswer(60, entries([2], [2], [3], [5]), { indexForm: false }).status, 'correct');
});

test('every agreed Practice number has the expected prime factors and LaTeX', () => {
    for (const [n, factors, latex] of [
        [30, [2, 3, 5], '2 \\times 3 \\times 5'],
        [44, [2, 2, 11], '2^{2} \\times 11'],
        [72, [2, 2, 2, 3, 3], '2^{3} \\times 3^{2}'],
        [81, [3, 3, 3, 3], '3^{4}'],
        [100, [2, 2, 5, 5], '2^{2} \\times 5^{2}'],
        [126, [2, 3, 3, 7], '2 \\times 3^{2} \\times 7']
    ]) {
        assert.deepEqual(primeFactors(n), factors);
        assert.equal(toLatex(toIndexForm(factors)), latex);
    }
});

test('feedback templates use the agreed wording and substitute the values', () => {
    assert.deepEqual(logic.FEEDBACK, {
        'is-prime': '{n} is prime. This branch is finished.',
        'not-whole': 'Use whole numbers bigger than 0.',
        'not-product': 'These numbers must multiply to make {n}. Try again.',
        'uses-one': '1 × {n} just gives you {n} again. Use two numbers bigger than 1.',
        'not-finished': "One end number isn't prime yet. Split it.",
        'includes-one': "Leave out 1. It isn't prime, and multiplying by 1 changes nothing.",
        'wrong-product': "Your answer makes {p}, not {n}. Check you've included every prime, including repeats.",
        'not-prime': "{x} isn't prime. Split it into prime factors.",
        'not-grouped': 'Your prime factors are correct. Now group the repeated factors using powers.',
        correct: 'All your factors are prime, and they multiply to make {n}.',
        empty: 'Add at least one factor.', invalid: 'Use whole numbers bigger than 0 for every factor and count.'
    });
    assert.equal(logic.feedback('uses-one', { n: 12 }), '1 × 12 just gives you 12 again. Use two numbers bigger than 1.');
    assert.equal(logic.feedback('is-prime', { n: 7 }), '7 is prime. This branch is finished.');
});

test('logic and rendering exports coexist regardless of script load order', () => {
    for (const files of [['prime-factors.js', 'interactive.js'], ['interactive.js', 'prime-factors.js']]) {
        const renderMaths = () => {};
        const window = { Maths1to9PrimeFactors: { renderMaths }, Maths1to9Interactives: {} };
        for (const file of files) loadScript(path.join(folder, file), [], { window });
        assert.equal(typeof window.Maths1to9PrimeFactors.markAnswer, 'function');
        assert.equal(typeof window.Maths1to9PrimeFactors.drawTree, 'function');
        assert.equal(typeof window.Maths1to9PrimeFactors.renderMaths, 'function');
        assert.equal(window.Maths1to9PrimeFactors.markAnswer(60, entries([2, 2], [3], [5]), { indexForm: true }).status, 'correct');
    }
});


test('marker rejects 1 with specific feedback before checking the product', () => {
    const expected = {
        status: 'includes-one',
        message: "Leave out 1. It isn't prime, and multiplying by 1 changes nothing."
    };
    assert.deepEqual(markAnswer(60, entries([1], [2, 2], [3], [5]), { indexForm: true }), expected);
    assert.deepEqual(markAnswer(60, entries([1], [2]), { indexForm: true }), expected);
});

test('marker rejects zero and negative bases, even when a power makes the target', () => {
    const expected = { status: 'invalid', message: 'Use whole numbers bigger than 0 for every factor and count.' };
    assert.deepEqual(markAnswer(4, entries([-2, 2]), { indexForm: true }), expected);
    assert.deepEqual(markAnswer(60, entries([0], [2, 2], [3], [5]), { indexForm: true }), expected);
    assert.deepEqual(markAnswer(60, entries([1], [0]), { indexForm: true }), expected);
});

test('Practice sessions choose six different generated numbers across seeded runs', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed++) {
        const key = Math.imul(seed, 2654435761) >>> 0;
        const order = logic.pick(seededRandom(key));
        const numbers = order.map(item => logic.generate(item, seededRandom(item.seed)).number);
        assert.equal(order.length, 6);
        assert.equal(new Set(numbers).size, 6);
        assert(numbers.every(number => logic.PRACTICE_NUMBERS.includes(number)));
        numbers.forEach(number => seen.add(number));
        assert.deepEqual(JSON.parse(JSON.stringify(logic.pick(seededRandom(key)))), JSON.parse(JSON.stringify(order)));
    }
    assert.deepEqual([...seen].sort((a, b) => a - b), [...logic.PRACTICE_NUMBERS]);
});

test('each Practice number accepts its expected prime factorisation in index form', () => {
    for (const n of [30, 44, 72, 81, 100, 126]) {
        assert.deepEqual(markAnswer(n, toIndexForm(primeFactors(n)), { indexForm: true }), {
            status: 'correct', message: `All your factors are prime, and they multiply to make ${n}.`
        });
    }
});

test('count rows convert to base/power entries and empty boxes never count as complete', () => {
    const { rowsToEntries, areRowsComplete } = loadScript(path.join(folder, 'prime-factors.js'), ['rowsToEntries', 'areRowsComplete']);
    const rows = [{ prime: '2', count: '2' }, { prime: '3', count: '1' }, { prime: '7', count: '1' }];
    assert.deepEqual(rowsToEntries(rows), entries([2, 2], [3], [7]));
    assert(areRowsComplete(rows));
    for (const incomplete of [[], [null], [{}], [{ prime: '', count: '1' }], [{ prime: '2', count: '' }], [{ prime: ' ', count: '2' }]]) {
        assert.equal(areRowsComplete(incomplete), false);
    }
    // Presence is distinct from marking: an entered zero still reaches the marker.
    assert(areRowsComplete([{ prime: '2', count: '0' }]));
    assert.equal(markAnswer(84, rowsToEntries([{ prime: '2', count: '0' }]), { indexForm: true }).status, 'invalid');
});

test('Try it count feedback identifies the first wrong row, including zero and invalid counts', () => {
    const { firstWrongPrime } = loadScript(path.join(folder, 'prime-factors.js'), ['firstWrongPrime']);
    const expected = entries([2, 2], [3], [7]);
    assert.equal(firstWrongPrime(expected, expected), null);
    assert.equal(firstWrongPrime(entries([2, 1], [3, 2], [7]), expected), 2);
    assert.equal(firstWrongPrime(entries([2, 2], [3, 2], [7]), expected), 3);
    assert.equal(firstWrongPrime(entries([2, 2], [3], [7, 0]), expected), 7);
    assert.equal(firstWrongPrime(entries([2, NaN], [3], [7]), expected), 2);
});

test('Check shuffling preserves each option’s feedback and correct answer without changing source questions', () => {
    const questions = logic.checks().filter(question => question.options);
    const source = JSON.stringify(questions);
    const orders = new Set();
    for (let seed = 0; seed < 100; seed++) for (const question of questions) {
        const shuffled = logic.prepare(question, seededRandom(seed));
        assert.equal(shuffled.options.find(option => option.correct).label, question.options.find(option => option.correct).label);
        assert.deepEqual(Array.from(shuffled.options, option => option.label).sort(), Array.from(question.options, option => option.label).sort());
        for (const option of shuffled.options) assert.equal(option.feedback, question.options.find(original => original.label === option.label).feedback);
        orders.add(shuffled.options.map(option => option.label).join('|'));
    }
    assert(orders.size > 4);
    assert.equal(JSON.stringify(questions), source);
});


test('generated questions have four distinct choices and correct answers for 200 seeds per type and mode', () => {
    for (const type of logic.types) for (const mode of ['choice', 'number']) for (let seed = 0; seed < 200; seed++) {
        const item = { type, mode, seed };
        const question = logic.generate(item, seededRandom(seed));
        const primes = primeFactors(question.number);
        assert(question.number <= 200 && primes.length >= 2 && primes.length <= 4);
        assert.equal(JSON.stringify(question), JSON.stringify(logic.generate(item, seededRandom(seed))));
        if (mode === 'choice') {
            assert.equal(question.options.length, 4, `${type} seed ${seed}`);
            assert.equal(new Set(question.options.map(option => option.label)).size, 4);
            assert.equal(question.options.filter(option => option.correct).length, 1);
            assert(question.options.every(option => option.feedback.trim()));
            const label = question.options.find(option => option.correct).label;
            if (question.kind === 'product') assert.equal(label, primes.join(' × '));
            else if (question.kind === 'index') {
                const powers = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4' };
                const value = label.split(' × ').reduce((total, term) => {
                    const [, base, power] = term.match(/^(\d+)([⁰¹²³⁴]*)$/);
                    return total * Number(base) ** Number([...power].map(char => powers[char]).join('') || 1);
                }, 1);
                assert.equal(value, question.number);
            } else assert.equal(Number(label), question.kind === 'missing' ? primes.at(-1) : primes.filter(prime => prime === question.prime).length);
        } else assert.equal(Number(question.answer), question.kind === 'missing' ? primes.at(-1) : primes.filter(prime => prime === question.prime).length);
    }
});

test('custom tree and index widgets mark generated answers and reject incomplete or false trees', () => {
    function finishedTree(number) {
        if (isPrime(number)) return { value: number, id: String(number) };
        const first = primeFactors(number)[0];
        return { value: number, id: String(number), children: [finishedTree(first), finishedTree(number / first)] };
    }
    for (let seed = 0; seed < 200; seed++) for (const type of ['finished-tree', 'prime-index-form']) {
        const question = logic.generate({ type, mode: 'custom' }, seededRandom(seed));
        const value = type === 'finished-tree' ? { tree: finishedTree(question.number) }
            : toIndexForm(primeFactors(question.number)).map(entry => ({ prime: String(entry.base), count: String(entry.power) }));
        assert.equal(question.widget.mark(value).correct, true);
        assert.equal(question.widget.isEmpty(null), true);
    }
    assert.equal(logic.treeWidget(60).mark({ tree: createTree(60) }).correct, false);
    assert.equal(logic.treeWidget(60).mark({ tree: { value: 60, children: [{ value: 2 }, { value: 3 }] } }).correct, false);
    assert.equal(logic.builderWidget(60).mark([{ prime: '2', count: '1' }, { prime: '3', count: '1' }, { prime: '5', count: '1' }]).correct, false);
});

test('fixed questions mix input types, keep four choices and teach every method in Learn', () => {
    for (const questions of [logic.examples(), logic.checks()]) {
        assert(questions.some(question => question.input === 'choice'));
        assert(questions.some(question => question.input === 'number'));
        for (const question of questions.filter(question => question.options)) {
            assert.equal(question.options.length, 4);
            assert.equal(new Set(question.options.map(option => option.label)).size, 4);
            assert.equal(question.options.filter(option => option.correct).length, 1);
            assert(question.options.every(option => option.feedback.trim()));
        }
    }
    const text = JSON.stringify(logic.learnScreens).toLowerCase();
    for (const keyword of ['prime', 'factor tree', 'product', 'index', 'power', 'copies', 'divide', 'missing']) assert(text.includes(keyword), keyword);
});
