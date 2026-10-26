(() => {
    'use strict';

    const practiceTypes = ['sameLetterAdd', 'sameLetterSubtract', 'mixedLetters', 'lettersAndNumbers', 'powersAndLetters', 'zeroPairs', 'productLetters', 'productPowers'];
    const superscripts = ['', '', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    const familyFor = (base, power) => power === 0 ? 'number' : base + superscripts[power];
    const numberText = value => String(value).replace(/-/g, '−');
    function termText(coefficient, family) {
        if (coefficient === 0) return '0';
        if (family === 'number') return numberText(coefficient);
        const magnitude = Math.abs(coefficient) === 1 ? '' : String(Math.abs(coefficient));
        return (coefficient < 0 ? '−' : '') + magnitude + family;
    }
    const familiesOf = terms => [...new Set(terms.map(term => term.family))];
    function sumsOf(terms) {
        const sums = {};
        for (const term of terms) sums[term.family] = (sums[term.family] || 0) + term.coefficient;
        return sums;
    }
    function formatTerms(terms) {
        return terms.map((term, index) => {
            const unsigned = termText(Math.abs(term.coefficient), term.family);
            return index === 0 ? (term.coefficient < 0 ? '−' : '') + unsigned : ` ${term.coefficient < 0 ? '−' : '+'} ${unsigned}`;
        }).join('');
    }
    function formatSums(sums, families = Object.keys(sums)) {
        const order = [...new Set([...families, ...Object.keys(sums)])].filter(family => family !== 'number').concat('number');
        const terms = order.filter(family => sums[family]).map(family => ({ family, coefficient: sums[family] }));
        return terms.length ? formatTerms(terms) : '0';
    }
    const vectorKey = sums => JSON.stringify(Object.keys(sums).sort().filter(family => sums[family] !== 0).map(family => [family, sums[family]]));
    function sumModel(type, pairs, widgetKind = 'coefficients', extra = {}) {
        const terms = pairs.map(([coefficient, family], index) => ({ id: `term-${index}`, coefficient, family }));
        const families = familiesOf(terms), sums = sumsOf(terms);
        return { kind: 'sum', type, terms, families, sums, expression: formatTerms(terms), answer: formatSums(sums, families), widgetKind, ...extra };
    }
    function wrongSums(model) {
        const result = [], seen = new Set([vectorKey(model.sums)]);
        function add(sums, feedback) {
            const key = vectorKey(sums);
            if (!seen.has(key)) { seen.add(key); result.push({ sums, feedback }); }
        }
        add(sumsOf(model.terms.map(term => ({ ...term, coefficient: Math.abs(term.coefficient) }))), 'That loses a minus sign. Keep each sign with the term that follows it.');
        const multiplied = {};
        for (const family of model.families) multiplied[family] = model.terms.filter(term => term.family === family).reduce((value, term) => value * term.coefficient, 1);
        add(multiplied, 'That multiplies the numbers in each group. Collecting like terms adds or subtracts them.');
        const firstFamily = model.families.find(family => family !== 'number');
        if (firstFamily) {
            const altered = { ...model.sums }; delete altered[firstFamily];
            altered[firstFamily.includes('²') ? firstFamily[0] + '⁴' : firstFamily + '²'] = model.sums[firstFamily];
            add(altered, 'Adding or subtracting terms does not change their letter part or power.');
            add({ [firstFamily]: model.terms.reduce((sum, term) => sum + term.coefficient, 0) }, 'That combines terms with different letter parts. Collect only the terms that match.');
        }
        add({ number: model.terms.reduce((sum, term) => sum + term.coefficient, 0) }, 'That drops the letters. Keep the letter part of each group.');
        if (model.families.includes('number')) { const omitted = { ...model.sums }; omitted.number = 0; add(omitted, 'That leaves out the number terms. Collect them separately.'); }
        add(sumsOf(model.terms.filter(term => Math.abs(term.coefficient) !== 1)), 'A single letter has a number 1 in front, even when it is not written. Keep its sign too.');
        add(sumsOf(model.terms.slice(0, 1)), 'That keeps only the first term. Collect all matching terms.');
        add(sumsOf(model.terms.slice(0, -1)), 'That leaves the last term out. Keep its sign and include it in its group.');
        model.terms.forEach((term, index) => {
            if (term.coefficient < 0) add(sumsOf(model.terms.map((item, i) => i === index ? { ...item, coefficient: -item.coefficient } : item)), 'That changes a minus to a plus. Keep the sign attached to its term.');
        });
        return result;
    }
    function sumQuestion(model, mode = 'choice') {
        const feedback = `${model.expression} simplifies to ${model.answer}.`;
        const prompt = model.widgetKind === 'paint' ? `In ${model.expression}, select the ${model.targetFamily} terms. Type the number in front after collecting those terms.`
            : model.widgetKind === 'sort' ? `Sort the terms in ${model.expression}. Then type the total for each group.`
                : model.widgetKind === 'zero' ? `Simplify ${model.expression}. Make zero pairs, then type the number in front of ${model.letter}.`
                    : `Simplify ${model.expression}.`;
        if (mode !== 'choice') return { input: 'custom', questionType: model.type, prompt, model, feedback, widget: widgetFor(model, feedback) };
        const wrong = wrongSums(model);
        if (wrong.length < 3) throw new Error(`Missing algebra mistakes for ${model.expression}`);
        return { input: 'choice', questionType: model.type, prompt: `Simplify ${model.expression}.`, model, feedback,
            options: [{ label: model.answer, correct: true, feedback }, ...wrong.slice(0, 3).map(item => ({ label: formatSums(item.sums, model.families), correct: false, feedback: item.feedback }))] };
    }
    function zeroModel(positiveCount, negativeCount, letter = 'm') {
        return sumModel('zeroPairs', [[positiveCount, letter], [-negativeCount, letter]], 'zero', { positiveCount, negativeCount, letter });
    }
    function productModel(leftCoefficient, rightCoefficient, leftPower = 1, rightPower = 1, base = 'a') {
        const coefficient = leftCoefficient * rightCoefficient, power = leftPower + rightPower;
        const type = leftPower === 1 && rightPower === 1 ? 'productLetters' : 'productPowers';
        return { kind: 'product', type, base, leftCoefficient, rightCoefficient, leftPower, rightPower, coefficient, power,
            expression: `${termText(leftCoefficient, familyFor(base, leftPower))} × ${termText(rightCoefficient, familyFor(base, rightPower))}`,
            answer: termText(coefficient, familyFor(base, power)), widgetKind: 'product',
            powerChoices: [...new Set([power, leftPower, rightPower, leftPower * rightPower, power + 1, power - 1, 0])].slice(0, 4) };
    }
    function productQuestion(model, mode = 'choice') {
        const feedback = `Multiply the numbers: ${model.leftCoefficient} × ${model.rightCoefficient} = ${model.coefficient}. Count all the letter factors. The answer is ${model.answer}.`;
        const question = { questionType: model.type, prompt: `Simplify ${model.expression}.`, model, feedback };
        if (mode !== 'choice') return { ...question, input: 'custom', widget: productWidget(model, feedback) };
        const alternatives = [[model.coefficient, Math.max(model.leftPower, model.rightPower), 'That leaves out some of the letter factors. Count them all.'],
            [model.leftCoefficient + model.rightCoefficient, model.power, 'Multiply the numbers in front. Do not add them.'],
            [model.coefficient, model.leftPower * model.rightPower, 'Count the letter factors by adding the powers, not multiplying them.'],
            [model.coefficient, 0, 'That drops the letter factors. Keep them in the answer.'],
            [model.leftCoefficient, model.power, 'That leaves out the second number in front. Multiply both numbers.'],
            [model.rightCoefficient, model.power, 'That leaves out the first number in front. Multiply both numbers.']];
        const seen = new Set([model.answer]), wrong = [];
        for (const [coefficient, power, feedback] of alternatives) {
            const label = termText(coefficient, familyFor(model.base, power));
            if (!seen.has(label)) { seen.add(label); wrong.push({ label, correct: false, feedback }); }
        }
        if (wrong.length < 3) throw new Error(`Missing product mistakes for ${model.expression}`);
        return { ...question, input: 'choice', options: [{ label: model.answer, correct: true, feedback }, ...wrong.slice(0, 3)] };
    }
    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type, mode: index % 2 ? 'custom' : 'choice', seed: E.randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const E = window.Maths1to9LessonEngine, integer = (a, b) => E.randomInt(a, b, random), mode = item.mode || 'choice';
        const letter = ['a', 'x', 'm'][integer(0, 2)];
        let model;
        switch (item.type) {
        case 'sameLetterAdd': model = sumModel(item.type, [[integer(2, 9), letter], [integer(1, 9), letter]]); break;
        case 'sameLetterSubtract': model = sumModel(item.type, [[integer(2, 9), letter], [-integer(1, 9), letter]]); break;
        case 'mixedLetters': model = sumModel(item.type, E.shuffle([[integer(2, 9), 'x'], [integer(1, 6), 'y'], [-integer(1, 9), 'x'], [integer(1, 6), 'y']], random)); break;
        case 'lettersAndNumbers': model = sumModel(item.type, [[integer(1, 9), letter], [integer(1, 9), 'number'], [-integer(1, 8), letter], [-integer(1, 8), 'number']]); break;
        case 'powersAndLetters': model = sumModel(item.type, [[integer(1, 8), letter + '²'], [integer(1, 6), letter], [-integer(1, 8), letter + '²']]); break;
        case 'zeroPairs': model = zeroModel(integer(2, 9), integer(1, 7), letter); break;
        case 'productLetters': return productQuestion(productModel(integer(1, 6), integer(1, 6), 1, 1, letter), mode);
        case 'productPowers': return productQuestion(productModel(integer(1, 5), integer(1, 5), 2, integer(1, 2), letter), mode);
        default: throw new Error(`Unknown simplifying type: ${item.type}`);
        }
        return sumQuestion(model, mode);
    }
    function examples() {
        return [sumQuestion(sumModel('lettersAndNumbers', [[4, 'a'], [5, 'number'], [-2, 'a']], 'paint', { targetFamily: 'a' }), 'custom'),
            sumQuestion(sumModel('sameLetterAdd', [[4, 'a'], [5, 'a']])),
            sumQuestion(sumModel('mixedLetters', [[3, 'x'], [2, 'y'], [-1, 'x'], [4, 'number'], [1, 'y'], [-1, 'number']], 'sort'), 'custom'),
            sumQuestion(sumModel('sameLetterSubtract', [[8, 'x'], [-3, 'x']])),
            sumQuestion(zeroModel(7, 2), 'custom'),
            sumQuestion(sumModel('lettersAndNumbers', [[2, 'a'], [6, 'number'], [5, 'a'], [-1, 'number']]), 'custom'),
            sumQuestion(sumModel('powersAndLetters', [[6, 'a²'], [2, 'a²'], [-9, 'a²']])),
            productQuestion(productModel(3, 2))];
    }
    function checks() {
        return [sumQuestion(sumModel('lettersAndNumbers', [[5, 'a'], [-2, 'a'], [4, 'number']]), 'custom'),
            sumQuestion(sumModel('lettersAndNumbers', [[2, 'a'], [3, 'number']])),
            sumQuestion(sumModel('powersAndLetters', [[4, 'a²'], [3, 'a'], [-1, 'a²']])),
            sumQuestion(zeroModel(2, 5), 'custom'), productQuestion(productModel(3, 2), 'custom')];
    }

    const numeric = value => {
        const text = window.Maths1to9LessonEngine.tidyNumber(value), number = text === null ? null : Number(text);
        return Number.isSafeInteger(number) && Math.abs(number) <= 1000000 ? number : null;
    };
    const element = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    };
    function arrowKeys(buttons) {
        buttons.forEach(button => button.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            const available = buttons.filter(item => !item.disabled && !item.hidden);
            const index = available.indexOf(button);
            if (index < 0) return;
            const target = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1
                : (index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + available.length) % available.length;
            event.preventDefault(); available[target].focus();
        }));
    }
    function coefficientFields(host, families, values, onInput) {
        const group = element('div', '', 'sx-coefficient-fields'), fields = {};
        for (const family of families) {
            const label = element('label', family === 'number' ? 'Number part' : `Number in front of ${family}`), input = document.createElement('input');
            input.type = 'text'; input.inputMode = 'text'; input.autocomplete = 'off'; input.value = values[family] || '';
            input.addEventListener('input', () => onInput(family, input.value)); label.append(input); group.append(label); fields[family] = input;
        }
        host.append(group); return fields;
    }
    function updateFields(fields, values, editable) {
        for (const [family, input] of Object.entries(fields)) { const value = String(values?.[family] ?? ''); if (input.value !== value) input.value = value; input.disabled = !editable; }
    }
    function markCoefficients(model, values) {
        for (const family of model.families) {
            if (numeric(values?.[family]) === null) return { correct: false, feedback: 'Type a whole number in each box. Use a minus sign if the number is negative.' };
            if (numeric(values?.[family]) !== model.sums[family]) return { correct: false,
                feedback: family === 'number' ? 'Collect the number terms separately. Keep each plus or minus sign.' : `Collect only the ${family} terms. Add or subtract their numbers and keep the letter part the same.` };
        }
        return { correct: true };
    }
    const coefficientValue = model => Object.fromEntries(model.families.map(family => [family, String(model.sums[family])]));
    const enteredSums = (families, values) => Object.fromEntries(families.map(family => [family, numeric(values?.[family]) || 0]));
    function coefficientAnswer(model, values) {
        if (model.families.some(family => numeric(values?.[family]) === null)) return model.families.map(family => `${family}: ${String(values?.[family] ?? '')}`).join('; ');
        return formatSums(enteredSums(model.families, values), model.families);
    }
    function coefficientsWidget(model, feedback) {
        return {
            correctValue: () => ({ coefficients: coefficientValue(model) }),
            isEmpty: value => model.families.some(family => !String(value?.coefficients?.[family] ?? '').trim()),
            mark(value) { const marked = markCoefficients(model, value?.coefficients); return marked.correct ? { correct: true, feedback } : marked; },
            answerText: value => value == null ? '' : coefficientAnswer(model, value.coefficients),
            render(host, { value, editable, onChange }) {
                let state = { coefficients: { ...value?.coefficients } };
                const fields = coefficientFields(host, model.families, state.coefficients, (family, text) => { state.coefficients[family] = text; onChange(JSON.parse(JSON.stringify(state))); });
                updateFields(fields, state.coefficients, editable);
                return { update(next) { state = { coefficients: { ...next.value?.coefficients } }; updateFields(fields, state.coefficients, next.editable); }, focus() { fields[model.families[0]].focus(); } };
            }
        };
    }
    function paintWidget(model, feedback) {
        const expected = model.terms.filter(term => term.family === model.targetFamily).map(term => term.id);
        const normalise = value => ({ selected: Array.isArray(value?.selected) ? [...value.selected] : [], coefficient: String(value?.coefficient ?? '') });
        return {
            correctValue: () => ({ selected: [...expected], coefficient: String(model.sums[model.targetFamily]) }),
            isEmpty: value => !normalise(value).selected.length || !normalise(value).coefficient.trim(),
            mark(value) {
                const state = normalise(value);
                if (state.selected.length !== expected.length || new Set(state.selected).size !== expected.length || state.selected.some(id => !expected.includes(id))) {
                    return { correct: false, feedback: `Select every ${model.targetFamily} term, including any minus sign. Leave the other terms alone.` };
                }
                return numeric(state.coefficient) === model.sums[model.targetFamily] ? { correct: true, feedback }
                    : { correct: false, feedback: 'The selected terms match. Add or subtract their numbers and keep the letter part the same.' };
            },
            answerText: value => value == null ? '' : `${termText(numeric(value.coefficient) || 0, model.targetFamily)} from the selected terms`,
            render(host, { value, editable, onChange }) {
                let state = normalise(value), canEdit = editable;
                const row = element('div', '', 'sx-term-row'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Select matching terms');
                const buttons = model.terms.map(term => {
                    const button = element('button', termText(term.coefficient, term.family)); button.type = 'button'; button.dataset.termId = term.id;
                    button.addEventListener('click', () => { if (!canEdit) return; state.selected = state.selected.includes(term.id) ? state.selected.filter(id => id !== term.id) : [...state.selected, term.id]; changed(); });
                    row.append(button); return button;
                });
                arrowKeys(buttons);
                const merged = element('span', '', 'sx-term-picture sx-merged-term'); merged.hidden = true; row.prepend(merged);
                host.append(row);
                const fields = coefficientFields(host, [model.targetFamily], { [model.targetFamily]: state.coefficient }, (family, text) => { state.coefficient = text; changed(); });
                const result = element('p', '', 'sx-result'); host.append(result);
                function changed() { onChange(JSON.parse(JSON.stringify(state))); draw(); }
                function draw(phase = 'answer') {
                    buttons.forEach((button, index) => { button.disabled = !canEdit; button.hidden = phase === 'correct' && expected.includes(model.terms[index].id); button.setAttribute('aria-pressed', String(state.selected.includes(model.terms[index].id))); });
                    merged.hidden = phase !== 'correct'; merged.textContent = phase === 'correct' ? termText(model.sums[model.targetFamily], model.targetFamily) : '';
                    updateFields(fields, { [model.targetFamily]: state.coefficient }, canEdit);
                    result.textContent = phase === 'correct' ? model.answer : '';
                }
                draw();
                return { update(next) { state = normalise(next.value); canEdit = next.editable; draw(next.phase); }, focus() { buttons[0].focus(); } };
            }
        };
    }
    function sortingWidget(model, feedback) {
        const normalise = value => ({ placements: { ...value?.placements }, coefficients: { ...value?.coefficients }, selected: value?.selected || null });
        return {
            correctValue: () => ({ placements: Object.fromEntries(model.terms.map(term => [term.id, term.family])), coefficients: coefficientValue(model), selected: null }),
            isEmpty: value => model.terms.some(term => !value?.placements?.[term.id]) || model.families.some(family => !String(value?.coefficients?.[family] ?? '').trim()),
            mark(value) {
                const wrong = model.terms.find(term => value?.placements?.[term.id] !== term.family);
                if (wrong) return { correct: false, feedback: `${termText(wrong.coefficient, wrong.family)} belongs with ${wrong.family === 'number' ? 'the number terms' : `the ${wrong.family} terms`}. Match the whole letter part and power.` };
                const marked = markCoefficients(model, value?.coefficients);
                return marked.correct ? { correct: true, feedback } : marked;
            },
            answerText: value => value == null ? '' : coefficientAnswer(model, value.coefficients),
            render(host, { value, editable, onChange }) {
                let state = normalise(value), canEdit = editable;
                const bank = element('div', '', 'sx-term-row'); bank.setAttribute('role', 'group'); bank.setAttribute('aria-label', 'Terms to sort');
                const grid = element('div', '', 'sx-trays'), trays = {}, trayButtons = {}, termButtons = {};
                host.append(element('p', 'Choose a term, then choose its tray. You can also drag a term into a tray.'), bank, grid);
                for (const family of model.families) {
                    const tray = element('section', '', 'sx-tray'), title = element('button', family === 'number' ? 'Numbers' : `${family} terms`), contents = element('div', '', 'sx-term-row');
                    title.type = 'button'; title.setAttribute('aria-label', `Place selected term in ${family} tray`);
                    title.addEventListener('click', () => { if (canEdit && state.selected) place(state.selected, family); });
                    tray.addEventListener('dragover', event => { if (canEdit) event.preventDefault(); });
                    tray.addEventListener('drop', event => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (canEdit && model.terms.some(term => term.id === id)) place(id, family); });
                    tray.append(title, contents); grid.append(tray); trays[family] = contents; trayButtons[family] = title;
                }
                for (const term of model.terms) {
                    const button = element('button', termText(term.coefficient, term.family)); button.type = 'button'; button.draggable = true; button.dataset.termId = term.id;
                    button.addEventListener('click', () => { if (!canEdit) return; state.selected = state.selected === term.id ? null : term.id; changed(); });
                    button.addEventListener('dragstart', event => { if (!canEdit) event.preventDefault(); else event.dataTransfer.setData('text/plain', term.id); });
                    termButtons[term.id] = button;
                }
                arrowKeys(Object.values(termButtons)); arrowKeys(Object.values(trayButtons));
                const fields = coefficientFields(host, model.families, state.coefficients, (family, text) => { state.coefficients[family] = text; changed(); });
                const result = element('p', '', 'sx-result'); host.append(result);
                function place(id, family) { state.placements[id] = family; state.selected = null; changed(); }
                function changed() { onChange(JSON.parse(JSON.stringify(state))); draw(); }
                function draw(phase = 'answer') {
                    for (const term of model.terms) {
                        const button = termButtons[term.id], target = trays[state.placements[term.id]] || bank;
                        if (button.parentNode !== target) target.append(button);
                        button.disabled = !canEdit; button.draggable = canEdit; button.setAttribute('aria-pressed', String(state.selected === term.id));
                    }
                    Object.values(trayButtons).forEach(button => { button.disabled = !canEdit || !state.selected; });
                    updateFields(fields, state.coefficients, canEdit); result.textContent = phase === 'correct' ? model.answer : '';
                }
                draw();
                return { update(next) { state = normalise(next.value); canEdit = next.editable; draw(next.phase); }, focus() { termButtons[model.terms[0].id].focus(); } };
            }
        };
    }
    function zeroTiles(model) {
        return [...Array.from({ length: model.positiveCount }, (_, i) => ({ id: `positive-${i}`, sign: 1 })),
            ...Array.from({ length: model.negativeCount }, (_, i) => ({ id: `negative-${i}`, sign: -1 }))];
    }
    function zeroPairWidget(model, feedback) {
        const tiles = zeroTiles(model), required = Math.min(model.positiveCount, model.negativeCount);
        const normalise = value => ({ pairs: Array.isArray(value?.pairs) ? value.pairs.map(pair => Array.isArray(pair) ? [...pair] : []) : [], selected: value?.selected || null, coefficient: String(value?.coefficient ?? '') });
        return {
            correctValue: () => ({ pairs: Array.from({ length: required }, (_, i) => [`positive-${i}`, `negative-${i}`]), selected: null, coefficient: String(model.positiveCount - model.negativeCount) }),
            isEmpty: value => !normalise(value).coefficient.trim() || (required > 0 && !normalise(value).pairs.length),
            mark(value) {
                const state = normalise(value), used = new Set();
                for (const pair of state.pairs) {
                    const first = tiles.find(tile => tile.id === pair[0]), second = tiles.find(tile => tile.id === pair[1]);
                    if (pair.length !== 2 || !first || !second || first.id === second.id || used.has(first.id) || used.has(second.id)) return { correct: false, feedback: 'Use each tile in at most one pair.' };
                    if (first.sign === second.sign) return { correct: false, feedback: 'A zero pair needs one positive tile and one negative tile. Two with the same sign do not cancel.' };
                    used.add(first.id); used.add(second.id);
                }
                if (state.pairs.length !== required) return { correct: false, feedback: 'There are still opposite tiles that can make a zero pair.' };
                return numeric(state.coefficient) === model.positiveCount - model.negativeCount ? { correct: true, feedback }
                    : { correct: false, feedback: 'Count the tiles left after the zero pairs cancel. Keep a minus sign if the tiles left are negative.' };
            },
            answerText: value => value == null ? '' : termText(numeric(value.coefficient) || 0, model.letter),
            render(host, { value, editable, onChange }) {
                let state = normalise(value), canEdit = editable;
                const row = element('div', '', 'sx-zero-board'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Positive and negative letter tiles');
                host.append(element('p', 'Choose two tiles to make a pair, or drag one onto another. Choose a paired tile to undo that pair.'), row);
                const buttons = tiles.map(tile => {
                    const button = element('button', '', `sx-zero-tile ${tile.sign > 0 ? 'sx-positive' : 'sx-negative'}`); button.type = 'button'; button.dataset.tileId = tile.id;
                    button.addEventListener('click', () => {
                        if (!canEdit) return;
                        const pair = state.pairs.findIndex(pair => pair.includes(tile.id));
                        if (pair >= 0) { state.pairs.splice(pair, 1); state.selected = null; }
                        else if (state.selected && state.selected !== tile.id) makePair(state.selected, tile.id);
                        else state.selected = state.selected === tile.id ? null : tile.id;
                        changed();
                    });
                    button.addEventListener('dragstart', event => { if (!canEdit) event.preventDefault(); else event.dataTransfer.setData('text/plain', tile.id); });
                    button.addEventListener('dragover', event => { if (canEdit) event.preventDefault(); });
                    button.addEventListener('drop', event => { event.preventDefault(); if (canEdit) { makePair(event.dataTransfer.getData('text/plain'), tile.id); changed(); } });
                    row.append(button); return button;
                });
                arrowKeys(buttons);
                const fields = coefficientFields(host, [model.letter], { [model.letter]: state.coefficient }, (family, text) => { state.coefficient = text; changed(); });
                const result = element('p', '', 'sx-result'); host.append(result);
                function makePair(first, second) {
                    if (first === second || !tiles.some(tile => tile.id === first) || !tiles.some(tile => tile.id === second) || state.pairs.some(pair => pair.includes(first) || pair.includes(second))) return;
                    state.pairs.push([first, second]); state.selected = null;
                }
                function changed() { onChange(JSON.parse(JSON.stringify(state))); draw(); }
                function draw(phase = 'answer') {
                    buttons.forEach((button, index) => {
                        const tile = tiles[index], pairIndex = state.pairs.findIndex(pair => pair.includes(tile.id));
                        button.textContent = `${tile.sign > 0 ? '+' : '−'}${model.letter}${pairIndex >= 0 ? ` · pair ${pairIndex + 1}` : ''}`;
                        button.setAttribute('aria-label', `${tile.id}: ${tile.sign > 0 ? 'positive' : 'negative'} ${model.letter}${pairIndex >= 0 ? `, pair ${pairIndex + 1}` : ''}`);
                        button.setAttribute('aria-pressed', String(state.selected === tile.id)); button.disabled = !canEdit; button.draggable = canEdit;
                        button.hidden = phase === 'correct' && pairIndex >= 0;
                    });
                    updateFields(fields, { [model.letter]: state.coefficient }, canEdit); result.textContent = phase === 'correct' ? model.answer : '';
                }
                draw();
                return { update(next) { state = normalise(next.value); canEdit = next.editable; draw(next.phase); }, focus() { buttons[0].focus(); } };
            }
        };
    }
    function productWidget(model, feedback) {
        const normalise = value => ({ coefficient: String(value?.coefficient ?? ''), power: value?.power == null ? null : Number(value.power) });
        return {
            correctValue: () => ({ coefficient: String(model.coefficient), power: model.power }),
            isEmpty: value => !normalise(value).coefficient.trim() || normalise(value).power === null,
            mark(value) {
                const state = normalise(value);
                if (numeric(state.coefficient) !== model.coefficient) return { correct: false, feedback: 'Multiply the two numbers in front. Do not add them.' };
                if (state.power !== model.power) return { correct: false, feedback: 'Count all the copies of the letter being multiplied. Adding the powers counts those copies.' };
                return { correct: true, feedback };
            },
            answerText: value => value == null ? '' : termText(numeric(value.coefficient) || 0, familyFor(model.base, Number(value.power) || 0)),
            render(host, { value, editable, onChange }) {
                let state = normalise(value), canEdit = editable;
                const fields = coefficientFields(host, ['number'], { number: state.coefficient }, (family, text) => { state.coefficient = text; changed(); });
                const group = element('div', '', 'sx-term-row'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Choose the letter part');
                host.append(element('p', 'Choose the letter part.'), group);
                const buttons = model.powerChoices.map(power => {
                    const button = element('button', power === 0 ? 'No letter' : familyFor(model.base, power)); button.type = 'button';
                    button.addEventListener('click', () => { if (!canEdit) return; state.power = power; changed(); }); group.append(button); return button;
                });
                arrowKeys(buttons);
                function changed() { onChange(JSON.parse(JSON.stringify(state))); draw(); }
                function draw() { updateFields(fields, { number: state.coefficient }, canEdit); buttons.forEach((button, i) => { button.disabled = !canEdit; button.setAttribute('aria-pressed', String(state.power === model.powerChoices[i])); }); }
                draw();
                return { update(next) { state = normalise(next.value); canEdit = next.editable; draw(); }, focus() { fields.number.focus(); } };
            }
        };
    }
    function widgetFor(model, feedback) {
        if (model.widgetKind === 'paint') return paintWidget(model, feedback);
        if (model.widgetKind === 'sort') return sortingWidget(model, feedback);
        if (model.widgetKind === 'zero') return zeroPairWidget(model, feedback);
        return coefficientsWidget(model, feedback);
    }
    const learnScreens = [
        { title: 'An expression is made of terms', lines: ['A term is one part of an expression, separated from the next part by a plus or minus sign.',
            'In 4a + 5 − 2a, the terms are 4a, +5 and −2a. Keep the sign with the term that follows it.',
            'The letter part tells you what kind of term it is. For a letter term, the number in front tells you how many. That number is called the coefficient.'],
        maths: ['4a + 5 − 2a'], terms: [[4, 'a'], [5, 'number'], [-2, 'a']] },
        { title: 'Collect only the terms that match', lines: ['Simplifying means writing a shorter expression with the same value.', 'Like terms have exactly the same letter part. Any small raised number must match too. 4a and −2a match. The number 5 does not match them.',
            'Add or subtract the numbers in front: 4 − 2 = 2. Keep the letter part a.', 'So 4a + 5 − 2a = 2a + 5. The number term stays separate.'],
        maths: ['4 − 2 = 2', '4a + 5 − 2a = 2a + 5'], terms: [[4, 'a'], [5, 'number'], [-2, 'a']], answer: '2a + 5' },
        { title: 'Add or subtract the numbers in front', lines: ['For 4a + 5a, both terms are a terms. 4 + 5 = 9, so the answer is 9a.',
            'For 8x − 3x, subtract the numbers: 8 − 3 = 5. The answer is 5x.', 'Adding terms does not create a new power. 4a + 5a is 9a, not 9a².'],
        maths: ['4a + 5a = 9a', '8x − 3x = 5x'], pictures: ['4a + 5a', '9a', '8x − 3x', '5x'] },
        { title: 'Collect each letter group separately', lines: ['A single letter means one of that letter: b = 1b and x = 1x.',
            'For 3y + 2b + 4y + b, collect 3y + 4y = 7y and 2b + b = 3b. The answer is 7y + 3b.',
            'For 3x + 5y − 2x + y, collect 3x − 2x = x and 5y + y = 6y. The answer is x + 6y.'],
        maths: ['b = 1b', 'x = 1x', '3y + 2b + 4y + b = 7y + 3b', '3x + 5y − 2x + y = x + 6y'], pictures: ['7y + 3b', 'x + 6y'] },
        { title: 'Keep number terms in their own group', lines: ['For 9e + 2 + e + 2, collect the e terms: 9e + e = 10e.',
            'Collect the numbers separately: 2 + 2 = 4. The answer is 10e + 4.',
            '2a + 3 cannot be collected into one term. The a term and the number term do not match. Keep 2a + 3.'],
        maths: ['9e + 2 + e + 2 = 10e + 4', '2 + 2 = 4', '2a + 3'], terms: [[9, 'e'], [2, 'number'], [1, 'e'], [2, 'number']], answer: '10e + 4' },
        { title: 'Sort the terms, then collect each group', lines: ['Start with 3x + 2y − x + 4 + y − 1. Keep the signs as you sort.',
            'The x terms give 3x − x = 2x. The y terms give 2y + y = 3y. The numbers give 4 − 1 = 3.',
            'The answer is 2x + 3y + 3. Do not combine different groups.'],
        maths: ['3x + 2y − x + 4 + y − 1 = 2x + 3y + 3', '3x − x = 2x', '2y + y = 3y', '4 − 1 = 3'],
        trays: [{ label: 'x terms', terms: ['3x', '−x'], result: '2x' }, { label: 'y terms', terms: ['2y', 'y'], result: '3y' }, { label: 'Numbers', terms: ['4', '−1'], result: '3' }] },
        { title: 'A positive and a negative tile make zero', lines: ['A +m tile and a −m tile add to zero. They make a zero pair.',
            'For 7m − 2m, two positive tiles cancel with two negative tiles. Five positive tiles are left, so the answer is 5m.',
            'If there are more negative tiles, the answer is negative. For 2m − 5m, three negative tiles are left, so the answer is −3m.'],
        maths: ['m − m = 0', '7m − 2m = 5m', '2m − 5m = −3m'], zero: { positiveCount: 7, negativeCount: 2, letter: 'm' } },
        { title: 'Match the powers as well as the letters', lines: ['a² means a multiplied by itself. The small raised 2 is a power. An a² term matches another a² term, but it does not match an a term.',
            'For 6a² + 2a² − 9a², collect the numbers: 6 + 2 − 9 = −1.',
            'The answer is −a². We usually leave out the number 1 before a letter. Keep 4x² + 3x as it is: its terms do not match.'],
        maths: ['a² = a × a', '6 + 2 − 9 = −1', '6a² + 2a² − 9a² = −a²', '4x² + 3x'], pictures: ['6a²', '+ 2a²', '− 9a²', '−a²'] },
        { title: 'Multiplying letters is different from adding terms', lines: ['a + a is two lots of a, written 2a. But a × a is a squared, written a².',
            'For 3a × 2a, multiply the numbers: 3 × 2 = 6. The letters give a × a = a².', 'So 3a × 2a = 6a². Keep both the number part and the letter part.'],
        maths: ['a + a = 2a', 'a × a = a²', '3 × 2 = 6', '3a × 2a = 6a²'], pictures: ['3 × 2', 'a × a', '6a²'] },
        { title: 'Count every copy of the letter', lines: ['A power counts how many copies of the letter are multiplied. A factor is one of the numbers being multiplied.',
            'For 3a² × 2a, the numbers give 6. The letters are a × a × a, so they give a³. The answer is 6a³.',
            'For 2a² × 3a², there are four a factors: 2a² × 3a² = 6a⁴. When multiplying the same letter, add the powers. When adding like terms, keep the power unchanged.'],
        maths: ['3a² × 2a = 6a³', 'a × a × a = a³', '2a² × 3a² = 6a⁴'], pictures: ['a² × a', 'a × a × a', 'a³', '6a³'] }
    ];
    function drawLearn(host, index) {
        const screen = learnScreens[index];
        if (screen.terms) {
            const row = element('div', '', 'sx-term-row');
            for (const [coefficient, family] of screen.terms) row.append(element('span', termText(coefficient, family), 'sx-term-picture'));
            host.append(row);
        }
        if (screen.pictures) {
            const row = element('div', '', 'sx-term-row');
            for (const text of screen.pictures) row.append(element('span', text, 'sx-term-picture'));
            host.append(row);
        }
        if (screen.trays) {
            const grid = element('div', '', 'sx-trays');
            for (const data of screen.trays) {
                const tray = element('div', '', 'sx-tray'); tray.append(element('strong', data.label));
                for (const text of data.terms) tray.append(element('span', text, 'sx-term-picture'));
                tray.append(element('strong', data.result)); grid.append(tray);
            }
            host.append(grid);
        }
        if (screen.zero) {
            const board = element('div', '', 'sx-zero-board');
            for (const tile of zeroTiles(screen.zero)) board.append(element('span', `${tile.sign > 0 ? '+' : '−'}m`, `sx-zero-tile ${tile.sign > 0 ? 'sx-positive' : 'sx-negative'}`));
            host.append(board);
        }
        if (screen.answer) host.append(element('p', screen.answer, 'sx-result'));
    }
    function prepare(question, random) {
        if (question.options) return { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) };
        if (question.model.kind === 'product') return { ...question, widget: productWidget({ ...question.model,
            powerChoices: window.Maths1to9LessonEngine.shuffle(question.model.powerChoices, random) }, question.feedback) };
        return { ...question };
    }
    window.SimplifyingExpressions = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn,
        sumModel, sumQuestion, sumsOf, formatTerms, formatSums, termText, familyFor, vectorKey, wrongSums, productModel, productQuestion,
        coefficientsWidget, paintWidget, sortingWidget, zeroPairWidget, productWidget, zeroModel, zeroTiles, numeric,
        correctValue: question => question.widget.correctValue() };
})();
