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
