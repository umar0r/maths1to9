const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture() {
    const node = () => ({
        children: [], dataset: {}, style: {}, listeners: {}, classes: new Set(), attributes: {},
        append(child) { this.children.push(child); },
        setAttribute(key, value) { this.attributes[key] = value; },
        removeAttribute(key) { delete this.attributes[key]; },
        addEventListener(key, handler) { this.listeners[key] = handler; },
        removeEventListener() {}, remove() {}, focus() {},
        get classList() {
            return { add: key => this.classes.add(key), remove: key => this.classes.delete(key),
                toggle: (key, enabled) => enabled ? this.classes.add(key) : this.classes.delete(key) };
        }
    });
    const window = { matchMedia: () => ({ matches: true }) };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/digit-cards.js'), 'utf8'), {
        window, document: { createElement: node }
    });
    const host = node(), changes = [];
    const slots = ['a:left', 'a:right', 'answer:left', 'answer:right'].map(id => ({ id, group: id.split(':')[0], element: node() }));
    const view = window.Maths1to9DigitCards.create(host, { slots,
        groups: { a: { advance: 'right' }, answer: { advance: 'left' } },
        onChange: value => changes.push(value) });
    return { api: window.Maths1to9DigitCards, host, changes, slots, view };
}

test('shared digit marks survive locked restore, retry selects number rows left first and answer rows right first', () => {
    const { api, view, slots, changes } = fixture();
    const input = { digits: { 'a:left': '9', 'a:right': '4', 'answer:left': '1', 'answer:right': '2' }, active: null };
    const marked = api.markedValue(input, { 'a:left': 'wrong', 'a:right': 'right', 'answer:left': 'wrong', 'answer:right': 'wrong' });
    assert.equal(input.marks, undefined);
    view.update({ value: marked, editable: false, phase: 'wrong' });
    assert.ok(slots.every(slot => slot.element.disabled));
    assert.ok(slots[0].element.classes.has('is-incorrect'));
    assert.ok(slots[1].element.classes.has('is-correct'));
    assert.equal(changes.length, 0);
    view.update({ value: marked, editable: true, phase: 'answer', retry: true });
    assert.equal(changes.at(-1).active, 'a:left');
    assert.deepEqual(JSON.parse(JSON.stringify(changes.at(-1).digits)), input.digits);
    assert.equal(changes.at(-1).marks['a:right'], undefined);
    assert.equal(marked.marks['a:right'], 'right');
    assert.ok(slots.every(slot => !slot.element.disabled));
    const answerOnly = api.markedValue(input, { 'answer:left': 'wrong', 'answer:right': 'wrong' });
    view.update({ value: answerOnly, editable: true, phase: 'answer', retry: true });
    assert.equal(changes.at(-1).active, 'answer:right');
});

test('shared digit changes clear only their own mark, keeping red on selection and identical digits', () => {
    const { view, host, slots, changes } = fixture();
    const value = { digits: { 'a:left': '9', 'a:right': '4' }, active: 'a:left', marks: { 'a:left': 'wrong', 'a:right': 'wrong' } };
    view.update({ value, editable: true, phase: 'answer', retry: true });
    slots[0].element.listeners.click();
    host.listeners.keydown({ key: '9', preventDefault() {} });
    assert.equal(changes.at(-1).marks['a:left'], 'wrong');
    slots[0].element.listeners.click();
    host.listeners.keydown({ key: '3', preventDefault() {} });
    assert.equal(changes.at(-1).marks['a:left'], undefined);
    assert.equal(changes.at(-1).marks['a:right'], 'wrong');
    assert.equal(changes.at(-1).active, 'a:right');
    host.listeners.keydown({ key: 'Backspace', preventDefault() {} });
    assert.equal(changes.at(-1).marks['a:right'], undefined);
    view.mark({ 'a:left': 'right' });
    assert.ok(slots[0].element.classes.has('is-correct'));
    view.clearMark('a:left');
    assert.ok(!slots[0].element.classes.has('is-correct'));
    view.update({ value: null, editable: true, phase: 'answer' });
    assert.ok(slots.every(slot => slot.element.textContent === '' && !slot.element.classes.has('is-incorrect')));
});
