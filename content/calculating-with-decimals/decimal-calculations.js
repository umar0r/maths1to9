(() => {
    'use strict';

    const Calc = window.DecimalCalculations;
    // Look up engine helpers when called: the engine loads after this file.
    const engine = () => window.Maths1to9LessonEngine;
    const integer = (low, high, random) => engine().randomInt(low, high, random);
    const element = (...args) => Calc.element(...args);
    const practiceTypes = ['multiply-whole-card', 'money-multiply', 'divide-whole-card',
        'multiply-decimals', 'known-fact', 'divide-by-decimal', 'share-the-bill',
        'meter-bill', 'times-ten', 'year-cost', 'divide-difference'];
    const choiceTypes = new Set(['money-multiply', 'divide-by-decimal', 'meter-bill', 'divide-difference']);
    // Two kinds take two screens with the same numbers: they share one seed.
    const twoStepTypes = new Set(['share-the-bill']);
    const stepCount = type => twoStepTypes.has(type) ? 2 : 1;

    // All amounts are integers with an explicit number of decimal places.
    function decimal(value, places = 2, trim = true) {
        const sign = value < 0 ? '−' : '';
        const digits = String(Math.abs(value)).padStart(places + 1, '0');
        if (!places) return sign + digits;
        const whole = digits.slice(0, -places);
        const fraction = trim ? digits.slice(-places).replace(/0+$/, '') : digits.slice(-places);
        return sign + whole + (fraction ? `.${fraction}` : '');
    }
    const money = cents => `£${decimal(cents, 2, false)}`;
    const option = (label, value, feedback, correct = false) => ({ label, value, feedback, correct });
    const moneyOption = (value, feedback, correct = false) => option(money(value), value, feedback, correct);
    const noZero = (low, high, random) => {
        let value;
        do { value = integer(low, high, random); } while (String(value).includes('0'));
        return value;
    };

    function validOptions(question) {
        return (question.stages || [question]).every(stage => !stage.options || (
            stage.options.length === 4 && stage.options.filter(option => option.correct).length === 1 &&
            new Set(stage.options.map(option => option.value ?? option.label)).size === 4 &&
            new Set(stage.options.map(option => option.label)).size === 4
        ));
    }

    function mixed(order) {
        const inputs = order.flatMap(type => Array.from({ length: stepCount(type) },
            (_, step) => choiceTypes.has(type) && step === 0 ? 'choice' : 'work'));
        return inputs.every((input, index) => index < 2 || input !== inputs[index - 1] || input !== inputs[index - 2]);
    }

    function pickSteps(random) {
        let order;
        do { order = engine().shuffle(practiceTypes, random); } while (!mixed(order));
        const result = order.flatMap((type, parent) => {
            const problemSeed = integer(0, 4294967295, random);
            return Array.from({ length: stepCount(type) }, (_, step) => ({
                type, parent, step, problemSeed, seed: integer(0, 4294967295, random)
            }));
        });
        return result;
    }


    function generateProblem(type, random) {
        let question;
        do {
            if (type === 'multiply-whole-card') {
                const a = noZero(105, 995, random), n = integer(3, 9, random), result = a * n;
                const task = {
                    sum: `${a} × ${n} = ${result}`,
                    digits: String(result),
                    gap: String(result).length - 2,
                    count: 2,
                    right: `${decimal(a, 2, false)} has 2 digits after the point, so ${decimal(result, 2, false)}.`,
                    wrong: () => `${decimal(a, 2, false)} has 2 digits after the point. Move the point back 2 digits.`
                };
                question = { input: 'custom', widget: window.PointGap.pointWidget(task),
                    prompt: `Work out ${decimal(a, 2, false)} × ${n}.`,
                    answer: decimal(result, 2, false), values: { a, n, result } };
            } else if (type === 'money-multiply') {
                const p = 115 + 5 * integer(0, 76, random), n = integer(3, 9, random), answer = n * p;
                const item = ['folder', 'pen', 'cake', 'ticket'][integer(0, 3, random)];
                question = { input: 'choice', prompt: `One ${item} costs ${money(p)}. How much do ${n} ${item}s cost?`,
                    answer: decimal(answer, 2, false), values: { p, n, answer }, options: [
                        moneyOption(answer, `${n} × ${money(p)} = ${money(answer)}.`, true),
                        moneyOption(p + n * 100, `You added ${n}. Find ${n} lots of the price.`),
                        moneyOption(Math.floor(p / 100) * 100 * n + p % 100, `Times the pence by ${n} too.`),
                        moneyOption(answer * 100, "That's the answer in pence. Change it to pounds.")
                    ] };
            } else if (type === 'divide-whole-card') {
                const divisor = integer(2, 9, random), answer = integer(112, 999, random), dividend = answer * divisor;
                const task = {
                    sum: `${dividend} ÷ ${divisor} = ${answer}`,
                    digits: String(answer),
                    gap: String(answer).length - 2,
                    count: 2,
                    right: `${decimal(dividend, 2, false)} has 2 digits after the point, so ${decimal(answer, 2, false)}.`,
                    wrong: () => `${decimal(dividend, 2, false)} has 2 digits after the point. Move the point back 2 digits.`
                };
                question = { input: 'custom', widget: window.PointGap.pointWidget(task),
                    prompt: `Work out ${decimal(dividend, 2, false)} ÷ ${divisor}.`,
                    answer: decimal(answer, 2, false), values: { dividend, divisor, answer } };
            } else if (type === 'multiply-decimals') {
                const a = noZero(12, 89, random), b = noZero(12, 89, random), answer = a * b;
                question = { input: 'number', prompt: `${a} × ${b} = ${answer}. Now work out ${decimal(a)} × ${decimal(b)}.`,
                    answer: decimal(answer, 4), values: { a, b, answer },
                    feedback: `${a} × ${b} = ${answer}, and there are 4 digits after the points.`,
                    rules: [
                        { value: decimal(answer, 3), feedback: 'Count the digits after the points again. There are 4.' }
                    ],
                    fallback: 'Take the points out, multiply, then count 4 digits from the end.' };
            } else if (type === 'known-fact') {
                const a = integer(12, 89, random), b = integer(12, 89, random), product = a * b;
                const x = decimal(a, 1, false), y = decimal(b, 1, false), answer = decimal(product, 2, false);
                question = { input: 'number', prompt: `${a} × ${b} = ${product}. Work out ${x} × ${y}.`, answer, values: { a, b, product },
                    feedback: `${x} × ${y} has 2 digits after the points, so it's ${answer}.`, rules: [
                        { value: decimal(product, 1), feedback: 'Count the digits after the points in both numbers. There are 2.' },
                        { value: decimal(product, 3), feedback: "That's 3 digits after the point. There are only 2." }
                    ], fallback: 'Take the points out, multiply, then count 2 digits from the end.' };
            } else if (type === 'divide-by-decimal') {
                const q = integer(12, 80, random), c = integer(2, 9, random), d = q * c;
                const dStr = decimal(d), cStr = decimal(c);
                const countD = (dStr.split('.')[1] || '').length;
                const countC = (cStr.split('.')[1] || '').length;
                const diff = countD - countC;
                question = { input: 'choice', prompt: `Work out ${dStr} ÷ ${cStr}.`, answer: String(q), values: { q, c, d }, options: [
                    option(String(q), q * 10000, `${countD} − ${countC} = ${diff}, so ${d} ÷ ${c} = ${q}.`, true),
                    option(decimal(q, 2), q * 100, "When you divide, take them away. Don't add them."),
                    option(decimal(q, 1), q * 1000, 'Count the digits after each point again, then take them away.'),
                    option(decimal(q * c * c, 4), q * c * c, "That's multiplying. The question asks you to divide.")
                ] };
            } else if (type === 'share-the-bill') {
                const n = integer(4, 8, random), answer = integer(500, 2500, random), total = n * answer;
                const f = integer(Math.floor(total / 2), Math.floor(total * 4 / 5), random), g = total - f;
                const selection = { input: 'choice', prompt: `${n} friends spend ${money(f)} on food and ${money(g)} on drinks. They share the bill equally. How much does each friend pay?`,
                    answer: decimal(answer, 2, false), options: [
                        option(`(${money(f)} + ${money(g)}) ÷ ${n}`, total, 'Add the food and drinks first, then share.', true),
                        option(`${money(f)} + ${money(g)} ÷ ${n}`, f * n + g, 'That only shares the drinks. Add them first.'),
                        option(`(${money(f)} − ${money(g)}) ÷ ${n}`, f - g, 'The friends pay for both, so add them.'),
                        option(`(${money(f)} + ${money(g)}) × ${n}`, total * n * n, 'Sharing means dividing.')
                    ] };
                const task = {
                    sum: `${total} ÷ ${n} = ${answer}`,
                    digits: String(answer),
                    gap: String(answer).length - 2,
                    count: 2,
                    right: `${money(total)} has 2 digits after the point, so ${money(answer)}.`,
                    wrong: () => `${money(total)} has 2 digits after the point. Move the point back 2 digits.`
                };
                const table = { input: 'custom', widget: window.PointGap.pointWidget(task),
                    prompt: `${money(f)} + ${money(g)} = ${money(total)}. Work out ${money(total)} ÷ ${n}.` };
                question = { stages: [selection, table], values: { n, answer, total, f, g } };
            } else if (type === 'meter-bill') {
                const first = integer(1000, 9000, random), used = integer(12, 48, random) * 10;
                const second = first + used, c = integer(12, 25, random), answer = used * c;
                question = { input: 'choice', prompt: `A meter reads ${first} units, then ${second} units. Each unit used costs ${c}p. What is the bill?`,
                    answer: decimal(answer, 2, false), values: { first, second, used, c, answer }, options: [
                        moneyOption(answer, `${used} units × ${c}p = ${answer}p = ${money(answer)}.`, true),
                        moneyOption((first + second) * c, "Take the first reading from the second, don't add them."),
                        moneyOption(answer * 100, "That's the bill in pence. Divide by 100."),
                        moneyOption(second * c, `${second} includes old units. Only pay for the difference.`)
                    ] };
            } else if (type === 'times-ten') {
                const a = integer(11, 99, random), power = integer(1, 2, random), factor = 10 ** power;
                const original = decimal(a, 1, false), answer = a * 10 ** (power - 1);
                question = { input: 'number', prompt: `Eli writes ${factor} × ${original} = ${original}${'0'.repeat(power)}. What should the answer be?`,
                    answer: String(answer), values: { a, factor, answer },
                    feedback: `Times ${factor} makes every digit worth ${factor} times more: ${answer}.`, rules: [
                        { value: original, feedback: "A 0 on the end after the point doesn't change the number." },
                        { value: decimal(a, power + 1), feedback: "That's dividing. Multiplying makes it bigger." }
                    ], fallback: `Times ${factor} makes every digit worth ${factor} times more: ${answer}.` };
            } else if (type === 'year-cost') {
                const a = 250 + 50 * integer(0, 6, random), b = integer(6, 9, random) * 100, m = integer(2, 4, random);
                const answer = m * a + (12 - m) * b;
                question = { input: 'number', prompt: `A club costs ${money(a)} a month for the first ${m} months, then ${money(b)} a month for the rest of the year. How much is it for the year?`,
                    answer: decimal(answer, 2, false), values: { a, b, m, answer },
                    feedback: `${m} × ${money(a)} + ${12 - m} × ${money(b)} = ${money(answer)}.`, rules: [
                        { value: decimal(12 * b), feedback: `The first ${m} months cost less.` },
                        { value: decimal(m * a + 12 * b), feedback: `That counts the first ${m} months twice.` }
                    ], fallback: `Work out the first ${m} months, then the other ${12 - m} months.` };
            } else if (type === 'divide-difference') {
                const c = integer(12, 18, random), q = integer(101, 299, random), b = integer(12, 249, random);
                if (q % 10 === 0 || c * q % 10 === 0) continue;
                const difference = c * q, a = difference + b * 10, answer = decimal(q, 1, false);
                const numerator = a * c - b * 1000, denominator = 1000 * c;
                // Dividing first: a − b ÷ c, to 2 decimal places. Pupils never
                // see a negative option, so pick new numbers when it would be.
                const dividedFirst = Math.round(Math.abs(numerator) * 100 / denominator) * Math.sign(numerator);
                if (dividedFirst <= 0) continue;
                const wrongOrder = decimal(dividedFirst, 2);
                question = { input: 'choice', prompt: `Work out (${decimal(a, 3, false)} − ${decimal(b, 2)}) ÷ ${decimal(c, 2, false)}.`,
                    answer, values: { a, b, c, q, difference }, options: [
                        option(answer, q, `${decimal(a, 3, false)} − ${decimal(b, 2)} = ${decimal(difference, 3, false)}. 3 − 2 = 1 digit after the point, so ${decimal(difference, 3, false)} ÷ ${decimal(c, 2, false)} = ${answer}.`, true),
                        option(decimal(q, 2), q * 100, 'When you divide, take them away: 3 − 2 = 1.'),
                        option(String(q), q * 10, 'Put the point back: 3 − 2 = 1 digit after it.'),
                        option(wrongOrder, q * 1000, 'Work out the top first, then divide.')
                    ] };
            } else throw new Error(`Unknown decimal question type: ${type}`);
        } while (!question || !validOptions(question));
        return question;
    }

    function generateStep(item, random) {
        const problem = generateProblem(item.type, engine().seededRandom(item.problemSeed));
        const definition = (problem.stages || [problem])[item.step];
        return { ...definition, questionType: item.type,
            options: definition.options ? engine().shuffle(definition.options, random) : undefined,
            figure(host) {
                host.dataset.kind = item.type;
                host.dataset.step = String(item.step);
                host.dataset.problem = String(item.parent + 1);
                window.Maths1to9Lesson.setSectionPosition('question-bank', `Question ${item.parent + 1} of 11`);
            }
        };
    }

    function aliWorking(host) {
        const figure = element('figure', '', 'decimal-ali-working');
        figure.append(element('figcaption', "Ali's working"));
        const drawing = element('div');
        drawing.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" fill="var(--text)" font-family="inherit" role="img" aria-label="Ali's working: 8.4 divided by 3, with 28 above the line and no point.">
            <path d="M43 103V49H149" fill="none" stroke="#64748b" stroke-width="2"/>
            <g font-size="28" font-weight="700" text-anchor="middle"><text x="21" y="88">3</text><text x="76" y="36">2</text><text x="127" y="36">8</text><text x="76" y="88">8</text><text x="101" y="88">.</text><text x="127" y="88">4</text></g>
        </svg>`;
        figure.append(drawing); host.append(figure);
    }

    function checks() {
        return [
            { type: 'count-digits', prompt: '46 × 35 = 1610. Where does the point go in 0.46 × 0.35?', options: [
                { label: '0.1610', correct: true, feedback: '0.46 × 0.35 has 4 digits after the points, so the answer has 4 too.' },
                { label: '16.10', feedback: "That's only 2 digits after the point. Count the digits in both numbers." },
                { label: '1.610', feedback: "That's 3 digits after the point. There are 4." },
                { label: '161.0', feedback: "That's 1 digit after the point. There are 4." }
            ] },
            { type: 'known-fact-check', prompt: '63 × 24 = 1512. What is 6.3 × 2.4?', options: [
                { label: '15.12', correct: true, feedback: '6.3 × 2.4 has 2 digits after the points, so 15.12.' },
                { label: '151.2', feedback: "That's only 1 digit after the point. Count both numbers." },
                { label: '1.512', feedback: "That's 3 digits after the point. There are only 2." },
                { label: '1512', feedback: 'You need to put the point back.' }
            ] },
            { type: 'fill-zeros', prompt: 'Why is 0.3 × 0.2 = 0.06, not 0.6?', options: [
                { label: '3 × 2 = 6, and the answer needs 2 digits after the point, so you write 0.06.', correct: true, feedback: 'Right. The 0 fills the gap so there are 2 digits after the point.' },
                { label: '0.6 is right. You only count the digits in one number.', feedback: 'Count the digits after the point in both numbers.' },
                { label: 'You always add a 0 when you multiply decimals.', feedback: 'The 0 is only there to make 2 digits after the point.' },
                { label: 'Multiplying always makes numbers smaller, so 0.6 is too big.', feedback: 'Not always: 4 × 3 = 12 is bigger. The 0 is there so the answer has 2 digits after the point.' }
            ] },
            { type: 'point-straight-up', prompt: 'Ali works out 8.4 ÷ 3 like this. What has Ali done wrong?', figure: aliWorking, options: [
                { label: 'The point should go above the point in 8.4, making 2.8.', correct: true, feedback: 'Right. When you divide by a whole number, the point goes straight up.' },
                { label: 'Nothing. 8.4 ÷ 3 = 28.', feedback: '28 × 3 is 84, not 8.4. The answer needs a point.' },
                { label: 'Ali should have divided 3 by 8.4.', feedback: "8.4 ÷ 3 means 8.4 shared into 3, so Ali divided the right way round." },
                { label: 'The answer should be 0.28.', feedback: '0.28 × 3 is 0.84. Put the point right above the point in 8.4.' }
            ] },
            { type: 'scale-divisor', prompt: 'Which gives the same answer as 2.7 ÷ 0.06?', options: [
                { label: '270 ÷ 6', correct: true, feedback: 'Both numbers are 100 times bigger, so the answer stays the same.' },
                { label: '2.7 ÷ 6', feedback: "You changed 0.06 but not 2.7. Change both the same way." },
                { label: '27 ÷ 6', feedback: '2.7 was times 10 but 0.06 was times 100. Change both the same way.' },
                { label: '0.027 ÷ 6', feedback: 'The point in 2.7 moved the wrong way. Move both to the right.' }
            ] }
        ];
    }

    Object.assign(Calc, { decimal, money, practiceTypes, pickSteps, generateProblem, generateStep, checks });
})();
