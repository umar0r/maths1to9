// Keep answer-format, score deduplication, snapshot and user-isolation coverage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { loadScript } = require('./helpers/lessons.cjs');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const engine = window.Maths1to9LessonEngine;
const Q = loadScript(path.join(root, 'content/rounding-and-significant-figures/rounding.js'), ['examples', 'checks'], { window });
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/rounding-and-significant-figures/lesson.json')));
for (const [value, expected] of [['2,700', '2700'], ['.0073', '0.0073'], ['1.0', '1.0']]) assert.equal(engine.tidyNumber(value), expected);
for (const value of ['27,00', '', '1abc', '1e3', 'Infinity']) assert.equal(engine.tidyNumber(value), null, value);
assert.notEqual(engine.tidyNumber('0.0073000000000000001'), engine.tidyNumber('0.0073'));
assert.notEqual(engine.tidyNumber('1'), '1.0');
assert.equal(engine.tidyNumber('1.0'), '1.0');
assert.notEqual(engine.tidyNumber('1.00'), '1.0');
for (const q of [...Q.examples(), ...Q.checks()]) {
    if (q.input === 'number') { assert.equal(q.exact, q.kind !== 'nearest'); assert.notEqual(engine.tidyNumber(q.answer), null); }
    if (q.options) assert.equal(q.options.filter(o => o.correct).length, 1);
}
const planned = [
    ...lesson.section_order.map(id => ({ id: `section:${id}`, kind: 'learn', completed: false })),
    ...lesson.score_activities.map(activity => ({ ...activity, completed: false })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `answer:question-bank:${i + 1}`, kind: 'answer', completed: false })),
    ...Array.from({ length: 5 }, (_, i) => ({ id: `answer:final-check-${i + 1}`, kind: 'answer', completed: false }))
];
const tracker = engine.createScoreTracker(planned);
assert.equal(tracker.getScore().maximumPoints, 195);
assert.equal(tracker.getScore().points, 0);
tracker.record({ id: 'section:explanation', kind: 'learn', completed: true });
assert.equal(tracker.getScore().points, 5);
tracker.record({ id: 'section:explanation', kind: 'learn', completed: true });
assert.equal(tracker.getScore().points, 5, 'Revisiting earns no more points');
tracker.record({ id: 'rounding-line:explored', kind: 'explore', completed: true });
assert.equal(tracker.getScore().points, 10);
tracker.record({ id: 'rounding-line:explored', kind: 'explore', completed: true });
assert.equal(tracker.getScore().points, 10, 'Repeated slider input earns no more points');
for (let i = 0; i < 3; i++) tracker.record({ id: `step:interactive:${i}`, kind: 'guided', completed: true });
assert.equal(tracker.getScore().points, 25);
tracker.record({ id: 'answer:question-bank:1', kind: 'answer', completed: true, firstCorrect: true, correct: true });
assert.equal(tracker.getScore().points, 35);
tracker.record({ id: 'answer:question-bank:1', kind: 'answer', completed: true, firstCorrect: true, correct: true });
assert.equal(tracker.getScore().points, 35);
assert.equal(engine.createScoreTracker(tracker.export()).getScore().points, 35, 'Restoring keeps points');
const storage = new Map();
const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k), key: i => [...storage.keys()][i], get length() { return storage.size; } };
const sandbox = vm.createContext({ window: { localStorage, crypto: { randomUUID: () => 'test-id' } }, document: { addEventListener() {}, dispatchEvent() {} }, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }, console });
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/progress.js'), 'utf8'), sandbox);
(async () => {
    const api = sandbox.window.Maths1to9Progress;
    const record = { title: 'Rounding', score: { points: 95 }, finished: false, activityStates: { learn: { sharedState: 1, version: 1, data: { screen: 1, lineValue: 67, explored: true } } } };
    await api.saveLessonProgress(lesson.slug, record);
    record.activityStates.learn.data.lineValue = 60;
    assert.equal((await api.getLessonProgress(lesson.slug)).activityStates.learn.data.lineValue, 67, 'Saved snapshot is isolated');
    await api.saveLessonProgress(lesson.slug, await api.getLessonProgress(lesson.slug));
    assert.equal((await api.getScoreSummary()).points, 95, 'Repeated save adds no points');
    await api.saveLessonProgress(lesson.slug, { score: { points: 145 }, finished: true });
    assert.equal((await api.getScoreSummary()).completedLessons, 1);
    assert.equal((await api.getScoreSummary()).points, 145);
    api.setUserId('second-pupil');
    assert.equal((await api.getScoreSummary()).points, 0);
    api.setUserId('anon-test-id');
    assert.equal((await api.getScoreSummary()).points, 145);
    console.log('Rounding: exact form, snapshots, score deduplication, shared activities and user isolation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
