(() => {
    'use strict';
    const element = (tag, value = '', className = '') => {
        const node = document.createElement(tag);
        node.textContent = value;
        node.className = className;
        return node;
    };
    function primeFactors(number) {
        const factors = [];
        for (let divisor = 2; divisor <= number; divisor++) {
            while (number % divisor === 0) {
                factors.push(divisor);
                number /= divisor;
            }
        }
        return factors;
    }
    const product = values => values.reduce((a, b) => a * b, 1);
    function shared(pair) {
        const remaining = primeFactors(pair[1]);
        return primeFactors(pair[0]).filter(value => {
            const index = remaining.indexOf(value);
            if (index < 0) return false;
            remaining.splice(index, 1);
            return true;
        });
    }
    const hcf = pair => product(shared(pair));
    function diagram(host, pair, matches = []) {
        const model = element('div', '', 'hcf-model');
        const venn = element('div', '', 'hcf-venn');
        venn.setAttribute('role', 'img');
        venn.setAttribute('aria-label', `Prime factors of ${pair[0]} and ${pair[1]}; overlap: ${matches.join(', ') || 'empty'}`);
        venn.append(element('div', '', 'hcf-circle hcf-circle-left'), element('div', '', 'hcf-circle hcf-circle-right'), element('strong', pair[0], 'hcf-label left'), element('strong', pair[1], 'hcf-label right'));
        for (let zone = 0; zone < 3; zone++) {
            const area = element('div', '', `hcf-zone ${['left', 'shared', 'right'][zone]}`);
            const values = zone === 1 ? matches : [...primeFactors(pair[zone === 0 ? 0 : 1])];
            if (zone !== 1) {
                for (const value of matches) values.splice(values.indexOf(value), 1);
            }
            for (const value of values) area.append(element('span', value, `hcf-tile${zone === 1 ? ' is-shared' : ''}`));
            venn.append(area);
        }
        model.append(venn);
        for (const number of pair) model.append(element('p', `${number} = ${primeFactors(number).join(' × ')}`, 'hcf-formula'));
        host.append(model);
        return model;
    }
    function matchingWidget(pair) {
        const primes = pair.map(primeFactors);
        const normalise = value => ({
            used: [0, 1].map(row => [...(value?.used?.[row] || [])]),
            selected: value?.selected || null,
            none: value?.none === true,
            message: typeof value?.message === 'string' ? value.message : ''
        });
        const matched = value => normalise(value).used[0].map(index => primes[0][index]);
        function valid(value) {
            const state = normalise(value);
            return state.used.every((indices, row) => indices.every(i => Number.isInteger(i) && i >= 0 && i < primes[row].length) && new Set(indices).size === indices.length)
                && state.used[0].length === state.used[1].length
                && state.used[0].every((index, i) => primes[0][index] === primes[1][state.used[1][i]]);
        }
        return {
            isEmpty(value) { const state = normalise(value); return !state.used[0].length && !state.none; },
            answerText(value) {
                return normalise(value).none ? 'No shared primes' : matched(value).join(' × ');
            },
            mark(value) {
                const expected = shared(pair);
                const values = matched(value);
                const state = normalise(value);
                const correct = valid(value) && values.length === expected.length
                    && (expected.length > 0 ? !state.none : state.none);
                if (state.none && expected.length > 0) {
                    return { correct: false, feedback: 'These numbers share prime factors. Match the same primes in both rows.' };
                }
                return { correct, feedback: correct ? (expected.length ? 'Every shared prime is in the overlap, using each pair once.' : 'There are no shared primes. The HCF is 1.') : 'Some shared primes are still outside the overlap. Match the same prime in both rows, including repeats.' };
            },
            render(host, { value, editable, onChange }) {
                let state = normalise(value);
                let canEdit = editable;
                const picture = element('div');
                const rows = element('div');
                const message = element('p', '', 'hcf-tile-message');
                message.setAttribute('role', 'status');
                const label = element('label', '', 'hcf-none');
                const none = element('input');
                none.type = 'checkbox';
                label.append(none, document.createTextNode('No shared primes'));
                host.append(picture, element('p', 'Choose a prime tile, then the same prime in the other row.'), rows, label, message);
                const buttons = primes.map((values, row) => {
                    const line = element('div', '', 'hcf-row');
                    line.append(element('strong', `${pair[row]}:`));
                    rows.append(line);
                    return values.map((prime, index) => {
                        const button = element('button', prime, 'hcf-tile');
                        button.type = 'button';
                        button.setAttribute('aria-label', `${prime}, prime tile ${index + 1} of ${pair[row]}`);
                        button.addEventListener('click', () => {
                            if (!canEdit) return;
                            const previous = state.selected;
                            state.message = '';
                            if (previous?.row === row && previous.index === index) state.selected = null;
                            else if (!previous || previous.row === row) state.selected = { row, index };
                            else if (primes[previous.row][previous.index] !== prime) {
                                state.message = 'Those primes are different. Choose the same prime in both rows.';
                                state.selected = null;
                            } else {
                                state.used[row].push(index);
                                state.used[previous.row].push(previous.index);
                                state.selected = null;
                                state.none = false;
                            }
                            paint();
                            onChange(state);
                            const focus = buttons.flat().find(button => !button.hidden && !button.disabled);
                            if (button.hidden) focus?.focus();
                        });
                        line.append(button);
                        return button;
                    });
                });
                none.addEventListener('change', () => {
                    state.none = none.checked;
                    state.message = '';
                    if (state.none) {
                        state.used = [[], []];
                        state.selected = null;
                    }
                    paint();
                    onChange(state);
                });
                function paint() {
                    message.textContent = state.message;
                    picture.replaceChildren();
                    // Only the pupil's own matches appear in this picture.
                    diagram(picture, pair, matched(state));
                    buttons.forEach((row, r) => row.forEach((button, i) => {
                        button.hidden = state.used[r].includes(i);
                        button.disabled = !canEdit;
                        button.setAttribute('aria-pressed', String(state.selected?.row === r && state.selected.index === i));
                    }));
                    none.checked = state.none;
                    none.disabled = !canEdit;
                }
                paint();
                return {
                    update(next) { state = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { buttons.flat().find(button => !button.hidden)?.focus(); }
                };
            }
        };
    }
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    function numberQuestion(pair, input = 'number') {
        const answer = hcf(pair);
        const sum = shared(pair).reduce((a, b) => a + b, 0);
        const candidates = [
            [sum, shared(pair).length ? 'That adds the shared primes. Multiply them instead.' : 'With no shared primes, the HCF is 1, not 0.'],
            [product(pair) / answer, 'That uses unshared primes too. The HCF uses only the shared primes.'],
            [pair[0], 'That is the first number. It does not divide both numbers.'],
            [pair[1], 'That is the second number. It does not divide both numbers.'],
            [0, 'The HCF cannot be 0. When no primes are shared, it is 1.'],
            [1, 'There are shared primes. Multiply all the matched primes.'],
            [answer * 2, 'That uses an extra factor. Use each matched pair once.']
        ].filter(([value], index, list) => value !== answer && list.findIndex(([other]) => value === other) === index);
        // When one number divides the other, the larger number still cannot be the HCF.
        const feedback = shared(pair).length ? `HCF = ${shared(pair).join(' × ')} = ${answer}` : 'No shared primes: the HCF is 1.';
        const question = { pair, prompt: `What is the HCF of ${pair[0]} and ${pair[1]}?`, input, questionType: 'hcf-prime-match', feedback,
            figure: host => { for (const n of pair) host.append(element('p', `${n} = ${primeFactors(n).join(' × ')}`, 'hcf-formula')); } };
        if (input === 'choice') question.options = [option(answer, feedback, true), ...candidates.slice(0, 3).map(([value, message]) => option(value, message))];
        else Object.assign(question, { answer: String(answer), rules: candidates.map(([value, feedback]) => ({ value: String(value), feedback })), fallback: 'Match the prime factors in both numbers. Multiply the matches, using each pair once.' });
        return question;
    }
    function matchQuestion(pair) {
        return { pair, questionType: 'hcf-prime-match', input: 'custom', prompt: `Match all the shared primes of ${pair[0]} and ${pair[1]} in the overlap.`, widget: matchingWidget(pair) };
    }
    function examples() {
        return [matchQuestion([60, 90]), numberQuestion([60, 90], 'choice'), matchQuestion([40, 60]), numberQuestion([40, 60]), numberQuestion([8, 15], 'choice'), numberQuestion([24, 36])];
    }
    function checks() {
        return [
            { input: 'choice', questionType: 'hcf-prime-match', prompt: '36 = 2 × 2 × 3 × 3 and 60 = 2 × 2 × 3 × 5. Maya says the HCF is 6. Is she right?', options: [
                option('Yes. 6 divides both numbers.', '6 is common, but not the highest. Both numbers have two 2s.'),
                option('No. The HCF is 2 × 2 × 3 = 12.', 'Both numbers share two 2s and one 3.', true),
                option('No. The HCF is 36.', '36 does not divide 60.'),
                option('No. The HCF is 180.', '180 uses every prime. The HCF cannot be bigger than either number.')
            ] },
            { input: 'choice', questionType: 'hcf-prime-match', prompt: '24 = 2 × 2 × 2 × 3 and 40 = 2 × 2 × 2 × 5. Sam puts 2, 2, 2 and 3 in the overlap. What should he do?', options: [
                option('Take out the 3. HCF = 8', '40 has no 3, so the 3 cannot be shared.', true),
                option('Take out a 2. HCF = 12', '40 has three 2s too, and 12 does not divide 40.'),
                option('Keep every tile. HCF = 24', '24 does not divide 40. The 3 is not shared.'),
                option('Swap the 3 for 5. HCF = 40', '24 has no 5. Only shared primes go in the overlap.')
            ] },
            numberQuestion([16, 25]), numberQuestion([20, 30]), numberQuestion([36, 54])
        ];
    }
    const types = ['shared', 'repeated', 'divides', 'coprime', 'match'];
    function generatedPair(type, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        if (type === 'coprime') return [[8, 15], [9, 20], [16, 25], [15, 28]][randomInt(0, 3, random)];
        const factor = type === 'repeated' ? [4, 8, 9, 12][randomInt(0, 3, random)] : randomInt(2, 12, random);
        if (type === 'divides') return [factor, factor * randomInt(2, 6, random)];
        return [factor * 2, factor * [3, 5, 7][randomInt(0, 2, random)]];
    }
    function generate(item, random) {
        const pair = generatedPair(item.type, random);
        return item.mode === 'custom' ? matchQuestion(pair) : numberQuestion(pair, item.mode || 'number');
    }
    function pick(random) {
        return [['shared', 'choice'], ['repeated', 'number'], ['divides', 'choice'], ['coprime', 'number'], ['match', 'custom'], ['match', 'custom']].map(([type, mode]) => ({ type, mode, seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295, random) }));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    const learnScreens = [
        { title: 'What HCF means', lines: ['A factor divides a number exactly, with no remainder.', 'A common factor divides both numbers. The highest common factor (HCF) is the biggest one.', 'The highlighted factors divide both 12 and 18. The biggest is 6.'] },
        { title: 'Match the prime factors', lines: ['A prime number has just two factors: 1 and itself. Examples are 2, 3 and 5.', 'Prime factors are prime numbers that multiply to make a number. Here, each tile is one prime factor.', 'Match the same prime in both rows. Put one tile from each pair in the overlap, the shared part of the circles. Match repeated primes too.'] },
        { title: 'Multiply the overlap', lines: ['Multiply the primes in the overlap, using each matched pair once.', 'Keep the other primes outside the overlap. They are not shared by both numbers.'] },
        { title: 'No matches', lines: ['When no primes match, the HCF is 1. The number 1 divides every whole number.'] }
    ];
    function drawLearn(host, index, matches = 0) {
        if (index === 0) {
            for (const [number, factors] of [[12, [1, 2, 3, 4, 6, 12]], [18, [1, 2, 3, 6, 9, 18]]]) {
                const row = element('div', '', 'hcf-row');
                row.append(element('strong', `${number}:`));
                for (const factor of factors) row.append(element('span', factor, `hcf-tile${[1, 2, 3, 6].includes(factor) ? ' is-shared' : ''}${factor === 6 ? ' is-largest' : ''}`));
                host.append(row);
            }
            host.append(element('p', 'HCF of 12 and 18 = 6', 'hcf-formula'));
        } else {
            const pair = index === 3 ? [8, 15] : [24, 36];
            diagram(host, pair, index === 1 ? shared(pair).slice(0, matches) : index === 2 ? shared(pair) : []);
            if (index === 2) host.append(element('p', 'HCF = 2 × 2 × 3 = 12', 'hcf-formula'));
        }
    }
    window.HCF = { primeFactors, shared, hcf, product, diagram, matchingWidget, numberQuestion, matchQuestion, examples, checks, types, generate, pick, prepare, learnScreens, drawLearn };
})();
