(() => {
    'use strict';

    const practiceTypes = ['nameThePart', 'shadedFraction', 'classifyFraction', 'improperToMixed',
        'mixedToImproper', 'chooseInequality', 'orderThree', 'compareNegative'];
    const fraction = (n, d) => `${n}/${d}`;
    const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
    const compare = (a, b) => Math.sign(a[0] * b[1] - b[0] * a[1]);
    const show = pair => fraction(...pair);

    // Compare fraction options by value too, so equivalent answers never appear twice.
    function optionKey(value) {
        const text = String(value).trim();
        const match = text.match(/^(-)?(?:(\d+) )?(\d+)\/(\d+)$/);
        if (match) {
            const denominator = Number(match[4]);
            const numerator = (Number(match[2] || 0) * denominator + Number(match[3])) * (match[1] ? -1 : 1);
            const factor = gcd(numerator, denominator);
            return `${numerator / factor}/${denominator / factor}`;
        }
        return /^-?\d+$/.test(text) ? `${Number(text)}/1` : text;
    }

    function makeQuestion({ type, mode = 'choice', prompt, answer, wrong, feedback, fallback, ...details }) {
        const candidates = wrong.filter(([label], index, list) => optionKey(label) !== optionKey(answer)
            && list.findIndex(([other]) => optionKey(other) === optionKey(label)) === index);
        const question = { ...details, questionType: type, input: mode, prompt, feedback };
        if (mode === 'choice') {
            if (candidates.length < 3) throw new Error(`Missing mistake options for ${type}`);
            question.options = [{ label: String(answer), correct: true, feedback },
                ...candidates.slice(0, 3).map(([label, message]) => ({ label: String(label), correct: false, feedback: message }))];
        } else {
            Object.assign(question, { answer: String(answer), tolerance: 0,
                rules: candidates.filter(([value]) => /^-?\d+\/\d+$/.test(optionKey(value)))
                    .map(([value, message]) => ({ value: String(value), feedback: message })), fallback });
        }
        return question;
    }

    function nameQuestion(n, d, part, mode) {
        const answer = part === 'numerator' ? n : d;
        return makeQuestion({ type: 'nameThePart', mode, model: { n, d, part },
            prompt: `What is the ${part} of ${fraction(n, d)}?`, answer,
            wrong: [[part === 'numerator' ? d : n, 'That is the other number. The top counts the parts; the bottom names the equal parts in one whole.'],
                [n + d, 'That adds the two numbers. Read the number in the fraction.'],
                [d - n, 'That counts the parts left unshaded. Read the number asked for.'],
                [n * d, 'That multiplies the two numbers. You only need to read one of them.']],
            feedback: `The ${part} is ${answer}. ${part === 'numerator' ? 'It is the top number.' : 'It is the bottom number.'}`,
            fallback: 'The numerator is the top number. The denominator is the bottom number.', picture: { kind: 'bar', n, d } });
    }

    function shadedQuestion(n, d, mode = 'choice', kind = 'bar') {
        return makeQuestion({ type: 'shadedFraction', mode, fractions: mode === 'number', model: { n, d },
            prompt: kind === 'pizza' ? 'A pizza had 8 equal slices. Three slices were eaten. What fraction is left?' : 'What fraction of the whole is shaded?',
            answer: fraction(n, d),
            wrong: [[fraction(d, n), 'That swaps the top and bottom. The bottom counts all the equal parts in one whole.'],
                [fraction(d - n, d), kind === 'pizza' ? 'That counts the slices eaten. Count the slices left.' : 'That counts the unshaded parts. Count the shaded parts.'],
                [fraction(n, n + d), 'That adds the shaded parts to the total. They are already part of the total.'],
                [fraction(n, d - n), 'The bottom must count all the parts, including the shaded ones.']],
            feedback: `${n} of the ${d} equal parts are shaded, so the fraction is ${fraction(n, d)}.`,
            fallback: 'Count the shaded parts for the top. Count all the equal parts for the bottom.', picture: { kind, n, d } });
    }

    function classifyQuestion(n, d, form, whole, mode = 'choice') {
        const written = form === 'mixed' ? `${whole} ${fraction(n, d)}` : fraction(n, d);
        const answer = form === 'proper' ? 'Proper fraction' : form === 'improper' ? 'Improper fraction' : 'Mixed number';
        const fullWholes = form === 'mixed' ? whole : Math.floor(n / d);
        const model = { n, d, form, whole, written };
        if (mode === 'number') return makeQuestion({ type: 'classifyFraction', mode, model,
            prompt: `How many complete wholes are there in ${written}?`, answer: fullWholes,
            wrong: [[n, 'That counts parts, not complete wholes.'], [d, 'That is the number of parts in one whole.'],
                [fullWholes + 1, 'There are not enough parts for that many complete wholes.']],
            feedback: `${written} has ${fullWholes} complete whole${fullWholes === 1 ? '' : 's'}.`,
            fallback: 'Count groups of the bottom number. A part of a whole does not count as a complete whole.' });
        return makeQuestion({ type: 'classifyFraction', mode, model, prompt: `How is ${written} written?`, answer,
            wrong: [['Proper fraction', 'A proper fraction has a top number smaller than its bottom number.'],
                ['Improper fraction', 'An improper fraction is written as one fraction, with its top at least as big as its bottom.'],
                ['Mixed number', 'A mixed number is written as a whole number and a fraction.'],
                ['Whole number', 'There is still a part of a whole here. It is not a whole number.']],
            feedback: `${written} is written as a ${answer.toLowerCase()}.`, fallback: 'Look at how the number is written.' });
    }

    function improperQuestion(whole, n, d, mode = 'choice') {
        const top = whole * d + n;
        return makeQuestion({ type: 'improperToMixed', mode, model: { whole, n, d, top },
            prompt: mode === 'choice' ? `Write ${fraction(top, d)} as a mixed number.`
                : `${fraction(top, d)} = ${whole} □/${d}. What is the missing top number?`,
            answer: mode === 'choice' ? `${whole} ${fraction(n, d)}` : n,
            wrong: mode === 'choice' ? [[`${whole} ${fraction(d, n)}`, 'Keep the original bottom number. The parts have not changed size.'],
                [`${n} ${fraction(whole, d)}`, 'That swaps the number of complete wholes and the parts left over.'],
                [`${whole + 1} ${fraction(n, d)}`, 'That counts one whole too many.'],
                [`${whole} ${fraction(n, d + 1)}`, 'The bottom number stays the same.']]
                : [[top, 'That is the original top number. Take away the parts used in the complete wholes.'],
                    [whole, 'That is the number of complete wholes, not the parts left over.'],
                    [d, 'That is the bottom number. Count the parts left over.']],
            feedback: `${top} ÷ ${d} gives ${whole} complete whole${whole === 1 ? '' : 's'} and ${n} part${n === 1 ? '' : 's'} left. ${fraction(top, d)} = ${whole} ${fraction(n, d)}.`,
            fallback: 'Divide the top by the bottom. The parts left over become the new top number.' });
    }

    function mixedQuestion(whole, n, d, mode = 'choice') {
        const top = whole * d + n;
        return makeQuestion({ type: 'mixedToImproper', mode, model: { whole, n, d, top },
            prompt: mode === 'choice' ? `Write ${whole} ${fraction(n, d)} as an improper fraction.`
                : `${whole} ${fraction(n, d)} = □/${d}. What is the missing top number?`,
            answer: mode === 'choice' ? fraction(top, d) : top,
            wrong: mode === 'choice' ? [[fraction(whole + n, d), 'That adds the whole number to the top. First multiply the whole number by the bottom.'],
                [fraction(whole * whole + n, d), 'Multiply the whole number by the bottom, not by itself. Then add the top.'],
                [fraction(whole * n, d), 'That multiplies the whole number by the top. Multiply by the bottom, then add the top.'],
                [fraction(top, whole * d), 'The bottom number stays the same.'],
                [fraction(whole * d - n, d), 'Add the extra parts. Do not subtract them.'],
                [fraction(whole * d, d), 'That counts only the complete wholes. Add the extra parts too.'],
                [fraction(d, top), 'That swaps the top and bottom. Keep the original bottom number.']]
                : [[whole + n, 'First count the parts in all the wholes. Do not just add the two visible numbers.'],
                    [whole * whole + n, 'Multiply the whole number by the bottom, not by itself.'],
                    [whole * n, 'Multiply the whole number by the bottom, then add the top.'],
                    [whole * d, 'That counts the complete wholes. Add the extra parts too.']],
            feedback: `${whole} × ${d} + ${n} = ${top}, so ${whole} ${fraction(n, d)} = ${fraction(top, d)}.`,
            fallback: 'Multiply the whole number by the bottom. Add the top. Keep the bottom the same.' });
    }

    function comparisonQuestion(left, right, mode = 'choice') {
        const comparison = compare(left, right), symbol = comparison < 0 ? '<' : comparison > 0 ? '>' : '=';
        const first = show(left), second = show(right);
        const bigger = comparison > 0 ? first : second, smaller = comparison > 0 ? second : first;
        const model = { left, right, symbol };
        const method = `Use the same bottom: ${first} = ${left[0] * right[1]}/${left[1] * right[1]} and ${second} = ${right[0] * left[1]}/${left[1] * right[1]}.`;
        if (mode === 'number') return makeQuestion({ type: 'chooseInequality', mode, fractions: true, model,
            prompt: `Which is greater: ${first} or ${second}? Type the fraction.`, answer: bigger,
            wrong: [[smaller, 'That is the smaller fraction. Compare them using the same bottom number.'],
                [fraction(left[1], left[0]), 'That turns the first fraction upside down.'],
                [fraction(right[1], right[0]), 'That turns the second fraction upside down.']],
            feedback: `${method} ${bigger} is greater.`, fallback: 'Make the bottom numbers match. Multiply each top and bottom by the same number.' });
        return makeQuestion({ type: 'chooseInequality', mode, model,
            prompt: `Which comparison of ${first} and ${second} is correct?`, answer: `${first} ${symbol} ${second}`,
            wrong: [['<', 'That says the first fraction is smaller. Compare equal-sized parts before choosing the sign.'],
                ['>', 'That says the first fraction is greater. Compare equal-sized parts before choosing the sign.'],
                ['=', 'That says the fractions have the same value. Compare their tops after making the bottoms match.']]
                .map(([sign, message]) => [`${first} ${sign} ${second}`, message])
                .concat([['These fractions cannot be compared.', 'Fractions with different bottoms can be compared. Rewrite them with the same bottom.']]),
            feedback: `${method} ${first} ${symbol} ${second}.`, fallback: 'Make the bottom numbers match, then compare the tops.' });
    }

    function negativeQuestion(left, right, mode = 'choice') {
        const [smaller, bigger] = compare(left, right) < 0 ? [left, right] : [right, left];
        return makeQuestion({ type: 'compareNegative', mode, fractions: mode === 'number', model: { left, right },
            prompt: `Which is smaller: ${show(left)} or ${show(right)}?${mode === 'number' ? ' Type the fraction.' : ''}`, answer: show(smaller),
            wrong: [[show(bigger), 'That is closer to zero. The smaller negative fraction is further left on the number line.'],
                ['They are equal.', 'These fractions are at different places on the number line.'],
                [fraction(-smaller[0], smaller[1]), 'Keep the minus sign. Both fractions in the question are negative.']],
            feedback: `${show(smaller)} is further left on the number line, so it is smaller.`,
            fallback: 'For negative numbers, further left means smaller.' });
    }

    function orderQuestion(values, mode = 'choice') {
        const sorted = values.slice().sort(compare), labels = sorted.map(show);
        const order = list => list.join(' < ');
        return makeQuestion({ type: 'orderThree', mode, fractions: mode === 'number', model: { values },
            prompt: mode === 'choice' ? `Put ${values.map(show).join(', ')} in order, smallest first.`
                : `Which is smallest: ${values.map(show).join(', ')}? Type the fraction.`,
            answer: mode === 'choice' ? order(labels) : labels[0],
            wrong: mode === 'choice' ? [[order(labels.slice().reverse()), 'That puts the largest first. Start with the smallest.'],
                [order([labels[1], labels[0], labels[2]]), 'The first two fractions are the wrong way round.'],
                [order([labels[0], labels[2], labels[1]]), 'The last two fractions are the wrong way round.']]
                : [[labels[1], 'There is a smaller fraction in the list. Compare their positions on a number line.'],
                    [labels[2], 'That is the largest fraction. You need the smallest.']],
            feedback: `Smallest first: ${order(labels)}.`, fallback: 'Negative fractions come before positive ones. Compare equal-sized parts within each group.' });
    }

    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type,
            mode: index % 2 ? 'number' : 'choice', seed: E.randomInt(0, 4294967295, random) }));
    }

    function generate(item, random) {
        const E = window.Maths1to9LessonEngine;
        const integer = (min, max) => E.randomInt(min, max, random);
        const mode = item.mode || 'choice';
        let n, d, whole, left, right;
        switch (item.type) {
        case 'nameThePart':
            d = [4, 5, 6, 8, 9, 10, 12][integer(0, 6)]; n = integer(1, d - 1);
            return nameQuestion(n, d, integer(0, 1) ? 'numerator' : 'denominator', mode);
        case 'shadedFraction':
            do { d = integer(3, 8); n = integer(1, d - 1); } while (gcd(n, d) !== 1);
            return shadedQuestion(n, d, mode);
        case 'classifyFraction': {
            const form = ['proper', 'improper', 'mixed'][integer(0, 2)];
            d = form === 'proper' ? integer(3, 8) : integer(2, 6); n = integer(1, d - 1);
            whole = form === 'proper' ? 0 : integer(1, form === 'mixed' ? 4 : 2);
            return classifyQuestion(form === 'improper' ? whole * d + n : n, d, form, whole, mode);
        }
        case 'improperToMixed':
            d = integer(2, 6); return improperQuestion(integer(1, 3), integer(1, d - 1), d, mode);
        case 'mixedToImproper':
            d = integer(2, 6); return mixedQuestion(integer(1, 4), integer(1, d - 1), d, mode);
        case 'chooseInequality':
            do {
                d = integer(2, 6); left = [integer(1, d), d];
                d = integer(2, 8); right = [integer(1, d), d];
            } while (mode === 'number' && compare(left, right) === 0);
            return comparisonQuestion(left, right, mode);
        case 'compareNegative':
            do {
                d = integer(2, 6); left = [-integer(1, d - 1), d];
                d = integer(2, 6); right = [-integer(1, d - 1), d];
            } while (compare(left, right) === 0);
            return negativeQuestion(left, right, mode);
        case 'orderThree':
            return orderQuestion(E.shuffle([[1, 2], [3, 4], [2, 5], [5, 4], [-1, 4], [-3, 4], [-1, 2]], random).slice(0, 3), mode);
        default: throw new Error(`Unknown fraction type: ${item.type}`);
        }
    }

    function examples() {
        return [shadedQuestion(5, 8, 'choice', 'pizza'), nameQuestion(3, 8, 'denominator', 'number'),
            classifyQuestion(9, 5, 'improper', 1), improperQuestion(1, 3, 4, 'number'), mixedQuestion(2, 1, 3, 'number'),
            comparisonQuestion([2, 3], [3, 5]), negativeQuestion([-2, 5], [-1, 5], 'number'),
            orderQuestion([[-3, 4], [2, 5], [-1, 2]])];
    }

    function checks() {
        return [shadedQuestion(3, 5, 'number'), mixedQuestion(2, 1, 3), improperQuestion(2, 3, 4, 'number'),
            comparisonQuestion([2, 3], [3, 4]), negativeQuestion([-3, 4], [-1, 2], 'number')];
    }

    const learnScreens = [
        { title: 'A fraction counts equal parts', lines: ['This bar is one whole, cut into 8 equal parts. Three parts are shaded.',
            'In 3/8, the top number is the numerator. It counts the shaded parts.',
            'The bottom number is the denominator. It counts the equal parts in one whole.'], maths: ['3/8'] },
        { title: 'More parts means smaller pieces', lines: ['Keep the whole the same size. Cut it into more equal parts. Each part gets smaller.',
            'One quarter is bigger than one eighth: 1/4 > 1/8. A bigger bottom number does not mean a bigger fraction.',
            'Move the slider to change the number of equal parts. One part stays shaded.'],
        maths: ['1/4 > 1/8', ...Array.from({ length: 9 }, (_, i) => `1/${i + 2}`)] },
        { title: 'Three ways to write fractions', lines: ['A proper fraction has a top smaller than its bottom. Its value is less than 1.',
            'An improper fraction has a top at least as big as its bottom. For example, 4/4 = 1 and 5/4 is more than 1.',
            'A mixed number has a whole number and a fraction. 1 1/4 and 5/4 have the same value. Choose a form to see it.'],
        maths: ['3/4', '4/4 = 1', '5/4 = 1 1/4'], forms: [{ id: 'proper', n: 3, d: 4, text: 'Proper fraction: 3/4' },
            { id: 'improper', n: 5, d: 4, text: 'Improper fraction: 5/4' }, { id: 'mixed', n: 5, d: 4, text: 'Mixed number: 1 1/4' }] },
        { title: 'Change an improper fraction to a mixed number', lines: ['There are 7 quarters. Four quarters make one whole.',
            '7 ÷ 4 = 1 whole with 3 parts left over. Keep the bottom number 4.', 'So 7/4 = 1 3/4.'], maths: ['7 ÷ 4 = 1 remainder 3', '7/4 = 1 3/4'] },
        { title: 'Change a mixed number to an improper fraction', lines: ['In 2 1/3, each whole has 3 thirds. Two wholes have 2 × 3 = 6 thirds.',
            'Add the extra third: 6 + 1 = 7. Keep the bottom number 3.', 'So 2 1/3 = 7/3. Multiplying 2 by itself would give the wrong answer, 5/3.'], maths: ['2 × 3 + 1 = 7', '2 1/3 = 7/3', '5/3'] },
        { title: 'Compare equal-sized parts', lines: ['With the same bottom number, compare the tops. For example, 3/8 > 2/8.',
            'With different bottoms, rewrite the fractions with the same bottom. Multiply the top and bottom by the same number. This keeps the value the same.',
            '2/3 = 10/15 and 3/5 = 9/15. Ten fifteenths is more than nine fifteenths, so 2/3 > 3/5.',
            'The sign < means smaller than. The sign > means greater than. The sign = means the same value.'],
        maths: ['3/8 > 2/8', '2/3 = (2 × 5)/(3 × 5) = 10/15', '3/5 = (3 × 3)/(5 × 3) = 9/15', '2/3 > 3/5'] },
        { title: 'Negative fractions on a number line', lines: ['Negative numbers are less than zero. They sit to the left of zero on the number line.',
            'Further left means smaller. So -3/4 < -1/2, even though 3/4 is bigger than 1/2.',
            'The positive fractions are to the right of zero. 5/4 is beyond 1 because it is more than one whole.'], maths: ['-3/4', '-1/2', '0', '2/5', '5/4', '-3/4 < -1/2'] },
        { title: 'Put fractions in order', lines: ['Order -3/4, 2/5 and -1/2, smallest first.',
            'Both negative fractions come before the positive fraction. Of the two negatives, -3/4 is further left.',
            'Smallest first: -3/4 < -1/2 < 2/5.'], maths: ['-3/4 < -1/2 < 2/5'] }
    ];

    function barSvg(n, d) {
        const count = Math.ceil(n / d), width = 320, rowHeight = 52;
        let cells = '';
        for (let row = 0; row < count; row++) {
            for (let part = 0; part < d; part++) cells += `<rect x="${1 + part * (width - 2) / d}" y="${1 + row * rowHeight}" width="${(width - 2) / d}" height="40" fill="${row * d + part < n ? '#62c5bc' : '#fff'}" stroke="#334155"/>`;
        }
        return `<svg class="fi-svg" role="img" aria-label="${count} bar${count === 1 ? '' : 's'}, each split into ${d} equal parts; ${n} part${n === 1 ? '' : 's'} shaded in total" viewBox="0 0 ${width} ${count * rowHeight}" width="${width}" height="${count * rowHeight}">${cells}</svg>`;
    }

    function pizzaSvg(n, d) {
        let pieces = '';
        for (let i = 0; i < d; i++) {
            const start = 2 * Math.PI * i / d - Math.PI / 2, end = start + 2 * Math.PI / d;
            pieces += `<path d="M100 100 L${100 + 92 * Math.cos(start)} ${100 + 92 * Math.sin(start)} A92 92 0 ${1 / d > .5 ? 1 : 0} 1 ${100 + 92 * Math.cos(end)} ${100 + 92 * Math.sin(end)} Z" fill="${i < n ? '#f4a259' : '#fff'}" stroke="#334155"/>`;
        }
        return `<svg class="fi-svg fi-pizza" role="img" aria-label="Pizza cut into ${d} equal slices, with ${n} slices left" viewBox="0 0 200 200" width="200" height="200">${pieces}</svg>`;
    }

    function numberLineSvg() {
        const x = value => 30 + (value + 1) * 110;
        let marks = '';
        for (let i = -1; i <= 2; i++) marks += `<path d="M${x(i)} 53v10" stroke="#334155"/><text x="${x(i)}" y="84">${i}</text>`;
        for (const [n, d, below] of [[-3, 4, false], [-1, 2, true], [2, 5, false], [5, 4, true]]) {
            const point = x(n / d);
            marks += `<circle cx="${point}" cy="58" r="4" fill="#155e75"/><path d="M${point} 58V${below ? 97 : 36}" stroke="#155e75"/><text x="${point}" y="${below ? 116 : 27}">${n}/${d}</text>`;
        }
        return `<svg class="fi-svg fi-number-line" role="img" aria-label="Number line from minus 1 to 2: minus 3 quarters, minus one half, two fifths, five quarters" viewBox="0 0 400 138" width="400" height="138"><path d="M20 58H375" stroke="#334155" stroke-width="2"/>${marks}</svg>`;
    }

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function drawLearn(host, screen, section) {
        const data = learnScreens[screen];
        function picture(n, d, caption) {
            const figure = element('figure', '', 'fi-picture');
            figure.innerHTML = barSvg(n, d);
            if (caption) figure.append(element('figcaption', caption, 'fi-equation'));
            return figure;
        }
        if (screen === 0) host.append(picture(3, 8, '3/8'));
        else if (screen === 1) {
            const label = element('label', 'Equal parts in one whole', 'fi-slider-label');
            const slider = document.createElement('input');
            slider.type = 'range'; slider.min = '2'; slider.max = '10'; slider.step = '1'; slider.value = section.state.parts;
            label.append(slider);
            const visual = element('div');
            host.append(label, visual);
            const update = () => {
                slider.setAttribute('aria-valuetext', `${slider.value} equal parts`);
                visual.replaceChildren(picture(1, Number(slider.value), `1/${slider.value}: one of ${slider.value} equal parts`));
            };
            slider.addEventListener('input', () => {
                section.update(state => { state.parts = Number(slider.value); });
                window.Maths1to9Lesson.recordActivity({ id: 'fractions-introduction:pieces', kind: 'explore' });
                update();
            });
            update();
        } else if (screen === 2) {
            const group = element('div', '', 'fi-forms'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'View a fraction form');
            const visual = element('div');
            const buttons = data.forms.map(form => {
                const button = element('button', form.text.split(':')[0]); button.type = 'button';
                button.addEventListener('click', () => {
                    section.update(state => { state.form = form.id; });
                    window.Maths1to9Lesson.recordActivity({ id: 'fractions-introduction:pieces', kind: 'explore' });
                    update();
                });
                group.append(button); return button;
            });
            function update() {
                const current = data.forms.find(form => form.id === section.state.form) || data.forms[0];
                buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(data.forms[index] === current)));
                visual.replaceChildren(picture(current.n, current.d, current.text));
            }
            host.append(group, visual); update();
        } else if (screen === 3) host.append(picture(7, 4, '7/4 = 1 3/4'));
        else if (screen === 4) host.append(picture(7, 3, '2 × 3 + 1 = 7'), element('p', '2 1/3 = 7/3', 'fi-equation'));
        else if (screen === 5) host.append(picture(10, 15, '2/3 = 10/15'), picture(9, 15, '3/5 = 9/15'));
        else host.innerHTML = numberLineSvg();
    }

    function prepare(question, random) {
        const prepared = question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
        if (question.picture) prepared.figure = host => {
            const { n, d, kind } = question.picture;
            host.innerHTML = kind === 'pizza' ? pizzaSvg(n, d) : barSvg(n, d);
        };
        return prepared;
    }

    window.FractionsIntroduction = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn,
        nameQuestion, shadedQuestion, classifyQuestion, improperQuestion, mixedQuestion, comparisonQuestion, negativeQuestion,
        orderQuestion, barSvg, pizzaSvg, numberLineSvg, optionKey, compare };
})();
