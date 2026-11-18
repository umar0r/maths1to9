// Exact maths and retained form/diagram checks for the shared rounding lesson.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript, allStrings } = require('./helpers/lessons.cjs');
const { roundToPower, roundSig, withCommas } = require('./helpers/decimals.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const { seededRandom, tidyNumber } = window.Maths1to9LessonEngine;
const folder = path.join(contentDir, 'rounding-and-significant-figures');
const data = JSON.parse(fs.readFileSync(path.join(folder, 'lesson.json')));
const Q = loadScript(path.join(folder, 'rounding.js'), ['roundToPower', 'rounded', 'keyDigits', 'accuracyText', 'tryIt', 'checks', 'practiceTypes', 'pick', 'generate', 'prepare', 'learnScreens'], { window });
const generated = Q.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode => Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0)))));
const questions = [...Q.checks(), ...generated];
const answerOf = q => q.answer ?? q.options.find(o => o.correct).label;
const clean = text => text.replace(/,/g, '');
function accuracyIn(text) {
    let m;
    if ((m = text.match(/nearest million/))) return { kind: 'nearest', accuracy: 6, phrase: m[0] };
    if ((m = text.match(/nearest whole number/))) return { kind: 'nearest', accuracy: 0, phrase: m[0] };
    if ((m = text.match(/nearest (\d[\d,]*)/))) return { kind: 'nearest', accuracy: clean(m[1]).length - 1, phrase: m[0] };
    if ((m = text.match(/(\d+) decimal places?/))) return { kind: 'decimal', accuracy: Number(m[1]), phrase: m[0] };
    if ((m = text.match(/(\d+) significant figures?/))) return { kind: 'sig', accuracy: Number(m[1]), phrase: m[0] };
    return null;
}
function expected(number, kind, accuracy) {
    return kind === 'sig' ? roundSig(number, accuracy) : roundToPower(number, kind === 'decimal' ? -accuracy : accuracy);
}
function keyDigits(number, kind, accuracy) {
    const indexes = [...number].map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
    const significant = indexes.slice(indexes.findIndex(i => number[i] !== '0'));
    const point = number.includes('.') ? number.indexOf('.') : number.length;
    const target = kind === 'sig' ? significant[accuracy - 1] : kind === 'decimal' ? point + accuracy : point - 1 - accuracy;
    return { target, decider: indexes[indexes.indexOf(target) + 1] };
}

test('rounding-and-significant-figures: every rounding prompt is recognised and gives the right exact answer', () => {
    for (const q of questions.filter(q => q.stage === 'round')) {
        const info = accuracyIn(q.prompt);
        assert.ok(info, q.prompt);
        const numbers = q.prompt.replace(info.phrase, '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
        assert.equal(numbers.length, 1, q.prompt);
        assert.equal(clean(numbers[0]), q.number);
        assert.equal(clean(answerOf(q)), expected(clean(numbers[0]), info.kind, info.accuracy), q.prompt);
        assert.equal(q.kind, info.kind);
        assert.equal(q.accuracy, info.accuracy);
    }
});

test('rounding-and-significant-figures: all choices have four distinct forms, one correct answer and distinct feedback', () => {
    for (const q of questions.filter(q => q.options)) {
        // Tapping a digit: one button per digit, up to four (345 only has three digits).
        const size = q.stage === 'keep' || q.stage === 'decider' ? Math.min(4, q.number.replace(/\D/g, '').length) : 4;
        assert.equal(q.options.length, size, q.prompt);
        assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, size, q.prompt);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, size, q.prompt);
        assert.ok(q.options.every(o => o.feedback));
        if (q.stage === 'round') {
            const answer = expected(q.number, q.kind, q.accuracy);
            assert.equal(q.options.filter(o => tidyNumber(o.label) === answer).length, 1, q.prompt);
            assert.equal(new Set(q.options.map(o => tidyNumber(o.label))).size, 4, q.prompt);
        }
    }
});

test('rounding-and-significant-figures: typed answers keep exact zeros, with rules and a fallback', () => {
    // Real-life steps have no rounding kind: their answers are plain numbers.
    for (const q of questions.filter(q => q.input === 'number' && q.stage === 'context')) {
        assert.equal(q.exact, false, q.prompt);
        assert.ok(q.feedback && q.fallback, q.prompt);
    }
    for (const q of questions.filter(q => q.input === 'number' && q.stage !== 'context')) {
        assert.equal(q.exact, q.kind !== 'nearest');
        assert.ok(q.rules.length && q.fallback && q.feedback);
        for (const rule of q.rules) assert.notEqual(tidyNumber(rule.value), tidyNumber(q.answer), q.prompt);
        if (q.answer.includes('.') && q.answer.endsWith('0')) assert.match(q.prompt, /Keep the zeros? at the end after the decimal point/);
    }
});

test('rounding-and-significant-figures: explanations name the right deciding digit and state the answer', () => {
    for (const q of questions.filter(q => q.stage === 'round')) {
        const { decider } = keyDigits(q.number, q.kind, q.accuracy);
        assert.equal(q.feedback.match(/next digit is (\d)/)[1], q.number[decider], q.prompt);
        assert.ok([answerOf(q), withCommas(clean(answerOf(q)))].some(answer => q.feedback.includes(answer)), q.prompt);
    }
});

test('rounding-and-significant-figures: Try it is two hands-on slides and Learn pictures highlight the right digits', () => {
    const [slideA, slideB] = Q.tryIt.slides;
    assert.equal(Q.tryIt.slides.length, 2);
    // Each slide is one guided activity.
    assert.equal(data.score_activities.filter(a => a.kind === 'guided').length, Q.tryIt.slides.length);
    // One thing per slide: tap the digit, then tap the half of the line.
    assert.deepEqual(Q.tryIt.slides.map(slide => slide.title), [
        'Round 53,481 to the nearest 100.',
        "Let's put 53,481 on a number line."
    ]);
    assert.equal(slideB.button, 'Continue');
    assert.equal(slideA.digits, '53481');
    for (const [slide, keep, look] of [[slideA, '4', '8']]) {
        const positions = Q.keyDigits(slide.digits, 'nearest', slide.accuracy);
        assert.equal(slide.digits[positions.target], keep, slide.title);
        assert.equal(slide.digits[positions.decider], look, slide.title);
    }
    assert.equal(slideA.digitNotes.keep, 'Round: the 4 is the hundreds digit. This is the digit we round (up or down).');
    assert.equal(slideA.digitNotes.look, 'Decides: the 8 is 5 or more, so the 4 rounds up to 5.');
    // The line runs from one round number to the next, and the slide rounds itself.
    assert.deepEqual([slideB.line.base, slideB.line.step, slideB.line.value], [53400, 10, 53481]);
    assert.equal(slideB.placeHint, 'The halfway point is 53,450. 53,481 is more than that.');
    assert.equal(Q.rounded(String(slideB.line.value), 'nearest', 2), '53500');
    assert.equal(slideB.answer, '53,481 ≈ 53,500');
    // The wrong-tap hints and the arrow notes say what they must.
    assert.equal(slideA.tapHint, 'The hundreds digit is the third from the right.');
    assert.equal(slideB.notes.digit, '53,481 is past the halfway mark, 53,450, so it rounds up.');
    assert.equal(slideB.notes.nearest, 'So 53,481 is closer to 53,500.');
    for (const q of questions.filter(q => q.number)) {
        const expected = keyDigits(q.number, q.kind, q.accuracy);
        assert.equal(q.target, expected.target, q.prompt);
        assert.equal(q.decider, expected.decider, q.prompt);
        if (q.stage === 'keep' || q.stage === 'decider') assert.equal(q.options.find(o => o.correct).index, q.stage === 'keep' ? expected.target : expected.decider);
    }
    for (const screen of Q.learnScreens.filter(screen => screen.number)) {
        const positions = Q.keyDigits(screen.number, screen.kind, screen.accuracy);
        const target = keyDigits(screen.number, screen.kind, screen.accuracy);
        assert.equal(positions.target, target.target);
        assert.equal(positions.decider, target.decider);
        // '0.730 → 3 significant figures' counts figures; it isn't a rounding.
        for (const equation of (screen.equations || []).filter(equation => equation.includes('≈'))) {
            const match = equation.replace(/ metres/g, '').match(/^([\d,.]+) ≈ ([\d,.]+)$/);
            assert.ok(match, equation);
            assert.equal(clean(match[2]), expected(clean(match[1]), screen.kind, screen.accuracy), equation);
        }
    }
});

test('rounding-and-significant-figures: every Practice session opens with the two number-line questions', () => {
    const realSeed = n => {
        const random = seededRandom(n);
        random();
        return window.Maths1to9LessonEngine.randomInt(0, 4294967295, random);
    };
    for (let n = 0; n < 501; n++) {
        const items = Q.pick(seededRandom(realSeed(n)));
        assert.equal(items.length, 12, `seed ${n}`);
        assert.equal(items.length, data.question_bank.session_length);
        assert.deepEqual(items.slice(0, 2).map(item => item.type), ['line-pick', 'line-pick'], `seed ${n}`);
        assert.deepEqual(items.slice(0, 2).map(item => item.place), [1, 2], `seed ${n}`);
        // Questions 3 to 12 are the ten the lesson picks now, never a line question.
        assert.equal(items.slice(2).length, 10, `seed ${n}`);
        assert.ok(items.slice(2).every(item => item.type !== 'line-pick'), `seed ${n}`);
        const [tens, hundreds] = items.slice(0, 2).map(item => Q.generate(item, seededRandom(item.seed)));
        // Nearest 10: one round number to the next ten, with the number on a tick.
        assert.equal(tens.step, 1);
        assert.equal(tens.base % 10, 0, tens.base);
        assert.ok(tens.base >= 10 && tens.base <= 90, tens.base);
        assert.ok(tens.value > tens.base && tens.value < tens.base + 10, tens.value);
        assert.notEqual(tens.value, tens.base + 5, tens.value);
        assert.equal(tens.answer, tens.value < tens.base + 5 ? tens.base : tens.base + 10);
        // Nearest 100: one round number to the next hundred, with the number between ticks.
        assert.equal(hundreds.step, 10);
        assert.equal(hundreds.base % 100, 0, hundreds.base);
        assert.ok(hundreds.base >= 100 && hundreds.base <= 900, hundreds.base);
        assert.ok(hundreds.value > hundreds.base && hundreds.value < hundreds.base + 100, hundreds.value);
        assert.ok(hundreds.value % 10 >= 1 && hundreds.value % 10 <= 9, hundreds.value);
        assert.notEqual(hundreds.value, hundreds.base + 50, hundreds.value);
        assert.equal(hundreds.answer, hundreds.value < hundreds.base + 50 ? hundreds.base : hundreds.base + 100);
        for (const card of [tens, hundreds]) {
            const text = number => number.toLocaleString('en-GB');
            assert.equal(card.input, 'custom', card.prompt);
            assert.equal(card.prompt, `Tap the number ${text(card.value)} is closest to.`);
            // The nearer end is right, the other end is wrong.
            assert.equal(card.widget.mark(card.answer).correct, true, card.prompt);
            const other = card.answer === card.base ? card.base + 10 * card.step : card.base;
            assert.equal(card.widget.mark(other).correct, false, card.prompt);
            assert.equal(card.widget.answerText(card.answer), text(card.answer));
            assert.equal(card.widget.isEmpty(null), true);
            assert.equal(card.widget.isEmpty(card.answer), false);
            // The feedback names the halfway mark and the end it is closer to.
            const halfway = card.base + 5 * card.step;
            const side = card.value > halfway ? 'past' : 'before';
            assert.equal(card.widget.mark(card.answer).feedback,
                `${text(card.value)} is ${side} the halfway mark, ${text(halfway)}, so it is closer to ${text(card.answer)}.`);
        }
    }
});

test('rounding-and-significant-figures: only the path and books questions carry a picture', () => {
    // Seeds are made the way a real Practice session makes them: 32-bit, not 0 to 499.
    const realSeed = n => {
        const random = seededRandom(n);
        random();
        return window.Maths1to9LessonEngine.randomInt(0, 4294967295, random);
    };
    let paths = 0, books = 0, minibuses = 0;
    for (let n = 0; n < 501; n++) {
        for (const mode of ['choice', 'number']) {
            const path = Q.generate({ type: 'path-context', mode }, seededRandom(realSeed(n)));
            assert.equal(typeof path.figure, 'function', `path seed ${n} ${mode}`);
            paths++;
        }
        const card = Q.generate({ type: 'round-up', mode: 'choice' }, seededRandom(realSeed(n)));
        if (/\bbooks\b/.test(card.prompt)) {
            assert.equal(typeof card.figure, 'function', `books seed ${n}`);
            books++;
        } else {
            assert.match(card.prompt, /minibus/, `seed ${n}`);
            assert.equal(card.figure, undefined, `minibus seed ${n}`);
            minibuses++;
        }
    }
    // Both books and minibuses must actually come up in those seeds.
    assert.ok(books > 0 && minibuses > 0, `${books} books, ${minibuses} minibuses`);
    assert.equal(paths, 1002);
    // Everything else, in either answer mode, has no picture at all.
    for (const type of ['nearest-ten', 'halfway-hundred', 'big-hundred', 'nearest-thousand', 'big-thousand', 'full-groups']) {
        for (const mode of ['choice', 'number']) {
            for (let n = 0; n < 50; n++) {
                assert.equal(Q.generate({ type, mode }, seededRandom(realSeed(n))).figure, undefined, `${type} seed ${n}`);
            }
        }
    }
});

test('rounding-and-significant-figures: halfway cases, carrying and direct rounding follow exact half-up rules', () => {
    for (const [number, kind, accuracy, answer] of [
        ['650', 'nearest', 2, '700'], ['5.465', 'decimal', 2, '5.47'], ['9.96', 'decimal', 1, '10.0'],
        ['2.449', 'decimal', 1, '2.4'], ['1.049', 'decimal', 1, '1.0'], ['2748', 'nearest', 2, '2700']
    ]) assert.equal(Q.rounded(number, kind, accuracy), answer);
    assert.equal(Q.roundToPower('18', 2), '0');
    assert.equal(Q.roundToPower('0.004', -2), '0.00');
});

test('rounding-and-significant-figures: the method question puts the steps in the right order', () => {
    const q = Q.checks().find(q => q.questionType === 'method');
    assert.match(answerOf(q), /^1\. Find the hundreds digit\. 2\. Look at the digit to its right\./);
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter(o => o.correct).length, 1);
    assert.equal(new Set(q.options.map(o => o.feedback)).size, 4);
});

test('rounding-and-significant-figures: 200 seeds per type and input mode are deterministic and mapped to the three existing skills', () => {
    for (const type of Q.practiceTypes) {
        const context = ['path-context', 'round-up', 'round-down', 'full-groups'];
        const skill = context.includes(type) ? 'round-in-context' : 'round-whole-numbers';
        assert.equal(data.assessment.question_types[type], skill);
        const positions = new Set();
        for (const mode of ['choice', 'number']) for (let seed = 0; seed < 200; seed++) {
            const q = Q.generate({ type, mode }, seededRandom(seed));
            assert.deepEqual(q, Q.generate({ type, mode }, seededRandom(seed)));
            if (q.options) positions.add(q.options.findIndex(o => o.correct));
            // The number-line card has no options: its answer is the end it points at.
            else if (q.answer !== undefined) positions.add(String(q.answer));
        }
        assert.ok(positions.size > 1, type);
    }
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, 12);
        assert.equal(items.length, data.question_bank.session_length);
        const qs = items.map(item => Q.generate(item, seededRandom(item.seed)));
        // Practice mixes multiple choice and typed answers.
        assert.ok(qs.some(q => q.input === 'choice') && qs.some(q => q.input === 'number'), `seed ${seed}`);
        assert.deepEqual(new Set(qs.map(q => data.assessment.question_types[q.questionType])), new Set(['round-whole-numbers', 'round-in-context']));
    }
    // Try it is hands-on, so it has no answer cards at all. Check is multiple choice.
    assert.equal(Q.tryIt.slides.length, 2);
    assert.ok(Q.tryIt.slides.every(slide => slide.digits || (slide.line && slide.place)));
    // The round-up questions (minibuses, boxes) are always multiple choice.
    for (let seed = 0; seed < 50; seed++) {
        for (const item of Q.pick(seededRandom(seed)).filter(item => item.type === 'round-up')) {
            assert.equal(Q.generate(item, seededRandom(item.seed)).input, 'choice', `seed ${seed}`);
        }
    }
    assert.deepEqual(new Set(Q.checks().map(q => q.input)), new Set(['choice']));
    assert.equal(Q.checks().length, data.comparison.questions.length);
});

test('rounding-and-significant-figures: wording and input numbers are tidy and style matches significant figures', () => {
    // Real-life questions have no number to round; the rest never start with a trailing decimal zero.
    for (const q of generated.filter(q => q.number)) assert.doesNotMatch(q.number, /\.\d*0$/);
    for (const text of allStrings([questions, Q.learnScreens, Q.tryIt])) {
        assert.doesNotMatch(text, /\b1 decimal places\b|\b1 significant figures\b|AQA|Edexcel|OCR/);
        assert.doesNotMatch(text, /\d+\.\d{12,}|\b(?:color|center|recognize|organize)\b/);
    }
    // The digit boxes and the equation box are still shared, word for word.
    const sharedBlock = text => text.slice(0, text.indexOf('}\n', text.indexOf('.significant-equation')) + 2);
    const sigCss = fs.readFileSync(path.join(contentDir, 'significant-figures/lesson.css'), 'utf8');
    assert.equal(sharedBlock(fs.readFileSync(path.join(folder, 'lesson.css'), 'utf8')), sharedBlock(sigCss));
    assert.equal(data.navigation.back_button, true);
    assert.deepEqual(data.navigation_stages.map(s => s.label), ['Learn', 'Try it', 'Practice', 'Check']);
    const reference = path.join(__dirname, '../dist/content/rounding-and-significant-figures');
    for (const file of ['lesson.json', 'lesson.css', 'rounding.js', 'interactive.js', 'questions.js']) assert.equal(fs.readFileSync(path.join(reference, file), 'utf8'), fs.readFileSync(path.join(folder, file), 'utf8'), file);
});
