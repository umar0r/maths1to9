// Maths checks for the function-machines practice: every machine, reverse
// step, working line and forward check is recomputed for all difficulty levels.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { contentDir, loadScript, evaluate, close, wrongSums, allStrings } = require('./helpers/lessons.cjs');

const bank = loadScript(path.join(contentDir, 'function-machines-find-the-input-2', 'questions.js'), ['buildProblem', 'buildSteps']);
const SYMBOL = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
const INVERSE = { '+': '−', '−': '+', '×': '÷', '÷': '×' };

// Every difficulty level (question numbers 1–8) with many seeds.
const problems = [];
for (let level = 1; level <= 8; level++) {
    for (let seed = 1; seed <= 100; seed++) {
        bank.reseed(seed * 10 + level);
        const problem = bank.buildProblem(level);
        problems.push({ where: `level ${level}, seed ${seed * 10 + level}`, problem, steps: bank.buildSteps(problem) });
    }
}

test('each machine turns the input into the output', () => {
    for (const { where, problem } of problems) {
        let value = problem.input;
        problem.operations.forEach((operation, i) => {
            value = evaluate(`${value} ${SYMBOL[operation.type]} ${operation.value}`);
            assert.equal(value, problem.values[i + 1], `step ${i + 1} value is wrong (${where})`);
            assert.ok(Number.isInteger(value), `step ${i + 1} gives ${value}, not a whole number (${where})`);
        });
        assert.equal(value, problem.output, `(${where})`);
    }
});

test('every step has exactly one correct, distinct option', () => {
    for (const { where, steps } of problems) {
        for (const step of steps) {
            const labels = step.options.map(option => String(option).trim());
            assert.equal(new Set(labels).size, labels.length, `duplicate options ${JSON.stringify(step.options)} in "${step.prompt}" (${where})`);
            assert.equal(step.options.filter(option => option === step.answer).length, 1, `"${step.prompt}" (${where})`);
        }
    }
});

test('start at the output, undo each box in reverse order, and the working is right', () => {
    for (const { where, problem, steps } of problems) {
        const [start, ...rest] = steps;
        assert.equal(start.answer, String(problem.output), `start with the output (${where})`);
        const reverses = rest.filter(step => step.assessmentType === 'reverse-operation');
        const expectedOrder = [...problem.operations].reverse();
        assert.equal(reverses.length, expectedOrder.length, `one reverse step per box (${where})`);
        reverses.forEach((step, i) => {
            const machine = `${SYMBOL[expectedOrder[i].type]} ${expectedOrder[i].value}`;
            assert.equal(step.row.machine, machine, `boxes must be undone last-first (${where})`);
            assert.equal(step.answer, `${INVERSE[machine[0]]} ${expectedOrder[i].value}`, `${step.answer} does not reverse ${machine} (${where})`);
            assert.deepEqual(wrongSums(step.row.working), [], `working "${step.row.working}" is wrong (${where})`);
        });
        const last = reverses.at(-1).row.working;
        assert.equal(Number(last.split('=').at(-1)), problem.input, `working backwards should end at the input ${problem.input}: ${last} (${where})`);
    }
});

test('the forward check starts at the input, reaches the output, and wrong checks do not', () => {
    for (const { where, problem, steps } of problems) {
        const check = steps.find(step => step.assessmentType === 'check-forward');
        const chain = text => text.split(', then ').map(part => part.split(' = '));
        const correct = chain(check.answer);
        assert.equal(Number(correct[0][0].split(' ')[0]), problem.input, `(${where})`);
        assert.equal(Number(correct.at(-1)[1]), problem.output, `(${where})`);
        correct.forEach(([calculation, result]) => assert.ok(close(evaluate(calculation), Number(result)), `${calculation} ≠ ${result} (${where})`));
        for (const option of check.options.filter(option => option !== check.answer && option.includes(', then '))) {
            assert.notEqual(Number(chain(option)[0][0].split(' ')[0]), problem.input, `distractor also checks the right input: ${option} (${where})`);
        }
    }
});

test('numbers are tidy and use the proper minus sign', () => {
    for (const { where, steps } of problems) {
        for (const text of allStrings(steps)) {
            assert.doesNotMatch(text, /\d\.\d{9,}/, `untidy number in "${text}" (${where})`);
            assert.doesNotMatch(text, /(?:^|[\s(=])-\d/, `hyphen used as a minus sign in "${text}" (${where})`);
        }
    }
});
