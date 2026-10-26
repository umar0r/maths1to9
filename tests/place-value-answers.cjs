// Keep the 19 legacy decimal/format checks against the actual shared card.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { loadScript } = require('./helpers/lessons.cjs');
class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.events = {}; this.dataset = {}; this.style = {}; this.textContent = ''; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(name, action) { this.events[name] = action; }
    focus() {}
    querySelector(tag) { return this.children.find(child => child.tagName === tag) || this.children.map(child => child.querySelector?.(tag)).find(Boolean); }
}
const document = { body: { dataset: { lessonRenderer: 'custom' } }, createElement: tag => new Node(tag), dispatchEvent() {}, addEventListener() {} };
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document });
const Q = loadScript(path.join(__dirname, '../content/place-value/place-value.js'), ['powerOfTenQuestion'], { window });
function isCorrect(actual, expected, exact = false) {
    const root = new Node('div');
    const section = { state: {}, update(change) { change(this.state); } };
    let action;
    const definition = { ...Q.powerOfTenQuestion(4770, 1, 1), sectionId: 'comparison', questionId: 'decimal', answer: expected };
    if (exact) { delete definition.tolerance; definition.exact = true; }
    window.Maths1to9LessonEngine.createQuestion(root, definition, section, {
        setSectionAction(id, next) { action = next; }, clearSectionAction() {}, recordAssessment() {}
    });
    const input = root.querySelector('input');
    input.value = actual; input.events.input(); action.onClick();
    return section.state.cards.decimal.correct === true;
}
test('place-value: the shared number card preserves all 19 exact decimal and strict-format cases', () => {
    for (const [actual, expected, correct] of [
        ['47.70', '47.7', true], ['47.7', '47.70', true],
        ['47.7000', '47.7', true], [' 047.70 ', '47.7', true],
        ['4,770.00', '4770', true], ['.40', '0.4', true],
        ['-0.00', '0', true], ['-47.70', '-47.7', true],
        ['47.71', '47.7', false], ['47.700000000000001', '47.7', false],
        ['', '0', false], [' ', '0', false], ['47.7abc', '47.7', false],
        ['47,70', '4770', false], ['4.77e1', '47.7', false],
        ['Infinity', 'Infinity', false], ['0x10', '16', false]
    ]) {
        // The old checker returned false for an invalid expected value too.
        if (expected === 'Infinity') {
            assert.throws(() => isCorrect(actual, expected), { name: 'TypeError' });
            assert.equal(isCorrect(actual, '0'), false);
            continue;
        }
        assert.equal(isCorrect(actual, expected), correct, `${actual} vs ${expected}`);
    }
    // The old unused money branch required literal formatting. The shared
    // exact-format mode retains that separate behaviour without a lesson parser.
    assert.equal(isCorrect('47.7', '47.70', true), false);
    assert.equal(isCorrect('47.70', '47.70', true), true);
});
