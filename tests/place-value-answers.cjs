const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../content/place-value/questions.js'), 'utf8');
const helper = source.slice(source.indexOf('    function normaliseDecimalAnswer('), source.indexOf('    function addCommas('));
const checker = source.slice(source.indexOf('        function isCorrect('), source.indexOf('        function removeCheckIntroduction('));
const context = vm.createContext({});
vm.runInContext(helper + checker, context);
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
    assert.equal(context.isCorrect({type: 'number', answer: expected}, {value: actual}), correct, `${actual} vs ${expected}`);
}
// Non-numeric formats are not loosened by decimal equivalence.
assert.equal(context.isCorrect({type: 'money', answer: '47.70'}, {value: '47.7'}), false);
assert.equal(context.isCorrect({type: 'money', answer: '47.70'}, {value: '47.70'}), true);
console.log('19 place-value answer checks passed.');
