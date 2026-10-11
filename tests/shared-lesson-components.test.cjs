const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Custom-renderer pages also run this block, before the standard engine exits.
const window = {};
const source = fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8');
vm.runInNewContext(source, { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const { escapeHtml, shuffle, seededRandom, randomInt } = window.Maths1to9LessonEngine;

test('shared escapeHtml escapes all HTML delimiters and preserves ordinary text', () => {
    assert.equal(escapeHtml(`<b title="a&b">'hello'</b>`), '&lt;b title=&quot;a&amp;b&quot;&gt;&#39;hello&#39;&lt;/b&gt;');
    assert.equal(escapeHtml('2 × 3 − 1'), '2 × 3 − 1');
    assert.equal(escapeHtml(0), '0');
    assert.equal(escapeHtml(null), '');
});

test('shared seededRandom matches saved order-of-operations seeds exactly', () => {
    for (const original of [0, 1, 123456789, 4294967295]) {
        let seed = original;
        const random = seededRandom(original);
        const again = seededRandom(original);
        for (let index = 0; index < 100; index++) {
            seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
            const value = random();
            assert.equal(value, seed / 4294967296);
            assert.equal(value, again());
            assert.ok(value >= 0 && value < 1);
        }
    }
    assert.notEqual(seededRandom(1)(), seededRandom(2)());
});

test('shared shuffle returns a new permutation without changing the original', () => {
    const original = ['a', 'b', 'c', 'd'];
    const result = shuffle(original, () => 0);
    assert.deepEqual(Array.from(result), ['b', 'c', 'd', 'a']);
    assert.deepEqual(original, ['a', 'b', 'c', 'd']);
    assert.notEqual(result, original);
    assert.deepEqual(Array.from(shuffle([], seededRandom(1))), []);
    assert.deepEqual(Array.from(shuffle(['only'], seededRandom(1))), ['only']);
    assert.deepEqual(Array.from(shuffle(original, seededRandom(12))), Array.from(shuffle(original, seededRandom(12))));
});

test('shared randomInt includes both bounds and handles negative and singleton ranges', () => {
    assert.equal(randomInt(2, 5, () => 0), 2);
    assert.equal(randomInt(2, 5, () => 1 - Number.EPSILON), 5);
    assert.equal(randomInt(-3, -1, () => 0), -3);
    assert.equal(randomInt(-3, -1, () => 1 - Number.EPSILON), -1);
    assert.equal(randomInt(4, 4, seededRandom(1)), 4);
    const random = seededRandom(6);
    const observed = new Set(Array.from({ length: 200 }, () => randomInt(-2, 2, random)));
    assert.deepEqual([...observed].sort(), [-1, -2, 0, 1, 2]);
    assert.throws(() => randomInt(5, 2), /ordered integer bounds/);
    assert.throws(() => randomInt(0.5, 2), /ordered integer bounds/);
});

const { createSectionState } = window.Maths1to9LessonEngine;
function stateStore(saved) {
    const writes = [];
    const frames = [];
    const store = {
        async getLessonActivityState(slug, key) { return saved; },
        saveLessonActivityState(slug, key, value) {
            saved = JSON.parse(JSON.stringify(value));
            writes.push({ slug, key, value: saved });
        }
    };
    return { store, writes, frames, schedule: callback => frames.push(callback),
        flush() { frames.splice(0).forEach(callback => callback()); } };
}
const stateOptions = { version: 2, initial: () => ({ screen: 0, items: [] }) };

test('section state restores every storage format and writes conversions once', async () => {
    for (const example of [
        { saved: undefined, screen: 0, from: undefined, writes: 0 },
        { saved: { sharedState: 1, version: 2, data: { screen: 3 } }, screen: 3, from: undefined, writes: 0 },
        { saved: { sharedState: 1, version: 1, data: { screen: 4 } }, screen: 4, from: 1, writes: 1 },
        { saved: { screen: 5 }, screen: 5, from: 0, writes: 1 }
    ]) {
        const harness = stateStore(example.saved);
        const calls = [];
        const options = { ...stateOptions, upgrade(saved, from) { calls.push(from); return saved; } };
        const section = await createSectionState('pilot', 'interactive', options, harness.store, harness.schedule);
        assert.equal(section.state.screen, example.screen);
        assert.deepEqual(calls, example.from === undefined ? [] : [example.from]);
        assert.equal(harness.writes.length, example.writes);
        if (example.writes) {
            const again = await createSectionState('pilot', 'interactive', options, harness.store, harness.schedule);
            assert.equal(again.state.screen, example.screen);
            assert.equal(calls.length, 1);
            assert.deepEqual(harness.writes[0], { slug: 'pilot', key: 'interactive', value: {
                sharedState: 1, version: 2, data: { screen: example.screen }
            } });
        }
    }
});

test('section state falls back to initial on missing or declined upgrade', async () => {
    for (const upgrade of [undefined, () => null]) {
        const harness = stateStore({ screen: 9 });
        const section = await createSectionState('pilot', 'learn', { ...stateOptions, upgrade }, harness.store, harness.schedule);
        assert.equal(section.state.screen, 0);
        assert.equal(harness.writes.length, 1);
    }
});

test('section state batches updates, restores exact answer phases, and resets', async () => {
    const harness = stateStore();
    const section = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule);
    section.update(state => { state.items.push({ value: '18', phase: 'wrong', firstCorrect: false }); });
    section.update(state => { state.screen = 1; });
    assert.equal(harness.frames.length, 1);
    assert.equal(harness.writes.length, 0);
    harness.flush();
    const restored = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule);
    assert.equal(JSON.stringify(restored.state), JSON.stringify(section.state));
    restored.update(state => { state.items[0].phase = 'correct'; state.items[0].value = '72'; });
    harness.flush();
    assert.equal(restored.state.items[0].firstCorrect, false);
    restored.update(state => { state.screen = 2; });
    restored.reset();
    harness.flush();
    assert.equal(JSON.stringify(harness.writes.at(-1).value.data), JSON.stringify(stateOptions.initial()));
    assert.equal(harness.writes.length, 3);
});

test('section state rejects non-JSON values with the storage key in the error', async () => {
    for (const invalid of [undefined, NaN, Infinity, () => {}, new Map(), new Date(), { nested: undefined }, [, 1], Symbol('x'), 1n]) {
        const harness = stateStore();
        const section = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule);
        assert.throws(() => section.update(state => { state.invalid = invalid; }), /interactive.*plain JSON/);
        assert.equal(harness.frames.length, 0);
        assert.equal(section.state.invalid, undefined);
    }
    const harness = stateStore();
    const section = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule);
    assert.throws(() => section.update(state => { state.cycle = state; }), /interactive.*plain JSON/);
    await assert.rejects(createSectionState('pilot', 'learn', { version: 1, initial: () => ({ bad: undefined }) }, harness.store), /learn.*plain JSON/);
});

test('LCM upgrade preserves its legacy save and declines unknown versions', async () => {
    const pilot = fs.readFileSync(path.join(__dirname, '../content/lowest-common-multiple/interactive.js'), 'utf8');
    const body = pilot.match(/upgrade\(saved, fromVersion\) \{([\s\S]*?)\n                \}/)[1];
    const upgrade = new Function('saved', 'fromVersion', body);
    const legacy = { index: 1, items: [{ phase: 'wrong', value: '18' }] };
    assert.equal(upgrade(legacy, 0), legacy);
    for (const version of [2, 99, -1]) {
        assert.equal(upgrade(legacy, version), null);
        const harness = stateStore({ sharedState: 1, version, data: legacy });
        const section = await createSectionState('pilot', 'interactive', { ...stateOptions, version: 1, upgrade }, harness.store, harness.schedule);
        assert.equal(section.state.screen, 0);
        assert.equal(harness.writes[0].value.version, 1);
    }
});

test('save validates and batches directly mutated state without changing it', async () => {
    const harness = stateStore();
    const section = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule);
    const state = section.state;
    state.screen = 2;
    section.save();
    state.screen = 3;
    section.save();
    assert.equal(section.state, state);
    assert.equal(harness.frames.length, 1);
    assert.equal(harness.writes.length, 0);
    harness.flush();
    assert.equal(harness.writes[0].value.data.screen, 3);
    state.bad = undefined;
    assert.throws(() => section.save(), /interactive.*plain JSON/);
    assert.equal(harness.frames.length, 0);
});

test('reset and invalid-update rollback keep the original state object', async () => {
    for (const initial of [() => ({ screen: 0, items: [] }), () => [1, 2]]) {
        const harness = stateStore();
        const section = await createSectionState('pilot', 'interactive', { version: 1, initial }, harness.store, harness.schedule);
        const state = section.state;
        section.update(value => { value.extra = 'remove me'; });
        section.reset();
        assert.equal(section.state, state);
        assert.equal(JSON.stringify(state), JSON.stringify(initial()));
        assert.equal(Object.hasOwn(state, 'extra'), false);
        harness.flush();
        assert.equal(JSON.stringify(harness.writes[0].value.data), JSON.stringify(initial()));
    }
    const harness = stateStore();
    const section = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule);
    const state = section.state;
    assert.throws(() => section.update(value => { value.bad = undefined; }), /plain JSON/);
    assert.equal(section.state, state);
    assert.equal(Object.hasOwn(state, 'bad'), false);
});

function lifecycleHarness() {
    const handlers = {};
    return {
        window: { addEventListener(name, callback) { handlers[name] = callback; } },
        document: { hidden: false, addEventListener(name, callback) { handlers[name] = callback; } },
        emit(name) { handlers[name](); }
    };
}

test('pagehide and hidden visibility flush once and stale frames never overwrite newer work', async () => {
    for (const event of ['pagehide', 'visibilitychange']) {
        const harness = stateStore();
        const lifecycle = lifecycleHarness();
        const section = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule, lifecycle);
        section.update(state => { state.screen = 1; });
        if (event === 'visibilitychange') {
            lifecycle.emit(event);
            assert.equal(harness.writes.length, 0);
            lifecycle.document.hidden = true;
        }
        lifecycle.emit(event);
        assert.equal(harness.writes.length, 1);
        assert.equal(harness.writes[0].value.data.screen, 1);
        lifecycle.emit(event);
        assert.equal(harness.writes.length, 1);
        lifecycle.document.hidden = false;
        section.update(state => { state.screen = 2; });
        harness.frames.shift()(); // the old frame must not flush the new snapshot
        assert.equal(harness.writes.length, 1);
        harness.flush();
        assert.equal(harness.writes.length, 2);
        assert.equal(harness.writes[1].value.data.screen, 2);
    }
});

test('saving while already hidden writes immediately without requesting a frame', async () => {
    const harness = stateStore();
    const lifecycle = lifecycleHarness();
    lifecycle.document.hidden = true;
    const section = await createSectionState('pilot', 'interactive', stateOptions, harness.store, harness.schedule, lifecycle);
    section.state.screen = 7;
    section.save();
    assert.equal(harness.frames.length, 0);
    assert.equal(harness.writes[0].value.data.screen, 7);
});

test('Back navigation is opt-in, hidden on the first screen, and prefers screen handlers', async () => {
    const { createBackNavigation } = window.Maths1to9LessonEngine;
    let section = { id: 'learn', index: 0 };
    const calls = [];
    const options = { current: () => section, previous: () => calls.push('previous'), focus: () => calls.push('focus') };
    const off = createBackNavigation({ ...options, enabled: false });
    off.set('learn', { onClick: () => calls.push('screen') });
    assert.equal(off.available(), false);
    await off.back();
    assert.deepEqual(calls, []);
    const on = createBackNavigation({ ...options, enabled: true });
    assert.equal(on.available(), false);
    on.set('learn', { onClick: () => calls.push('screen') });
    assert.equal(on.available(), true);
    await on.back();
    assert.deepEqual(calls, ['screen', 'focus']);
    on.set('learn', null);
    assert.equal(on.available(), false);
    section = { id: 'practice', index: 2 };
    await on.back();
    assert.deepEqual(calls, ['screen', 'focus', 'previous', 'focus']);
});

test('Back waits for screen rendering before focus', async () => {
    const calls = [];
    const back = window.Maths1to9LessonEngine.createBackNavigation({
        enabled: true, current: () => ({ id: 'check', index: 3 }),
        previous: () => calls.push('section'), focus: () => calls.push('focus')
    });
    back.set('check', { onClick: async () => { await Promise.resolve(); calls.push('render'); } });
    await back.back();
    assert.deepEqual(calls, ['render', 'focus']);
    back.set('check', null);
    await back.back();
    assert.deepEqual(calls, ['render', 'focus', 'section', 'focus']);
});

test('HCF Learn upgrades legacy position and completed matches without resetting work', async () => {
    const pilot = fs.readFileSync(path.join(__dirname, '../content/highest-common-factor/interactive.js'), 'utf8');
    const body = pilot.match(/upgrade\(saved, version\) \{([\s\S]*?)\n            \}/)[1];
    const upgrade = new Function('saved', 'version', body);
    for (const legacy of [
        { screen: 1, matches: 2, finished: false },
        { screen: 3, matches: 3, finished: true }
    ]) {
        const harness = stateStore(legacy);
        const section = await createSectionState('highest-common-factor', 'learn', {
            version: 1, initial: () => ({ screen: 0, furthestScreen: 0, matches: 0, finished: false }), upgrade
        }, harness.store, harness.schedule);
        assert.equal(section.state.screen, legacy.screen);
        assert.equal(section.state.matches, legacy.matches);
        assert.equal(section.state.finished, legacy.finished);
        assert.equal(section.state.furthestScreen, legacy.screen);
        assert.equal(harness.writes[0].key, 'learn');
    }
    assert.equal(upgrade({ screen: 3 }, 99), null);
});

// A small DOM fixture checks the helpers' generated structure without starting
// the standard lesson renderer. Real layout and KaTeX are checked in the pilots.
function resultsFixture(katex) {
    class Node {
        constructor(tag) {
            this.tagName = tag;
            this.children = [];
            this.attributes = {};
            this.textContent = '';
            this.dataset = {};
            this.events = {};
            this.style = { setProperty: (key, value) => { this.attributes[key] = value; } };
        }
        append(...nodes) { this.children.push(...nodes); }
        replaceChildren(...nodes) { this.children = nodes; }
        setAttribute(key, value) { this.attributes[key] = value; }
        addEventListener(name, action) { this.events[name] = action; }
        querySelector() {
            const search = node => node.tagName === 'h3' ? node : node.children?.map(search).find(Boolean);
            return search(this);
        }
        focus() { this.focused = true; }
    }
    const document = { body: { dataset: { lessonRenderer: 'custom' } }, createElement: tag => new Node(tag),
        dispatchEvent() {}, addEventListener() {} };
    const fixtureWindow = { katex };
    vm.runInNewContext(source, { window: fixtureWindow, document, CustomEvent: class { constructor(name, options) { this.type = name; this.detail = options?.detail; } } });
    return { ...fixtureWindow.Maths1to9LessonEngine, node: tag => new Node(tag) };
}

test('shared results render all four marks and explanations only when not right first time', () => {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    fixture.renderResults(container, [
        { prompt: 'One', answer: '1', firstCorrect: true, correct: true, explanation: 'Hidden' },
        { prompt: 'Two', answer: '2', firstCorrect: false, correct: true, explanation: 'Correction' },
        { prompt: 'Three', answer: '4', firstCorrect: false, correct: false, explanation: 'Review' },
        { prompt: 'Old save', answer: '5', firstCorrect: null, correct: true }
    ], { heading: 'Results' });
    assert.equal(container.children[0].textContent, 'Results');
    const rows = container.children[1].children;
    const answer = row => row.children[0].children[1];
    assert.equal(answer(rows[0]).children[1].textContent, '✓');
    assert.equal(answer(rows[0]).children[2].textContent, 'Right first time');
    assert.equal(rows[0].children.length, 1);
    assert.equal(answer(rows[1]).children[1].textContent, '2nd try');
    assert.equal(answer(rows[1]).children[2].textContent, 'Corrected');
    assert.equal(rows[1].children[1].textContent, 'Correction');
    assert.equal(answer(rows[2]).children[1].textContent, 'Incorrect');
    assert.equal(answer(rows[2]).children[2].textContent, 'Incorrect');
    assert.equal(answer(rows[3]).children.length, 1);
    assert.equal(rows[3].children.length, 1);
});

test('shared results render whole maths, keep supplied visuals and replace rather than duplicate work', () => {
    const calls = [];
    const fixture = resultsFixture({ render: (latex, node) => { calls.push(latex); node.textContent = latex; } });
    const container = fixture.node('div');
    const visual = fixture.node('svg');
    fixture.renderResults(container, [{ prompt: { latex: '24 = 2^3 \\times 3' }, answer: { latex: '\\mathrm{HCF} = 12' }, visual }]);
    assert.deepEqual(calls, ['24 = 2^3 \\times 3', '\\mathrm{HCF} = 12']);
    assert.equal(container.children.length, 1);
    assert.equal(container.children[0].children[0].children[1], visual);
    fixture.renderResults(container, []);
    assert.equal(container.children.length, 1);
    assert.equal(container.children[0].children.length, 0);
});

test('shared results safely render text and maths without KaTeX', () => {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    fixture.renderResults(container, [{ prompt: '<img onerror=bad>', answer: { latex: '2 \\times 3 = 6' } }]);
    const line = container.children[0].children[0].children[0];
    assert.equal(line.children[0].textContent, '<img onerror=bad>');
    assert.equal(line.children[1].children[0].textContent, '2 \\times 3 = 6');
});

test('shared score panel uses exact counts, optional readiness and configurable messages', () => {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    fixture.renderScorePanel(container, { correct: 4, total: 5 });
    let panel = container.children[0];
    assert.equal(panel.children[0].children[0].textContent, '4/5');
    assert.equal(panel.children[0].attributes['--practice-progress'], '80%');
    assert.equal(panel.children[1].children[0].textContent, 'You got 4 out of 5 right first time.');
    assert.equal(panel.children[1].children.length, 1);
    fixture.renderScorePanel(container, { correct: 4, total: 5, readyScore: 4 });
    assert.equal(container.children[0].children[1].children[1].textContent, "You're ready");
    fixture.renderScorePanel(container, { correct: 3, total: 5, readyScore: 4 });
    assert.equal(container.children[0].children[1].children[1].textContent, 'Keep practising');
    fixture.renderScorePanel(container, { correct: 0, total: 0, readyScore: 1, notReadyText: 'Try more' });
    assert.equal(container.children[0].children[0].attributes['--practice-progress'], '0%');
    assert.equal(container.children[0].children[1].children[1].textContent, 'Try more');
    fixture.renderScorePanel(container, { correct: 1, total: 1, readyScore: 1, readyText: 'Ready for Check' });
    assert.equal(container.children[0].children[1].children[1].textContent, 'Ready for Check');
});


test('shared result marks and score rings expose hidden words instead of generic aria labels', () => {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    fixture.renderResults(container, [
        { answer: '1', firstCorrect: true, correct: true },
        { answer: '2', firstCorrect: false, correct: true },
        { answer: '3', firstCorrect: false, correct: false },
        { answer: '4', firstCorrect: null, correct: true }
    ]);
    const rows = container.children[0].children;
    for (const [index, words] of ['Right first time', 'Corrected', 'Incorrect'].entries()) {
        const marks = rows[index].children[0].children[1].children;
        assert.equal(marks[1].attributes['aria-hidden'], 'true');
        assert.equal(marks[1].attributes['aria-label'], undefined);
        assert.equal(marks[2].className, 'visually-hidden');
        assert.equal(marks[2].textContent, words);
    }
    assert.equal(rows[3].children[0].children[1].children.length, 1);
    fixture.renderScorePanel(container, { correct: 3, total: 5 });
    const ring = container.children[0].children[0];
    assert.equal(ring.attributes['aria-label'], undefined);
    assert.equal(ring.children[0].attributes['aria-hidden'], 'true');
    assert.equal(ring.children[1].className, 'visually-hidden');
    assert.equal(ring.children[1].textContent, '3 out of 5 right first time');
});

function questionFixture(config, restored) {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    const section = {
        state: restored || {},
        writes: 0,
        update(change) { change(this.state); this.writes++; }
    };
    const assessments = [];
    const feedback = [];
    let continued = 0;
    let action;
    const api = {
        setSectionAction(id, next) { assert.equal(id, 'comparison'); action = next; },
        clearSectionAction(id) { assert.equal(id, 'comparison'); action = null; },
        recordAssessment(record) { assessments.push(record); }
    };
    const options = { sectionId: 'comparison', questionId: 'stable-1', questionType: 'test',
        scored: true, input: 'choice', prompt: 'Choose a number',
        options: [{ label: '2', feedback: 'Wrong', hint: 'Look again' },
            { label: '4', correct: true, feedback: 'Right' }, { label: '6', feedback: 'Too big' }],
        onContinue: () => { assert.equal(action, null); continued++; },
        onFeedback: result => feedback.push(result), ...config };
    const card = fixture.createQuestion(container, options, section, api);
    return { fixture, container, section, assessments, feedback, card,
        get action() { return action; }, get continued() { return continued; },
        click(index) { container.children[0].children[1].children[index].events.click(); },
        type(value) {
            const input = container.children[0].children[1].children[0];
            input.value = value;
            input.events.input();
            return input;
        },
        reload(overrides = {}) {
            const restoredOptions = { ...options, ...overrides };
            delete restoredOptions.onContinue;
            delete restoredOptions.onFeedback;
            return questionFixture(restoredOptions, JSON.parse(JSON.stringify(section.state)));
        }
    };
}

test('shared question choice cycle retains rejected choices and immutable firstCorrect across reloads', () => {
    let harness = questionFixture();
    assert.equal(harness.action.label, 'Check');
    assert.equal(harness.action.disabled, true);
    harness.click(0);
    assert.equal(harness.action.disabled, false);
    assert.equal(harness.container.children[0].children[1].attributes.role, 'group');
    harness = harness.reload();
    assert.equal(harness.section.state.cards['stable-1'].selected, 0);
    harness.action.onClick();
    assert.equal(harness.action.label, 'Try again');
    assert.equal(harness.card.result().firstCorrect, false);
    assert.equal(harness.feedback[0].hint, 'Look again');
    assert.equal(harness.assessments.length, 1);
    assert.equal(harness.assessments[0].questionId, 'stable-1');
    harness = harness.reload();
    assert.equal(harness.action.label, 'Try again');
    assert.equal(harness.assessments.length, 0);
    harness.action.onClick();
    const choices = harness.container.children[0].children[1].children;
    assert.equal(choices[0].disabled, true);
    assert.match(choices[0].className, /is-rejected/);
    assert.equal(choices[0].children[0].textContent, ' ×');
    assert.equal(choices[1].disabled, false);
    harness.click(0);
    assert.equal(harness.section.state.cards['stable-1'].selected, null);
    harness.click(1);
    harness.action.onClick();
    assert.equal(harness.card.result().firstCorrect, false);
    assert.equal(harness.card.result().correct, true);
    assert.equal(harness.card.result().answer, '4');
    assert.equal(harness.assessments.length, 1);
    assert.equal(harness.assessments[0].questionId, 'stable-1');
    harness = harness.reload();
    assert.equal(harness.action.label, 'Continue');
    assert.equal(harness.assessments.length, 0);
    harness.action.onClick();
    assert.equal(harness.continued, 1);
    assert.equal(harness.action, null);
});

test('shared question records each Check once with one stable score slot and no points for read-only views', () => {
    const harness = questionFixture();
    const tracker = window.Maths1to9LessonEngine.createScoreTracker([{ id: 'answer:stable-1', kind: 'answer', completed: false }]);
    harness.click(0);
    harness.action.onClick();
    harness.action.onClick();
    harness.click(1);
    harness.action.onClick();
    assert.equal(harness.assessments.length, 2);
    for (const record of harness.assessments) tracker.record({ id: `answer:${record.questionId}`, kind: 'answer', correct: record.correct });
    assert.equal(tracker.getScore().maximumPoints, 10);
    assert.equal(tracker.getScore().points, 5);
    const review = harness.reload({ readOnly: true });
    assert.equal(review.action, null);
    assert.equal(review.assessments.length, 0);
    assert.equal(review.card.result().firstCorrect, false);
    assert.equal(review.card.result().answer, '4');
    assert.equal(review.container.children[0].children[1].children[0].textContent, '2nd try');
    assert.equal(tracker.getScore().points, 5);
});

test('shared unscored questions retain firstCorrect without recording assessments', () => {
    const harness = questionFixture({ scored: false });
    harness.click(1);
    harness.action.onClick();
    assert.equal(harness.card.result().firstCorrect, true);
    assert.equal(harness.assessments.length, 0);
});

test('shared typed-number tidying accepts GCSE numeric forms and rejects malformed commas and non-numbers', () => {
    const tidy = window.Maths1to9LessonEngine.tidyNumber;
    for (const [input, expected] of [
        [' 1\u2009250\u00a0', '1250'], ['−.5', '-0.5'], ['–5', '-5'], ['—5', '-5'],
        ['.5', '0.5'], ['1,250', '1250'], ['12,500.5', '12500.5'], ['1,250,000', '1250000'],
        ['15.0', '15.0'], ['5.', '5.']
    ]) assert.equal(tidy(input), expected, input);
    for (const input of ['', ' ', '1,25', '12,50.5', '1,2500', '1.2.3', '5kg', '1/2', '1e3', '+5', 'Infinity']) {
        assert.equal(tidy(input), null, input);
    }
});

test('shared number input keeps its node and restores invalid feedback without an attempt', () => {
    let harness = questionFixture({ input: 'number', answer: '0.5', feedback: 'Correct' });
    const input = harness.type('hello');
    assert.equal(input, harness.container.children[0].children[1].children[0]);
    input.events.keydown({ key: 'Enter', preventDefault() {} });
    assert.equal(harness.assessments.length, 0);
    assert.equal(harness.card.result().firstCorrect, null);
    assert.equal(harness.action.label, 'Check');
    assert.equal(harness.container.children[0].children[2].textContent, 'Type a number, like 12 or 0.5.');
    harness = harness.reload();
    assert.equal(harness.section.state.cards['stable-1'].invalid, true);
    assert.equal(harness.container.children[0].children[2].textContent, 'Type a number, like 12 or 0.5.');
    harness.type('.5').events.keydown({ key: 'Enter', preventDefault() {} });
    assert.equal(harness.card.result().answer, '0.5');
    assert.equal(harness.card.result().firstCorrect, true);
    assert.equal(harness.assessments.length, 1);
    assert.equal(harness.action.label, 'Continue');
});

test('shared number retry clears input and checks misconception rules in order', () => {
    const harness = questionFixture({ input: 'number', answer: '72',
        rules: [{ value: '6', feedback: 'First rule', hint: 'overlap' },
            { value: '6.0', feedback: 'Second rule' }], fallback: 'Use every tile' });
    harness.type('6.0');
    harness.action.onClick();
    assert.equal(harness.card.result().explanation, 'First rule');
    assert.equal(harness.feedback[0].hint, 'overlap');
    harness.action.onClick();
    assert.equal(harness.section.state.cards['stable-1'].value, '');
    assert.equal(harness.action.disabled, true);
    harness.type('7');
    harness.action.onClick();
    assert.equal(harness.card.result().explanation, 'Use every tile');
    harness.action.onClick();
    harness.type('72.0');
    harness.action.onClick();
    assert.equal(harness.card.result().correct, true);
    assert.equal(harness.card.result().firstCorrect, false);
    assert.equal(harness.assessments.length, 3);
});

test('shared number exact mode distinguishes 15 from 15.0 while default mode does not', () => {
    const exact = questionFixture({ input: 'number', answer: '15.0', exact: true });
    exact.type('15');
    exact.action.onClick();
    assert.equal(exact.card.result().correct, false);
    exact.action.onClick();
    exact.type('15.0');
    exact.action.onClick();
    assert.equal(exact.card.result().correct, true);
    const numeric = questionFixture({ input: 'number', answer: '15.0' });
    numeric.type('15');
    numeric.action.onClick();
    assert.equal(numeric.card.result().correct, true);
});

test('HCF Check upgrades old shuffled answers and phases without losing work or score history', async () => {
    const pilot = fs.readFileSync(path.join(__dirname, '../content/highest-common-factor/questions.js'), 'utf8');
    const body = pilot.match(/function upgradeCheck\(saved, version\) \{([\s\S]*?)\n        \}/)[1];
    const upgrade = new Function('saved', 'version', 'lesson', body);
    const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/highest-common-factor/lesson.json'), 'utf8'));
    const questions = lesson.comparison.questions.map(question => {
        const order = [3, 1, 0, 2];
        return { ...question, options: order.map(index => question.options[index]),
            feedback: order.map(index => question.feedback[index]), answer: order.indexOf(question.answer) };
    });
    for (const phase of ['answer', 'wrong', 'correct', 'finished']) {
        const old = {
            contentVersion: 1, index: 1, screen: 1, furthestScreen: 1,
            selected: phase === 'correct' ? questions[1].answer : 0,
            phase: phase === 'finished' ? 'correct' : phase,
            finished: phase === 'finished', questions: JSON.parse(JSON.stringify(questions))
        };
        old.questions[0].firstCorrect = false;
        if (phase === 'wrong') old.questions[1].firstCorrect = false;
        if (phase === 'correct') old.questions[1].firstCorrect = true;
        if (phase === 'finished') {
            old.index = 3; old.screen = 4; old.furthestScreen = 4;
        }
        const store = stateStore(old);
        const section = await createSectionState('highest-common-factor', 'comparison', {
            version: 1, initial: () => ({}), upgrade: (saved, version) => upgrade(saved, version, lesson)
        }, store.store, store.schedule);
        const restored = section.state;
        assert.equal(restored.finished, old.finished);
        assert.equal(restored.screen, old.screen);
        assert.equal(restored.furthestScreen, old.furthestScreen);
        assert.deepEqual(Array.from(restored.order[1]), [3, 1, 0, 2]);
        assert.equal(restored.cards['final-check-1'].firstCorrect, false);
        assert.equal(restored.cards['final-check-1'].selected, questions[0].answer);
        assert.equal(restored.cards['final-check-1'].correct, true);
        assert.equal(restored.questions, undefined); // question content is read from lesson.json
        if (!old.finished) {
            const card = restored.cards['final-check-2'];
            assert.equal(card.phase, old.phase);
            assert.equal(card.selected, old.selected);
            assert.equal(card.feedback, old.phase === 'answer' ? '' : questions[1].feedback[old.selected]);
            assert.equal(card.rejected.length, phase === 'wrong' ? 1 : 0);
        } else {
            assert.equal(restored.cards['final-check-4'].firstCorrect, null);
        }
        assert.equal(store.writes.length, 1);
        assert.equal(store.writes[0].key, 'comparison');
        assert.equal(store.writes[0].value.version, 1);
    }
    assert.equal(upgrade({ contentVersion: 1, questions }, 99, lesson), null);
    assert.equal(upgrade({ contentVersion: 2, questions }, 0, lesson), null);
});

const { archivePractice, questionSetId } = window.Maths1to9LessonEngine;
test('question sets use session-specific evidence ids and stable Check ids', () => {
    assert.equal(questionSetId('question-bank', 1, 0), 'question-bank:1:1');
    assert.equal(questionSetId('question-bank', 2, 0), 'question-bank:2:1');
    assert.equal(questionSetId('comparison', 3, 0), 'final-check-1');
});

test('Practise again keeps the five most recent sessions without mutating their answers', () => {
    const state = { session: 1, finished: true, earlier: [], cards: { one: { firstCorrect: false } } };
    const reference = state;
    const fresh = () => ({ finished: false, cards: {}, items: [{ type: 'number', seed: state.session + 100 }] });
    for (let session = 2; session <= 8; session++) {
        assert.equal(archivePractice(state, fresh()), true);
        assert.equal(state, reference);
        assert.equal(state.session, session);
        assert.equal(state.finished, false);
        assert.equal(state.earlier.length, Math.min(session - 1, 5));
        assert.ok(state.earlier.every(earlier => earlier.earlier === undefined));
        state.finished = true;
    }
    assert.deepEqual(Array.from(state.earlier, earlier => earlier.session), [3, 4, 5, 6, 7]);
    const unfinished = { session: 1, finished: false, earlier: [] };
    assert.equal(archivePractice(unfinished, fresh()), false);
    assert.equal(unfinished.session, 1);
});

test('repeat Practice assessments freeze first-session points while retaining distinct evidence ids', () => {
    const tracker = window.Maths1to9LessonEngine.createScoreTracker([], () => {}, ['answer:question-bank:1', 'answer:question-bank:2']);
    tracker.record({ id: 'answer:question-bank:1:1', kind: 'answer', correct: false });
    tracker.record({ id: 'answer:question-bank:1:1', kind: 'answer', correct: true });
    tracker.record({ id: 'answer:question-bank:1:2', kind: 'answer', completed: true, firstCorrect: true, correct: true });
    const before = tracker.getScore();
    for (const correct of [false, true]) {
        tracker.record({ id: 'answer:question-bank:2:1', kind: 'answer', completed: true, firstCorrect: correct, correct });
        tracker.record({ id: 'answer:question-bank:2:2', kind: 'answer', completed: true, firstCorrect: correct, correct });
    }
    assert.deepEqual(tracker.getScore(), before);
    assert.equal(tracker.export().length, 2);
});

async function setFixture(restored, isCheck = false) {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    const id = isCheck ? 'comparison' : 'question-bank';
    let section;
    let action;
    let back;
    let card;
    let picks = 0;
    let completions = 0;
    const config = {
        version: 1, count: 2, practiseAgain: true, heading: 'Results',
        pick(random) { picks++; return [1, 2].map(() => ({ type: 'number', seed: Math.floor(random() * 100000) })); },
        question(item, random) { return { input: 'number', prompt: `Number ${item.seed}`, answer: String(Math.floor(random() * 10)) }; }
    };
    const api = {
        async useSectionState(key, options) {
            assert.equal(key, id);
            section = { state: restored ? JSON.parse(JSON.stringify(restored)) : options.initial(), update(change) { change(this.state); } };
            return section;
        },
        getLesson: () => ({ question_bank: {} }),
        getSections: () => [{ id: 'question-bank' }, { id: 'comparison' }],
        getCurrentSection: () => ({ id }), setSlideHash() {}, registerHashRoute() {}, goToSection: () => true,
        setSectionProgress() {}, setSectionBack(key, value) { back = value; },
        setSectionAction(key, value) { action = value; }, clearSectionAction() { action = null; },
        completeLesson() { completions++; },
        createQuestion(root, definition) {
            card = definition;
            section.state.cards[definition.questionId] ??= {
                value: '', firstCorrect: null, correct: null, feedback: '', phase: 'answer'
            };
        }
    };
    const runner = await fixture.runQuestionSet(id, config, api, container);
    function finishQuestion(firstCorrect = true) {
        Object.assign(section.state.cards[card.questionId], { value: card.answer, correct: true, firstCorrect, phase: 'correct' });
        card.onFeedback({ correct: true });
        card.onContinue();
    }
    return { container, section, runner, finishQuestion, get card() { return card; }, get action() { return action; },
        get back() { return back; }, get picks() { return picks; }, get completions() { return completions; } };
}

test('question sets rebuild saved seeds, retain the exact cursor and show readonly Back/Next without assessments', async () => {
    let set = await setFixture();
    const seeds = Array.from(set.section.state.items, item => item.seed);
    set.finishQuestion(false);
    const currentId = set.card.questionId;
    set.section.state.cards[currentId].value = '.5';
    set = await setFixture(set.section.state);
    assert.equal(set.picks, 0);
    assert.deepEqual(Array.from(set.section.state.items, item => item.seed), seeds);
    assert.equal(set.card.questionId, currentId);
    assert.equal(set.section.state.cards[currentId].value, '.5');
    set.back.onClick();
    assert.equal(set.card.readOnly, true);
    assert.equal(set.action.label, 'Next');
    assert.equal(set.section.state.index, 1);
    set.action.onClick();
    assert.equal(set.card.readOnly, false);
    assert.equal(set.card.questionId, currentId);
    assert.equal(set.section.state.cards[currentId].value, '.5');
    set.finishQuestion();
    assert.equal(set.action.label, 'Continue');
    assert.equal(set.section.state.finished, true);
    set = await setFixture(set.section.state);
    assert.equal(set.picks, 0);
    assert.equal(set.section.state.finished, true);
    set.back.onClick();
    assert.equal(set.card.readOnly, true);
    assert.equal(set.section.state.screen, 1);
});

test('repeat sessions pick fresh seeds, retain earlier marks and never reset another section or completion', async () => {
    const set = await setFixture();
    set.finishQuestion(false);
    set.finishQuestion();
    const first = JSON.parse(JSON.stringify(set.section.state));
    const again = () => set.container.children.find(node => node.tagName === 'button').events.click();
    again();
    assert.equal(set.section.state.session, 2);
    assert.equal(set.section.state.finished, false);
    assert.equal(set.section.state.earlier[0].cards['question-bank:1:1'].firstCorrect, false);
    assert.notDeepEqual(Array.from(set.section.state.items, item => item.seed), Array.from(first.items, item => item.seed));
    assert.equal(set.card.questionId, 'question-bank:2:1');
    const restored = await setFixture(set.section.state);
    assert.equal(restored.picks, 0);
    assert.equal(restored.card.questionId, 'question-bank:2:1');
    assert.equal(set.completions, 0);
    set.finishQuestion();
    set.finishQuestion();
    const details = set.container.children.filter(node => node.tagName === 'details');
    assert.equal(details.length, 1);
    assert.equal(details[0].children[0].textContent, 'Earlier practice 1');
    assert.equal(details[0].open, undefined);
});

test('Check uses fixed assessment ids and never offers Practise again', async () => {
    const set = await setFixture(undefined, true);
    assert.equal(set.card.questionId, 'final-check-1');
    set.finishQuestion();
    assert.equal(set.card.questionId, 'final-check-2');
    set.finishQuestion();
    assert.equal(set.container.children.some(node => node.tagName === 'button'), false);
});

test('HCF Practice upgrades old tiles, phases, position and first-session marks', () => {
    const pilot = fs.readFileSync(path.join(__dirname, '../content/highest-common-factor/interactive.js'), 'utf8');
    const body = pilot.match(/function upgradePractice\(saved, version\) \{([\s\S]*?)\n        \}/)[1];
    const api = { getProgress: () => ({ scoreActivities: [
        { id: 'answer:question-bank:1', firstCorrect: false },
        { id: 'answer:question-bank:2', firstCorrect: true }
    ] }) };
    const upgrade = new Function('saved', 'version', 'api', body);
    const order = [[18, 30], [48, 72], [14, 28], [9, 20], [30, 50]];
    const items = order.map(pair => ({ pair, stage: 'answer', phase: 'correct', value: '6',
        used: [[0, 1], [0, 1]], overlap: [2, 3], selected: null, message: 'HCF = 6.' }));
    for (const phase of ['match', 'answer', 'wrong', 'correct', 'finished']) {
        const saved = { order, items: JSON.parse(JSON.stringify(items)), index: phase === 'finished' ? 5 : 2,
            screen: 0, furthestScreen: phase === 'finished' ? 5 : 2, finished: phase === 'finished' };
        saved.items[2].stage = phase === 'match' ? 'match' : 'answer';
        saved.items[2].phase = ['wrong', 'correct'].includes(phase) ? phase : 'answer';
        const next = upgrade(saved, 0, api);
        assert.equal(next.session, 1);
        assert.equal(next.screen, 0);
        assert.equal(next.index, saved.index);
        assert.equal(next.finished, saved.finished);
        assert.deepEqual(next.items[2].used, [[0, 1], [0, 1]]);
        assert.equal(next.items[0].firstCorrect, false);
        assert.equal(next.items[1].firstCorrect, true);
        assert.equal(next.items[2].firstCorrect, null);
        assert.equal(next.cards['question-bank:1:1'].firstCorrect, false);
        if (phase !== 'match') assert.equal(next.cards['question-bank:1:3'].phase, saved.items[2].phase);
    }
    assert.equal(upgrade({ order, items }, 99, api), null);
    assert.equal(upgrade({}, 0, api), null);
});
