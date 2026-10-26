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

async function setFixture(restored, isCheck = false, lastSection = false) {
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
        getSections: () => lastSection ? [{ id: 'question-bank' }] : [{ id: 'question-bank' }, { id: 'comparison' }],
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

test('seeded Practice keeps its skill evidence identity through reloads and changes it for new sessions', () => {
    const id = window.Maths1to9LessonEngine.assessmentEvidenceId;
    const state = { session: 2, items: [{ type: 'algebra', seed: 123 }] };
    assert.equal(id('algebra', 'page-one', 'question-bank:2:1', state), id('algebra', 'page-two', 'question-bank:2:1', state));
    assert.notEqual(id('algebra', 'page-one', 'question-bank:2:1', state), id('algebra', 'page-one', 'question-bank:3:1', { session: 3, items: [{ type: 'algebra', seed: 456 }] }));
    assert.notEqual(id('algebra', 'page-one', 'question-bank:2:1', state), id('algebra', 'page-one', 'question-bank:2:1', { session: 2, items: [{ type: 'algebra', seed: 999 }] }));
    assert.equal(id('hcf', 'page-one', 'question-bank:2:1', { session: 2, seed: 12 }), id('hcf', 'page-two', 'question-bank:2:1', { session: 2, seed: 12 }));
    assert.equal(id('old', 'page-one', 'question-bank:1'), 'old:page-one:question-bank:1');
    assert.equal(id('check', 'page-one', 'final-check-1', state), 'check:page-one:final-check-1');
});

test('algebraic Practice recovers old question numbers and permutations without saving lesson wording', () => {
    const { loadScript } = require('./helpers/lessons.cjs');
    const pilot = loadScript(path.join(__dirname, '../content/algebraic-expressions/questions.js'), ['questionBank', 'practiceQuestions']);
    const bank = pilot.practiceQuestions(10, window.Maths1to9LessonEngine);
    const types = Object.keys(pilot.questionBank(() => .5).generators);
    const history = Array.from({ length: 10 }, (_, index) => {
        const type = types[index % types.length];
        const question = pilot.questionBank(seededRandom(index + 503)).generators[type]();
        return { type, question, selected: question.answerLabel, checked: true, correct: true,
            firstCorrect: index === 0 ? false : index === 1 ? null : true,
            attempts: index === 0 ? [{ selected: question.options.find(option => !option.correct).label, correct: false }] : [] };
    });
    for (const finished of [false, true]) {
        const old = { contentVersion: 1, number: 10, sessionLength: 10, history, entry: history[9], finished };
        const restored = bank.upgrade(old, 0);
        assert.ok(restored);
        assert.equal(restored.session, 1);
        assert.equal(restored.index, finished ? 10 : 9);
        assert.equal(restored.screen, restored.index);
        for (let index = 0; index < 10; index++) {
            const item = restored.items[index];
            const definition = bank.question(item, seededRandom(item.seed));
            assert.equal(definition.prompt, [history[index].question.prompt, history[index].question.display].filter(Boolean).join(' '));
            assert.deepEqual(Array.from(definition.options, option => option.label), Array.from(history[index].question.options, option => option.label));
            const card = restored.cards[`question-bank:1:${index + 1}`];
            assert.equal(definition.options[card.selected].label, history[index].selected);
            assert.equal(card.firstCorrect, history[index].firstCorrect);
            assert.equal(item.question, undefined);
            assert.equal(item.prompt, undefined);
        }
    }
    assert.equal(bank.upgrade({ contentVersion: 1 }, 0), null);
    assert.equal(bank.upgrade({}, 99), null);
});

test('finished question sets say All lessons only when no section follows', async () => {
    for (const lastSection of [false, true]) {
        const set = await setFixture(undefined, false, lastSection);
        set.finishQuestion();
        set.finishQuestion();
        assert.equal(set.action.label, lastSection ? 'All lessons' : 'Continue');
    }
});

function customWidgetFixture() {
    const calls = { renders: [], updates: [], marks: [], focus: 0 };
    let change;
    const widget = {
        render(host, options) {
            calls.renders.push(options);
            change = options.onChange;
            return {
                update(options) { calls.updates.push(JSON.parse(JSON.stringify(options))); },
                focus() { calls.focus++; }
            };
        },
        isEmpty: value => value === null,
        mark(value) {
            calls.marks.push(value);
            return { correct: value.number === 4, feedback: 'Marked', hint: 'Use four' };
        },
        answerText: value => `Number ${value.number}`
    };
    return { widget, calls, change(value) { change(value); } };
}

test('custom cards require every widget function and a boolean marking result', () => {
    for (const name of ['render', 'isEmpty', 'mark', 'answerText']) {
        const fake = customWidgetFixture();
        delete fake.widget[name];
        assert.throws(() => questionFixture({ input: 'custom', widget: fake.widget }), /stable-1/);
    }
    assert.throws(() => questionFixture({ input: 'custom' }), /stable-1/);
    const fake = customWidgetFixture();
    fake.widget.mark = () => ({ correct: 'yes' });
    const card = questionFixture({ input: 'custom', widget: fake.widget });
    fake.change({ number: 4 });
    assert.throws(() => card.action.onClick(), /stable-1/);
    assert.equal(card.assessments.length, 0);
    assert.equal(card.card.result().firstCorrect, null);
});

test('custom cards copy changes, refresh only Check and ignore empty Checks', () => {
    const fake = customWidgetFixture();
    const card = questionFixture({ input: 'custom', widget: fake.widget });
    assert.equal(card.section.state.cards['stable-1'].value, null);
    assert.equal(card.card.result().answer, '');
    assert.equal(card.action.disabled, true);
    card.action.onClick();
    assert.equal(fake.calls.marks.length, 0);
    const value = { number: 2 };
    fake.change(value);
    value.number = 99;
    assert.equal(card.section.state.cards['stable-1'].value.number, 2);
    assert.equal(card.action.disabled, false);
    assert.equal(fake.calls.updates.length, 1);
    assert.equal(card.card.result().answer, 'Number 2');
});

test('custom wrong-then-right cycle preserves firstCorrect, scores each Check and copies feedback', () => {
    for (const scored of [true, false]) {
        const fake = customWidgetFixture();
        const card = questionFixture({ input: 'custom', widget: fake.widget, scored });
        fake.change({ number: 2 });
        card.action.onClick();
        assert.equal(fake.calls.marks.length, 1);
        assert.equal(card.action.label, 'Try again');
        fake.change({ number: 99 });
        assert.equal(card.section.state.cards['stable-1'].value.number, 2);
        assert.equal(fake.calls.updates.at(-1).editable, false);
        assert.equal(fake.calls.updates.at(-1).phase, 'wrong');
        card.feedback[0].value.number = 99;
        assert.equal(card.section.state.cards['stable-1'].value.number, 2);
        card.action.onClick();
        assert.equal(card.section.state.cards['stable-1'].value, null);
        assert.equal(card.section.state.cards['stable-1'].feedback, '');
        assert.equal(card.section.state.cards['stable-1'].hint, null);
        assert.deepEqual(fake.calls.updates.at(-1), { value: null, editable: true, phase: 'answer' });
        assert.equal(fake.calls.focus, 1);
        fake.change({ number: 4 });
        card.action.onClick();
        fake.change({ number: 99 });
        assert.equal(card.card.result().answer, 'Number 4');
        assert.equal(card.card.result().firstCorrect, false);
        assert.equal(card.card.result().correct, true);
        assert.equal(fake.calls.marks.length, 2);
        assert.equal(card.assessments.length, scored ? 2 : 0);
        assert.equal(card.feedback[1].value.number, 4);
        card.action.onClick();
        assert.equal(card.continued, 1);
        fake.change({ number: 99 });
        assert.equal(card.card.result().answer, 'Number 4');
    }
});

test('custom reloads restore each phase and readonly renders preserve answer text without writes', () => {
    for (const phase of ['answer', 'wrong', 'correct']) {
        const fake = customWidgetFixture();
        let card = questionFixture({ input: 'custom', widget: fake.widget });
        fake.change({ number: phase === 'correct' ? 4 : 2 });
        if (phase !== 'answer') card.action.onClick();
        const before = JSON.stringify(card.section.state);
        card = card.reload();
        assert.equal(JSON.stringify(card.section.state), before);
        assert.equal(fake.calls.renders.at(-1).editable, phase === 'answer');
        assert.equal(fake.calls.updates.at(-1).phase, phase);
        assert.equal(fake.calls.updates.at(-1).value.number, phase === 'correct' ? 4 : 2);
        const readonly = card.reload({ readOnly: true });
        assert.equal(fake.calls.renders.at(-1).editable, false);
        assert.equal(fake.calls.updates.at(-1).editable, false);
        fake.change({ number: 99 });
        assert.equal(JSON.stringify(readonly.section.state), before);
        assert.equal(readonly.section.writes, 0);
        assert.equal(readonly.container.children[0].children[2].textContent, readonly.card.result().answer);
    }
});

test('custom question-set rows use widget text for current and earlier sessions and blank null values', async () => {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    const widget = customWidgetFixture().widget;
    const session = (number, value) => ({
        session: number, items: [{ type: 'custom', seed: 1 }], screen: 1, index: 1, finished: true,
        cards: { [`question-bank:${number}:1`]: { value, firstCorrect: true, correct: true } }
    });
    const state = { ...session(2, { number: 4 }), earlier: [session(1, { number: 2 }), session(0, null)] };
    await fixture.runQuestionSet('question-bank', {
        version: 1, count: 1, question: () => ({ input: 'custom', widget, prompt: 'Choose' })
    }, {
        useSectionState: async () => ({ state, update(change) { change(state); } }),
        getCurrentSection: () => ({ id: 'question-bank' }), getLesson: () => ({}),
        getSections: () => [{ id: 'question-bank' }, { id: 'comparison' }],
        registerHashRoute() {}, setSlideHash() {}, setSectionAction() {}, setSectionBack() {}, setSectionProgress() {}
    }, container);
    const text = node => [node.textContent, ...node.children.map(text)].join(' ');
    assert.match(text(container), /Number 4/);
    assert.match(text(container), /Number 2/);
    assert.doesNotMatch(text(container), /Number undefined|Number null/);
});

test('fraction cards accept signed whole numbers, decimals and fractions by exact value', () => {
    for (const [value, answer] of [
        ['3', '3'], ['-2', '-2'], ['0.5', '1/2'], ['1/2', '1/2'],
        ['−3/4', '-0.75'], ['6/4', '1.5'], ['- 1 / 2', '−1/2'],
        ['1/−2', '-1/2'], ['–3/4', '-3/4'], ['2/4', '1/2'], ['3/6', '1/2'],
        ['.5', '1/2'], ['−.5', '-1/2'], ['5.', '5'], ['0', '0/3'],
        ['9007199254740993/3', '3002399751580331'],
        ['0.10000000000000000001', '10000000000000000001/100000000000000000000']
    ]) {
        const card = questionFixture({ input: 'number', fractions: true, answer });
        card.type(value);
        card.action.onClick();
        assert.equal(card.card.result().correct, true, value);
        assert.equal(card.assessments.length, 1);
    }
    for (const [value, answer] of [['0.33', '1/3'], ['9007199254740993', '9007199254740992']]) {
        const card = questionFixture({ input: 'number', fractions: true, answer });
        card.type(value);
        card.action.onClick();
        assert.equal(card.card.result().correct, false, value);
    }
});

test('fraction cards reject mixed numbers, zero denominators and malformed input without an attempt', () => {
    for (const value of ['1 1/2', '−1 1/2', '1/0', '1/−0', '1/2/3', 'x', '/', '-',
        '1.2.3', '1.5/2', '1/2.5', '+1', '1e3', '1,000', '2kg']) {
        let card = questionFixture({ input: 'number', fractions: true, answer: '1/2' });
        card.type(value);
        card.action.onClick();
        assert.equal(card.card.result().firstCorrect, null, value);
        assert.equal(card.assessments.length, 0, value);
        assert.equal(card.container.children[0].children[2].textContent,
            'Type a number or a fraction, like 3 or 1/2.');
        card = card.reload();
        assert.equal(card.action.label, 'Check');
        assert.equal(card.section.state.cards['stable-1'].invalid, true);
    }
});

test('fraction rules use exact values in order, retain typed form and expose text input settings', () => {
    const card = questionFixture({ input: 'number', fractions: true, answer: '2',
        rules: [{ value: '-1/2', feedback: 'First' }, { value: '-0.5', feedback: 'Second' }],
        fallback: 'Other' });
    const input = card.type('- 3 / 6');
    assert.equal(input.inputMode, 'text');
    assert.equal(input.autocomplete, 'off');
    assert.equal(input.attributes.autocorrect, 'off');
    assert.equal(input.autocapitalize, 'off');
    assert.equal(input.spellcheck, false);
    card.action.onClick();
    assert.equal(card.card.result().explanation, 'First');
    assert.equal(card.card.result().answer, '−3/6');
    assert.equal(card.section.state.cards['stable-1'].value, '−3/6');
    const review = card.reload({ readOnly: true });
    assert.equal(review.container.children[0].children[1].textContent, '−3/6');
    assert.equal(review.card.result().answer, '−3/6');
    card.action.onClick();
    card.type('6/4');
    card.action.onClick();
    assert.equal(card.card.result().explanation, 'Other');
    assert.equal(card.card.result().answer, '6/4');
    assert.throws(() => questionFixture({ input: 'number', fractions: true, exact: true }),
        /fractions: true cannot be combined with exact: true/);
});

test('figures render once between prompt and any answer, including reload and read-only cards', () => {
    for (const input of ['number', 'choice', 'custom']) {
        const calls = [];
        const fixture = resultsFixture();
        const root = fixture.node('div');
        const section = { state: {}, update(fn) { fn(this.state); } };
        const config = { input, sectionId: 'comparison', questionId: 'figure', prompt: 'Picture',
            answer: '1', options: [{ label: '1', correct: true }],
            widget: { render() { return { update() {} }; }, isEmpty: () => true,
                mark: () => ({ correct: true }), answerText: () => '' },
            figure(host, { readOnly }) {
                const article = root.children[0];
                assert.equal(article.children[0].textContent, 'Picture');
                assert.equal(article.children[1], host);
                assert.equal(article.children.length, 2); // No answer has been created yet.
                calls.push(readOnly);
            } };
        const api = { setSectionAction() {}, clearSectionAction() {} };
        fixture.createQuestion(root, config, section, api);
        fixture.createQuestion(root, config, section, api);
        fixture.createQuestion(root, { ...config, readOnly: true }, section, api);
        assert.deepEqual(calls, [false, false, true]);
    }
});

const fieldDefinition = {
    input: 'number', fractions: true,
    fields: [{ id: 'm', label: 'Gradient' }, { id: 'c', label: 'y-intercept' }],
    answer: { m: '-1', c: '1/2' }, feedback: 'Right', fallback: 'Fallback',
    rules: [{ value: { m: '0' }, feedback: 'First partial' },
        { value: { m: '0', c: '6' }, feedback: 'Later full' },
        { value: { m: '-1' }, feedback: 'Gradient right' }]
};
function fieldBox(card, index) {
    return card.container.children[0].children[1].children[index].children[0];
}
function typeField(card, index, value) {
    const box = fieldBox(card, index);
    box.value = value;
    box.events.input();
    return box;
}
test('fields reject unsupported inputs, malformed lists, duplicate ids and incomplete answers', () => {
    for (const override of [
        { input: 'choice' }, { fractions: false }, { exact: true },
        { fields: null }, { fields: [] }, { fields: [{ id: 'm', label: 'm' }] },
        { fields: [{ id: 'm', label: 'm' }, { id: 'm', label: 'c' }] },
        { fields: [{ id: 'm' }, { id: 'c', label: 'c' }] },
        { answer: { m: '1' } }, { answer: { m: 'bad', c: '2' } }
    ]) assert.throws(() => questionFixture({ ...fieldDefinition, ...override }), { name: 'TypeError' });
});
test('fields require every box, restore invalid focus without marking and use fraction keyboard settings', () => {
    let card = questionFixture(fieldDefinition);
    assert.equal(card.action.disabled, true);
    typeField(card, 0, '-1');
    assert.equal(card.action.disabled, true);
    const box = typeField(card, 1, 'bad');
    assert.equal(card.action.disabled, false);
    for (const input of [fieldBox(card, 0), box]) {
        assert.equal(input.inputMode, 'text');
        assert.equal(input.autocomplete, 'off');
        assert.equal(input.attributes.autocorrect, 'off');
        assert.equal(input.autocapitalize, 'off');
        assert.equal(input.spellcheck, false);
    }
    card.action.onClick();
    assert.equal(box.attributes['aria-invalid'], 'true');
    assert.equal(box.focused, true);
    assert.equal(card.assessments.length, 0);
    assert.equal(card.section.state.cards['stable-1'].firstCorrect, null);
    card = card.reload();
    assert.equal(fieldBox(card, 1).value, 'bad');
    assert.equal(fieldBox(card, 1).attributes['aria-invalid'], 'true');
    assert.equal(card.container.children[0].children[2].textContent, 'Type a number or a fraction, like 3 or 1/2.');
});
test('fields use ordered partial rules, retain retry values and focus the first wrong box', () => {
    let card = questionFixture(fieldDefinition);
    typeField(card, 0, '0'); typeField(card, 1, '6');
    card.action.onClick();
    assert.equal(card.card.result().explanation, 'First partial');
    card = card.reload();
    assert.equal(card.action.label, 'Try again');
    card.action.onClick();
    assert.equal(fieldBox(card, 0).value, '0');
    assert.equal(fieldBox(card, 1).value, '6');
    assert.equal(fieldBox(card, 0).focused, true);
    typeField(card, 0, '-1'); card.action.onClick();
    assert.equal(card.card.result().explanation, 'Gradient right');
    card.action.onClick();
    assert.equal(fieldBox(card, 1).focused, true);
    typeField(card, 1, '2/4'); card.action.onClick();
    assert.equal(card.card.result().correct, true);
    assert.equal(card.card.result().firstCorrect, false);
    assert.equal(card.card.result().answer, 'Gradient −1, y-intercept 2/4');
});
test('fields save tidied texts, copy feedback values and render retained answers after reload', () => {
    let card = questionFixture(fieldDefinition);
    typeField(card, 0, ' − 1 '); typeField(card, 1, '2 / 4');
    card = card.reload();
    assert.equal(card.action.label, 'Check');
    card.action.onClick();
    assert.equal(JSON.stringify(card.section.state.cards['stable-1'].value), JSON.stringify({ m: '−1', c: '2/4' }));
    assert.equal(JSON.stringify(card.feedback[0].value), JSON.stringify({ m: '−1', c: '2/4' }));
    card.feedback[0].value.m = '99';
    assert.equal(card.section.state.cards['stable-1'].value.m, '−1');
    card = card.reload();
    assert.equal(card.action.label, 'Continue');
    const review = card.reload({ readOnly: true });
    assert.equal(review.container.children[0].children[1].textContent, 'Gradient −1, y-intercept 2/4');
});

test('fields work through question-set results, Back and Practise again with retained earlier rows', async () => {
    const fixture = resultsFixture();
    const container = fixture.node('div');
    let section, action, back, current;
    const api = {
        async useSectionState(key, options) {
            section = { state: options.initial(), update(change) { change(this.state); } };
            return section;
        },
        getLesson: () => ({ question_bank: {} }),
        getSections: () => [{ id: 'question-bank' }, { id: 'comparison' }],
        getCurrentSection: () => ({ id: 'question-bank' }), setSlideHash() {}, registerHashRoute() {}, goToSection: () => true,
        setSectionProgress() {}, setSectionBack(key, value) { back = value; },
        setSectionAction(key, value) { action = value; }, clearSectionAction() { action = null; }, recordAssessment() {},
        createQuestion(root, definition) {
            current = definition;
            return fixture.createQuestion(root, definition, section, api);
        }
    };
    const runner = await fixture.runQuestionSet('question-bank', {
        version: 1, count: 1, practiseAgain: true,
        pick: () => [{ type: 'fields', seed: 123 }], question: () => fieldDefinition
    }, api, container);
    const find = (node, tag) => [node, ...node.children.flatMap(child => find(child, tag))].filter(node => node.tagName === tag);
    function fill() {
        for (const [index, box] of find(container, 'input').entries()) {
            box.value = index === 0 ? '−1' : '2/4'; box.events.input();
        }
        action.onClick(); action.onClick();
    }
    fill();
    assert.equal(find(container, 'span').filter(node => node.textContent === 'Gradient −1, y-intercept 2/4').length, 1);
    back.onClick();
    assert.equal(current.readOnly, true);
    assert.equal(find(container, 'input').length, 0);
    action.onClick();
    find(container, 'button').find(button => button.textContent === 'Practise again').events.click();
    assert.equal(section.state.session, 2);
    assert.equal(section.state.earlier.length, 1);
    assert.equal(action.disabled, true);
    fill();
    assert.equal(find(container, 'span').filter(node => node.textContent === 'Gradient −1, y-intercept 2/4').length, 2);
});

test('tolerance plain cards include both exact edges and reject just outside without float rounding', () => {
    for (const [answer, tolerance, values] of [
        ['1.5', 0.2, [['1.4', true], ['1.3', true], ['1.7', true], ['1.29999999999999999', false], ['1.70000000000000001', false]]],
        ['-1.5', 0.2, [['-1.3', true], ['-1.7', true], ['-1.29999999999999999', false], ['-1.70000000000000001', false]]],
        ['5.0', 0, [['5', true], ['5.0', true], ['5.00000000000000001', false]]],
        ['1', 1e-7, [['1.0000001', true], ['1.0000001000000001', false]]],
        ['1', 1e308, [['0', true]]]
    ]) for (const [value, correct] of values) {
        const card = questionFixture({ input: 'number', answer, tolerance, feedback: 'Close enough' });
        card.type(value); card.action.onClick();
        assert.equal(card.card.result().correct, correct, `${answer} ± ${tolerance}, ${value}`);
        if (correct) assert.equal(card.card.result().explanation, 'Close enough');
    }
});

test('tolerance fraction cards compare decimals and fractions exactly, including negative denominators', () => {
    for (const [value, correct] of [['1.2', true], ['1.3', true], ['1.4', true], ['1.5', true], ['1.53', true],
        ['1.1', false], ['1.54', false], ['7/5', true], ['-7/-5', true], ['17/15', true], ['23/15', true]]) {
        const card = questionFixture({ input: 'number', fractions: true, answer: '4/3', tolerance: 0.2 });
        card.type(value); card.action.onClick();
        assert.equal(card.card.result().correct, correct, value);
    }
    const negative = questionFixture({ input: 'number', fractions: true, answer: '4/-3', tolerance: 0.2 });
    negative.type('-7/5'); negative.action.onClick();
    assert.equal(negative.card.result().correct, true);
});

test('tolerance fields apply scalar or per-field ranges to every box and to ordered partial rules', () => {
    for (const [tolerance, values, correct] of [[0.2, ['-0.8', '0.7'], true], [0.2, ['-0.8', '0.71'], false],
        [{ m: 0.2, c: 0.5 }, ['-1.2', '1'], true], [{ m: 0.2, c: 0.5 }, ['-1.21', '0.5'], false]]) {
        const card = questionFixture({ ...fieldDefinition, tolerance });
        values.forEach((value, index) => typeField(card, index, value)); card.action.onClick();
        assert.equal(card.card.result().correct, correct);
    }
    const card = questionFixture({ ...fieldDefinition, tolerance: { m: 0.2, c: 0.5 }, rules: [
        { value: { m: '0', c: '6' }, feedback: 'First near rule' },
        { value: { m: '0' }, feedback: 'Later partial' }
    ] });
    typeField(card, 0, '0.2'); typeField(card, 1, '5.5'); card.action.onClick();
    assert.equal(card.card.result().explanation, 'First near rule');
    card.action.onClick();
    assert.equal(fieldBox(card, 0).focused, true);
});

test('tolerance rules keep order and can never beat the right answer', () => {
    for (const [value, feedback] of [['2.1', 'First'], ['1.5', 'Correct']]) {
        const card = questionFixture({ input: 'number', answer: '1.5', tolerance: 0.2, feedback: 'Correct', rules: [
            { value: '2', feedback: 'First' }, { value: '2.1', feedback: 'Second' }, { value: '1.6', feedback: 'Overlaps answer' }
        ] });
        card.type(value); card.action.onClick();
        assert.equal(card.card.result().explanation, feedback);
    }
});

test('tolerance rejects every unsupported configuration before creating saved cards', () => {
    for (const tolerance of [-0.1, Infinity, -Infinity, NaN, '0.2', null, undefined, [], {}, { m: 0.2 }]) {
        assert.throws(() => questionFixture({ input: 'number', answer: '1.5', tolerance }), { name: 'TypeError' });
    }
    assert.throws(() => questionFixture({ input: 'number', answer: '1.5', tolerance: 0, exact: true }), { name: 'TypeError' });
    for (const answer of ['4/3', 'bad', 'Infinity']) {
        assert.throws(() => questionFixture({ input: 'number', answer, tolerance: 0.2 }), { name: 'TypeError' });
    }
    for (const tolerance of [{ m: 0.2 }, { m: 0.2, c: 0.5, extra: 1 }, { m: -1, c: 0.5 },
        { m: 0.2, c: '0.5' }, { m: 0.2, c: NaN }, { m: 0.2, c: Infinity }, { m: 0.2, c: 0.5, [Symbol('extra')]: 1 }]) {
        assert.throws(() => questionFixture({ ...fieldDefinition, tolerance }), { name: 'TypeError' });
    }
});

test('tolerance keeps pupil text, invalid-input attempts, feedback and phases through reload and read-only results', () => {
    let card = questionFixture({ input: 'number', fractions: true, answer: '4/3', tolerance: 0.2, feedback: 'Close enough' });
    card.type('bad'); card.action.onClick();
    assert.equal(card.assessments.length, 0);
    assert.equal(card.card.result().firstCorrect, null);
    card.type('1.1'); card.action.onClick();
    card = card.reload(); assert.equal(card.action.label, 'Try again');
    card.action.onClick(); card.type('7/5'); card.action.onClick();
    assert.equal(card.feedback[0].value, '7/5');
    assert.equal(card.card.result().firstCorrect, false);
    card = card.reload(); assert.equal(card.action.label, 'Continue');
    const review = card.reload({ readOnly: true });
    assert.equal(review.card.result().answer, '7/5');
    assert.equal(review.card.result().explanation, 'Close enough');
    assert.equal(review.assessments.length, 0);
});
