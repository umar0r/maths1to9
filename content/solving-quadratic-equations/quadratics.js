(() => {
    'use strict';

    const E = () => window.Maths1to9LessonEngine;
    const numberText = value => String(value).replace('-', '−');
    function term(value, suffix = '') {
        if (value === 0) return '';
        const size = Math.abs(value);
        return ` ${value < 0 ? '−' : '+'} ${size === 1 && suffix ? '' : size}${suffix}`;
    }
    const polynomial = (b, c) => `x²${term(b, 'x')}${term(c)}`;
    const factor = root => root === 0 ? 'x' : `x${term(-root)}`;
    const factorised = roots => roots.map(root => root === 0 ? 'x' : `(${factor(root)})`).join('');
    const pairText = roots => roots.map(root => `x = ${numberText(root)}`).join(' or ');
    const samePair = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => v === [...b].sort((x, y) => x - y)[i]);

    function model(type, roots, shift = 0) {
        roots = [...roots].sort((a, b) => a - b);
        const b = -(roots[0] + roots[1]);
        const c = roots[0] * roots[1];
        const zeroForm = `${polynomial(b, c)} = 0`;
        let equation = zeroForm;
        if (type === 'squareEqualsNumber') equation = `x² = ${-c}`;
        if (type === 'rearrangeToZero') equation = `${polynomial(b, c + shift)} = ${numberText(shift)}`;
        if (['bothSolutionsFromBrackets', 'setFactorsZero'].includes(type)) equation = `${factorised(roots)} = 0`;
        return { type, roots, b, c, shift, equation, zeroForm, factorised: `${factorised(roots)} = 0` };
    }

    function explanation(question) {
        const { roots, b, c, zeroForm } = question;
        const lines = [];
        if (question.equation !== zeroForm && !['bothSolutionsFromBrackets', 'setFactorsZero'].includes(question.type)) {
            lines.push(`First make one side 0: ${zeroForm}.`);
        }
        if (c === 0) lines.push(`Take out x: ${question.factorised}. Keep x = 0; do not divide by x.`);
        else lines.push(`The bracket numbers are ${numberText(-roots[0])} and ${numberText(-roots[1])}. They multiply to ${numberText(c)} and add to ${numberText(b)}. So ${question.factorised}.`);
        lines.push(`If two numbers multiply to make 0, one of them is 0. So ${factor(roots[0])} = 0 or ${factor(roots[1])} = 0.`);
        lines.push(`This gives ${pairText(roots)}.`);
        if (question.context) lines.push(`A width must be positive, so the rectangle's width is ${numberText(roots[1])} cm.`);
        return lines.join(' ');
    }

    function wrongAnswers(question) {
        const { roots: [a, b], b: coefficient, c } = question;
        const candidates = [
            { roots: [-a, -b], feedback: 'Those are the bracket numbers. Solve each bracket equal to 0; the solution has the opposite sign.' },
            { roots: [a, -b], feedback: `Check the second sign. ${factor(b)} = 0 gives x = ${numberText(b)}.` },
            { roots: [-a, b], feedback: `Check the first sign. ${factor(a)} = 0 gives x = ${numberText(a)}.` },
            { roots: [a], feedback: 'That is one solution. The other factor can also be 0. Give both solutions.' },
            { roots: [b], feedback: 'That is one solution. Solve the other factor as well. Do not lose x = 0 when it is a solution.' },
            { roots: [0, a], feedback: 'The whole bracket must equal 0. Setting a bracket equal to its constant does not solve the original equation.' },
            { roots: [0, b], feedback: 'Set each whole bracket equal to 0. The letter is not automatically 0.' },
            { roots: [-Math.abs(c), Math.abs(c)], feedback: 'These use the squared number as a solution. Find the number that squares to it, then include both signs.' },
            { roots: [coefficient, c], feedback: 'The numbers in the equation are not the solutions. Factorise, then set each factor equal to 0.' }
        ];
        const seen = new Set([JSON.stringify([a, b])]);
        return candidates.filter(item => {
            item.roots.sort((x, y) => x - y);
            if (item.roots.length === 2 && item.roots[0] === item.roots[1]) return false;
            const key = JSON.stringify(item.roots);
            if (seen.has(key) || samePair(item.roots, [a, b])) return false;
            seen.add(key);
            item.label = pairText(item.roots) + (item.roots.length === 1 ? ' only' : '');
            return true;
        });
    }

    function solveQuestion(question, mode = 'choice') {
        let prompt = `Solve ${question.equation}. Give both solutions.`;
        if (question.type === 'setFactorsZero') prompt = `Each bracket can be 0. Solve ${question.equation}. Give both solutions.`;
        if (question.type === 'notFinished') prompt = `A pupil has factorised ${question.zeroForm} as ${question.factorised}. Finish solving it. Give both values of x.`;
        if (question.type === 'spotError') prompt = `A pupil says the solutions of ${question.equation} are ${pairText(question.roots.map(root => -root))}. Correct their answer. Give both solutions.`;
        if (question.context) prompt = `${question.context} Find both solutions of the equation before deciding which can be a width.`;
        const base = { task: 'solve', questionType: question.type, model: question, prompt, feedback: explanation(question) };
        const wrongs = wrongAnswers(question);
        if (mode === 'choice') return {
            ...base, input: 'choice',
            options: [{ label: pairText(question.roots), correct: true, feedback: base.feedback }, ...wrongs.slice(0, 3).map(item => ({ label: item.label, correct: false, feedback: item.feedback }))]
        };
        return {
            ...base, input: 'number', fractions: true,
            prompt: `${prompt} Put the smaller solution first.`,
            fields: [{ id: 'smaller', label: 'Smaller solution for x' }, { id: 'larger', label: 'Larger solution for x' }],
            answer: { smaller: String(question.roots[0]), larger: String(question.roots[1]) },
            rules: [
                { value: { smaller: String(question.roots[1]), larger: String(question.roots[0]) }, feedback: 'These are the two solutions. Put the smaller number in the first box and the larger number in the second.' },
                ...wrongs.filter(item => item.roots.length === 2).map(item => ({ value: { smaller: String(item.roots[0]), larger: String(item.roots[1]) }, feedback: item.feedback })),
                { value: { smaller: String(question.roots[0]), larger: String(question.roots[0]) }, feedback: 'You have repeated one solution. Set the other factor equal to 0 too.' },
                { value: { smaller: String(question.roots[1]), larger: String(question.roots[1]) }, feedback: 'You have repeated one solution. Give the solution from each factor.' }
            ],
            fallback: 'Make one side 0. Factorise, then set each factor equal to 0. Solve both equations and put the smaller answer first.'
        };
    }

    const practiceTypes = ['squareEqualsNumber', 'monicReady', 'rearrangeToZero', 'factoriseThenSolve', 'commonFactor', 'setFactorsZero', 'bothSolutionsFromBrackets', 'spotError', 'notFinished', 'contextReject'];
    function pick(random) {
        return E().shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type, mode: index % 2 ? 'number' : 'choice', seed: E().randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const choose = values => values[E().randomInt(0, values.length - 1, random)];
        const nonzero = [-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8];
        let roots;
        let shift = 0;
        if (item.type === 'squareEqualsNumber') {
            const size = E().randomInt(2, 12, random);
            roots = [-size, size];
        } else if (item.type === 'commonFactor') roots = [0, choose(nonzero)];
        else if (item.type === 'contextReject') {
            const positive = E().randomInt(1, 7, random);
            const add = E().randomInt(1, 6, random);
            roots = [-(positive + add), positive];
        } else {
            const first = choose(nonzero);
            roots = [first, choose(nonzero.filter(value => value !== first && value !== -first))];
        }
        if (item.type === 'rearrangeToZero') shift = choose(nonzero);
        const question = model(item.type, roots, shift);
        if (item.type === 'contextReject') {
            const add = question.b;
            const area = -question.c;
            question.context = `A rectangle has width x cm and length (x + ${add}) cm. Its area is ${area} cm². This gives x(x + ${add}) = ${area}, or ${question.zeroForm}.`;
        }
        return solveQuestion(question, item.mode);
    }

    function examples() {
        return [
            solveQuestion(model('rearrangeToZero', [-5, 2], 10), 'choice'),
            solveQuestion(model('bothSolutionsFromBrackets', [-2, 5]), 'number'),
            solveQuestion(model('monicReady', [-2, -5]), 'choice'),
            solveQuestion(model('commonFactor', [0, -7]), 'number'),
            solveQuestion(model('squareEqualsNumber', [-6, 6]), 'choice'),
            solveQuestion(model('factoriseThenSolve', [-3, 4]), 'number'),
            solveQuestion(model('notFinished', [2, 3]), 'choice'),
            solveQuestion(model('spotError', [-4, 1]), 'number')
        ];
    }
    function checks() {
        return [
            solveQuestion(model('monicReady', [-3, -4]), 'number'),
            solveQuestion(model('rearrangeToZero', [-6, 2], 12), 'choice'),
            solveQuestion(model('commonFactor', [0, 5]), 'number'),
            solveQuestion(model('squareEqualsNumber', [-7, 7]), 'choice'),
            solveQuestion(model('bothSolutionsFromBrackets', [-2, 5]), 'number')
        ];
    }

    const learnScreens = [
        { title: 'A squared letter can give two answers', lines: [
            'A quadratic equation has a squared letter as its highest power. In x² = 25, x² means x × x.',
            'Both 5 × 5 and (−5) × (−5) make 25. So x = 5 or x = −5. A solution is a value that makes the equation true.',
            'We will turn quadratics into brackets, then use the brackets to find the solutions.'
        ], maths: ['x² = 25', '5 × 5 = 25', '(−5) × (−5) = 25'], squares: true },
        { title: 'Use a grid to multiply two brackets', lines: [
            'Each square in this grid is one multiplication. Multiply each row label by each column label.',
            '(x + 2)(x + 5) gives x² + 5x + 2x + 10. Collect 5x + 2x to get 7x.',
            'So (x + 2)(x + 5) = x² + 7x + 10. The two bracket numbers multiply to 10 and add to 7.'
        ], maths: ['(x + 2)(x + 5)', 'x² + 5x + 2x + 10', 'x² + 7x + 10'], grid: [2, 5] },
        { title: 'Factorising goes back to the brackets', lines: [
            'To factorise means to write an expression as things multiplied together. For x² + 7x + 10, find two numbers that multiply to 10 and add to 7.',
            'The numbers are 2 and 5, so x² + 7x + 10 = (x + 2)(x + 5). These brackets are the factors.',
            'Change the two bracket numbers below. Watch their product and their sum. A negative number keeps its sign.'
        ], maths: ['2 × 5 = 10', '2 + 5 = 7', 'x² + 7x + 10 = (x + 2)(x + 5)'], explorer: true },
        { title: 'A product of zero tells us about the factors', lines: [
            'If two numbers multiply to make 0, one of them is 0. This is called the zero product rule.',
            'So (x + 2)(x + 5) = 0 means x + 2 = 0 or x + 5 = 0. Each bracket could be the one that makes the product 0.',
            'Solve both: x + 2 = 0 gives x = −2. And x + 5 = 0 gives x = −5. Do not stop at the brackets.'
        ], maths: ['0 × 7 = 0', '(x + 2)(x + 5) = 0', 'x + 2 = 0 or x + 5 = 0', 'x = −2 or x = −5'], grid: [2, 5] },
        { title: 'Check the sign of each solution', lines: [
            'The solution has the opposite sign to the number in its bracket. To make x + 2 equal 0, x must be −2. To make x − 5 equal 0, x must be 5.',
            'So (x + 2)(x − 5) = 0 gives x = −2 or x = 5, not 2 and −5.',
            'Check −2: (−2 + 2)(−2 − 5) = 0 × (−7) = 0. Check 5: (5 + 2)(5 − 5) = 7 × 0 = 0.',
            'When typing two solutions in this lesson, put the smaller number first: −2, then 5.'
        ], maths: ['(x + 2)(x − 5) = 0', 'x + 2 = 0 or x − 5 = 0', 'x = −2 or x = 5'] },
        { title: 'Make one side zero first', lines: [
            'Solve x² + 3x = 10. Subtract 10 from both sides: x² + 3x − 10 = 0.',
            'Find numbers that multiply to −10 and add to 3: 5 and −2. So (x + 5)(x − 2) = 0.',
            'Now x + 5 = 0 or x − 2 = 0, giving x = −5 or x = 2. The zero product rule works because the product equals 0.',
            'Check in the original equation: (−5)² + 3 × (−5) = 25 − 15 = 10. Also 2² + 3 × 2 = 4 + 6 = 10.'
        ], maths: ['x² + 3x = 10', 'x² + 3x − 10 = 0', '(x + 5)(x − 2) = 0', 'x = −5 or x = 2'], grid: [5, -2] },
        { title: 'Use negative numbers in the grid too', lines: [
            'For x² − x − 12 = 0, the bracket numbers must multiply to −12 and add to −1.',
            'Use 3 and −4: 3 × (−4) = −12 and 3 + (−4) = −1. The grid gives (x + 3)(x − 4).',
            'Set each bracket equal to 0. This gives x = −3 or x = 4. Check: 9 + 3 − 12 = 0 and 16 − 4 − 12 = 0.'
        ], maths: ['x² − x − 12 = 0', '(x + 3)(x − 4) = 0', 'x = −3 or x = 4'], grid: [3, -4] },
        { title: 'Keep zero when it is a solution', lines: [
            'Solve x² + 7x = 0. Both terms contain x. Take out x to get x(x + 7) = 0.',
            'The factors are x and x + 7. So x = 0 or x + 7 = 0, giving x = 0 or x = −7.',
            'The same method works for x² − 5x = 0: take out x to get x(x − 5) = 0. The solutions are x = 0 or x = 5.',
            'Do not divide by x. That would lose the solution x = 0. Check the first example: 0² + 7 × 0 = 0, and (−7)² + 7 × (−7) = 49 − 49 = 0.'
        ], maths: ['x² + 7x = 0', 'x(x + 7) = 0', 'x = −7 or x = 0'], grid: [0, 7] },
        { title: 'A square can give a positive and a negative solution', lines: [
            'Solve x² − 36 = 0. Since 6² = 36, use (x + 6)(x − 6) = 0. The +6x and −6x cancel in the grid.',
            'This is called a difference of two squares: one squared amount minus another.',
            'Now x + 6 = 0 or x − 6 = 0, so x = −6 or x = 6. Both square to 36. Giving just 6 misses one solution.',
            'For x² = 36, first subtract 36 from both sides. You get the same equation and the same two solutions.'
        ], maths: ['x² − 36 = 0', '(x + 6)(x − 6) = 0', 'x = −6 or x = 6'], grid: [6, -6] },
        { title: 'A length must be positive', lines: [
            'A rectangle has width x cm and length (x + 3) cm. Its area is 40 cm², so x(x + 3) = 40.',
            'Make one side 0: x² + 3x − 40 = 0. Factorise: (x + 8)(x − 5) = 0.',
            'The equation has solutions x = −8 or x = 5. A width cannot be negative, so the rectangle is 5 cm wide and 8 cm long.',
            'If a question asks for both solutions of the equation, give −8 and 5. If it asks for the width, give 5 cm. Check: 5 × 8 = 40.'
        ], maths: ['x(x + 3) = 40', 'x² + 3x − 40 = 0', '(x + 8)(x − 5) = 0', 'x = −8 or x = 5'] }
    ];

    function drawGrid(host, p, q) {
        const table = document.createElement('table');
        table.className = 'quad-grid';
        const caption = document.createElement('caption');
        caption.textContent = `Factorising grid for (x${term(p)})(x${term(q)})`;
        table.append(caption);
        const rows = [['×', 'x', numberText(q)], ['x', 'x²', q === 0 ? '0' : `${q === 1 ? '' : q === -1 ? '−' : numberText(q)}x`], [numberText(p), p === 0 ? '0' : `${p === 1 ? '' : p === -1 ? '−' : numberText(p)}x`, numberText(p * q)]];
        rows.forEach((values, row) => {
            const tr = document.createElement('tr');
            values.forEach((value, col) => {
                const cell = document.createElement(row === 0 || col === 0 ? 'th' : 'td');
                if (row === 0) cell.scope = 'col';
                else if (col === 0) cell.scope = 'row';
                cell.textContent = value;
                tr.append(cell);
            });
            table.append(tr);
        });
        host.append(table);
    }
    function drawLearn(host, index, section) {
        const screen = learnScreens[index];
        if (screen.squares) {
            const picture = document.createElement('div');
            picture.className = 'quad-squares';
            for (const value of [5, -5]) {
                const panel = document.createElement('figure');
                const tiles = document.createElement('div');
                tiles.className = 'quad-square-tiles';
                tiles.setAttribute('aria-label', `${numberText(value)} squared is 25`);
                for (let i = 0; i < 25; i++) tiles.append(document.createElement('span'));
                const caption = document.createElement('figcaption');
                caption.textContent = `${numberText(value)} × ${value < 0 ? '(−5)' : '5'} = 25`;
                panel.append(tiles, caption);
                picture.append(panel);
            }
            host.append(picture);
        }
        if (screen.grid) drawGrid(host, ...screen.grid);
        if (screen.explorer) {
            const saved = section.state.grid || { p: 2, q: 5 };
            const controls = document.createElement('div');
            controls.className = 'quad-controls';
            const drawing = document.createElement('div');
            const result = document.createElement('p');
            result.className = 'quad-maths';
            result.setAttribute('aria-live', 'polite');
            const inputs = {};
            const updatePicture = () => {
                const p = Number(inputs.p.value);
                const q = Number(inputs.q.value);
                if (inputs.p.value === '' || inputs.q.value === '' || !Number.isInteger(p) || !Number.isInteger(q) || Math.abs(p) > 8 || Math.abs(q) > 8) return;
                section.update(state => { state.grid = { p, q }; });
                drawing.replaceChildren();
                drawGrid(drawing, p, q);
                result.textContent = `Product: ${numberText(p * q)}. Sum: ${numberText(p + q)}. (x${term(p)})(x${term(q)}) = ${polynomial(p + q, p * q)}`;
            };
            for (const [id, labelText] of [['p', 'First bracket number'], ['q', 'Second bracket number']]) {
                const label = document.createElement('label');
                label.textContent = labelText;
                const input = document.createElement('input');
                input.type = 'number'; input.min = '-8'; input.max = '8'; input.step = '1'; input.value = saved[id];
                inputs[id] = input;
                input.addEventListener('input', updatePicture);
                label.append(input);
                controls.append(label);
            }
            host.append(controls, drawing, result);
            updatePicture();
        }
        const maths = document.createElement('div');
        maths.className = 'quad-working';
        for (const line of screen.maths) {
            const p = document.createElement('p');
            p.textContent = line;
            maths.append(p);
        }
        host.append(maths);
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: E().shuffle(question.options, random) } : { ...question };
    }
    const evaluate = (question, x) => x * x + question.b * x + question.c;
    window.QuadraticEquations = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn, drawGrid,
        model, solveQuestion, wrongAnswers, explanation, evaluate, polynomial, factor, factorised, pairText, numberText };
})();
