// Construct a chart from its table: exact shares, whole angles and full drawings.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript, allStrings } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const { seededRandom } = window.Maths1to9LessonEngine;
const Q = loadScript(path.join(contentDir, 'pie-charts/pie-chart.js'), ['total', 'angles', 'fraction', 'allowedTotals', 'dataset', 'point', 'sectorPath', 'drawingWidget', 'examples', 'checks', 'practiceTypes', 'pick', 'generate', 'learnData', 'learnScreens'], { window });
const lesson = JSON.parse(fs.readFileSync(path.join(contentDir, 'pie-charts/lesson.json')));
const generated = Q.practiceTypes.flatMap(type => (['draw', 'share'].includes(type) ? [type === 'draw' ? 'custom' : 'choice'] : ['choice', 'number']).flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0)))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
const answerOf = q => q.answer ?? q.options?.find(o => o.correct).label;
const fractionValue = text => text.split('/').map(Number).reduce((a, b) => a / b);
const numeric = text => Number(text.replace('°', ''));
const degrees = data => {
    const t = data.reduce((sum, row) => sum + row.count, 0);
    return data.map(row => row.count * 360 / t);
};

test('pie-charts: every fixed and generated answer follows from the table or known angles', () => {
    for (const q of questions) {
        const t = q.data?.reduce((sum, row) => sum + row.count, 0);
        if (q.questionType === 'draw') continue;
        if (q.questionType === 'share') assert.equal(fractionValue(answerOf(q)), q.data[q.index].count / t, q.prompt);
        else if (q.questionType === 'error') assert.equal(answerOf(q), 'A full circle has 360°. Multiply each share by 360.');
        else {
            const expected = q.questionType === 'total' ? t : q.questionType === 'per-item' ? 360 / t : q.questionType === 'angle' ? degrees(q.data)[q.index] : 360 - q.known.reduce((a, b) => a + b, 0);
            assert.equal(numeric(answerOf(q)), expected, q.prompt);
        }
    }
});

test('pie-charts: all choices have four distinct options, one correct answer and their own feedback', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.length, 4, `${q.prompt} / ${JSON.stringify(q.data)}`);
        assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4, q.prompt);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, q.prompt);
        assert.ok(q.options.every(o => o.feedback));
        if (q.questionType === 'share') {
            assert.equal(q.options.filter(o => fractionValue(o.label) === q.data[q.index].count / Q.total(q.data)).length, 1);
        } else if (q.questionType !== 'error') {
            assert.equal(q.options.filter(o => numeric(o.label) === numeric(answerOf(q))).length, 1);
            assert.ok(q.options.every(o => Number.isInteger(numeric(o.label))));
            if (q.questionType !== 'total') assert.ok(q.options.every(o => numeric(o.label) >= 0 && numeric(o.label) <= 360));
        }
    }
});

test('pie-charts: typed rules are wrong, specific and have a fallback', () => {
    for (const q of questions.filter(q => q.input === 'number')) {
        assert.ok(q.rules.length && q.fallback && q.feedback);
        for (const rule of q.rules) {
            assert.notEqual(Number(rule.value), Number(q.answer), q.prompt);
            assert.ok(rule.feedback);
        }
    }
});

test('pie-charts: 200 seeds per type give positive frequencies, permitted totals and whole angles adding to 360', () => {
    const totals = new Set();
    for (const q of generated.filter(q => q.data)) {
        const t = Q.total(q.data);
        totals.add(t);
        assert.ok(Array.from(Q.allowedTotals).includes(t));
        assert.ok(q.data.every(row => Number.isInteger(row.count) && row.count > 0));
        const expected = degrees(q.data);
        assert.ok(expected.every(angle => Number.isInteger(angle) && angle > 0 && angle < 360));
        assert.equal(expected.reduce((a, b) => a + b, 0), 360);
        assert.deepEqual(Array.from(Q.angles(q.data)), expected);
    }
    assert.equal(totals.size, Q.allowedTotals.length);
});

test('pie-charts: drawing marking checks every angle as well as the sum', () => {
    for (const q of questions.filter(q => q.input === 'custom')) {
        const expected = degrees(q.data);
        const value = { angles: expected.map(String), active: 0 };
        assert.equal(q.widget.isEmpty(null), true);
        assert.equal(q.widget.isEmpty({ angles: ['90', '', ''] }), true);
        assert.equal(q.widget.isEmpty(value), false);
        assert.equal(q.widget.mark(value).correct, true);
        assert.ok(q.widget.answerText(value).includes(`${q.data[0].name} ${expected[0]}°`));
        for (let index = 0; index < expected.length; index++) {
            const wrong = [...expected]; wrong[index]++;
            assert.equal(q.widget.mark({ angles: wrong.map(String) }).correct, false);
        }
        const balanced = [...expected]; balanced[0]++; balanced[1]--;
        assert.equal(balanced.reduce((a, b) => a + b, 0), 360);
        assert.equal(q.widget.mark({ angles: balanced.map(String) }).correct, false, 'A full circle alone does not make the slices correct');
        for (const invalid of ['1.5', '-1', '361', 'word']) {
            const wrong = [...value.angles]; wrong[0] = invalid;
            assert.equal(q.widget.mark({ angles: wrong }).correct, false);
        }
    }
    const widget = Q.drawingWidget(Q.dataset([6, 3, 3]));
    assert.match(widget.mark({ angles: ['50', '25', '25'] }).feedback, /uses 100/);
    assert.match(widget.mark({ angles: ['60', '90', '90'] }).feedback, /divides 360 by that row/);
    assert.match(widget.mark({ angles: ['30', '90', '90'] }).feedback, /only one pupil/);
    assert.match(widget.mark({ angles: ['179', '90', '90'] }).feedback, /add to 359/);
});

test('pie-charts: generated data, options and six-question sessions are deterministic and assess only construction', () => {
    const serialise = q => JSON.stringify(q, (key, value) => typeof value === 'function' ? undefined : value);
    for (const type of Q.practiceTypes) {
        assert.equal(lesson.assessment.question_types[type], 'construct-pie-charts');
        for (let seed = 0; seed < 200; seed++) {
            const entry = { type, mode: type === 'draw' ? 'custom' : type === 'share' ? 'choice' : seed % 2 ? 'choice' : 'number' };
            assert.equal(serialise(Q.generate(entry, seededRandom(seed))), serialise(Q.generate(entry, seededRandom(seed))));
        }
    }
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length);
        assert.equal(items.length, 6);
        const inputs = items.map(item => Q.generate(item, seededRandom(item.seed)).input);
        assert.equal(inputs.filter(input => input === 'choice').length, 2);
        assert.equal(inputs.filter(input => input === 'number').length, 3);
        assert.equal(inputs.filter(input => input === 'custom').length, 1);
    }
    for (const group of [Q.examples(), Q.checks()]) assert.deepEqual(new Set(group.map(q => q.input)), new Set(['choice', 'number', 'custom']));
    assert.equal(Q.examples().length, 5);
    assert.equal(Q.checks().length, 5);
});

test('pie-charts: geometry handles empty, small, large and full-circle slices without broken paths', () => {
    assert.equal(Q.sectorPath(0, 0), '');
    assert.equal(Q.point(0).x, 170);
    assert.equal(Q.point(90).y, 170);
    for (const angle of [2, 30, 90, 180, 270, 358, 360]) {
        const path = Q.sectorPath(30, angle);
        assert.doesNotMatch(path, /NaN|Infinity|undefined/);
        assert.match(path, /^M 170 170 L /);
        assert.match(path, / Z$/);
    }
});

test('pie-charts: Learn keeps the five construction steps and all model angles agree', () => {
    assert.deepEqual(Array.from(Q.learnScreens, screen => screen.title), ['Find the total', 'Write each share as a fraction', 'Turn the share into an angle', 'Check the angles', 'Draw the chart']);
    assert.equal(Q.total(Q.learnData), 12);
    assert.deepEqual(Array.from(Q.angles(Q.learnData)), [90, 270]);
    assert.equal(Q.fraction(3, 12), '1/4');
    assert.equal(Q.fraction(9, 12), '3/4');
    for (const text of allStrings([Q.learnScreens, questions])) assert.doesNotMatch(text, /AQA|Edexcel|OCR|NaN|Infinity/);
    assert.ok(Q.learnScreens[0].lines.some(line => line.includes('A sector is one slice')));
    assert.ok(Q.learnScreens[2].lines.some(line => line.includes('An angle is the turn')));
});

test('pie-charts: live registration is after frequency tables, uses one skill and matches the static build', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(contentDir, 'curriculum.json')));
    const statistics = curriculum.categories.find(category => category.id === 'statistics');
    const index = statistics.lessons.findIndex(entry => entry.folder === 'frequency-tables-and-charts');
    assert.deepEqual(statistics.lessons[index + 1], { folder: 'pie-charts', title: 'Pie charts', subtitle: 'Turn a frequency table into angles, then draw the chart.', skills: ['construct-pie-charts'] });
    assert.ok(Object.values(lesson.assessment.question_types).every(skill => skill === 'construct-pie-charts'));
    assert.deepEqual(lesson.navigation_stages.map(stage => stage.label), ['Learn', 'Try it', 'Practice', 'Check']);
    assert.equal(lesson.navigation.back_button, true);
    assert.ok(!fs.existsSync(path.join(contentDir, '_pie-charts')));
    assert.ok(!fs.existsSync(path.join(__dirname, '../dist/content/_pie-charts')));
    const dist = path.join(__dirname, '../dist/content/pie-charts');
    for (const file of ['lesson.json', 'lesson.css', 'pie-chart.js', 'interactive.js', 'questions.js']) assert.equal(fs.readFileSync(path.join(dist, file), 'utf8'), fs.readFileSync(path.join(contentDir, 'pie-charts', file), 'utf8'), file);
});
