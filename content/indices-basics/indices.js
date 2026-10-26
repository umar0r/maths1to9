(() => {
    'use strict';

    const sup = number => [...String(number)].map(digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]).join('');
    const power = (base, index) => `${base}${sup(index)}`;
    const repeated = (base, index) => Array(index).fill(base).join(' × ');
    const types = ['identify-parts', 'expand-power', 'calculate-power', 'write-notation', 'apply-power'];
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });

    function question({ type, mode = 'choice', prompt, answer, wrong, feedback, ...details }) {
        const candidates = wrong.filter(([label], index, list) => String(label) !== String(answer)
            && list.findIndex(([other]) => String(other) === String(label)) === index);
        const result = { ...details, input: mode, questionType: type, prompt, feedback };
        if (mode === 'choice') result.options = [option(answer, feedback, true), ...candidates.slice(0, 3).map(([label, message]) => option(label, message))];
        else Object.assign(result, { answer: String(answer), rules: candidates.map(([value, feedback]) => ({ value: String(value), feedback })),
            fallback: details.fallback || 'Write out the repeated multiplication. Use the base once for each copy counted by the index.' });
        return result;
    }

    function identifyPartsQuestion(base, index, askBase, mode = 'choice') {
        const answer = askBase ? base : index;
        return question({ type: 'identify-parts', mode, base, index, askBase,
            prompt: `In ${power(base, index)}, what is the ${askBase ? 'base' : 'index'}?`, answer,
            fallback: askBase ? 'Read the big number. That is the base.' : 'Read the small raised number. That is the index.',
            feedback: `The base is ${base}. The index is ${index}.`,
            wrong: [
                [askBase ? index : base, askBase ? 'That is the small index. The base is the big number.' : 'That is the base. The index is the small raised number.'],
                [base ** index, 'That is the value after multiplying. Read the two parts of the power.'],
                [base + index, 'Do not add the two numbers. Read the part named in the question.'],
                [answer + 1, `Read the ${askBase ? 'big base' : 'small raised index'} again. That is one too many.`],
                [0, 'This power has a positive base and a positive index. Neither part is 0.']
            ] });
    }

    function expandPowerQuestion(base, index, mode = 'choice') {
        const answer = mode === 'choice' ? repeated(base, index) : base;
        return question({ type: 'expand-power', mode, base, index,
            prompt: mode === 'choice' ? `Which shows the copies of the base in ${power(base, index)}?`
                : `Find the missing factor for ${power(base, index)}: ${index > 1 ? `${repeated(base, index - 1)} × ` : ''}□`,
            answer, feedback: `${power(base, index)} = ${repeated(base, index)}`,
            wrong: mode === 'choice' ? [
                [repeated(base, index + 1), 'That uses one extra copy of the base. Count the copies.'],
                [repeated(base, Math.max(1, index - 1)), 'That leaves out a copy of the base.'],
                [`${base} × ${index}`, 'The index counts copies. It is not a factor to multiply by the base.'],
                [`${base} + ${index}`, 'A power uses repeated multiplication, not addition.'],
                [repeated(index, base), 'The base and index have been swapped. Repeat the big base.'],
                [repeated(base, index + 2), 'There are too many copies. Use the index to count them.']
            ] : [
                [index, 'That is the index. Each factor must be a copy of the base.'],
                [base ** index, 'That is the whole value. Fill just the missing factor.'],
                [1, 'Multiplying by 1 does not add another copy of the base.'],
                [base + index, 'Do not add the base and index. Repeat the base.']
            ], fallback: 'Each factor is a copy of the big base. Fill just the missing factor.' });
    }

    function calculatePowerQuestion(base, index, mode = 'choice') {
        return question({ type: 'calculate-power', mode, base, index,
            prompt: `Calculate ${power(base, index)}.`, answer: base ** index,
            feedback: `${power(base, index)} = ${repeated(base, index)} = ${base ** index}`,
            wrong: [
                [base * index, 'That multiplies the base by the index. Multiply copies of the base instead.'],
                [base + index, 'That adds the base and index. A power uses multiplication.'],
                [base ** (index - 1), 'That uses one copy too few. Count every copy.'],
                [index ** base, 'That swaps the base and index. Keep the big number as the base.'],
                [base ** (index + 1), 'That uses one extra copy of the base.'],
                [Number(String(base).repeat(index)), 'That writes the copies side by side. Multiply them instead.']
            ] });
    }

    function writeNotationQuestion(base, index, mode = 'choice') {
        return question({ type: 'write-notation', mode, base, index,
            prompt: mode === 'choice' ? `Which index notation matches ${repeated(base, index)}?`
                : `Write ${repeated(base, index)} in index form. What index goes on the ${base}?`,
            answer: mode === 'choice' ? power(base, index) : index,
            feedback: `${repeated(base, index)} = ${power(base, index)}`,
            wrong: mode === 'choice' ? [
                [power(base, Math.max(1, index - 1)), 'That counts one copy too few.'],
                ...(base ** index !== index ** base ? [[power(index, base), 'That swaps the base and index. The repeated number stays as the base.']] : []),
                [power(base, index + 1), 'That counts one extra copy.'],
                [`${base} × ${index}`, 'That is not index form. Write the count as a small raised number.'],
                [power(base, index + 2), 'There are too many copies. Count only the factors shown.']
            ] : [
                [base, 'That is the base. Count how many copies are shown.'],
                [base ** index, 'That is the value after multiplying. Give the count of copies.'],
                [index - 1, 'A copy is missing from your count.'],
                [index + 1, 'That counts one copy too many.']
            ], fallback: 'Count the copies of the repeated number. That count is the index.' });
    }

    function applyPowerQuestion(scenario, base, index, mode = 'choice') {
        let prompt, answer, unit = '', wrong, feedback;
        if (scenario === 'square') {
            index = 2; unit = 'm²'; answer = base ** 2;
            prompt = `A square rug has side length ${base} m. What is its area?`;
            feedback = `${base} × ${base} = ${answer} m²`;
            wrong = [[base * 4, 'That finds the distance around the square. Area counts the squares inside.'],
                [base + base, 'That adds two side lengths. Area is side multiplied by side.'],
                [base, 'That is the side length. Multiply it by itself to find the area.'],
                [base ** 3, 'That cubes the side. A square uses two copies.']];
        } else if (scenario === 'cube') {
            index = 3; unit = 'cm³'; answer = base ** 3;
            prompt = `A cube-shaped storage box has edges of length ${base} cm. What is its volume?`;
            feedback = `${repeated(base, 3)} = ${answer} cm³`;
            wrong = [[base * 3, 'That adds three edges. Volume multiplies length, width and height.'],
                [base ** 2, 'That is the area of one face. Multiply by the height as well.'],
                [base, 'That is one edge length. A cube uses three copies.'],
                [base * 12, 'That counts the total length of the edges, not the space inside.']];
        } else {
            base = 2; answer = 2 ** index;
            prompt = `A bacteria population doubles every hour, starting from 1. What is the population after ${index} hours?`;
            feedback = `After ${index} hours: ${repeated(2, index)} = ${answer}`;
            wrong = [[2 * index, 'Doubling multiplies by 2 each hour. It does not add 2 each hour.'],
                [index ** 2, 'That squares the hours. Use one factor of 2 for each hour.'],
                [2 ** (index - 1), 'That stops one hour too early.'],
                [2 ** (index + 1), 'That doubles once too many.'],
                [answer + 1, 'The starting 1 is already included. Do not add it again.']];
        }
        const format = value => `${value}${unit ? ` ${unit}` : ''}`;
        const choices = wrong.map(([value, message]) => [mode === 'choice' ? format(value) : value, message]);
        if (mode === 'choice' && unit) choices.unshift([`${answer} ${scenario === 'square' ? 'm' : 'cm'}`, 'Use square units for area and cube units for volume.']);
        return question({ type: 'apply-power', mode, base, index, scenario,
            prompt: mode === 'number' && unit ? `${prompt} Give your answer in ${unit}.` : prompt,
            answer: mode === 'choice' ? format(answer) : answer, wrong: choices, feedback,
            fallback: scenario === 'square' ? 'Multiply the side length by itself.'
                : scenario === 'cube' ? 'Multiply length by width by height. All three lengths are the same.'
                    : 'Start with 1. Multiply by 2 once for each hour.' });
    }

    function grid(size) {
        const board = document.createElement('div');
        board.className = 'indices-grid';
        board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        board.setAttribute('role', 'img');
        board.setAttribute('aria-label', `${size} rows of ${size} small squares`);
        for (let index = 0; index < size * size; index++) {
            const cell = document.createElement('span');
            cell.className = 'indices-grid__cell';
            board.append(cell);
        }
        return board;
    }

    function examples() {
        const square = calculatePowerQuestion(6, 2);
        square.prompt = 'This grid shows 6². How many small squares fill the grid?';
        square.options = [option('12', 'That adds two sides. Count all the squares inside.'),
            option('6', 'That counts just one row. There are six rows.'),
            option('36', '6 × 6 = 36', true), option('18', 'That is 6 × 3. Squared means multiply 6 by itself.')];
        square.figure = host => host.append(grid(6));
        const misconception = { input: 'choice', questionType: 'calculate-power',
            prompt: '4³: Student A says 4 × 3 = 12. Student B says 4 × 4 × 4 = 64. Who is correct?',
            options: [option('Student A', 'The index counts copies. It is not a factor to multiply by 4.'),
                option('Student B', 'Three copies of 4 make 4 × 4 × 4 = 64', true),
                option('Both students', 'Only Student B multiplies three copies of 4.'),
                option('Neither student', 'Student B uses three copies of 4 and gets 64.')] };
        return [identifyPartsQuestion(2, 6, false, 'number'), square, misconception,
            calculatePowerQuestion(9, 1, 'number'), writeNotationQuestion(8, 2, 'number'), applyPowerQuestion('cube', 3, 3, 'number')];
    }
    const checks = () => [identifyPartsQuestion(4, 3, false, 'number'), expandPowerQuestion(3, 4),
        calculatePowerQuestion(5, 3, 'number'), writeNotationQuestion(7, 3), applyPowerQuestion('square', 6, 2, 'number')];
    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const base = randomInt(2, 10, random);
        const index = randomInt(1, 5, random);
        const mode = item.mode || 'choice';
        switch (item.type) {
            case 'identify-parts': return identifyPartsQuestion(base, index, randomInt(0, 1, random) === 0, mode);
            case 'expand-power': return expandPowerQuestion(base, index, mode);
            case 'calculate-power': return calculatePowerQuestion(base, index, mode);
            case 'write-notation': return writeNotationQuestion(base, index, mode);
            case 'apply-power': return applyPowerQuestion(['square', 'cube', 'doubling'][randomInt(0, 2, random)], base, Math.max(2, index), mode);
            default: throw new Error(`Unknown power question type: ${item.type}`);
        }
    }
    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const session = types.map((type, index) => ({ type, mode: index % 2 === 0 ? 'number' : 'choice' }));
        session.push({ type: 'calculate-power', mode: 'choice' });
        return shuffle(session, random).map(item => ({ ...item, seed: randomInt(0, 4294967295, random) }));
    }
    const prepare = (question, random) => question.options
        ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };

    const learnScreens = [
        { title: 'A power counts copies', lines: [
            'The base is the big number. The index, or power, is the small raised number. It counts how many copies of the base to multiply.',
            'In 4³, the base is 4 and the index is 3. Multiply three copies of 4: 4 × 4 × 4 = 64.',
            'A factor is a number in a multiplication. Every factor here is 4.'
        ] },
        { title: 'Build a power one factor at a time', lines: [
            'Choose a base. Move the index slider to add or remove one copy at a time.',
            'The index counts the copies. Multiply all those copies to find the value.'
        ] },
        { title: 'Squared means two copies', lines: [
            '5² is read as “five squared”. It means 5 × 5 = 25.',
            'A square with side length 5 m has 5 rows of 5 small squares. Its area is the space inside: 5 × 5 = 25 m².',
            'The small ² in m² means square metres.'
        ] },
        { title: 'Cubed means three copies', lines: [
            '3³ is read as “three cubed”. It means 3 × 3 × 3 = 27.',
            'A cube has equal length, width and height. Its volume is the space inside: 3 × 3 × 3 = 27 cm³.',
            'The small ³ in cm³ means cubic centimetres. Think of three layers, each with 3 rows of 3 small cubes.'
        ] },
        { title: 'A power of 1', lines: [
            'An index of 1 means just one copy. There is no other copy to multiply by.',
            '9¹ = 9. For any base x, x¹ = x. The letter x stands for a number.'
        ] },
        { title: 'Write repeats in index form', lines: [
            'Index form is the shorter way to write repeated multiplication.',
            'In 8 × 8, count two copies of 8. Keep 8 as the base and write the count as the small index: 8².',
            'For a missing factor, repeat the base: 8³ = 8 × 8 × □, so the missing factor is 8.'
        ] },
        { title: 'Doubling uses powers of 2', lines: [
            'Doubling means multiplying by 2. Start with 1 and double once each hour.',
            'After three hours: 1 × 2 × 2 × 2 = 2³ = 8. Use one factor of 2 for each hour.'
        ] },
        { title: 'Work out the value', lines: [
            'Write every copy, then multiply. For 2³: 2 × 2 = 4, then 4 × 2 = 8.',
            'For 10³: 10 × 10 = 100, then 100 × 10 = 1000.'
        ] },
        { title: 'Keep the base and index in place', lines: [
            '4³ means 4 × 4 × 4 = 64. It does not mean 4 × 3 = 12 or 4 + 3 = 7.',
            'Swapping the base and index changes the power: 2³ = 8, while 3² = 9.'
        ] }
    ];
    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text; node.className = className;
        return node;
    }
    function factorTiles(base, index) {
        const row = element('div', '', 'indices-factor-tiles');
        for (let count = 0; count < index; count++) {
            if (count) row.append(element('span', '×', 'indices-times'));
            row.append(element('span', base, 'indices-factor-tile'));
        }
        return row;
    }
    function drawLearn(host, screen) {
        if (screen === 0) {
            const figure = element('figure', '', 'indices-notation');
            figure.setAttribute('role', 'img');
            figure.setAttribute('aria-label', '4 cubed. Base 4, index 3. Three factors of 4 make 64.');
            figure.innerHTML = '<div class="indices-notation__layout"><div class="indices-notation__label indices-notation__label--base">Base<span>The repeated number</span></div><div class="indices-notation__power">4<sup>3</sup></div><div class="indices-notation__label indices-notation__label--index">Index<span>The count of copies</span></div></div>';
            host.append(figure, factorTiles(4, 3), element('p', '4³ = 4 × 4 × 4 = 64', 'indices-equation'));
        } else if (screen === 2) {
            host.append(grid(5), element('p', '5² = 5 × 5 = 25', 'indices-equation'));
        } else if (screen === 3) {
            const layers = element('div', '', 'indices-cube-layers');
            for (let layer = 0; layer < 3; layer++) layers.append(grid(3));
            host.append(layers, element('p', '3³ = 3 × 3 × 3 = 27', 'indices-equation'), element('p', '3 layers × 9 small cubes = 27 small cubes', 'indices-equation'));
        } else if (screen === 4) host.append(factorTiles(9, 1), element('p', '9¹ = 9', 'indices-equation'));
        else if (screen === 5) host.append(factorTiles(8, 2), element('p', '8 × 8 = 8²', 'indices-equation'));
        else if (screen === 6) {
            const steps = element('div', '', 'indices-doubling');
            for (let hour = 0; hour <= 3; hour++) steps.append(element('div', `${hour} ${hour === 1 ? 'hour' : 'hours'}: ${2 ** hour}`, 'indices-doubling-step'));
            host.append(steps);
        } else if (screen === 7) host.append(factorTiles(2, 3), element('p', '2³ = 8', 'indices-equation'), factorTiles(10, 3), element('p', '10³ = 1000', 'indices-equation'));
        else if (screen === 8) host.append(factorTiles(4, 3), element('p', '4³ = 64', 'indices-equation'),
            element('p', '2³ = 8     3² = 9', 'indices-equation'));
    }
    Object.assign(window.Indices ??= {}, { sup, power, repeated, types, identifyPartsQuestion, expandPowerQuestion,
        calculatePowerQuestion, writeNotationQuestion, applyPowerQuestion, examples, checks, generate, pick, prepare,
        learnScreens, drawLearn, factorTiles });
})();
