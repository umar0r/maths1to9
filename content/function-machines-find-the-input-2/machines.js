(() => {
    'use strict';

    const practiceTypes = ['multiplyAdd', 'addMultiply', 'subtractMultiply', 'divideAdd', 'multiplySubtract', 'addDivide',
        'threeAddMultiplySubtract', 'threeSubtractMultiplyAdd'];
    const symbols = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
    const opposites = { add: 'subtract', subtract: 'add', multiply: 'divide', divide: 'multiply' };
    const formatNumber = value => String(value).replace(/-/g, '−');
    const operationLabel = operation => `${symbols[operation.type]} ${formatNumber(operation.value)}`;
    const operationWords = operation => `${{ add: 'adds', subtract: 'subtracts', multiply: 'multiplies by', divide: 'divides by' }[operation.type]} ${operation.value}`;
    function applyOperation(value, operation) {
        switch (operation.type) {
        case 'add': return value + operation.value;
        case 'subtract': return value - operation.value;
        case 'multiply': return value * operation.value;
        case 'divide': return value / operation.value;
        default: throw new Error(`Unknown machine operation: ${operation.type}`);
        }
    }
    const inverseOperation = operation => ({ type: opposites[operation.type], value: operation.value });
    const calculation = (value, operation) => `${formatNumber(value)} ${operationLabel(operation)} = ${formatNumber(applyOperation(value, operation))}`;
    function makeProblem(input, operations, type = 'reverse-operation') {
        const values = [input];
        for (const operation of operations) values.push(applyOperation(values.at(-1), operation));
        return { type, input, operations, values, output: values.at(-1), reverseValues: values.slice().reverse(),
            reverseOperations: operations.slice().reverse().map(inverseOperation) };
    }
    function reverseRows(problem) {
        return problem.reverseOperations.map((operation, index) => ({ operation, original: problem.operations.at(-1 - index),
            start: problem.reverseValues[index], result: problem.reverseValues[index + 1], working: calculation(problem.reverseValues[index], operation) }));
    }
    const follow = (start, operations) => operations.reduce(applyOperation, start);
    function wrongCandidates(problem) {
        const candidates = [];
        function add(value, feedback) {
            if (!Number.isFinite(value)) return;
            const integer = Math.round(value);
            if (Math.abs(value - integer) > 1e-8 || integer === problem.input || candidates.some(item => item.value === integer)) return;
            candidates.push({ value: integer, feedback });
        }
        add(follow(problem.output, problem.operations), 'That follows the original machine forwards from the output. Use the opposite operations and work backwards.');
        add(follow(problem.output, problem.operations.map(inverseOperation)), 'That uses opposite operations in the original order. Undo the last box first.');
        add(follow(problem.output, problem.operations.slice().reverse()), 'That reverses the box order but keeps the original operations. Change each operation to its opposite too.');
        add(problem.reverseValues.at(-2), 'That stops before the last backwards step. Keep going until you reach the input.');
        add(problem.output, 'That is the output. Use the backwards steps to find the input.');
        problem.reverseOperations.forEach((correct, index) => {
            for (const type of ['add', 'subtract', 'multiply', 'divide']) {
                if (type === correct.type) continue;
                const wrong = { type, value: correct.value };
                const operations = problem.reverseOperations.map((operation, i) => i === index ? wrong : operation);
                add(follow(problem.output, operations), `${operationLabel(wrong)} does not undo ${operationLabel(problem.operations.at(-1 - index))}. Use ${operationLabel(correct)} for that box.`);
            }
        });
        return candidates;
    }
    function numberQuestion({ problem, answer, prompt, wrong, feedback, mode = 'choice', type = problem.type, diagram }) {
        const seen = new Set([answer]), mistakes = wrong.filter(item => {
            if (seen.has(item.value)) return false;
            seen.add(item.value); return true;
        });
        const question = { questionType: type, prompt, model: { problem, answer, diagram }, feedback };
        if (mode === 'number') return { ...question, input: 'number', answer: formatNumber(answer), tolerance: 0,
            rules: mistakes.map(item => ({ value: formatNumber(item.value), feedback: item.feedback })),
            fallback: 'Start at the output. Use the opposite operation for the last box, then keep working backwards.' };
        if (mistakes.length < 3) throw new Error(`Missing machine mistakes for ${problem.type}`);
        return { ...question, input: 'choice', options: [{ label: formatNumber(answer), correct: true, feedback },
            ...mistakes.slice(0, 3).map(item => ({ label: formatNumber(item.value), correct: false, feedback: item.feedback }))] };
    }
    function inputQuestion(problem, mode = 'choice') {
        return numberQuestion({ problem, mode, answer: problem.input,
            prompt: `The machine ${problem.operations.map(operationWords).join(', then ')}. Its output is ${formatNumber(problem.output)}. Find the input.`,
            wrong: wrongCandidates(problem), feedback: `${reverseRows(problem).map(row => row.working).join('; ')}. The input is ${formatNumber(problem.input)}.`,
            diagram: { direction: 'backwards', known: 1, readonlyKnown: problem.values.length } });
    }
    function operationQuestion(problem, step) {
        const operation = problem.operations.at(-1 - step), inverse = inverseOperation(operation);
        return { input: 'choice', questionType: 'reverse-operation',
            prompt: `Working backwards, the next box to undo says ${operationLabel(operation)}. Which operation undoes it?`,
            model: { problem, backwardStep: step, inverse, diagram: { direction: 'forwards', knownIndices: [problem.operations.length] } },
            options: [inverse.type, ...['add', 'subtract', 'multiply', 'divide'].filter(type => type !== inverse.type)].map(type => ({
                label: operationLabel({ type, value: operation.value }), correct: type === inverse.type,
                feedback: type === inverse.type ? `${operationLabel(inverse)} undoes ${operationLabel(operation)}.`
                    : `${operationLabel({ type, value: operation.value })} does not undo ${operationLabel(operation)}. Use ${operationLabel(inverse)}.` })) };
    }
    function stepQuestion(problem, step) {
        const row = reverseRows(problem)[step];
        const wrong = ['add', 'subtract', 'multiply', 'divide'].filter(type => type !== row.operation.type)
            .map(type => ({ value: applyOperation(row.start, { type, value: row.operation.value }),
                feedback: `That uses ${operationLabel({ type, value: row.operation.value })}. This step needs ${operationLabel(row.operation)}.` }))
            .filter(item => Number.isInteger(item.value));
        wrong.push({ value: row.start, feedback: 'That is the number before this backwards step. Carry out the operation.' });
        return numberQuestion({ problem, mode: 'number', type: 'reverse-operation', answer: row.result,
            prompt: `Work out ${formatNumber(row.start)} ${operationLabel(row.operation)}. What number do you reach?`, wrong, feedback: row.working,
            diagram: { direction: 'backwards', known: step + 1, readonlyKnown: step + 2, knownOperations: step + 1 } });
    }
    function forwardChain(input, operations) {
        let current = input;
        return operations.map(operation => { const line = calculation(current, operation); current = applyOperation(current, operation); return line; }).join(', then ');
    }
    function checkQuestion(problem) {
        const changed = problem.operations.map((operation, index) => index === 0 ? inverseOperation(operation) : operation);
        const correct = forwardChain(problem.input, problem.operations);
        return { input: 'choice', questionType: 'check-forward', prompt: `Which calculation checks that the input is ${formatNumber(problem.input)}?`,
            model: { problem, diagram: { direction: 'forwards', knownIndices: [0, problem.operations.length], readonlyKnown: problem.values.length } },
            options: [{ label: correct, correct: true, feedback: `That follows the original boxes from ${formatNumber(problem.input)} and reaches ${formatNumber(problem.output)}.` },
                { label: forwardChain(problem.output, problem.operations), correct: false, feedback: 'That starts at the output. A forwards check must start with the input you found.' },
                { label: forwardChain(problem.input, changed), correct: false, feedback: 'That changes the first operation. Use the original machine for the forwards check.' },
                { label: forwardChain(problem.input, problem.operations.slice().reverse()), correct: false, feedback: 'That uses the original boxes in the wrong order. A forwards check follows them from left to right.' }] };
    }

    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type, mode: index % 2 ? 'number' : 'choice',
            seed: E.randomInt(0, 4294967295, random) }));
    }
    function problemFor(type, random) {
        const E = window.Maths1to9LessonEngine, integer = (a, b) => E.randomInt(a, b, random);
        let input, operations;
        if (type === 'multiplyAdd') { input = integer(2, 7); operations = [{ type: 'multiply', value: 2 }, { type: 'add', value: integer(3, 7) }]; }
        else if (type === 'addMultiply') { input = integer(2, 8); operations = [{ type: 'add', value: integer(2, 6) }, { type: 'multiply', value: 3 }]; }
        else if (type === 'subtractMultiply') { input = integer(8, 15); operations = [{ type: 'subtract', value: integer(2, 6) }, { type: 'multiply', value: 2 }]; }
        else if (type === 'divideAdd') {
            const divisor = integer(2, 4); input = divisor * integer(3, 8); operations = [{ type: 'divide', value: divisor }, { type: 'add', value: integer(4, 8) }];
        } else if (type === 'multiplySubtract') { input = integer(3, 9); operations = [{ type: 'multiply', value: integer(3, 5) }, { type: 'subtract', value: integer(4, 9) }]; }
        else if (type === 'addDivide') {
            const divisor = integer(2, 4); input = divisor * integer(4, 9); operations = [{ type: 'add', value: divisor * integer(1, 3) }, { type: 'divide', value: divisor }];
        } else if (type === 'threeAddMultiplySubtract') {
            input = integer(2, 7); operations = [{ type: 'add', value: integer(2, 5) }, { type: 'multiply', value: 3 }, { type: 'subtract', value: integer(4, 9) }];
        } else if (type === 'threeSubtractMultiplyAdd') {
            input = integer(7, 14); operations = [{ type: 'subtract', value: integer(2, 5) }, { type: 'multiply', value: 4 }, { type: 'add', value: integer(5, 11) }];
        } else throw new Error(`Unknown machine pattern: ${type}`);
        return makeProblem(input, operations, type);
    }
    const generate = (item, random) => inputQuestion(problemFor(item.type, random), item.mode || 'choice');
    const guidedProblem = () => makeProblem(10, [{ type: 'subtract', value: 3 }, { type: 'multiply', value: 4 }], 'subtractMultiply');
    function examples() {
        const problem = guidedProblem();
        const start = numberQuestion({ problem, type: 'identify-output', answer: problem.output,
            prompt: 'Find the missing input. Which number do you start with?',
            wrong: [{ value: 4, feedback: '4 is the last multiplier. Start with the output number.' },
                { value: 3, feedback: '3 is the amount subtracted in the first box. Start with the output.' },
                { value: 25, feedback: 'That subtracts 3 from the output. First identify the output itself.' }],
            feedback: 'Start at 28 because 28 is the output.', diagram: { direction: 'forwards', knownIndices: [2] } });
        return [start, operationQuestion(problem, 0), stepQuestion(problem, 0), operationQuestion(problem, 1), stepQuestion(problem, 1), checkQuestion(problem),
            inputQuestion(makeProblem(9, [{ type: 'multiply', value: 2 }, { type: 'add', value: 7 }], 'multiplyAdd'), 'number'),
            inputQuestion(makeProblem(6, [{ type: 'add', value: 4 }, { type: 'multiply', value: 3 }, { type: 'subtract', value: 5 }], 'threeAddMultiplySubtract'), 'number')];
    }
    function checks() {
        return [inputQuestion(makeProblem(9, [{ type: 'multiply', value: 2 }, { type: 'add', value: 7 }], 'multiplyAdd'), 'number'),
            inputQuestion(makeProblem(3, [{ type: 'add', value: 4 }, { type: 'multiply', value: 3 }], 'addMultiply')),
            inputQuestion(makeProblem(15, [{ type: 'subtract', value: 7 }, { type: 'multiply', value: 3 }], 'subtractMultiply'), 'number'),
            inputQuestion(makeProblem(12, [{ type: 'divide', value: 3 }, { type: 'add', value: 5 }], 'divideAdd')),
            inputQuestion(makeProblem(6, [{ type: 'add', value: 4 }, { type: 'multiply', value: 3 }, { type: 'subtract', value: 5 }], 'threeAddMultiplySubtract'), 'number')];
    }

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function drawMachine(host, problem, diagram = {}, readOnly = false) {
        const backwards = diagram.direction === 'backwards', values = backwards ? problem.reverseValues : problem.values;
        const operations = backwards ? problem.reverseOperations : problem.operations;
        const known = readOnly && diagram.readonlyKnown !== undefined ? diagram.readonlyKnown : diagram.known || 0;
        const figure = element('figure', '', 'fm-picture');
        figure.append(element('figcaption', backwards ? 'Backwards: start at the output' : 'Forwards: input to output', 'fm-caption'));
        const chain = element('div', '', `fm-chain${backwards ? ' fm-chain--backwards' : ''}`);
        values.forEach((value, index) => {
            const shown = diagram.showAll || index < known || (diagram.knownIndices || []).includes(index);
            const box = element('div', '', 'fm-box fm-value');
            const label = index === 0 ? backwards ? 'Output' : 'Input' : index === values.length - 1 ? backwards ? 'Input' : 'Output' : 'Between boxes';
            box.append(element('span', label), element('strong', shown ? formatNumber(value) : '?')); chain.append(box);
            if (index < operations.length) {
                const arrow = element('span', '', 'fm-arrow'); arrow.setAttribute('aria-hidden', 'true');
                const operationText = backwards && diagram.knownOperations !== undefined && index >= diagram.knownOperations
                    ? `Undo ${operationLabel(problem.operations.at(-1 - index))}` : operationLabel(operations[index]);
                const operation = element('div', operationText, 'fm-box fm-operation');
                const nextArrow = arrow.cloneNode(true); chain.append(arrow, operation, nextArrow);
            }
        });
        figure.append(chain); host.append(figure);
    }
    const learnScreens = [
        { title: 'A machine changes a number', lines: ['A function machine follows a number rule. The input is the number going in. The output is the number coming out.',
            'Here 4 goes in. The machine adds 3. The output is 7, because 4 + 3 = 7.'], maths: ['4 + 3 = 7'], input: 4, operations: [{ type: 'add', value: 3 }], direction: 'forwards' },
        { title: 'Follow the boxes in order', lines: ['This machine adds 4, then multiplies by 3. Start with an input of 3.',
            'First, 3 + 4 = 7. Then 7 × 3 = 21. The output is 21. Follow the boxes from input to output.'], maths: ['3 + 4 = 7', '7 × 3 = 21'],
        input: 3, operations: [{ type: 'add', value: 4 }, { type: 'multiply', value: 3 }], direction: 'forwards' },
        { title: 'Use the opposite operation to undo a box', lines: ['Adding and subtracting undo each other. Multiplying and dividing undo each other.',
            'Subtract 4 to undo + 4. Add 4 to undo − 4. Divide by 3 to undo × 3. Multiply by 3 to undo ÷ 3.',
            'These are called inverse operations. Inverse means opposite here.'], maths: ['+ 4 and − 4', '× 3 and ÷ 3'], pairs: [['+ 4', '− 4'], ['× 3', '÷ 3']] },
        { title: 'Undo the last box first', lines: ['When the input is missing, start at the output. Use opposite operations in reverse order.',
            'For the output 21, undo the last box, × 3, first: 21 ÷ 3 = 7.',
            'Then undo + 4: 7 − 4 = 3. Both the operation and the order change. The input is 3.'], maths: ['21 ÷ 3 = 7', '7 − 4 = 3'],
        input: 3, operations: [{ type: 'add', value: 4 }, { type: 'multiply', value: 3 }], direction: 'backwards', paired: true },
        { title: 'Undo adding, then undo multiplying', lines: ['The machine multiplies by 2, then adds 7. Its output is 25.',
            'Work backwards: 25 − 7 = 18, then 18 ÷ 2 = 9. The input is 9.', 'Check forwards: 9 × 2 = 18, then 18 + 7 = 25.'],
        maths: ['25 − 7 = 18', '18 ÷ 2 = 9', '9 × 2 = 18', '18 + 7 = 25'], input: 9, operations: [{ type: 'multiply', value: 2 }, { type: 'add', value: 7 }], direction: 'backwards' },
        { title: 'Undo subtraction with addition', lines: ['The machine subtracts 7, then multiplies by 3. Its output is 24.',
            'Undo the last box first: 24 ÷ 3 = 8. Then undo − 7: 8 + 7 = 15.', 'The input is 15. Check: 15 − 7 = 8, then 8 × 3 = 24.'],
        maths: ['24 ÷ 3 = 8', '8 + 7 = 15', '15 − 7 = 8', '8 × 3 = 24'], input: 15, operations: [{ type: 'subtract', value: 7 }, { type: 'multiply', value: 3 }], direction: 'backwards' },
        { title: 'Undo division with multiplication', lines: ['The machine divides by 3, then adds 5. Its output is 9.',
            'Work backwards: 9 − 5 = 4, then 4 × 3 = 12. The input is 12.', 'Check: 12 ÷ 3 = 4, then 4 + 5 = 9.'],
        maths: ['9 − 5 = 4', '4 × 3 = 12', '12 ÷ 3 = 4', '4 + 5 = 9'], input: 12, operations: [{ type: 'divide', value: 3 }, { type: 'add', value: 5 }], direction: 'backwards' },
        { title: 'Work backwards through three boxes', lines: ['The machine adds 4, multiplies by 3, then subtracts 5. Its output is 25.',
            'Undo − 5: 25 + 5 = 30. Undo × 3: 30 ÷ 3 = 10. Undo + 4: 10 − 4 = 6.',
            'The input is 6. Check forwards: 6 + 4 = 10, then 10 × 3 = 30, then 30 − 5 = 25.'],
        maths: ['25 + 5 = 30', '30 ÷ 3 = 10', '10 − 4 = 6', '6 + 4 = 10', '10 × 3 = 30', '30 − 5 = 25'],
        input: 6, operations: [{ type: 'add', value: 4 }, { type: 'multiply', value: 3 }, { type: 'subtract', value: 5 }], direction: 'backwards' },
        { title: 'Change both the operations and their order', lines: ['For × 2 then + 6 with output 20, the correct backwards steps are 20 − 6 = 14, then 14 ÷ 2 = 7.',
            'Using opposite operations in the original order gives 20 ÷ 2 − 6 = 4. That is the wrong input.',
            'Reversing only the order gives (20 + 6) × 2 = 52. Going forwards from 20 gives 20 × 2 + 6 = 46. Start at the output and undo the last box first.'],
        maths: ['20 − 6 = 14', '14 ÷ 2 = 7', '20 ÷ 2 − 6 = 4', '(20 + 6) × 2 = 52', '20 × 2 + 6 = 46'],
        input: 7, operations: [{ type: 'multiply', value: 2 }, { type: 'add', value: 6 }], direction: 'backwards' }
    ];
    function drawLearn(host, index) {
        const screen = learnScreens[index];
        if (screen.pairs) {
            const group = element('div', '', 'fm-inverse-pairs');
            for (const [forward, backward] of screen.pairs) group.append(element('p', `${forward} is undone by ${backward}`), element('p', `${backward} is undone by ${forward}`));
            host.append(group); return;
        }
        const problem = makeProblem(screen.input, screen.operations);
        if (screen.paired) drawMachine(host, problem, { direction: 'forwards', showAll: true });
        drawMachine(host, problem, { direction: screen.direction, showAll: true });
    }
    function prepare(question, random) {
        const prepared = question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
        prepared.figure = (host, { readOnly }) => drawMachine(host, question.model.problem, question.model.diagram, readOnly);
        return prepared;
    }
    window.FunctionMachines = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn, drawMachine,
        makeProblem, problemFor, applyOperation, inverseOperation, operationLabel, operationWords, calculation, reverseRows, wrongCandidates,
        inputQuestion, operationQuestion, stepQuestion, checkQuestion, forwardChain, formatNumber };
})();
