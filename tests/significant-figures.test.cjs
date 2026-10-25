// Retain exact rounding, format, digit, wording and wiring coverage on shared cards.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings } = require('./helpers/lessons.cjs');
const root = path.join(__dirname, '..');
const folder = 'significant-figures';
const lessonDir = path.join(root, 'content', folder);
const distDir = path.join(root, 'dist', 'content', folder);
const read = file => fs.readFileSync(file, 'utf8');
const page = read(path.join(lessonDir, 'index.php'));
const data = JSON.parse(read(path.join(lessonDir, 'lesson.json')));
const window = {};
vm.runInNewContext(read(path.join(root, 'assets/js/lesson-engine.js')), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const { seededRandom, tidyNumber } = window.Maths1to9LessonEngine;
const Q = loadScript(path.join(lessonDir, 'significant-figures.js'),
    ['round', 'digits', 'place', 'digitLabel', 'roundingQuestion', 'guided', 'examples', 'checks', 'practiceTypes', 'pick', 'generate', 'prepare', 'learnScreens'], { window });
const generated = Q.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(seed)))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
const answerOf = q => q.answer ?? q.options.find(option => option.correct).label;
const clean = text => text.replace(/,/g, '');
const spaced = text => { const [a, b] = text.split('.'); return a.replace(/\B(?=(\d{3})+$)/g, ',') + (b !== undefined ? '.' + b : ''); };
const nextDigit = (text, n) => text.replace(/[,.]/g, '').replace(/^0+/, '')[n];
function roundSig(text, n) {
    const clean = text.replace(/,/g, '');
    const [whole, fraction = ''] = clean.split('.');
    const mantissa = BigInt(whole + fraction);
    if (mantissa === 0n) throw new Error(`Cannot round zero: ${text}`);
    const length = mantissa.toString().length;
    const drop = length - n;
    let kept, place = drop - fraction.length;
    if (drop > 0) {
        const unit = 10n ** BigInt(drop);
        kept = mantissa / unit;
        if ((mantissa % unit) * 2n >= unit) kept++;
        if (kept.toString().length > n) { kept /= 10n; place++; }
    } else {
        kept = mantissa;
    }
    if (place >= 0) return (kept * 10n ** BigInt(place)).toString();
    const digits = kept.toString().padStart(-place + 1, '0');
    return digits.slice(0, place) + '.' + digits.slice(place);
}
test('significant-figures: rounding helper follows exact half-up rules and keeps needed zeros', () => {
    for (const [number, n, expected] of [
        ['2.45', 2, '2.5'], ['650', 1, '700'], ['0.0047', 1, '0.005'], ['9.96', 2, '10'],
        ['9644', 1, '10000'], ['15.03', 3, '15.0'], ['0.0283', 2, '0.028'], ['305', 2, '310'],
        ['0.0045', 1, '0.005'], ['0.07304', 3, '0.0730'], ['0.9996', 2, '1.0']
    ]) {
        assert.equal(roundSig(number, n), expected);
        assert.equal(Q.round(number, n), expected);
    }
});

test('significant-figures: every fixed and generated rounding answer is right in value and form', () => {
    for (const q of questions.filter(q => q.stage === 'round')) {
        const match = q.prompt.match(/^Round ([\d,.]+) to (\d+) significant figures?\./);
        assert.ok(match, q.prompt);
        assert.equal(clean(answerOf(q)), roundSig(match[1], Number(match[2])), q.prompt);
        assert.equal(q.n, Number(match[2]));
        assert.equal(q.exact, true);
        assert.notEqual(tidyNumber(answerOf(q)), null);
        if (q.input === 'number' && q.answer.includes('.') && q.answer.endsWith('0')) assert.match(q.prompt, /Keep the zero at the end after the decimal point/);
    }
});

test('significant-figures: worked Learn examples and explanation question give the right answers', () => {
    for (const screen of Q.learnScreens) for (const equation of screen.equations || []) {
        const match = equation.match(/^([\d,.]+) ≈ ([\d,.]+)/);
        assert.ok(match, equation);
        assert.equal(clean(match[2]), roundSig(match[1], screen.n), equation);
    }
    const error = Q.checks()[0];
    assert.equal(answerOf(error), 'Start at 2. Keep 2 and 8. The next digit is 3, so the answer is 0.028');
    assert.equal(roundSig('0.0283', 2), '0.028');
});

test('significant-figures: every choice has four distinct well-formed options and one correct answer', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4, q.prompt);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, q.prompt);
        assert.ok(q.options.every(o => o.feedback));
        if (q.stage === 'round') {
            const expected = roundSig(q.number, q.n);
            assert.equal(q.options.filter(o => tidyNumber(o.label) === expected).length, 1, q.prompt);
            assert.equal(new Set(q.options.map(o => tidyNumber(o.label))).size, 4, q.prompt);
            assert.ok(q.options.every(o => tidyNumber(o.label) !== null), q.prompt);
        }
    }
});

test('significant-figures: shuffling moves correct answers without changing the content', () => {
    const examples = Q.examples();
    for (const q of examples.filter(q => q.options)) {
        const positions = new Set();
        for (let seed = 0; seed < 200; seed++) {
            const shuffled = Q.prepare(q, seededRandom(seed));
            positions.add(shuffled.options.findIndex(o => o.correct));
            assert.deepEqual(Array.from(shuffled.options, o => o.label).sort(), Array.from(q.options, o => o.label).sort());
        }
        assert.ok(positions.size > 1);
    }
});

test('significant-figures: explanations name the right deciding digit and show the answer', () => {
    for (const q of questions.filter(q => q.stage === 'round')) {
        const feedback = q.feedback;
        assert.ok(feedback.includes(answerOf(q)) || feedback.includes(spaced(clean(answerOf(q)))), q.prompt);
        assert.equal(feedback.match(/next digit is (\d)/)[1], nextDigit(q.number, q.n), q.prompt);
    }
});

test('significant-figures: six guided examples point at the correct keep and deciding digits', () => {
    assert.equal(Q.guided.length, 6);
    assert.equal(Q.examples().length, 18);
    for (const q of questions.filter(q => q.number)) {
        const indexes = [...q.number].map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
        const significant = indexes.slice(indexes.findIndex(i => q.number[i] !== '0'));
        assert.equal(q.first, significant[0], q.prompt);
        assert.equal(q.target, significant[q.n - 1], q.prompt);
        assert.equal(q.decider, significant[q.n], q.prompt);
        if (q.stage === 'keep' || q.stage === 'decider') {
            const correct = q.options.find(o => o.correct);
            const index = q.stage === 'keep' ? q.target : q.decider;
            assert.equal(correct.index, index, q.prompt);
            assert.equal(correct.label, `${q.number[index]} (${Q.place(q.number, index)})`, q.prompt);
        }
    }
});

test('significant-figures: typed answers use exact form, meaningful rules and a fallback', () => {
    for (const q of questions.filter(q => q.input === 'number')) {
        assert.equal(q.exact, true);
        assert.ok(q.rules.length && q.fallback && q.feedback);
        for (const rule of q.rules) {
            assert.notEqual(tidyNumber(rule.value), tidyNumber(q.answer), q.prompt);
            assert.ok(rule.feedback);
        }
    }
    const accuracy = Q.checks().find(q => q.answer === '15.0');
    assert.equal(accuracy.exact, true);
    assert.ok(accuracy.rules.some(rule => rule.value === '15'));
});

test('significant-figures: generators cover every old type for 200 seeds in both answer modes', () => {
    assert.equal(Q.practiceTypes.length, 10);
    for (const type of Q.practiceTypes) {
        assert.equal(data.assessment.question_types[type], 'round-significant-figures');
        const positions = new Set(Array.from({ length: 200 }, (_, seed) =>
            Q.generate({ type, mode: 'choice' }, seededRandom(seed)).options.findIndex(o => o.correct)));
        assert.ok(positions.size > 1, type);
        for (const mode of ['choice', 'number']) for (let seed = 0; seed < 200; seed++) {
            assert.deepEqual(Q.generate({ type, mode }, seededRandom(seed)), Q.generate({ type, mode }, seededRandom(seed)));
        }
    }
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, 6);
        assert.equal(items.length, data.question_bank.session_length);
        const modes = items.map(item => Q.generate(item, seededRandom(item.seed)).input);
        assert.equal(modes.filter(mode => mode === 'choice').length, 3);
        assert.equal(modes.filter(mode => mode === 'number').length, 3);
    }
    for (const group of [Q.examples(), Q.checks()]) assert.deepEqual(new Set(group.map(q => q.input)), new Set(['choice', 'number']));
    assert.equal(Q.checks().length, 5);
});

test('significant-figures: wording has correct plurals, British spelling and no padded question decimals', () => {
    for (const text of allStrings([questions, Q.learnScreens])) {
        assert.doesNotMatch(text, /\b1 significant figures\b|\b(?:[2-9]|\d{2,}) significant figure\b(?!s)/);
        assert.doesNotMatch(text, /\b(?:color|center|recognize|organize|analyze|favorite|practicing|practiced)\b/i);
        assert.doesNotMatch(text, /AQA|Edexcel|OCR|<\/?[a-z]|&[a-z]+;/i);
    }
    for (const q of generated) assert.doesNotMatch(q.number, /\.\d*0$/);
});

test('significant-figures: lesson is wired to its existing skill and four shared sections', () => {
    assert.equal(data.slug, folder);
    assert.match(page, /\$lessonId = 'significant-figures';/);
    assert.doesNotMatch(page, /data-lesson-renderer/);
    assert.deepEqual(data.navigation_stages.map(stage => stage.label), ['Learn', 'Try it', 'Practice', 'Check']);
    assert.equal(data.navigation.back_button, true);
    assert.equal(new Set(Q.learnScreens.map(screen => screen.title)).size, Q.learnScreens.length);
    const curriculum = JSON.parse(read(path.join(root, 'content/curriculum.json')));
    const entry = curriculum.categories.flatMap(c => c.lessons).find(l => l.folder === folder);
    const skills = JSON.parse(read(path.join(root, 'content/skills.json'))).skills;
    for (const skill of Object.values(data.assessment.question_types)) {
        assert.ok(skills.some(s => s.id === skill));
        assert.ok(entry.skills.includes(skill));
    }
});

test('significant-figures: every loaded asset exists and dist matches the source', () => {
    const urls = text => [...text.matchAll(/(?:src|href)="(\.[^"]+)"/g)].map(m => m[1]).filter(url => !url.endsWith('/'));
    for (const url of [...urls(page), './lesson.json']) assert.ok(fs.existsSync(path.join(lessonDir, url.split('?')[0])), url);
    for (const file of ['lesson.json', 'lesson.css', 'significant-figures.js', 'interactive.js', 'questions.js']) {
        assert.equal(read(path.join(distDir, file)), read(path.join(lessonDir, file)), file);
    }
    const html = read(path.join(distDir, 'index.html'));
    assert.deepEqual(urls(html), urls(page));
    assert.match(html, /data-lesson-id="significant-figures"/);
    assert.ok(!fs.existsSync(path.join(distDir, 'lesson.js')));
    for (const url of urls(page).filter(url => url.startsWith('../../assets/'))) {
        const file = url.split('?')[0].replace('../../', '');
        assert.equal(read(path.join(root, 'dist', file)), read(path.join(root, file)), file);
    }
});
