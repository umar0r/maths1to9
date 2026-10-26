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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/speed-from-distance-time-graphs/journeys.js'), 'utf8'), { window });
const J = window.SpeedJourneys, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));

test('speedText divides distance by time and keeps the unit with the answer', () => {
    assert.equal(J.speedText(18, 6), '18 ÷ 6 = 3\u00a0m/s');
    assert.equal(J.speedText(0, 4), '0 ÷ 4 = 0\u00a0m/s');
});
test('seeded sessions alternate three distinct typed types and three distinct choice types', () => {
    for (let seed = 0; seed < 200; seed++) {
        const items = J.pick(E.seededRandom(seed));
        assert.equal(items.length, 6);
        const typed = items.filter((item, i) => i % 2 === 0).map(item => item.type);
        const choices = items.filter((item, i) => i % 2 === 1).map(item => item.type);
        assert.equal(new Set(typed).size, 3);
        assert.ok(typed.every(type => J.typedTypes.includes(type)));
        assert.equal(new Set(choices).size, 3);
        assert.ok(choices.every(type => J.choiceTypes.includes(type)));
        assert.deepEqual(plain(items), plain(J.pick(E.seededRandom(seed))));
        for (const item of items) {
            assert.deepEqual(plain(J.generate(item, E.seededRandom(item.seed))), plain(J.generate(item, E.seededRandom(item.seed))));
        }
    }
});
test('every generated journey follows the time, distance, section and whole-speed rules', () => {
    for (const type of [...J.typedTypes, ...J.choiceTypes]) for (let seed = 0; seed < 500; seed++) {
        const q = J.generate({ type, seed }, E.seededRandom(seed));
        const { corners, section } = q.journey;
        assert.deepEqual(plain(corners[0]), [0, 0]);
        const speeds = [], distances = [];
        for (const [i, [t, d]] of corners.entries()) {
            assert.ok(Number.isInteger(t) && t >= 0 && t <= 10);
            assert.ok(d % 2 === 0 && d >= 0 && d <= 30);
            if (i === 0) continue;
            const duration = t - corners[i - 1][0], distance = d - corners[i - 1][1], speed = distance / duration;
            assert.ok(duration >= 2 && distance >= 0);
            assert.ok(Number.isInteger(speed) && speed >= 0 && speed <= 6);
            if (speed > 0 && speeds.at(-1) > 0) assert.notEqual(speed, speeds.at(-1));
            speeds.push(speed); distances.push(distance);
        }
        if (section) assert.ok(section[1] - section[0] >= 2);
        if (type === 'fastest') {
            assert.equal(new Set(speeds).size, 3);
            const best = speeds.indexOf(Math.max(...speeds));
            assert.ok(distances.some((d, i) => speeds[i] < speeds[best] && d > distances[best]));
        }
        if (q.options) {
            assert.equal(new Set(q.options.map(o => o.label)).size, q.options.length);
            assert.equal(q.options.filter(o => o.correct).length, 1);
            assert.equal(q.options.length, 4);
        }
        if (q.input === 'number') for (const rule of q.rules) {
            if (q.fields) assert.notDeepEqual(plain(rule.value), plain(q.answer));
            else assert.notEqual(Number(rule.value), Number(q.answer));
        }
    }
});

test('typed answers are the highlighted section\'s distance ÷ time', () => {
    for (const type of J.typedTypes) for (let seed = 0; seed < 300; seed++) {
        const q = J.generate({ type, seed }, E.seededRandom(seed));
        const [t1, t2] = q.journey.section;
        const at = t => q.journey.corners.find(([time]) => time === t)[1];
        const speed = (at(t2) - at(t1)) / (t2 - t1);
        if (q.fields) assert.deepEqual(plain(q.answer), { d: String(at(t2) - at(t1)), t: String(t2 - t1) }, q.prompt);
        else assert.equal(Number(q.answer), speed, q.prompt);
    }
});
test('Try it and Check mix choice and typed cards, with four options on every choice', () => {
    for (const set of [J.examples(), J.checks()]) {
        assert.ok(set.filter(q => q.input === 'choice').length >= 1);
        assert.ok(set.filter(q => q.input === 'number').length >= 1);
        for (const q of set.filter(q => q.options)) {
            assert.equal(q.options.length, 4, q.prompt);
            assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        }
    }
    assert.equal(J.checks().length, 5);
});
