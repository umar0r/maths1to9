(() => {
    'use strict';

    const tidy = value => String(Number(value.toFixed(4)));
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const fraction = (a, b) => `${a / gcd(a, b)}/${b / gcd(a, b)}`;
    const amount = (percent, whole) => percent * whole / 100;

    function numeric(prompt, answer, mistakes, feedback, input, questionType, details = {}) {
        const wrong = mistakes.filter(([value], index, list) =>
            tidy(value) !== tidy(answer) && list.findIndex(([other]) => tidy(other) === tidy(value)) === index);
        const question = { prompt, input, questionType, feedback, ...details };
        if (input === 'choice') {
            question.options = [option(tidy(answer), feedback, true), ...wrong.slice(0, 3).map(([value, message]) => option(tidy(value), message))];
        } else {
            question.answer = tidy(answer);
            question.rules = wrong.map(([value, message]) => ({ value: tidy(value), feedback: message }));
            question.fallback = feedback;
        }
        return question;
    }

    function decimalQuestion(percent, input = 'choice') {
        return numeric(`Write ${tidy(percent)}% as a decimal.`, percent / 100, [
            [percent / 10, 'That divides by 10. Divide the percentage by 100.'],
            [percent, 'That keeps the percentage number. Divide it by 100.'],
            [percent / 1000, 'That divides by 1000. Divide by 100 instead.']
        ], `${tidy(percent)} ÷ 100 = ${tidy(percent / 100)}`, input, 'percent-decimal', { percent });
    }

    function percentQuestion(decimal, input = 'number') {
        const question = numeric(`Write ${tidy(decimal)} as a percentage.${input === 'number' ? ' Type the percentage. Leave out the % sign.' : ''}`, decimal * 100, [
            [decimal, 'That is still the decimal. Multiply it by 100.'],
            [decimal * 10, 'That multiplies by 10. Multiply the decimal by 100.'],
            [decimal / 100, 'That divides by 100. Multiply by 100 to find the percentage.']
        ], `${tidy(decimal)} × 100 = ${tidy(decimal * 100)}, so the percentage is ${tidy(decimal * 100)}%.`, input, 'decimal-percent', { decimal });
        if (question.options) question.options.forEach(item => { item.label += '%'; });
        return question;
    }

    function fractionQuestion(percent) {
        const correct = fraction(percent, 100);
        const wrong = [
            option(fraction(percent, 10), 'That uses 10 as the whole. A percentage is out of 100.'),
            option(fraction(100 - percent, 100), 'That is the part left over. Use the stated percentage.'),
            option('1/100', 'That is only 1%. Use the stated number of hundredths.'),
            option(fraction(100, percent), 'That puts 100 on top. The percentage goes on top of 100.')
        ].filter((item, index, list) => item.label !== correct && list.findIndex(other => other.label === item.label) === index);
        return {
            percent, questionType: 'percent-fraction', input: 'choice', prompt: `Which fraction equals ${percent}%?`,
            options: [option(correct, `${percent}/100 = ${correct}`, true), ...wrong.slice(0, 3)]
        };
    }

    function amountQuestion(percent, whole, input = 'number', questionType = 'fraction-amount', prompt) {
        const answer = amount(percent, whole);
        return numeric(prompt || `Find ${percent}% of ${whole}.`, answer, [
            ...(percent === 75 ? [[whole / 5, 'That finds one fifth, which is 20%. Use three quarters for 75%.']] : []),
            [whole / percent, 'That divides the whole by the percentage. Divide the percentage by 100, then multiply by the whole.'],
            [answer * 10, 'That amount is ten times too large. Check the decimal for the percentage.'],
            [whole / 100, 'That is only 1% of the whole. Multiply the 1% amount by the percentage.'],
            [whole - answer, 'That is the amount left over. The question asks for the stated percentage.'],
            [whole * percent, 'That multiplies by the percentage number. Divide the percentage by 100 first.']
        ], `${tidy(percent / 100)} × ${whole} = ${tidy(answer)}`, input, questionType, { percent, whole });
    }

    function examples() {
        const quarter = amountQuestion(25, 56, 'number', 'fraction-amount', 'Find one quarter of 56.');
        quarter.feedback = '56 ÷ 4 = 14';
        quarter.fallback = quarter.feedback;
        return [
            { questionType: 'percent-fraction', percent: 75, whole: 56, input: 'choice',
                prompt: 'Which fraction of the bar is 75%?', options: [
                    option('3/4', '75/100 = 3/4', true),
                    option('1/4', 'One quarter is 25%. Three quarters make 75%.'),
                    option('1/5', 'One fifth is 20%. Three quarters make 75%.'),
                    option('4/3', 'That is more than one whole. 75% is less than a whole.')
                ] },
            quarter,
            amountQuestion(75, 56),
            amountQuestion(10, 120, 'number', 'money-blocks', 'Find 10% of £120. Type the amount in pounds.'),
            amountQuestion(5, 120, 'choice', 'money-blocks', 'Find 5% of £120. Choose the amount in pounds.'),
            amountQuestion(35, 120, 'number', 'money-blocks', 'Find 35% of £120. Type the amount in pounds.'),
            amountQuestion(1, 240, 'number', 'one-percent', 'Find 1% of 240 kg. Type the amount in kg.'),
            amountQuestion(7, 240, 'choice', 'calculator', 'Find 7% of 240 kg. Choose the amount in kg.'),
            amountQuestion(17, 240, 'number', 'build-blocks', 'Find 17% of 240 kg. Type the amount in kg.'),
            decimalQuestion(8),
            { questionType: 'operation', percent: 8, whole: 65, input: 'choice', prompt: 'Which calculation finds 8% of £65?', options: [
                option('0.08 × 65', '8% is 0.08. Multiply by the whole amount.', true),
                option('0.8 × 65', '0.8 is 80%. Use 0.08 for 8%.'),
                option('65 ÷ 0.08', 'This divides by 0.08. Multiply by 0.08 to find 8%.'),
                option('8 × 65', '8 is 800%. Divide 8 by 100 before multiplying.')
            ] },
            amountQuestion(8, 65, 'number', 'calculator', 'Find 8% of £65. Type the amount in pounds.')
        ];
    }

    function checks() {
        return [
            { questionType: 'error', input: 'choice', prompt: 'Which statement explains 3% correctly?', options: [
                option('3% = 0.03 because 3 ÷ 100 = 0.03', 'Per cent means out of 100, so divide 3 by 100.', true),
                option('3% = 0.3 because 3 ÷ 10 = 0.3', 'That divides by 10. A percentage needs division by 100.'),
                option('3% = 3 because the number stays the same', 'The % sign changes what 3 means. It means 3 out of 100.'),
                option('3% = 0.003 because 3 ÷ 1000 = 0.003', 'That divides by 1000. Per cent means out of 100.')
            ] },
            percentQuestion(0.125), amountQuestion(75, 44), amountQuestion(125, 72, 'choice', 'over-whole'),
            amountQuestion(20, 90, 'number', 'money-blocks', 'A £90 coat has 20% off. How many pounds are taken off?')
        ];
    }

    const practiceTypes = ['percent-decimal', 'decimal-percent', 'percent-fraction', 'fraction-amount', 'money-blocks', 'one-percent', 'build-blocks', 'near-whole', 'over-whole', 'calculator', 'people', 'battery'];
    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const groups = [
            ['percent-decimal', 'decimal-percent', 'percent-fraction'], ['fraction-amount'],
            ['money-blocks', 'build-blocks'], ['one-percent', 'calculator'],
            ['near-whole', 'over-whole'], ['people', 'battery']
        ];
        return groups.map((group, index) => ({
            type: group[randomInt(0, group.length - 1, random)],
            mode: index % 2 === 0 ? 'choice' : 'number', seed: randomInt(0, 4294967295, random)
        }));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const choose = values => values[randomInt(0, values.length - 1, random)];
        const input = item.mode || 'number';
        let question;
        switch (item.type) {
        case 'percent-decimal': question = decimalQuestion(randomInt(1, 99, random), input); break;
        case 'decimal-percent': question = percentQuestion(randomInt(1, 199, random) / 100, input); break;
        case 'percent-fraction': question = fractionQuestion(choose([20, 25, 40, 50, 60, 75, 80])); break;
        case 'fraction-amount': question = amountQuestion(choose([25, 50, 75]), randomInt(3, 40, random) * 4, input); break;
        case 'money-blocks': {
            const p = choose([15, 35, 45, 65]);
            const whole = randomInt(2, 30, random) * 20;
            question = amountQuestion(p, whole, input, item.type, `Find ${p}% of £${whole}. ${input === 'choice' ? 'Choose' : 'Type'} the amount in pounds.`);
            break;
        }
        case 'one-percent': question = amountQuestion(1, randomInt(10, 99, random) * 10, input); break;
        case 'build-blocks': question = amountQuestion(choose([12, 17, 26, 35, 45]), randomInt(2, 40, random) * 10, input); break;
        case 'near-whole': question = amountQuestion(99, randomInt(2, 30, random) * 100, input); break;
        case 'over-whole': question = amountQuestion(choose([125, 150, 175]), randomInt(3, 40, random) * 4, input); break;
        case 'calculator': {
            const p = choose([3, 6, 7, 8, 13, 18, 23]);
            const whole = randomInt(5, 80, random) * 5;
            question = amountQuestion(p, whole, input, item.type, `Use a calculator: find ${p}% of £${whole}. ${input === 'choice' ? 'Choose' : 'Type'} the amount in pounds.`);
            break;
        }
        case 'people': {
            const p = choose([20, 40, 60, 80]);
            const whole = randomInt(3, 20, random) * 5;
            question = amountQuestion(p, whole, input, item.type, `${p}% of ${whole} club members cycle to school. How many cycle?`);
            break;
        }
        case 'battery': {
            const whole = randomInt(10, 50, random) * 100;
            const p = choose([15, 35, 65, 85, 95]);
            question = amountQuestion(p, whole, input, item.type, `A full battery holds ${whole} mAh of charge. How much charge is ${p}%, in mAh?`);
            break;
        }
        default: throw new Error(`Unknown percentage question type: ${item.type}`);
        }
        return prepare({ ...question, questionType: item.type }, random);
    }

    const learnScreens = [
        { title: 'What does a percentage mean?', lines: ['Per cent means out of 100. Each square is one of 100 equal parts.', '100% is the whole amount, 50% is half, and 0% is none. The whole can be any size.'], grid: 37, explore: true },
        { title: 'The same share, three ways', lines: ['Fractions, decimals and percentages can show the same share.', 'To write a percentage as a decimal, divide by 100.', 'To write it as a fraction, put it over 100, then simplify.'], grid: 50, equations: ['50% = 1/2 = 0.5', '20% = 1/5 = 0.2', '5% = 0.05'] },
        { title: 'Three quarters', lines: ['Each part of this bar is one quarter of the whole. Each quarter is 25%.', 'Three quarters make 75%.'], percent: 75, parts: 4, equations: ['75% = 75/100 = 3/4 = 0.75'] },
        { title: 'Use a familiar fraction', lines: ['To find three quarters of an amount, divide by 4, then multiply by 3.', 'A box holds 32 pencils. Three quarters are blue.'], percent: 75, whole: 32, parts: 4, equations: ['32 ÷ 4 = 8', '8 × 3 = 24', '75% of 32 = 24'] },
        { title: 'Compare the amounts', lines: ['Work out each percentage of its own whole, then compare the answers.', 'The smaller percentage can give a larger amount when the wholes are different.'], equations: ['75% of 32 = 24', '60% of 50 = 30'], caption: '30 is greater than 24, so 60% of 50 is greater than 75% of 32.' },
        { title: 'Build from 10% and 5%', lines: ['To find 10%, divide the whole by 10. To find 5%, halve the 10% amount.', 'Find 35% of £80 by adding 30% and 5%.'], grid: 35, equations: ['10%: £80 ÷ 10 = £8', '30%: 3 × £8 = £24', '5%: £8 ÷ 2 = £4', '35% of £80 = £24 + £4 = £28'] },
        { title: 'Choose useful pieces', lines: ['You do not always need to start with 10%.', 'For 26% of 180, add 25% and 1%. A quarter is 25%.'], grid: 26, equations: ['25%: 180 ÷ 4 = 45', '1%: 180 ÷ 100 = 1.8', '26% of 180 = 45 + 1.8 = 46.8'] },
        { title: 'Small parts are useful', lines: ['To find 1%, divide by 100.', 'Find 12% of 350 g by adding 10% and 2%.'], grid: 12, equations: ['10%: 350 ÷ 10 = 35 g', '1%: 350 ÷ 100 = 3.5 g', '2%: 2 × 3.5 = 7 g', '12% of 350 g = 35 g + 7 g = 42 g'] },
        { title: 'Of means multiply', lines: ['Divide the percentage by 100. Multiply that decimal by the whole amount.', 'The decimal is called a multiplier: the number you multiply by. A calculator helps with awkward numbers.'], grid: 23, equations: ['23% = 0.23', '23% of 450 = 0.23 × 450 = 103.5'], caption: 'To find 25%, multiply by 0.25.' },
        { title: 'Check the decimal point', lines: ['7% means 7 out of 100, so divide 7 by 100.', '0.7 means seven tenths. That is 70%, not 7%.'], grid: 7, equations: ['7% = 0.07', '70% = 0.7'] },
        { title: 'More than the whole', lines: ['150% is one whole and another half.', 'Less than 100% gives a smaller amount. More than 100% gives a larger amount.'], percent: 150, equations: ['150% of 46 = 1.5 × 46 = 69'], caption: 'Always check which number is the whole amount.' }
    ];

    function text(host, tag, value, className) {
        const node = document.createElement(tag);
        node.textContent = value;
        if (className) node.className = className;
        host.append(node);
        return node;
    }
    function drawGrid(host, percent) {
        const grid = document.createElement('div');
        grid.className = 'percentage-grid';
        grid.setAttribute('role', 'img');
        const cells = Array.from({ length: 100 }, () => {
            const cell = document.createElement('span');
            cell.setAttribute('aria-hidden', 'true');
            grid.append(cell);
            return cell;
        });
        host.append(grid);
        function update(value) {
            grid.setAttribute('aria-label', `${value} of 100 squares shaded`);
            cells.forEach((cell, index) => cell.classList.toggle('is-shaded', index < value));
        }
        update(percent);
        return update;
    }
    function drawBar(host, percent, parts = 10) {
        const bar = document.createElement('div');
        bar.className = 'percentage-bars';
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `${percent}% of the whole shaded`);
        for (let row = 0; row < Math.ceil(percent / 100); row++) {
            const strip = document.createElement('div');
            strip.className = 'percentage-bar';
            strip.style.setProperty('--parts', parts);
            for (let part = 0; part < parts; part++) {
                const cell = document.createElement('span');
                if (part < Math.min(100, percent - row * 100) * parts / 100) cell.className = 'is-shaded';
                strip.append(cell);
            }
            bar.append(strip);
        }
        host.append(bar);
    }
    function drawLearn(host, index, shaded, onChange) {
        const screen = learnScreens[index];
        if (screen.grid !== undefined) {
            const updateGrid = drawGrid(host, screen.explore ? shaded : screen.grid);
            if (screen.explore) {
                const output = text(host, 'p', '', 'percentage-equation');
                const label = text(host, 'label', 'Move the slider to change the shaded percentage.');
                label.htmlFor = 'percentage-slider';
                const slider = document.createElement('input');
                Object.assign(slider, { id: 'percentage-slider', type: 'range', min: '0', max: '100', step: '1', value: String(shaded) });
                slider.setAttribute('aria-label', 'Shaded percentage');
                const update = value => {
                    updateGrid(value);
                    output.textContent = `${value}% = ${value}/100 = ${tidy(value / 100)}`;
                    slider.setAttribute('aria-valuetext', `${value} percent`);
                };
                slider.addEventListener('input', () => {
                    const value = Number(slider.value);
                    onChange(value);
                    update(value);
                });
                host.append(slider);
                update(shaded);
            }
        }
        if (screen.percent) drawBar(host, screen.percent, screen.parts);
        for (const equation of screen.equations || []) text(host, 'p', equation, 'percentage-equation');
        if (screen.caption) text(host, 'p', screen.caption);
    }
    function drawExample(host, question, correct) {
        if (question.whole) text(host, 'p', `Whole amount: ${question.whole}`, 'percentage-whole');
        if (question.percent && question.percent <= 100) {
            if (question.questionType === 'percent-fraction' || question.percent === 25 || question.percent === 75) drawBar(host, question.percent, 4);
            else drawGrid(host, question.percent);
        }
        // Show only the given percentage and whole until the pupil answers.
        if (correct) {
            const answer = question.answer || question.options.find(item => item.correct).label;
            text(host, 'p', answer, 'percentage-equation');
        }
    }

    window.PercentageAmounts = { tidy, amount, decimalQuestion, percentQuestion, fractionQuestion, amountQuestion, examples, checks, practiceTypes, pick, prepare, generate, learnScreens, drawLearn, drawExample };
})();
