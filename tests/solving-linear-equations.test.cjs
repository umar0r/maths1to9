// Maths checks for solving-linear-equations: worked examples are solved by
// substitution and the story examples in interactive.js are recomputed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { contentDir, read, readJson, evaluate, close } = require('./helpers/lessons.cjs');

const dir = path.join(contentDir, 'solving-linear-equations');
const lesson = readJson(path.join(dir, 'lesson.json'));

// The `const examples = [...]` array inside interactive.js.
function storyExamples() {
    const source = read(path.join(dir, 'interactive.js'));
    let i = source.indexOf('[', source.indexOf('const examples ='));
    const start = i;
    for (let depth = 0; i < source.length; i++) {
        if (source[i] === '[') depth++;
        else if (source[i] === ']' && --depth === 0) break;
    }
    return new Function(`return ${source.slice(start, i + 1)};`)();
}

test('worked examples: the answer satisfies the equation', () => {
    for (const example of lesson.worked_examples) {
        const [, equation] = example.title.match(/^Solve (.+)$/) ?? [];
        assert.ok(equation, `unexpected title "${example.title}"`);
        const [, letter, value] = example.answer.match(/^([a-z]) = (−?[\d.]+)$/);
        const [lhs, rhs] = equation.split('=');
        const vars = { [letter]: evaluate(value) };
        assert.ok(close(evaluate(lhs, vars), evaluate(rhs, vars)), `${example.answer} does not solve ${equation}`);
    }
});

test('story examples: fixed + rate × answer = total, and the text matches the numbers', () => {
    for (const example of storyExamples()) {
        assert.equal(example.fixed + example.coefficient * example.answer, example.total, `${example.id}: ${example.fixed} + ${example.coefficient} × ${example.answer} ≠ ${example.total}`);
        assert.ok(example.fixedDisplay.includes(String(example.fixed)), `${example.id}: fixedDisplay ${example.fixedDisplay}`);
        assert.ok(example.rateDisplay.includes(String(example.coefficient)), `${example.id}: rateDisplay ${example.rateDisplay}`);
        assert.ok(example.totalDisplay.includes(String(example.total)), `${example.id}: totalDisplay ${example.totalDisplay}`);
        assert.ok(example.question.includes(example.totalDisplay), `${example.id}: the question does not mention the total`);
        assert.ok(example.answerSentence.includes(String(example.answer)), `${example.id}: "${example.answerSentence}" does not give ${example.answer}`);
        assert.ok(example.equationStory.includes(`${example.coefficient}${example.variable}`), `${example.id}: the story should show ${example.coefficient}${example.variable}`);
    }
});
