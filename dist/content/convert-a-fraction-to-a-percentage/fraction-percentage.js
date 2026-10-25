(() => {
    'use strict';

    const tidy = value => String(Number(value.toFixed(4)));
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });
    const percent = (n, d) => n / d * 100;
    const working = (n, d) => `${n} ÷ ${d} = ${tidy(n / d)}. Then ${tidy(n / d)} × 100 = ${tidy(percent(n, d))}, so ${n}/${d} = ${tidy(percent(n, d))}%.`;

    function percentage(n, d, input = 'choice') {
        const decimal = n / d;
        const answer = percent(n, d);
        const question = {
            n, d, questionType: 'percentage', input,
            prompt: `Write ${n}/${d} as a percentage.${input === 'number' ? ' Leave out the % sign.' : ''}`,
            feedback: working(n, d)
        };
        if (input === 'choice') question.options = [
            option(`${tidy(answer)}%`, working(n, d), true),
            option(`${tidy(decimal)}%`, `That is the decimal with a % sign. Multiply ${tidy(decimal)} by 100.`),
            option(`${tidy(decimal * 10)}%`, 'That multiplies the decimal by 10. Multiply by 100 to get the percentage.'),
            option(`${Number((d / n * 100).toFixed(2))}%`, `That divides ${d} by ${n} before multiplying by 100. Divide the top number ${n} by the bottom number ${d}.`)
        ];
        else {
            question.answer = tidy(answer);
            question.rules = [
                { value: tidy(decimal), feedback: 'That is the decimal. Multiply it by 100 to get the percentage.' },
                { value: tidy(decimal * 10), feedback: 'That multiplies by 10. Multiply the decimal by 100.' },
                { value: tidy(d / n), feedback: 'That divides the bottom number by the top number. Divide the top by the bottom first.' },
                { value: tidy(d / n * 100), feedback: 'You divided the wrong way round before multiplying by 100.' }
            ].filter((rule, index, rules) => Number(rule.value) !== answer && rules.findIndex(other => other.value === rule.value) === index);
            question.fallback = `Divide ${n} by ${d}, then multiply the decimal by 100. Leave out the % sign.`;
        }
        return question;
    }

    function examples() {
        return [
            {
                n: 3, d: 8, stage: 'decimal', questionType: 'divide',
                prompt: 'Work out 3 ÷ 8.', input: 'number', answer: '0.375',
                feedback: '3 ÷ 8 = 0.375. This is the decimal, so there is no % sign yet.',
                rules: [
                    { value: '2.667', feedback: 'That divides 8 by 3. Divide the top number 3 by the bottom number 8.' },
                    { value: '0.0375', feedback: 'Check the decimal point. Use 3 ÷ 8 on your calculator.' },
                    { value: '3.8', feedback: 'The fraction means 3 divided by 8. It does not mean 3.8.' }
                ],
                fallback: 'Divide the top number 3 by the bottom number 8. Keep all the decimal digits.'
            },
            {
                n: 3, d: 8, stage: 'percentage', questionType: 'multiply', input: 'choice',
                prompt: '3 ÷ 8 = 0.375. What is 0.375 as a percentage?',
                options: [
                    option('0.375%', 'That just adds the % sign. Multiply the decimal by 100.'),
                    option('3.75%', 'That multiplies by 10. Multiply by 100 instead.'),
                    option('37.5%', '0.375 × 100 = 37.5, so 3/8 = 37.5%.', true),
                    option('375%', 'That multiplies by 1000. Multiply by 100 instead.')
                ]
            }
        ];
    }

    function checks() {
        return [
            {
                questionType: 'error', input: 'choice',
                prompt: 'A student writes 3/5 = 0.6%. Which explanation corrects the mistake?',
                options: [
                    option('0.6 is the decimal. Multiply by 100 to get 60%.', '3 ÷ 5 = 0.6. Then 0.6 × 100 = 60, so 3/5 = 60%.', true),
                    option('0.6 is the percentage. Just add the % sign.', '0.6 is the decimal, so it still needs to be multiplied by 100.'),
                    option('Divide 0.6 by 100 to get 0.006%.', 'Dividing by 100 makes the number smaller. Multiply by 100 to get the percentage.'),
                    option('Multiply 0.6 by 10 to get 6%.', 'That uses 10 instead of 100. A percentage means out of 100.')
                ]
            },
            percentage(1, 4, 'number'),
            percentage(9, 16, 'number'),
            {
                n: 17, d: 20, questionType: 'context', input: 'choice',
                prompt: 'Mia scores 17 out of 20 in a test. What percentage is that?',
                options: [
                    option('85%', '17 ÷ 20 = 0.85. Then 0.85 × 100 = 85, so Mia scores 85%.', true),
                    option('17%', '17 is her mark out of 20. Convert the fraction 17/20 to a percentage.'),
                    option('8.5%', 'That multiplies the decimal by 10. A percentage needs × 100.'),
                    option('117.6%', 'That divides 20 by 17 before multiplying by 100. Divide her mark by the total mark.')
                ]
            },
            percentage(7, 8, 'number')
        ];
    }

    const practiceTypes = ['quarters', 'twentieths', 'sixteenths'];
    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        return practiceTypes.flatMap(type => ['choice', 'number'].map(mode => ({
            type, mode, seed: randomInt(0, 4294967295, random)
        })));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function generate(item, random) {
        const d = { quarters: 4, twentieths: 20, sixteenths: 16 }[item.type];
        const n = window.Maths1to9LessonEngine.randomInt(1, d - 1, random);
        return prepare({ ...percentage(n, d, item.mode || (item.type === 'twentieths' ? 'number' : 'choice')), questionType: item.type }, random);
    }

    function fraction(host, n, d) {
        const visual = document.createElement('span');
        visual.className = 'fraction';
        visual.setAttribute('aria-label', `${n} over ${d}`);
        for (const value of [n, d]) {
            const part = document.createElement('span');
            part.textContent = value;
            visual.append(part);
        }
        host.append(visual);
    }
    function line(host, text) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        paragraph.className = 'fraction-equation';
        host.append(paragraph);
    }
    function drawHundred(host) {
        const grid = document.createElement('div');
        grid.className = 'percentage-grid';
        grid.setAttribute('role', 'img');
        grid.setAttribute('aria-label', '100 squares. The top-left quarter has 25 shaded squares.');
        for (let row = 0; row < 10; row++) {
            for (let column = 0; column < 10; column++) {
                const square = document.createElement('span');
                square.className = row < 5 && column < 5 ? 'is-shaded' : '';
                square.setAttribute('aria-hidden', 'true');
                grid.append(square);
            }
        }
        host.append(grid);
        const caption = document.createElement('p');
        caption.textContent = '25 of the 100 squares are shaded.';
        host.append(caption);
    }

    function drawLearn(host, screen) {
        if (screen === 0) drawHundred(host);
        const visual = document.createElement('div');
        visual.className = 'fraction-equation';
        if (screen === 0) {
            fraction(visual, 1, 4);
            visual.append(' = ');
            fraction(visual, 25, 100);
            visual.append(' = 25%');
        } else {
            fraction(visual, 5, 16);
            visual.append(screen === 1 ? ' → decimal' : ' = 31.25%');
        }
        if (screen === 2) line(host, '0.3125 × 100 = 31.25');
        host.append(visual);
        if (screen === 1) line(host, '5 ÷ 16 = 0.3125');
    }
    function drawExample(host, question, correct) {
        const visual = document.createElement('div');
        visual.className = 'fraction-equation';
        fraction(visual, question.n, question.d);
        if (correct) visual.append(question.stage === 'decimal' ? ' = 0.375' : ' = 37.5%');
        host.append(visual);
    }
    window.FractionPercentage = { tidy, percent, working, percentage, examples, checks, practiceTypes, pick, prepare, generate, drawLearn, drawExample };
})();
