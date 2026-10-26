(() => {
    'use strict';

    const practiceTypes = ['add', 'subtract', 'multiply', 'divide', 'twoStepAdd', 'twoStepSubtract', 'brackets', 'bracketsAndAdd', 'costStory'];
    const numberText = value => String(value).replace(/-/g, '−');
    const signed = value => value === 0 ? '' : ` ${value < 0 ? '−' : '+'} ${Math.abs(value)}`;
    const term = (coefficient, letter = 'x') => coefficient === 1 ? letter : coefficient === -1 ? `−${letter}` : `${numberText(coefficient)}${letter}`;
    const linearText = (coefficient, constant, letter = 'x') => term(coefficient, letter) + signed(constant);
    function equationModel(type, params) {
        const letter = params.letter || 'x';
        let coefficient = 1, constant = 0, divisor = 1, left;
        if (type === 'add') constant = params.amount;
        else if (type === 'subtract') constant = -params.amount;
        else if (type === 'multiply') coefficient = params.coefficient;
        else if (type === 'divide') divisor = params.divisor;
        else if (type === 'twoStepAdd' || type === 'costStory') { coefficient = params.coefficient; constant = params.amount; }
        else if (type === 'twoStepSubtract') { coefficient = params.coefficient; constant = -params.amount; }
        else if (type === 'brackets' || type === 'bracketsAndAdd') { coefficient = params.outer; constant = params.outer * params.inner + (params.extra || 0); }
        else throw new Error(`Unknown equation type: ${type}`);
        if (type === 'divide') left = `${letter} ÷ ${divisor}`;
        else if (type === 'brackets' || type === 'bracketsAndAdd') left = `${params.outer}(${letter}${signed(params.inner)})${signed(params.extra || 0)}`;
        else if (type === 'costStory') left = `${params.amount} + ${term(coefficient, letter)}`;
        else left = linearText(coefficient, constant, letter);
        const total = params.total, solution = (total * divisor - constant) / coefficient;
        const model = { type, params: { ...params }, letter, coefficient, constant, divisor, total, solution, left,
            equation: `${left} = ${numberText(total)}`, context: params.context || '', unit: params.unit || '' };
        model.steps = methodSteps(model);
        const value = solution < 0 ? `(${numberText(solution)})` : numberText(solution);
        let checkLeft = coefficient === 1 ? value + signed(constant) : `${numberText(coefficient)} × ${value}${signed(constant)}`;
        if (type === 'divide') checkLeft = `${value} ÷ ${divisor}`;
        if (type === 'costStory') checkLeft = `${constant} + ${coefficient} × ${value}`;
        if (type === 'brackets' || type === 'bracketsAndAdd') checkLeft = `${params.outer} × (${value}${signed(params.inner)})${signed(params.extra || 0)}`;
        model.check = `${checkLeft} = ${numberText(total)}`;
        return model;
    }
    function methodSteps(model) {
        const steps = [], { coefficient: a, constant: b, divisor: d, total: c, letter } = model;
        if (model.type === 'brackets' || model.type === 'bracketsAndAdd') {
            const expanded = term(a, letter) + signed(model.params.outer * model.params.inner) + signed(model.params.extra || 0);
            steps.push({ instruction: 'Multiply every term inside the brackets by the number outside.', equation: `${expanded} = ${numberText(c)}` });
            if (model.params.extra) steps.push({ instruction: 'Collect the number terms.', equation: `${linearText(a, b, letter)} = ${numberText(c)}` });
        }
        if (d !== 1) steps.push({ instruction: `Multiply both sides by ${d}.`, equation: `${letter} = ${numberText(c)} × ${d}` });
        else {
            if (b !== 0) steps.push({ instruction: `${b > 0 ? 'Subtract' : 'Add'} ${Math.abs(b)} ${b > 0 ? 'from' : 'to'} both sides.`,
                equation: `${term(a, letter)} = ${numberText(c - b)}` });
            if (a !== 1) steps.push({ instruction: `Divide both sides by ${a}.`, equation: `${letter} = ${numberText(c - b)} ÷ ${a}` });
        }
        const finalEquation = `${letter} = ${numberText(model.solution)}`;
        if (steps.at(-1)?.equation !== finalEquation) steps.push({ instruction: 'This is the value of the unknown.', equation: finalEquation });
        return steps;
    }
    function wrongAnswers(model) {
        const { coefficient: a, constant: b, divisor: d, total: c, solution } = model;
        const result = [];
        function add(value, feedback, fractionLabel = null) {
            if (!Number.isFinite(value)) return;
            const integer = Math.round(value), whole = Math.abs(value - integer) < 1e-8;
            if (!whole && fractionLabel === null) return;
            const numeric = whole ? integer : value;
            if (numeric === solution || result.some(item => item.value === numeric)) return;
            result.push({ value: numeric, label: whole ? numberText(integer) : fractionLabel, feedback });
        }
        if (model.type === 'brackets' || model.type === 'bracketsAndAdd') {
            const numerator = c - model.params.inner - (model.params.extra || 0);
            add(numerator / model.params.outer, 'That multiplies only the letter inside the brackets. Multiply every term inside by the outside number.', `${numberText(numerator)}/${model.params.outer}`);
        }
        if (d !== 1) {
            add(c / d, `That divides by ${d} again. Undo division by multiplying both sides by ${d}.`, `${numberText(c)}/${d}`);
            add(c + d, 'That adds the number after ÷. Multiplication is the opposite of division.');
            add(c - d, 'That subtracts the number after ÷. Multiplication is the opposite of division.');
            add(c, 'That leaves the right side unchanged. Multiply both sides, not just the left.');
            add(d - c, 'That subtracts in the wrong order instead of undoing the division.');
        } else {
            if (b !== 0) {
                add(c / a, 'That removes the fixed number from only the left side. Do the same thing to both sides.');
                add((c + b) / a, 'That keeps the original sign of the fixed number. Undo it with the opposite operation on both sides.');
                add(c / a - b, 'That divides the letter term and the right side, but leaves the fixed number unchanged. A whole side must be treated the same way.');
            }
            if (a !== 1) {
                add(c - b, `That finds ${term(a, model.letter)}, not ${model.letter}. Divide by ${a} too.`);
                add((c - b) * a, `That multiplies by ${a}. Undo ${term(a, model.letter)} by dividing both sides by ${a}.`);
            }
            if (b !== 0) {
                add(c + b, 'That uses the original operation on the fixed number. Use its opposite, then finish solving.');
                add(b - c, 'That subtracts in the wrong order. Start from the right side and undo the fixed number.');
                add(c * b, 'That multiplies the fixed number instead of undoing its addition or subtraction.');
                add(c / b, 'That divides by the fixed number instead of undoing its addition or subtraction.');
            }
            if (a !== 1) {
                add(c - a, 'That subtracts the number in front of the letter. Multiplication is undone by division.');
                add(c + a, 'That adds the number in front of the letter. Multiplication is undone by division.');
                add(-(c - b), 'That changes the sign of the whole result and leaves the multiplication undone. Keep the signs and divide by the number in front of the letter.');
            }
            add(c, 'That copies the right side without undoing the operation on the unknown.');
        }
        return result;
    }
    function solveQuestion(model, mode = 'choice') {
        const prompt = `${model.context ? model.context + ' ' : ''}Solve ${model.equation}.${model.unit ? ` Give the number of ${model.unit}.` : ''}`;
        const feedback = `${model.steps.map(step => step.equation).join('; ')}. Check: ${model.check}.`;
        const wrong = wrongAnswers(model);
        const question = { questionType: model.type, prompt, model, task: 'solve', feedback };
        if (mode === 'number') return { ...question, input: 'number', answer: numberText(model.solution), fractions: true, tolerance: 0,
            rules: wrong.map(item => ({ value: item.label, feedback: item.feedback })),
            fallback: 'Expand any brackets first. Then use opposite operations on both sides to get the letter on its own.' };
        if (wrong.length < 3) throw new Error(`Missing equation mistakes for ${model.equation}`);
        return { ...question, input: 'choice', options: [{ label: numberText(model.solution), correct: true, feedback },
            ...wrong.slice(0, 3).map(item => ({ label: item.label, correct: false, feedback: item.feedback }))] };
    }

    const stories = [
        { id: 'taxi', title: 'Taxi fare', fixed: 3, coefficient: 2, total: 17, unit: 'miles', context: 'A taxi charges £3, plus £2 for each mile. The total fare is £17. Let x be the miles travelled.' },
        { id: 'phone', title: 'Mobile plan', fixed: 5, coefficient: 3, total: 20, unit: 'extra gigabytes', context: 'A phone plan costs £5, plus £3 for each extra gigabyte. The bill is £20. Let x be the extra gigabytes used.' },
        { id: 'savings', title: 'Weekly savings', fixed: 8, coefficient: 4, total: 28, unit: 'weeks', context: 'A jar starts with £8. You save £4 each week until it holds £28. Let x be the number of weeks.' },
        { id: 'repair', title: 'Repair invoice', fixed: 10, coefficient: 6, total: 34, unit: 'hours', context: 'A repair costs a £10 call-out fee, plus £6 for each hour. The invoice is £34. Let x be the hours worked.' }
    ];
    const storyModel = story => equationModel('costStory', { coefficient: story.coefficient, amount: story.fixed, total: story.total, context: story.context, unit: story.unit, storyId: story.id });
    function storyEquationQuestion() {
        const model = storyModel(stories[0]);
        return { input: 'choice', questionType: 'storyEquation', task: 'formEquation', model,
            prompt: `${model.context} Which equation matches the story?`,
            options: [{ label: '3 + 2x = 17', correct: true, feedback: 'The fixed £3 is added once. The miles cost 2x pounds.' },
                { label: '3x + 2 = 17', correct: false, feedback: 'That swaps the fixed charge and the cost per mile.' },
                { label: '2(x + 3) = 17', correct: false, feedback: 'That charges the fixed £3 more than once. Add it once after the mileage cost.' },
                { label: '3 + 2 + x = 17', correct: false, feedback: 'Each mile costs £2, so x miles cost 2x, not 2 + x.' }] };
    }
    function undoQuestion() {
        const model = storyModel(stories[0]);
        return { input: 'choice', questionType: 'undoBoth', task: 'undoConstant', model,
            prompt: 'In 3 + 2x = 17, which step removes the added 3 while keeping both sides equal?',
            options: [{ label: 'Subtract 3 from both sides.', correct: true, feedback: 'Both sides lose 3, so the equation stays balanced.' },
                { label: 'Subtract 3 from the left side only.', correct: false, feedback: 'That changes one side without changing the other. It breaks the balance.' },
                { label: 'Add 3 to both sides.', correct: false, feedback: 'Adding 3 does not undo the added 3. Subtract 3 from both sides.' },
                { label: 'Divide both sides by 3.', correct: false, feedback: 'Division does not undo an added 3. Use subtraction.' }] };
    }
    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type, mode: index % 2 ? 'number' : 'choice', seed: E.randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const E = window.Maths1to9LessonEngine, integer = (a, b) => E.randomInt(a, b, random);
        let params, a = 1, b = 0;
        if (item.type === 'add' || item.type === 'subtract') { params = { amount: integer(1, 15) }; b = item.type === 'add' ? params.amount : -params.amount; }
        else if (item.type === 'multiply') { params = { coefficient: integer(2, 8) }; a = params.coefficient; }
        else if (item.type === 'divide') { params = { divisor: integer(2, 8), total: [...Array.from({ length: 6 }, (_, i) => i - 6), ...Array.from({ length: 10 }, (_, i) => i + 1)][integer(0, 15)] }; }
        else if (item.type === 'twoStepAdd' || item.type === 'twoStepSubtract' || item.type === 'costStory') {
            params = { coefficient: integer(2, 6), amount: integer(1, 15) }; a = params.coefficient; b = item.type === 'twoStepSubtract' ? -params.amount : params.amount;
        } else if (item.type === 'brackets' || item.type === 'bracketsAndAdd') {
            const choices = [-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8];
            params = { outer: integer(2, 6), inner: choices[integer(0, choices.length - 1)], extra: item.type === 'bracketsAndAdd' ? integer(1, 9) : 0 };
            a = params.outer; b = a * params.inner + params.extra;
        } else throw new Error(`Unknown equation generator: ${item.type}`);
        if (item.type !== 'divide') {
            let solutions = [...Array.from({ length: 8 }, (_, i) => i - 8), ...Array.from({ length: 12 }, (_, i) => i + 1)].filter(x => a * x + b !== 0);
            if (item.type === 'costStory') solutions = solutions.filter(x => x > 0);
            const solution = solutions[integer(0, solutions.length - 1)]; params.total = a * solution + b;
            if (item.type === 'costStory') { params.unit = 'hours'; params.context = `A hire costs £${params.amount}, plus £${params.coefficient} for each hour. The total is £${params.total}. Let x be the hours hired.`; }
        }
        return solveQuestion(equationModel(item.type, params), item.mode || 'choice');
    }
    function examples() {
        return [storyEquationQuestion(), undoQuestion(), solveQuestion(equationModel('multiply', { coefficient: 2, total: 14 }), 'number'),
            solveQuestion(storyModel(stories[1]), 'number'), solveQuestion(storyModel(stories[2])), solveQuestion(storyModel(stories[3]), 'number'),
            solveQuestion(equationModel('brackets', { outer: 3, inner: 2, total: 21 })), solveQuestion(equationModel('divide', { divisor: 4, total: 3 }), 'number')];
    }
    function checks() {
        return [solveQuestion(equationModel('subtract', { amount: 12, total: -3 }), 'number'),
            solveQuestion(equationModel('twoStepAdd', { coefficient: 3, amount: 1, total: 7 })),
            solveQuestion(equationModel('twoStepAdd', { coefficient: 5, amount: 17, total: 32 }), 'number'),
            solveQuestion(equationModel('brackets', { outer: 3, inner: 2, total: 21 })),
            solveQuestion(equationModel('bracketsAndAdd', { outer: 2, inner: -3, extra: 4, total: 14 }), 'number')];
    }
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function drawBalance(host, left, right, caption = '') {
        const figure = element('figure', '', 'eq-balance');
        const pans = element('div', '', 'eq-pans'); pans.setAttribute('role', 'img'); pans.setAttribute('aria-label', `Balanced equation: ${left} equals ${right}`);
        const leftPan = element('div', left, 'eq-pan'), equals = element('strong', '=', 'eq-equals'), rightPan = element('div', right, 'eq-pan');
        pans.append(leftPan, equals, rightPan);
        const beam = element('div', '', 'eq-beam'), stand = element('div', '', 'eq-stand');
        beam.setAttribute('aria-hidden', 'true'); stand.setAttribute('aria-hidden', 'true');
        figure.append(pans, beam, stand);
        if (caption) figure.append(element('figcaption', caption, 'eq-caption'));
        host.append(figure);
    }
    const learnScreens = [
        { title: 'An equation keeps two amounts equal', lines: ['A taxi charges £3, plus £2 for each mile. The fare is £17. Let m be the miles travelled.',
            'The equation 3 + 2m = 17 says the two sides have the same value. An equation has an equals sign.',
            'Solving means finding the unknown number. The letter m is the unknown here. Other equations often use x. The balance picture shows the two equal sides.'],
        maths: ['3 + 2m = 17'], balances: [['3 + 2m', '17']] },
        { title: 'Do the same thing to both sides', lines: ['Start with 3 + 2m = 17. Subtract 3 from both sides to keep them equal. This leaves 2m = 14.',
            '2m means 2 × m. Divide both sides by 2 to get m = 7.',
            'Check in the original equation: 3 + 2 × 7 = 17. The journey was 7 miles. Removing an amount from only one side would break the balance.'],
        maths: ['3 + 2m = 17', '2m = 14', 'm = 7', '3 + 2 × 7 = 17'], balances: [['2m', '14'], ['m', '7']] },
        { title: 'Undo addition or subtraction', lines: ['Use the opposite operation on both sides. For x + 5 = 12, subtract 5 from both sides. This gives x = 7.',
            'For b − 12 = −3, add 12 to both sides. Then b = −3 + 12 = 9.',
            'Check: 9 − 12 = −3. Keep a minus sign with its number.'],
        maths: ['x + 5 = 12', 'x = 7', 'b − 12 = −3', 'b = −3 + 12 = 9', '9 − 12 = −3'], balances: [['x + 5', '12'], ['b − 12', '−3']] },
        { title: 'Undo multiplication or division', lines: ['For 4x = 20, divide both sides by 4. This gives x = 5.',
            'For x ÷ 3 = 4, multiply both sides by 3. This gives x = 12.',
            'Multiplication and division undo each other. Whatever you do, apply it to both whole sides.'],
        maths: ['4x = 20', 'x = 5', 'x ÷ 3 = 4', 'x = 12'], balances: [['4x', '20'], ['x ÷ 3', '4']] },
        { title: 'Undo the added number, then the multiplication', lines: ['Solve 3x + 1 = 7. Subtract 1 from both sides to get 3x = 6.',
            'Then divide both sides by 3. The answer is x = 2.',
            'Check: 3 × 2 + 1 = 7. This method undoes the added number before the multiplication.'],
        maths: ['3x + 1 = 7', '3x = 6', 'x = 2', '3 × 2 + 1 = 7'], balances: [['3x + 1', '7'], ['3x', '6']] },
        { title: 'Keep the sign when undoing a fixed number', lines: ['For 5c + 17 = 32, subtract 17 from both sides: 5c = 15. Divide both sides by 5 to get c = 3.',
            'For 2x − 3 = 11, the 3 is subtracted. Undo it by adding 3 to both sides: 2x = 14. Then divide by 2 to get x = 7.',
            'The opposite of adding is subtracting. The opposite of subtracting is adding.'],
        maths: ['5c + 17 = 32', '5c = 15', 'c = 3', '2x − 3 = 11', '2x = 14', 'x = 7'], balances: [['5c', '15'], ['2x', '14']] },
        { title: 'An answer can be negative', lines: ['Solve 3x + 4 = −2. Subtract 4 from both sides: 3x = −6.',
            'Divide both sides by 3: x = −2. Keep the minus sign.',
            'Check: 3 × (−2) + 4 = −2. Put the negative value in brackets when checking.'],
        maths: ['3x + 4 = −2', '3x = −6', 'x = −2', '3 × (−2) + 4 = −2'], balances: [['3x', '−6'], ['x', '−2']] },
        { title: 'Multiply every part inside brackets', lines: ['Solve 3(x + 2) = 21. A term is a part separated from another part by + or −. Expanding brackets means multiplying the outside number by every term inside.',
            '3 × x = 3x and 3 × 2 = 6, so 3x + 6 = 21. Do not leave the 2 unchanged.',
            'Subtract 6 from both sides: 3x = 15. Divide by 3: x = 5. Check: 3 × (5 + 2) = 21.'],
        maths: ['3(x + 2) = 21', '3x + 6 = 21', '3x = 15', 'x = 5', '3 × (5 + 2) = 21'], balances: [['3(x + 2)', '21'], ['3x + 6', '21']] },
        { title: 'Expand, collect, then solve', lines: ['Solve 2(x − 3) + 4 = 14. Multiply both terms inside by 2: 2x − 6 + 4 = 14.',
            'Collect the numbers: −6 + 4 = −2. Now 2x − 2 = 14. Add 2 to both sides to get 2x = 16.',
            'Divide both sides by 2: x = 8. Check: 2 × (8 − 3) + 4 = 14. The minus sign stayed with the 3 when the brackets were expanded.'],
        maths: ['2(x − 3) + 4 = 14', '2x − 6 + 4 = 14', '−6 + 4 = −2', '2x − 2 = 14', '2x = 16', 'x = 8', '2 × (8 − 3) + 4 = 14'], balances: [['2x − 2', '14'], ['2x', '16']] },
        { title: 'Treat every term on a side the same way', lines: ['For 2x + 6 = 18, a simple method is to subtract 6 from both sides first. Then 2x = 12, so x = 6.',
            'You can divide first, but then every term must be divided. Dividing both whole sides by 2 gives x + 3 = 9, not x + 6 = 9.',
            'Changing only some terms breaks the balance. Check a solution in the original equation: 2 × 6 + 6 = 18.'],
        maths: ['2x + 6 = 18', '2x = 12', 'x = 6', 'x + 3 = 9', '2 × 6 + 6 = 18'], balances: [['2x + 6', '18'], ['x + 3', '9']] }
    ];
    function drawLearn(host, index) {
        for (const [left, right] of learnScreens[index].balances) drawBalance(host, left, right);
    }
    function prepare(question, random) {
        const prepared = question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
        if (question.task !== 'formEquation') prepared.figure = host => drawBalance(host, question.model.left, numberText(question.model.total));
        return prepared;
    }
    const evaluateLeft = (model, value) => (model.coefficient * value + model.constant) / model.divisor;
    window.LinearEquations = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn, drawBalance,
        equationModel, methodSteps, wrongAnswers, solveQuestion, storyEquationQuestion, undoQuestion, stories, storyModel,
        numberText, signed, term, linearText, evaluateLeft };
})();
