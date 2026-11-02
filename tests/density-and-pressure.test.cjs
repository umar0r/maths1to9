const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/density-and-pressure/density.js'), 'utf8'), { window });
const D = window.DensityAndPressure, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return D.generate({ type, seed }, E.seededRandom(seed)); };

const units = / ?(g\/cm³|N\/m²|N\/cm²|cm³|cm²|m²|kg|N|g)$/;
const toNumber = text => Number(String(text).replace(units, ''));
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;

// Works out displayed working, such as "54 ÷ 3" or "600 ÷ 0.2".
function evaluate(text) {
    const js = text.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a × b = c" style sum in the text. Rounded answers may be 0.05 out.
function assertSums(text, where) {
    const sums = text.match(/\(?\d+(?:\.\d+)?(?: [×÷+−] \(?\d+(?:\.\d+)?\)?)+(?: = \d+(?:\.\d+)?)/g) || [];
    for (const sum of sums) {
        const sides = sum.split(' = ').map(evaluate);
        assert.ok(close(sides[0], sides[1], 0.05), `${where}: ${sum}`);
    }
}

function assertOptions(q, where) {
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(o => o.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(o => o.correct).length, 1, `${where}: one right option`);
    assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(o => {
        assert.ok(o.feedback && o.feedback.length > 5, `${where}: feedback for ${o.label}`);
        assert.notEqual(o.feedback, o.label, `${where}: feedback for ${o.label} isn't just its label`);
    });
}

// The value the card asks for, from the two it gives.
function expected(q) {
    const values = q.values;
    if ('force' in values) {
        if (q.asked === 'pressure') return values.force / values.area;
        if (q.asked === 'force') return values.pressure * values.area;
        if (q.asked === 'area') return values.force / values.pressure;
        return null;
    }
    if (q.asked === 'density') return values.mass / values.volume;
    if (q.asked === 'mass') return values.mass === null ? values.density * values.volume / (q.unit === 'kg' ? 1000 : 1) : null;
    if (q.asked === 'volume') return values.mass / values.density;
    return null;
}

function assertCard(q, where) {
    assertSums(JSON.stringify([q.prompt, q.options, q.feedback, q.fallback, q.rules]), where);
    assert.doesNotMatch(JSON.stringify(q), /AQA|Edexcel|OCR|undefined|NaN|Infinity/, `${where}: no exam boards or broken text`);
    const values = q.values;
    assert.ok(values, `${where}: values`);
    const density = 'force' in values;
    assert.ok(density
        ? 'force' in values && 'pressure' in values && 'area' in values
        : 'mass' in values && 'density' in values && 'volume' in values, `${where}: values have the right parts`);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'calculation') {
            let answer;
            if (density) {
                answer = values.pressure === null ? values.force / values.area
                    : values.area === null ? values.force / values.pressure : values.pressure * values.area;
            } else {
                answer = values.density === null ? values.mass / values.volume
                    : values.volume === null ? values.mass / values.density : values.density * values.volume;
            }
            assert.ok(close(evaluate(right), answer), `${where}: right working ${right}`);
        }
        if (['density', 'mass', 'volume', 'pressure', 'force', 'area'].includes(q.asked) && /^\d/.test(right)) {
            assert.ok(close(toNumber(right), expected(q), 0.05), `${where}: right answer ${right}`);
        }
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.ok(q.unit, `${where}: unit`);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.ok(/^\d+(\.\d{1,3})?$/.test(q.answer), `${where}: answer ${q.answer} is plain`);
    if (expected(q) !== null) {
        assert.ok(close(Number(q.answer), expected(q), q.tolerance ?? 0.005), `${where}: answer ${q.answer}`);
    }
    const tolerance = q.tolerance ?? 0;
    const rules = q.rules.map(rule => Number(rule.value));
    assert.ok(rules.length >= 1, `${where}: at least one mistake rule`);
    rules.forEach(value => assert.ok(Math.abs(value - Number(q.answer)) > tolerance, `${where}: rule ${value} isn't marked right`));
    rules.forEach((value, index) => rules.slice(index + 1).forEach(other =>
        assert.notEqual(value, other, `${where}: rules ${value} and ${other} are different`)));
    q.rules.forEach(rule => assert.ok(rule.feedback, `${where}: every rule has feedback`));
}

test('density lesson: Try it has 10 cards, 5 choice and 5 typed, all correct', () => {
    const cards = D.examples();
    assert.equal(cards.length, 10);
    assert.equal(cards.filter(q => q.input === 'choice').length, 5);
    assert.equal(cards.filter(q => q.input === 'number').length, 5);
    cards.forEach((q, index) => assertCard(q, `try-${index + 1}`));
});

test('density lesson: Check has 6 cards, 3 choice and 3 typed, all correct', () => {
    const cards = D.checks();
    assert.equal(cards.length, 6);
    assert.equal(cards.filter(q => q.input === 'choice').length, 3);
    assert.equal(cards.filter(q => q.input === 'number').length, 3);
    cards.forEach((q, index) => assertCard(q, `check-${index + 1}`));
});

test('density lesson: the lesson.json types map to the two skills', () => {
    const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/density-and-pressure/lesson.json'), 'utf8'));
    const types = lesson.assessment.question_types;
    const densityTypes = [...D.practiceTypes, ...D.examples().map(q => q.questionType), ...D.checks().map(q => q.questionType)]
        .filter((type, index, list) => list.indexOf(type) === index);
    densityTypes.forEach(type => assert.ok(types[type], `${type} is in lesson.json`));
    D.examples().forEach(q => {
        if (Number(q.questionType.split('-')[1]) >= 8 && q.questionType !== 'try-10') {
            assert.equal(types[q.questionType], 'pressure-force-area', q.questionType);
        } else {
            assert.equal(types[q.questionType], 'density-mass-volume', q.questionType);
        }
    });
    D.checks().forEach(q => {
        assert.equal(types[q.questionType], ['check-3', 'check-5', 'check-6'].includes(q.questionType)
            ? 'pressure-force-area' : 'density-mass-volume', q.questionType);
    });
    assert.equal(lesson.comparison.questions.length, D.checks().length);
    assert.equal(lesson.question_bank.session_length, 6);
    assert.deepEqual(lesson.section_order, ['explanation', 'interactive', 'question-bank', 'comparison']);
});

test('density lesson: each Practice session is find-pressure, two density types and the three choice types', () => {
    for (let n = 0; n < 200; n++) {
        const items = D.pick(E.seededRandom(realSeed(n)));
        const types = items.map(item => item.type);
        assert.equal(items.length, 6);
        assert.equal(new Set(types).size, 6);
        assert.ok(types.includes('find-pressure'), 'find-pressure');
        D.CHOICE_TYPES.forEach(type => assert.ok(types.includes(type), type));
        assert.equal(types.filter(type => D.DENSITY_TYPES.includes(type)).length, 2);
    }
});

test('density lesson: every Practice type makes good cards (500 seeds each)', () => {
    for (const type of D.practiceTypes) {
        for (let n = 0; n < 500; n++) assertCard(generated(type, n), `${type} seed ${n}`);
    }
});

test('density lesson: Practice rebuilds the same card from the same seed', () => {
    for (const type of D.practiceTypes) {
        assert.deepEqual(generated(type, 7), generated(type, 7), type);
    }
});

test('density lesson: float noise is rounded away', () => {
    assert.equal(D.number(600 / 0.3), '2000');
    assert.equal(D.number(600 / 0.15), '4000');
    assert.equal(D.number(936 / 2.6), '360');
});

test('density lesson: Learn has 8 screens, all showing before they ask', () => {
    assert.equal(D.learnScreens.length, 8);
    D.learnScreens.forEach((screen, index) => {
        assert.ok(screen.title && screen.lines.length, `learn-${index + 1}`);
        assert.doesNotMatch(screen.lines.join(' '),
            /AQA|Edexcel|OCR|compound measure|\brate\b|\bquantity\b|\bunit rate\b|\bsubstance\b/i, `learn-${index + 1} wording`);
        assert.ok(!screen.lines.some(line => line.trim().endsWith('?')), `learn-${index + 1} asks nothing`);
    });
});

test('density lesson: Learn 5 and 8 triangle sums are true', () => {
    const triangleScreens = D.learnScreens.filter(screen => screen.cover);
    assert.equal(triangleScreens.length, 2);
    triangleScreens.forEach(screen => {
        for (const [letter, info] of Object.entries(screen.cover)) {
            assertSums(`${info.rule} ${info.example}`, `learn ${letter}`);
            assert.ok(screen.names[letter], `learn ${letter} has a name`);
        }
    });
});

test('density lesson: every Learn slider setting gives the whole numbers the spec promises', () => {
    const screen = index => D.learnScreens[index];
    // Learn 1: the metal is always 16 times heavier.
    assert.equal(screen(0).trays[1].density / screen(0).trays[0].density, 16);
    // Learn 3: mass 24 to 240 in 24s, volume 1, 2, 3, 4, 6, 8, 12.
    const learn3 = screen(2);
    const masses = Array.from({ length: 10 }, (_, index) => 24 + index * 24);
    assert.deepEqual(learn3.sliders[0].min, 24);
    assert.deepEqual(learn3.sliders[0].max, 240);
    assert.deepEqual(learn3.sliders[0].step, 24);
    assert.deepEqual(Array.from(learn3.sliders[1].values), [1, 2, 3, 4, 6, 8, 12]);
    masses.forEach(mass => learn3.sliders[1].values.forEach(volume => {
        assert.ok(Number.isInteger(mass / volume), `mass ${mass} over volume ${volume}`);
    }));
    // Learn 4: 48 g shared into squares of every density on offer.
    const learn4 = screen(3);
    assert.equal(learn4.mass, 48);
    learn4.sliders[0].values.forEach(density => {
        assert.ok(Number.isInteger(learn4.mass / density), `48 g in ${density} g pieces`);
    });
    // Learn 6: kg to g, then divide by 2.5 g/cm³.
    const learn6 = screen(5);
    const kgMasses = Array.from({ length: 6 }, (_, index) => 0.5 + index * 0.5);
    kgMasses.forEach(mass => {
        const grams = mass * 1000;
        assert.ok(Number.isInteger(grams), `${mass} kg is whole grams`);
        assert.ok(Number.isInteger(grams / learn6.density), `${grams} g over ${learn6.density} g/cm³`);
    });
    // Learn 7: 600 N over every area on the slider, all whole numbers.
    const learn7 = screen(6);
    assert.equal(learn7.force, 600);
    learn7.sliders[0].values.forEach(area => {
        assert.ok(Number.isInteger(Number(D.number(learn7.force / area))), `600 N over ${area} m²`);
    });
    assert.deepEqual(Array.from(learn7.sliders[0].values, area => Number(D.number(learn7.force / area))),
        [12000, 6000, 4000, 3000, 2400, 2000]);
});

test('density lesson: curriculum lists both skills and the plain subtitle', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lessons = curriculum.categories.flatMap(category => category.lessons);
    const entry = lessons.find(lesson => lesson.folder === 'density-and-pressure');
    assert.deepEqual(entry.skills, ['density-mass-volume', 'pressure-force-area']);
    assert.equal(entry.subtitle, 'Work out density, mass, volume and pressure.');
});
