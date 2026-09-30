// Checks for the significant-figures lesson: maths, options, explanations,
// wording, wiring and the dist build. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const folder = 'significant-figures';
const lessonDir = path.join(root, 'content', folder);
const distDir = path.join(root, 'dist', 'content', folder);
const read = file => fs.readFileSync(file, 'utf8');
const source = read(path.join(lessonDir, 'lesson.js'));
const page = read(path.join(lessonDir, 'index.php'));
const data = JSON.parse(read(path.join(lessonDir, 'lesson.json')));
const questions = [...data.guided, ...data.practice, ...data.check];

// Use the lesson's own answer checker rather than a copy of it.
const { normalise, matches } = new Function(
    source.slice(source.indexOf('    const normalise ='), source.indexOf('    const engine =')) +
    source.slice(source.indexOf('    function matches('), source.indexOf('    function advance(')) +
    'return { normalise, matches };'
)();

// Round a decimal string to n significant figures, half up, without floats.
// After a carry (9.96 -> 10) the extra digit is dropped so the answer keeps n figures.
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
const nextDigit = (text, n) => text.replace(/[,.]/g, '').replace(/^0+/, '')[n];
const decimals = text => (text.split('.')[1] || '').length;
const withCommas = text => {
    const [whole, fraction] = text.split('.');
    return whole.replace(/\B(?=(\d{3})+$)/g, ',') + (fraction !== undefined ? '.' + fraction : '');
};
const roundPrompt = q => q.prompt.match(/^Round ([\d,.]+) to (\d+) significant figures?\.$/);
const allStrings = value => typeof value === 'string' ? [value]
    : value && typeof value === 'object' ? Object.values(value).flatMap(allStrings) : [];

test('rounding helper follows GCSE half-up rules', () => {
    for (const [number, n, expected] of [
        ['2.45', 2, '2.5'], ['650', 1, '700'], ['0.0047', 1, '0.005'], ['9.96', 2, '10'],
        ['9644', 1, '10000'], ['15.03', 3, '15.0'], ['0.0283', 2, '0.028'], ['305', 2, '310']
    ]) assert.equal(roundSig(number, n), expected, `${number} to ${n} s.f.`);
});

test('5. every rounding answer is mathematically correct', () => {
    for (const q of questions) {
        const match = roundPrompt(q);
        if (!match) continue;
        const [, number, n] = match;
        const expected = roundSig(number, Number(n));
        assert.equal(q.answer.replace(/,/g, ''), expected, q.prompt);
        assert.equal(q.significant_figures, Number(n), `significant_figures field: ${q.prompt}`);
        assert.equal(q.places, decimals(expected), `places field: ${q.prompt}`);
        assert.ok(matches(q, q.answer), `checker rejects its own answer: ${q.prompt}`);
        assert.ok(matches(q, withCommas(expected)), `checker rejects comma form: ${q.prompt}`);
    }
});

test('5. worked examples in learn slides and the summary are correct', () => {
    for (const item of data.learn) {
        const match = (item.equation || '').match(/^([\d,.]+) ≈ ([\d,.]+)\s+\((\d+) significant figures?\)$/);
        if (match) assert.equal(match[2].replace(/,/g, ''), roundSig(match[1], Number(match[3])), item.equation);
    }
    const claims = [...source.matchAll(/([\d,.]*\d) to (\d+) significant figures? is ([\d,.]*\d)/g)];
    assert.ok(claims.length > 0, 'expected worked examples in the summary');
    for (const [claim, number, n, answer] of claims) {
        assert.equal(answer.replace(/,/g, ''), roundSig(number, Number(n)), claim);
    }
});

test('5. multiple-choice explanation answers contain the correct rounding', () => {
    for (const q of data.check.filter(q => q.options && !roundPrompt(q))) {
        const match = q.prompt.match(/([\d,.]*\d) to (\d+) significant figures?/);
        if (match) assert.match(q.answer, new RegExp(roundSig(match[1], Number(match[2])).replace('.', '\\.') + '\\.?$'), q.prompt);
    }
});

test('6. each set of options has exactly one correct, distinct, well-formed answer', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.filter(option => matches(q, option)).length, 1, `one correct option: ${q.prompt}`);
        assert.equal(new Set(q.options).size, q.options.length, `duplicate options: ${q.prompt}`);
        if (normalise(q.answer) === null) continue;
        q.options.forEach(option => assert.notEqual(normalise(option), null, `badly formatted option "${option}": ${q.prompt}`));
        // 15 and 15.0 may both appear: the accuracy is what's being tested.
        const values = q.options.map(option => `${normalise(option)}|${decimals(option)}`);
        assert.equal(new Set(values).size, values.length, `two options are the same number: ${q.prompt}`);
    }
});

test('6. the correct option is not always in the same position', () => {
    for (const [name, set] of Object.entries({ guided: data.guided, practice: data.practice })) {
        const positions = set.filter(q => q.options).map(q => q.options.findIndex(option => matches(q, option)));
        assert.ok(new Set(positions).size > 1, `${name}: correct answer is always option ${positions[0] + 1}`);
    }
});

test('7. explanations show the answer and name the right deciding digit', () => {
    for (const q of questions) {
        const match = roundPrompt(q);
        if (!match) continue;
        assert.ok(q.explanation.includes(q.answer) || q.explanation.includes(withCommas(q.answer)),
            `explanation doesn't show ${q.answer}: ${q.prompt}`);
        const said = q.explanation.match(/next digit(?: after [^.,]*?)? is (\d)/i);
        if (said) assert.equal(said[1], nextDigit(match[1], Number(match[2])), `wrong deciding digit: ${q.prompt}`);
    }
});

test('7. step-by-step examples point at the right digits', () => {
    for (const q of data.guided) {
        const n = q.significant_figures;
        assert.equal(q.prompt, `Round ${q.number} to ${q.accuracy}.`);
        assert.equal(q.accuracy, `${n} significant ${n === 1 ? 'figure' : 'figures'}`);
        const digitIndexes = [...q.number].map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
        const significant = digitIndexes.slice(digitIndexes.findIndex(i => q.number[i] !== '0'));
        assert.equal(q.target, significant[n - 1], `target digit: ${q.prompt}`);
        assert.equal(q.decider, significant[n], `deciding digit: ${q.prompt}`);
        const helped = q.decider_help.match(/is (\d)\./);
        assert.ok(helped, `decider_help should name the digit: ${q.prompt}`);
        assert.equal(helped[1], q.number[q.decider], `decider_help digit: ${q.prompt}`);
    }
});

test('8. wording: plurals, British spelling and no raw HTML', () => {
    const texts = [...allStrings(data), source];
    for (const text of texts) {
        assert.doesNotMatch(text, /\b1 significant figures\b/, 'should be "1 significant figure"');
        assert.doesNotMatch(text, /\b(?:[2-9]|\d{2,}) significant figure\b(?!s)/, 'should be plural');
        assert.doesNotMatch(text, /\b(?:color|center|recognize|organize|analyze|favorite|practicing|practiced)\b/i,
            'American spelling');
    }
    for (const text of allStrings(data)) assert.doesNotMatch(text, /<\/?[a-z]|&[a-z]+;/i, `HTML in lesson text: ${text}`);
});

test('9. lesson is wired up to the site', () => {
    assert.equal(data.slug, folder);
    assert.match(page, new RegExp(`\\$lessonId = '${folder}';`));
    const curriculum = JSON.parse(read(path.join(root, 'content', 'curriculum.json')));
    const entry = curriculum.categories.flatMap(c => c.lessons).find(l => l.folder === folder);
    assert.ok(entry, 'missing from curriculum.json');
    const skillIds = new Set(JSON.parse(read(path.join(root, 'content', 'skills.json'))).skills.map(s => s.id));
    for (const q of [...data.practice, ...data.check]) {
        assert.ok(skillIds.has(q.skill), `unknown skill ${q.skill}`);
        assert.ok(entry.skills.includes(q.skill), `curriculum.json doesn't list ${q.skill}`);
    }
});

test('9. every file the page loads exists', () => {
    const urls = [...page.matchAll(/(?:src|href)="(\.[^"]+)"/g)].map(m => m[1]);
    const fetched = [...source.matchAll(/fetch\('([^']+)'/g)].map(m => m[1]);
    const lessonSrc = page.match(/data-lesson-src="([^"]+)"/)[1];
    for (const url of [...urls, ...fetched, lessonSrc]) {
        assert.ok(fs.existsSync(path.join(lessonDir, url.split('?')[0])), `missing file: ${url}`);
    }
});

test('9. slide ids and sections are consistent', () => {
    const reserved = ['step-by-step', 'practice', 'practise', 'practice-review', 'check', 'summary', 'complete'];
    const ids = data.learn.map(item => item.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate learn ids');
    for (const id of ids) {
        assert.match(id, /^[a-z0-9-]+$/, `id not usable as a #hash: ${id}`);
        assert.ok(!reserved.includes(id) && !/^(?:step|practice|check)-\d+$/.test(id), `learn id clashes with a slide id: ${id}`);
    }
    const total = source.match(/totalSections:(\d+)/);
    assert.ok(total, 'totalSections not found in lesson.js');
    assert.equal(Number(total[1]), data.navigation_stages.length, 'totalSections disagrees with navigation_stages');
});

test('10. dist build matches the source', () => {
    for (const file of ['lesson.js', 'lesson.json', 'lesson.css']) {
        assert.equal(read(path.join(distDir, file)), read(path.join(lessonDir, file)), `dist ${file} is out of date`);
    }
    const html = read(path.join(distDir, 'index.html'));
    // The build rewrites page links (index.php -> ../../), so compare assets only.
    const assetUrls = text => [...text.matchAll(/(?:src|href)="(\.[^"]+)"/g)].map(m => m[1])
        .filter(url => !url.endsWith('/') && !url.split('?')[0].endsWith('.php'));
    assert.deepEqual(assetUrls(html), assetUrls(page), 'dist index.html loads different files or versions');
    assert.match(html, new RegExp(`data-lesson-id="${folder}"`));
    for (const url of assetUrls(page).filter(url => url.startsWith('../../assets/'))) {
        const relative = url.split('?')[0].replace('../../', '');
        assert.equal(read(path.join(root, 'dist', relative)), read(path.join(root, relative)), `dist ${relative} is out of date`);
    }
});
