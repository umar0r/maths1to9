const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wrongSums } = require('./helpers/lessons.cjs');

test('written sums recognise complete fraction results and equivalent fraction calculations', () => {
    for (const text of ['Right. 6 ÷ 4 = 3/2, or 1.5.', '3 ÷ 6 = 1/2.',
        '4 ÷ 8 = 1/2.', '2/4 = 1/2.', '−6 ÷ 4 = −3/2.']) {
        assert.deepEqual(wrongSums(text), [], text);
    }
});

test('written sums still reject incorrect fraction and ordinary calculations', () => {
    for (const text of ['6 ÷ 4 = 3/3.', '2/4 = 1/3.', '−6 ÷ 4 = 3/2.',
        '3 × 2 + 1 = 8.', '−4 + 9 = 6.']) {
        assert.equal(wrongSums(text).length, 1, text);
    }
});
