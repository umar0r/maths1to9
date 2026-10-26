(() => {
    'use strict';

    const practiceTypes = ['singleLetterQuestion', 'hiddenMultiplicationQuestion', 'areaQuestion', 'perimeterQuestion',
        'repeatedLetterQuestion', 'bracketQuestion', 'powerQuestion', 'negativeQuestion', 'negativePowerQuestion', 'divisionQuestion'];
    const textNumber = value => String(value).replace(/-/g, '−');
    const slot = (letter, suffix = '', brackets = false) => ({ letter, suffix, brackets });
    const mistake = (value, feedback, unit) => ({ value, feedback, unit });
    function displayedSlot(part, value) {
        const text = textNumber(value);
        return (part.brackets || text.startsWith('−') ? `(${text})` : text) + part.suffix;
    }
    function substituted(model) {
        return model.parts.map(part => typeof part === 'string' ? part : displayedSlot(part, model.givens[part.letter])).join('');
    }
    function labelFor(model, value, unit = model.unit) {
        return model.currency ? `£${textNumber(value)}` : `${textNumber(value)}${unit ? ` ${unit}` : ''}`;
    }
    function finishModel(model) {
        model.substituted = substituted(model);
        const values = Object.values(model.givens), all = [...values, ...model.fixedNumbers];
        const sum = all.reduce((total, n) => total + n, 0), product = all.reduce((total, n) => total * n, 1);
        model.tiles = [...new Set([...values, ...model.fixedNumbers, ...values.map(Math.abs), ...values.map(n => n * n),
            sum, product, sum + Math.max(...all), product + sum].map(textNumber))].slice(0, 6);
        return model;
    }

    function modelFor(type, p) {
        let model;
        if (type === 'singleLetterQuestion' || type === 'hiddenMultiplicationQuestion') {
            const { fixed, coefficient, value } = p, hidden = type === 'hiddenMultiplicationQuestion', letter = hidden ? 's' : 'h', result = 'C';
            model = { type, params: p, result, context: hidden ? `Entry costs £${fixed}. Each snack costs £${coefficient}.` : 'A cost has a fixed charge and a charge for each hour.',
                formula: `${result} = ${fixed} + ${coefficient}${letter}`, givens: { [letter]: value },
                parts: [`${result} = ${fixed} + ${coefficient} × `, slot(letter)], answer: fixed + coefficient * value,
                unit: 'pounds', currency: true, fixedNumbers: [fixed, coefficient],
                wrong: [mistake(fixed + coefficient + value, 'That adds the coefficient and the value. A number beside a letter means multiply.'),
                    mistake(fixed + Number(`${coefficient}${value}`), `That joins ${coefficient} and ${value} as digits. Multiply them instead.`),
                    mistake((fixed + coefficient) * value, 'That adds before multiplying. Work out the multiplication first.'),
                    mistake(coefficient * value, 'That leaves out the fixed charge.'),
                    mistake(fixed * value + coefficient, 'That swaps the two fixed numbers in the formula. Keep them in their original places.')] };
        } else if (type === 'areaQuestion') {
            const { length: l, width: w } = p;
            model = { type, params: p, result: 'A', context: 'Find the area of a rectangle. Length and width are in cm.', formula: 'A = lw', givens: { l, w },
                parts: ['A = ', slot('l'), ' × ', slot('w')], answer: l * w, unit: 'cm²', fixedNumbers: [],
                wrong: [mistake(l + w, 'That adds the length and width. The formula multiplies them.'),
                    mistake(2 * (l + w), 'That works out the distance around the rectangle. Area is the space inside it.'),
                    mistake(l * w, 'Area uses square centimetres, cm², rather than cm.', 'cm'),
                    mistake(2 * l * w, 'That doubles the area. The formula has no extra factor of 2.')] };
        } else if (type === 'perimeterQuestion') {
            const { length: l, width: w } = p;
            model = { type, params: p, result: 'P', context: 'Find the perimeter of a rectangle. Length and width are in cm.', formula: 'P = 2l + 2w', givens: { l, w },
                parts: ['P = 2 × ', slot('l'), ' + 2 × ', slot('w')], answer: 2 * l + 2 * w, unit: 'cm', fixedNumbers: [2],
                wrong: [mistake(l + w, 'That counts only one length and one width. Both are doubled in the formula.'),
                    mistake(l * w, 'That finds the area. Perimeter is the distance around the rectangle.', 'cm²'),
                    mistake(2 * l + 2 * w, 'Perimeter is a length. Use cm, not square centimetres.', 'cm²'),
                    mistake(2 * l + w, 'That doubles the length but not the width. Replace both letters in the complete formula.')] };
        } else if (type === 'repeatedLetterQuestion' || type === 'negativePowerQuestion') {
            const { x, coefficient: c } = p, negative = type === 'negativePowerQuestion';
            model = { type, params: p, result: 'y', context: 'Use the same value for both copies of x.', formula: `y = x² + ${c}x`, givens: { x },
                parts: ['y = ', slot('x', '²', negative), ` + ${c} × `, slot('x', '', negative)], answer: x * x + c * x, unit: '', fixedNumbers: [c],
                wrong: negative ? [mistake(-x * x + c * x, 'A negative number squared is positive. Keep the negative value inside brackets before squaring.'),
                    mistake(x * x + c * Math.abs(x), 'That loses the minus sign in the second copy of x.'),
                    mistake(x + c * x, 'The first copy of x is squared. Multiply it by itself.')]
                    : [mistake(x + c * x, 'That does not square the first copy of x.'),
                        mistake(x * x + c, 'That leaves the second copy of x out of the multiplication.'),
                        mistake(x * x * c, 'That multiplies the two terms instead of adding them.'),
                        mistake((x * x + c) * x, 'That multiplies the whole sum by x. Only the second term has that multiplication.'),
                        mistake(x * x, 'That leaves out the second term.'), mistake(c * x, 'That leaves out the squared term.')] };
        } else if (type === 'bracketQuestion') {
            const { x } = p, inside = 2 * x - 1;
            model = { type, params: p, result: 'y', context: 'Keep the brackets and replace both copies of x.', formula: 'y = x(2x − 1)', givens: { x },
                parts: ['y = ', slot('x'), ' × (2 × ', slot('x'), ' − 1)'], answer: x * inside, unit: '', fixedNumbers: [2, 1],
                wrong: [mistake(inside, 'That finds only the bracket. Multiply it by the value outside too.'),
                    mistake(2 * x * x - 1, 'That drops the brackets. Work out the whole bracket before multiplying.'),
                    mistake(x * (2 * x + 1), 'The sign inside the bracket is minus, not plus.')] };
        } else if (type === 'powerQuestion') {
            const { length: l, height: h } = p;
            model = { type, params: p, result: 'V', context: 'Find the volume of a pyramid with a square base. l is a side of the base and h is the height, in cm.', formula: 'V = l²h ÷ 3', givens: { l, h },
                parts: ['V = ', slot('l', '²'), ' × ', slot('h'), ' ÷ 3'], answer: l * l * h / 3, unit: 'cm³', fixedNumbers: [3],
                wrong: [mistake(l * h / 3, 'That does not square l. Work out l × l first.'),
                    mistake(l * l * h, 'That leaves out the final division by 3.'),
                    mistake(l * l * h / 3, 'Volume uses cubic centimetres, cm³, rather than cm.', 'cm')] };
        } else if (type === 'negativeQuestion') {
            const { coefficient: c, constant, n } = p;
            model = { type, params: p, result: 'm', context: 'Keep the minus sign when replacing n.', formula: `m = ${c}n + ${constant}`, givens: { n },
                parts: [`m = ${c} × `, slot('n', '', true), ` + ${constant}`], answer: c * n + constant, unit: '', fixedNumbers: [c, constant],
                wrong: [mistake(c * Math.abs(n) + constant, 'That loses the minus sign from the value of n.'),
                    mistake(c + n + constant, 'The number beside n means multiply, not add.'),
                    mistake(c * n, 'That stops before adding the fixed number.')] };
        } else if (type === 'divisionQuestion') {
            const { distance: d, time: t } = p;
            model = { type, params: p, result: 'v', context: 'Distance is in miles and time is in hours. Find the speed.', formula: 'v = d ÷ t', givens: { d, t },
                parts: ['v = ', slot('d'), ' ÷ ', slot('t')], answer: d / t, unit: 'mph', fixedNumbers: [],
                wrong: [mistake(d * t, 'The formula divides distance by time. Do not multiply them.'),
                    mistake(d - t, 'The formula uses division, not subtraction.'),
                    mistake(d / t, 'Speed is measured in miles per hour, mph. Miles alone measures distance.', 'miles')] };
        } else throw new Error(`Unknown substitution type: ${type}`);
        return finishModel(model);
    }

    function makeQuestion(model, mode = 'choice') {
        const givens = Object.entries(model.givens).map(([letter, value]) => `${letter} = ${textNumber(value)}`).join(' and ');
        const prompt = `${model.context} Use ${model.formula} when ${givens}. `
            + (mode === 'custom' ? `Replace each letter, then type ${model.result}${model.unit ? ` in ${model.unit}` : ''}.`
                : `Find ${model.result}${mode === 'number' && model.unit ? ` in ${model.unit}` : ''}.`);
        const feedback = `${model.substituted}. The answer is ${labelFor(model, model.answer)}.`;
        const fallback = 'Replace every letter with its given value. Work out brackets, then powers, then multiply or divide, then add or subtract.';
        const question = { questionType: model.type, prompt, model, feedback };
        if (mode === 'custom') return { ...question, input: 'custom', widget: replacementWidget(model, feedback, fallback) };
        if (mode === 'number') return { ...question, input: 'number', answer: textNumber(model.answer), tolerance: 0,
            rules: model.wrong.filter((wrong, index, list) => wrong.value !== model.answer && list.findIndex(other => other.value === wrong.value) === index)
                .map(wrong => ({ value: textNumber(wrong.value), feedback: wrong.feedback })), fallback };
        const answer = labelFor(model, model.answer);
        const seen = new Set([answer]), wrong = [];
        for (const item of model.wrong) {
            const label = labelFor(model, item.value, item.unit);
            if (!seen.has(label)) { seen.add(label); wrong.push({ label, correct: false, feedback: item.feedback }); }
        }
        if (wrong.length < 3) throw new Error(`Missing substitution mistakes for ${model.type}: ${JSON.stringify(model.params)}`);
        return { ...question, input: 'choice', options: [{ label: answer, correct: true, feedback }, ...wrong.slice(0, 3)] };
    }

    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type, mode: index % 2 ? 'custom' : 'choice',
            seed: E.randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const E = window.Maths1to9LessonEngine, integer = (a, b) => E.randomInt(a, b, random);
        let p;
        switch (item.type) {
        case 'singleLetterQuestion': p = { fixed: integer(3, 8), coefficient: integer(2, 5), value: integer(2, 7) }; break;
        case 'hiddenMultiplicationQuestion': p = { fixed: integer(4, 9), coefficient: integer(2, 5), value: integer(2, 7) }; break;
        case 'areaQuestion': p = { length: integer(3, 10), width: integer(2, 9) }; break;
        case 'perimeterQuestion': p = { length: integer(4, 10), width: integer(2, 8) }; break;
        case 'repeatedLetterQuestion': p = { x: integer(2, 6), coefficient: integer(2, 5) }; break;
        case 'bracketQuestion': p = { x: integer(2, 5) }; break;
        case 'powerQuestion': p = { length: integer(3, 8), height: [6, 9, 12, 15, 18, 21, 24][integer(0, 6)] }; break;
        case 'negativeQuestion': p = { coefficient: integer(2, 5), constant: integer(5, 12), n: -integer(2, 5) }; break;
        case 'negativePowerQuestion': p = { x: -integer(2, 5), coefficient: integer(2, 4) }; break;
        case 'divisionQuestion': { const time = integer(2, 6); p = { time, distance: time * integer(8, 25) }; break; }
        default: throw new Error(`Unknown substitution type: ${item.type}`);
        }
        return makeQuestion(modelFor(item.type, p), item.mode || 'choice');
    }
    function examples() {
        const given = { input: 'choice', questionType: 'replace-values', prompt: 'Use C = 5 + 2s when s = 4. What value is given for s?',
            options: [{ label: '4', correct: true, feedback: 's is given the value 4.' },
                { label: '5', correct: false, feedback: '5 is the fixed charge in the formula. The given value of s is 4.' },
                { label: '2', correct: false, feedback: '2 is the number multiplying s. It is not the given value of s.' },
                { label: '9', correct: false, feedback: 'That adds 5 and 4. Read the value given for s.' }] };
        const cinema = modelFor('hiddenMultiplicationQuestion', { fixed: 5, coefficient: 2, value: 4 });
        const firstOperation = { input: 'choice', questionType: 'replace-values', prompt: 'C = 5 + 2 × 4. Which part do you work out first?',
            options: [{ label: '2 × 4', correct: true, feedback: 'Work out the multiplication before the addition.' },
                { label: '5 + 2', correct: false, feedback: 'That adds before multiplying. Work out 2 × 4 first.' },
                { label: '5 × 4', correct: false, feedback: '5 is added after the multiplication. It is not multiplied by 4.' },
                { label: '2 + 4', correct: false, feedback: 'The sign between 2 and 4 is multiplication, not addition.' }] };
        return [given, makeQuestion(cinema, 'custom'), firstOperation, makeQuestion(cinema, 'number'),
            makeQuestion(modelFor('singleLetterQuestion', { fixed: 6, coefficient: 4, value: 3 })),
            makeQuestion(modelFor('perimeterQuestion', { length: 7, width: 4 }), 'custom'),
            makeQuestion(modelFor('negativePowerQuestion', { x: -3, coefficient: 3 })),
            makeQuestion(modelFor('bracketQuestion', { x: 3 }), 'custom')];
    }
    function checks() {
        return [makeQuestion(modelFor('singleLetterQuestion', { fixed: 6, coefficient: 4, value: 3 }), 'number'),
            makeQuestion(modelFor('areaQuestion', { length: 6, width: 4 })),
            makeQuestion(modelFor('repeatedLetterQuestion', { x: 4, coefficient: 3 }), 'custom'),
            makeQuestion(modelFor('negativePowerQuestion', { x: -3, coefficient: 2 })),
            makeQuestion(modelFor('divisionQuestion', { distance: 150, time: 3 }), 'number')];
    }

    const numeric = value => {
        const text = window.Maths1to9LessonEngine.tidyNumber(value);
        return text === null ? null : Number(text);
    };
    const slotsFor = model => model.parts.filter(part => typeof part !== 'string');
    function normalise(value, count) {
        return { placements: Array.from({ length: count }, (_, i) => value?.placements?.[i] == null ? null : String(value.placements[i])),
            selected: value?.selected == null ? null : String(value.selected), answer: String(value?.answer ?? '') };
    }
    function replacementWidget(model, feedback, fallback) {
        const slots = slotsFor(model);
        function correctValue() {
            return { placements: slots.map(part => textNumber(model.givens[part.letter])), selected: null, answer: textNumber(model.answer) };
        }
        function mark(value) {
            const state = normalise(value, slots.length);
            const wrongIndex = slots.findIndex((part, index) => numeric(state.placements[index]) !== model.givens[part.letter]);
            if (wrongIndex >= 0) {
                const letter = slots[wrongIndex].letter, given = model.givens[letter];
                return { correct: false, feedback: `Use ${textNumber(given)} in the ${letter} space. Keep the other numbers in their original places. Replace every copy of the letter.` };
            }
            const answer = numeric(state.answer);
            if (answer === null) return { correct: false, feedback: 'Type a number in the answer box. Use a minus sign if the answer is negative.' };
            if (answer === model.answer) return { correct: true, feedback };
            return { correct: false, feedback: model.wrong.find(wrong => wrong.value === answer)?.feedback || fallback };
        }
        return { mark, correctValue,
            isEmpty: value => { const state = normalise(value, slots.length); return state.placements.some(item => item === null) || !state.answer.trim(); },
            answerText(value) {
                if (value == null) return '';
                const state = normalise(value, slots.length); let index = 0;
                const calculation = model.parts.map(part => typeof part === 'string' ? part : displayedSlot(part, state.placements[index++] ?? '?')).join('');
                return `${calculation}; ${model.result} = ${state.answer.replace(/-/g, '−')}${model.unit ? ` ${model.unit}` : ''}`;
            },
            render(host, { value, editable, onChange }) {
                let state = normalise(value, slots.length), canEdit = editable;
                const formula = element('div', '', 'su-formula'), slotButtons = [];
                let index = 0;
                for (const part of model.parts) {
                    if (typeof part === 'string') formula.append(document.createTextNode(part));
                    else {
                        const position = index++, button = element('button', ''); button.type = 'button'; button.dataset.letter = part.letter;
                        button.addEventListener('click', () => { if (!canEdit) return; if (state.selected !== null) place(position, state.selected); else { state.placements[position] = null; changed(); } });
                        button.addEventListener('dragover', event => { if (canEdit) event.preventDefault(); });
                        button.addEventListener('drop', event => { event.preventDefault(); const value = event.dataTransfer.getData('text/plain'); if (canEdit && model.tiles.includes(value)) place(position, value); });
                        slotButtons.push(button); formula.append(button);
                    }
                }
                const bank = element('div', '', 'su-value-bank'); bank.setAttribute('role', 'group'); bank.setAttribute('aria-label', 'Values to place');
                const tileButtons = model.tiles.map(value => {
                    const button = element('button', value); button.type = 'button'; button.draggable = true;
                    button.addEventListener('click', () => { if (!canEdit) return; state.selected = state.selected === value ? null : value; changed(); });
                    button.addEventListener('dragstart', event => { if (!canEdit) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', value); });
                    bank.append(button); return button;
                });
                const label = element('label', `Your answer${model.unit ? `, in ${model.unit}` : ''}`, 'su-answer');
                const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off';
                input.addEventListener('input', () => { state.answer = input.value; changed(); }); label.append(input);
                host.append(element('p', 'Choose a value, then choose a letter space. You can also drag a value into a space.'), formula, bank, label);
                function place(position, value) { state.placements[position] = value; state.selected = null; changed(); }
                function changed() { onChange(JSON.parse(JSON.stringify(state))); draw(); }
                function draw() {
                    slotButtons.forEach((button, i) => {
                        const placed = state.placements[i]; button.textContent = placed === null ? `${slots[i].letter}${slots[i].suffix}` : displayedSlot(slots[i], placed);
                        button.disabled = !canEdit; button.setAttribute('aria-label', `${slots[i].letter} space ${i + 1}: ${placed === null ? 'empty' : textNumber(placed)}`);
                    });
                    tileButtons.forEach((button, i) => { button.disabled = !canEdit; button.draggable = canEdit;
                        button.setAttribute('aria-pressed', String(state.selected === model.tiles[i])); button.setAttribute('aria-label', `Value ${model.tiles[i]}`); });
                    if (input.value !== state.answer) input.value = state.answer;
                    input.disabled = !canEdit;
                }
                draw();
                return { update(next) { state = normalise(next.value, slots.length); canEdit = next.editable; draw(); }, focus() { tileButtons[0].focus(); } };
            }
        };
    }

    const learnScreens = [
        { title: 'One formula can use many values', lines: ['A cinema visit costs £5, plus £2 for each snack. The rule is C = 5 + 2s.',
            'A formula is a rule linking amounts. Here s is the number of snacks and C is the cost in pounds.',
            'With 2 snacks, C = 5 + 2 × 2 = 9. With 4 snacks, C = 5 + 2 × 4 = 13. The rule stays the same.'],
        maths: ['C = 5 + 2s', 's = 2', 'C = 5 + 2 × 2 = 9', 's = 4', 'C = 5 + 2 × 4 = 13'], picture: ['C = 5 + 2s', 's = 2: £9', 's = 4: £13'] },
        { title: 'Replace the letter, then calculate', lines: ['Substitution means replacing a letter with its given number. Use C = 6 + 4h when h = 3.',
            '4h means 4 × h. Replace h with 3 to get C = 6 + 4 × 3. Do not join the digits to make 43.',
            'Multiply before adding: 4 × 3 = 12, then 6 + 12 = 18. The cost is £18. Replace the letters on the right side; keep C as the answer label.'],
        maths: ['C = 6 + 4h', 'h = 3', 'C = 6 + 4 × 3', 'C = 6 + 12', 'C = 18'], picture: ['h = 3', 'C = 6 + 4 × 3', 'C = 18'] },
        { title: 'Replace both letters', lines: ['Use P = 2l + 2w when l = 7 and w = 4. The letters l and w are the length and width of a rectangle, in cm.',
            'Perimeter is the distance around the shape. P = 2 × 7 + 2 × 4 = 14 + 8 = 22.',
            'Replace each letter with its own value. The perimeter is 22 cm. It is a length, so use cm, not cm².'],
        maths: ['P = 2l + 2w', 'l = 7', 'w = 4', 'P = 2 × 7 + 2 × 4 = 14 + 8 = 22'], picture: ['l = 7 cm', 'w = 4 cm', 'P = 22 cm'], rectangle: [7, 4] },
        { title: 'Two letters beside each other mean multiply', lines: ['Area is the space inside a shape. For a rectangle, A = lw means A = l × w.',
            'When l = 5 and w = 3, A = 5 × 3 = 15.', 'Area counts squares. The area is 15 cm², or 15 square centimetres.'],
        maths: ['A = lw', 'A = l × w', 'l = 5', 'w = 3', 'A = 5 × 3 = 15'], picture: ['5 cm × 3 cm', 'A = 15 cm²'], rectangle: [5, 3] },
        { title: 'Replace every copy of the letter', lines: ['Use y = x² + 3x when x = 4. Both copies of x become 4.',
            'The raised 2 means squared: multiply the number by itself. Work out the square first.',
            'y = 4² + 3 × 4 = 16 + 12 = 28. Keep the square and replace both copies of x.'],
        maths: ['y = x² + 3x', 'x = 4', 'y = 4² + 3 × 4 = 16 + 12 = 28'], picture: ['x = 4', '4² + 3 × 4', '16 + 12', 'y = 28'] },
        { title: 'Keep the brackets', lines: ['Use y = x(2x − 1) when x = 3. A letter beside a bracket means multiply.',
            'Replace both copies of x: y = 3 × (2 × 3 − 1). Work inside the brackets first.',
            'Inside, 2 × 3 − 1 = 5. Then 3 × 5 = 15. Do not drop the brackets.'],
        maths: ['y = x(2x − 1)', 'x = 3', 'y = 3 × (2 × 3 − 1)', '2 × 3 − 1 = 5', 'y = 3 × 5 = 15'], picture: ['3 × (2 × 3 − 1)', '3 × 5', 'y = 15'] },
        { title: 'Keep a negative value inside brackets', lines: ['Use m = 3n + 7 when n = −2. Replace n with the whole value, including its minus sign.',
            'm = 3 × (−2) + 7. Three lots of −2 gives −6.', 'Then m = −6 + 7 = 1. The brackets help keep the minus sign with the value.'],
        maths: ['m = 3n + 7', 'n = −2', 'm = 3 × (−2) + 7', 'm = −6 + 7 = 1'], picture: ['n = −2', '3 × (−2) + 7', 'm = 1'] },
        { title: 'Square the whole negative value', lines: ['A negative number multiplied by itself gives a positive number. For example, (−3)² = (−3) × (−3) = 9.',
            'Use y = x² + 3x when x = −3. Replace both copies: y = (−3)² + 3 × (−3).',
            'The square is 9 and the multiplication is −9. So y = 9 − 9 = 0. Do not turn (−3)² into −9.'],
        maths: ['(−3)² = (−3) × (−3) = 9', 'y = x² + 3x', 'x = −3', 'y = (−3)² + 3 × (−3)', 'y = 9 − 9 = 0'], picture: ['(−3)² = 9', '3 × (−3) = −9', 'y = 0'] },
        { title: 'Keep the power and the division', lines: ['Volume is the space inside a 3D shape. For a pyramid with a square base, use V = l²h ÷ 3. Here l is a side of the base and h is the height.',
            'When l = 3 and h = 6, replace both letters: V = 3² × 6 ÷ 3.',
            'Work out the square first: 9 × 6 ÷ 3 = 18. The volume is 18 cm³, or 18 cubic centimetres.'],
        maths: ['V = l²h ÷ 3', 'l = 3', 'h = 6', 'V = 3² × 6 ÷ 3', 'V = 9 × 6 ÷ 3 = 18'], picture: ['l = 3 cm', 'h = 6 cm', 'V = 18 cm³'], pyramid: true },
        { title: 'Keep each value in the right place', lines: ['Speed is distance divided by time: v = d ÷ t. Use d = 150 miles and t = 3 hours.',
            'Replace d with 150 and t with 3. Then v = 150 ÷ 3 = 50.',
            'The speed is 50 miles per hour, written 50 mph. Do not swap the values to make 3 ÷ 150.'],
        maths: ['v = d ÷ t', 'd = 150', 't = 3', 'v = 150 ÷ 3 = 50'], picture: ['150 miles', '÷ 3 hours', 'v = 50 mph'] }
    ];
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function drawLearn(host, screen) {
        const data = learnScreens[screen], row = element('div', '', 'su-working');
        for (const line of data.picture) row.append(element('span', line, 'su-working-line'));
        if (data.rectangle) {
            const [l, w] = data.rectangle;
            const visual = element('div');
            visual.innerHTML = `<svg class="su-rectangle" role="img" aria-label="Rectangle of length ${l} cm and width ${w} cm" viewBox="0 0 300 140" width="300" height="140"><rect x="25" y="15" width="200" height="85" fill="#d5f1ed" stroke="#155e75" stroke-width="2"/><text x="125" y="124" text-anchor="middle">${l} cm</text><text x="240" y="64">${w} cm</text></svg>`;
            host.append(visual);
        }
        if (data.pyramid) {
            const visual = element('div');
            visual.innerHTML = '<svg class="su-rectangle" role="img" aria-label="Pyramid with a square base of side 3 cm and height 6 cm" viewBox="0 0 330 160" width="330" height="160"><path d="M45 116L135 140L230 105L140 82Z" fill="#d5f1ed" stroke="#155e75" stroke-width="2"/><path d="M45 116L142 15L230 105M142 15L135 140" fill="none" stroke="#155e75" stroke-width="2"/><path d="M142 15V110" stroke="#64748b" stroke-dasharray="4 3"/><text x="240" y="65">h = 6 cm</text><text x="32" y="153">l = 3 cm</text></svg>';
            host.append(visual);
        }
        host.append(row);
    }
    function prepare(question, random) {
        if (question.options) return { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) };
        if (question.input === 'custom') return { ...question, widget: replacementWidget({ ...question.model,
            tiles: window.Maths1to9LessonEngine.shuffle(question.model.tiles, random) }, question.feedback,
        'Replace every letter. Keep brackets and powers, then work out the calculation in the right order.') };
        return { ...question };
    }
    window.Substitution = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn, modelFor, makeQuestion,
        replacementWidget, substituted, slotsFor, textNumber, numeric, correctValue: question => question.widget.correctValue() };
})();
