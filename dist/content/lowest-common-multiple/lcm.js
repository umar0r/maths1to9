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
    const lcm = pair => product(pair) / hcf(pair);

    function diagramTiles(pair) {
        const overlap = shared(pair);
        const sides = pair.map(primeFactors);
        for (const side of sides) {
            for (const prime of overlap) side.splice(side.indexOf(prime), 1);
        }
        return [sides[0], overlap, sides[1]].flatMap((values, zone) => values.map((value, index) => ({
            id: `${['left', 'shared', 'right'][zone]}:${index}`, value, zone: ['left', 'shared', 'right'][zone]
        })));
    }

    function diagram(host, pair, matches = [], controls = null) {
        const model = element('div', '', 'lcm-model');
        const venn = element('div', '', 'lcm-venn');
        venn.setAttribute('role', controls ? 'group' : 'img');
        venn.setAttribute('aria-label', `Prime factors of ${pair[0]} and ${pair[1]}; overlap: ${matches.join(', ') || 'empty'}`);
        venn.append(element('div', '', 'lcm-circle lcm-circle-left'), element('div', '', 'lcm-circle lcm-circle-right'), element('strong', pair[0], 'lcm-label left'), element('strong', pair[1], 'lcm-label right'));
        for (let zone = 0; zone < 3; zone++) {
            const area = element('div', '', `lcm-zone ${['left', 'shared', 'right'][zone]}`);
            const values = zone === 1 ? matches : [...primeFactors(pair[zone === 0 ? 0 : 1])];
            if (zone !== 1) {
                for (const value of matches) values.splice(values.indexOf(value), 1);
            }
            values.forEach((value, index) => {
                const tile = element(controls ? 'button' : 'span', value, `lcm-tile${zone === 1 ? ' is-shared' : ''}`);
                if (controls) {
                    const id = `${['left', 'shared', 'right'][zone]}:${index}`;
                    tile.type = 'button';
                    tile.dataset.tileId = id;
                    tile.setAttribute('aria-label', `${value}, ${['left', 'shared', 'right'][zone]} tile ${index + 1} for the LCM`);
                    tile.addEventListener('click', () => controls.onSelect(id));
                }
                area.append(tile);
            });
            venn.append(area);
        }
        model.append(venn);
        for (const number of pair) model.append(element('p', `${number} = ${primeFactors(number).join(' × ')}`, 'lcm-formula'));
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
                return { correct, feedback: correct ? (expected.length ? 'Every shared prime is in the overlap, using each pair once.' : 'There are no shared primes. Multiply all the tiles for the LCM.') : 'Some shared primes are still outside the overlap. Match the same prime in both rows, including repeats.' };
            },
            render(host, { value, editable, onChange }) {
                let state = normalise(value);
                let canEdit = editable;
                const picture = element('div');
                const rows = element('div');
                const message = element('p', '', 'lcm-tile-message');
                message.setAttribute('role', 'status');
                const label = element('label', '', 'lcm-none');
                const none = element('input');
                none.type = 'checkbox';
                label.append(none, document.createTextNode('No shared primes'));
                host.append(picture, element('p', 'Choose a prime tile, then the same prime in the other row.'), rows, label, message);
                const buttons = primes.map((values, row) => {
                    const line = element('div', '', 'lcm-row');
                    line.append(element('strong', `${pair[row]}:`));
                    rows.append(line);
                    return values.map((prime, index) => {
                        const button = element('button', prime, 'lcm-tile');
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
    function tileWidget(pair) {
        const tiles = diagramTiles(pair);
        const normalise = value => ({ picked: [...(value?.picked || [])] });
        const selectedTiles = value => tiles.filter(tile => normalise(value).picked.includes(tile.id));
        return {
            isEmpty(value) { return normalise(value).picked.length === 0; },
            answerText(value) {
                const values = selectedTiles(value).map(tile => tile.value);
                return values.length ? `${values.join(' × ')} = ${product(values)}` : '';
            },
            mark(value) {
                const picked = normalise(value).picked;
                const correct = picked.length === tiles.length && new Set(picked).size === tiles.length
                    && tiles.every(tile => picked.includes(tile.id));
                const onlyOverlap = picked.length > 0 && selectedTiles(value).every(tile => tile.zone === 'shared');
                return {
                    correct,
                    feedback: correct ? `Every tile is included once. LCM = ${lcm(pair)}`
                        : onlyOverlap ? 'That is only the overlap. The LCM needs the side tiles too.'
                            : 'Include every tile, using each one once.'
                };
            },
            render(host, { value, editable, onChange }) {
                let state = normalise(value);
                let canEdit = editable;
                const picture = diagram(host, pair, shared(pair), {
                    onSelect(id) {
                        if (!canEdit) return;
                        state.picked = state.picked.includes(id)
                            ? state.picked.filter(picked => picked !== id) : [...state.picked, id];
                        paint();
                        onChange(state);
                    }
                });
                const formula = element('p', '', 'lcm-formula');
                formula.setAttribute('aria-live', 'polite');
                host.append(formula);
                const buttons = [...picture.querySelectorAll('[data-tile-id]')];
                function paint() {
                    buttons.forEach(button => {
                        button.disabled = !canEdit;
                        button.setAttribute('aria-pressed', String(state.picked.includes(button.dataset.tileId)));
                    });
                    const values = selectedTiles(state).map(tile => tile.value);
                    formula.textContent = values.length ? `Chosen tiles: ${values.join(' × ')}` : 'No tiles chosen yet';
                }
                paint();
                return {
                    update(next) { state = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { buttons[0]?.focus(); }
                };
            }
        };
    }

    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    function numberQuestion(pair, input = 'number') {
        const answer = lcm(pair);
        const candidates = [
            [hcf(pair), 'That is the HCF, the overlap only. The LCM uses every prime tile once.'],
            [product(pair), 'That multiplies the two numbers. It counts the shared primes twice.'],
            [pair[0], 'That is the first number. It is not a multiple of both numbers.'],
            [pair[1], 'That is the second number. It is not a multiple of both numbers.'],
            [pair[0] + pair[1], 'That adds the two numbers. Multiply the prime tiles instead.'],
            [answer * 2, 'That is a common multiple, but it is not the lowest.']
        ].filter(([value], index, list) => value !== answer && list.findIndex(([other]) => value === other) === index);
        const feedback = `LCM = ${diagramTiles(pair).map(tile => tile.value).join(' × ')} = ${answer}`;
        const question = {
            pair, prompt: `What is the LCM of ${pair[0]} and ${pair[1]}?`, input,
            questionType: 'lcm-prime-match', feedback,
            figure(host) {
                for (const number of pair) host.append(element('p', `${number} = ${primeFactors(number).join(' × ')}`, 'lcm-formula'));
            }
        };
        if (input === 'choice') {
            question.options = [option(answer, feedback, true), ...candidates.slice(0, 3).map(([value, message]) => option(value, message))];
        } else {
            Object.assign(question, {
                answer: String(answer),
                rules: candidates.map(([value, feedback]) => ({ value: String(value), feedback })),
                fallback: 'Match the shared prime factors. Multiply every tile in both circles, using each tile once.'
            });
        }
        return question;
    }
    function matchQuestion(pair) {
        return { pair, questionType: 'lcm-prime-match', input: 'custom',
            prompt: `Match all the shared primes of ${pair[0]} and ${pair[1]} in the overlap.`, widget: matchingWidget(pair) };
    }
    function buildQuestion(pair) {
        return { pair, questionType: 'lcm-prime-match', input: 'custom',
            prompt: `Choose the tiles to multiply for the LCM of ${pair[0]} and ${pair[1]}.`, widget: tileWidget(pair) };
    }
    function examples() {
        return [matchQuestion([12, 30]), buildQuestion([12, 30]), numberQuestion([12, 30], 'choice'),
            matchQuestion([18, 24]), numberQuestion([18, 24]), numberQuestion([8, 15], 'choice'), numberQuestion([24, 36])];
    }
    function checks() {
        return [
            {
                input: 'choice', questionType: 'lcm-prime-match',
                prompt: '12 = 2 × 2 × 3, 18 = 2 × 3 × 3. Jo says the LCM is 12 × 18 = 216. Is she right?',
                options: [
                    option('Yes. 216 is a multiple of both.', '216 is a common multiple, but not the lowest. 12 × 18 uses the shared 2 and 3 twice.'),
                    option('No. The LCM is 2 × 2 × 3 × 3 = 36.', 'Use the shared 2 and 3 once, plus 2 from 12 and 3 from 18.', true),
                    option('No. The LCM is 2 × 3 = 6.', "That's the HCF: the overlap only."),
                    option('No. The LCM is 18, the bigger number.', "18 isn't a multiple of 12.")
                ]
            },
            {
                input: 'choice', questionType: 'lcm-prime-match',
                prompt: '20 = 2 × 2 × 5, 30 = 2 × 3 × 5. Ben multiplies the overlap and gets 10. Has he found the LCM?',
                options: [
                    option('Yes. 10 is the LCM.', "10 is the HCF. The LCM must be a multiple of both numbers, so it can't be smaller than either."),
                    option('No. Multiply every tile: 2 × 5 × 2 × 3 = 60.', 'Multiply the overlap once and both sides.', true),
                    option('No. The LCM is 20 × 30 = 600.', '600 is a common multiple, but not the lowest. It uses the shared 2 and 5 twice.'),
                    option('No. The LCM is 2 × 5 × 3 = 30.', "That leaves out 20's extra 2. 30 isn't a multiple of 20.")
                ]
            },
            numberQuestion([8, 12]), numberQuestion([9, 10]), numberQuestion([6, 18])
        ];
    }
    const types = ['shared', 'repeated', 'divides', 'coprime', 'match', 'build'];
    function generatedPair(type, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        if (type === 'coprime') return [[8, 15], [9, 20], [16, 25], [15, 28]][randomInt(0, 3, random)];
        const factor = type === 'repeated' ? [4, 8, 9, 12][randomInt(0, 3, random)] : randomInt(2, 12, random);
        if (type === 'divides') return [factor, factor * randomInt(2, 6, random)];
        return [factor * 2, factor * [3, 5, 7][randomInt(0, 2, random)]];
    }
    function generate(item, random) {
        const pair = generatedPair(item.type, random);
        return item.mode === 'custom' ? (item.type === 'build' ? buildQuestion(pair) : matchQuestion(pair))
            : numberQuestion(pair, item.mode || 'number');
    }
    function pick(random) {
        return [['shared', 'choice'], ['repeated', 'number'], ['divides', 'choice'], ['coprime', 'number'], ['match', 'custom'], ['build', 'custom']].map(([type, mode]) => ({ type, mode, seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295, random) }));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    const learnScreens = [
        { title: 'What LCM means', lines: [
            'A multiple is a number in a times table. These lists show multiples of 4 and 6.',
            'A common multiple is in both lists. The lowest common multiple (LCM) is the smallest one.',
            'The highlighted numbers are in both lists. The smallest is 12.'
        ] },
        { title: 'Bigger numbers make longer lists', lines: [
            'These lists show multiples of 24 and 36. The first number in both lists is 72.',
            'Lists can get long. Prime factors help us find the LCM.'
        ] },
        { title: 'Match the prime factors', lines: [
            'A factor divides a number exactly, with no remainder. A prime number has just two factors: 1 and itself.',
            'Prime factors are prime numbers that multiply to make a number. Here, each tile is one prime factor.',
            'Move the slider. Each matching pair of primes moves into the overlap, the part both circles share. Repeated primes can match too.'
        ] },
        { title: 'Multiply every tile', lines: [
            'Multiply every tile in both circles, including the overlap. Use each tile once.',
            'The overlap alone gives the HCF, the biggest factor of both numbers. The LCM uses the overlap and both sides.',
            'Multiplying the two original numbers would count the shared primes twice.'
        ] },
        { title: 'No matches', lines: [
            'When no primes match, multiply all the tiles. That is the same as multiplying the two numbers.'
        ] }
    ];
    function drawLearn(host, index, matches = 0) {
        if (index === 0 || index === 1) {
            const rows = index === 0 ? [[4, [4, 8, 12, 16, 20, 24]], [6, [6, 12, 18, 24, 30]]]
                : [[24, [24, 48, 72]], [36, [36, 72]]];
            const common = index === 0 ? [12, 24] : [72];
            const smallest = common[0];
            for (const [number, values] of rows) {
                const row = element('div', '', 'lcm-row lcm-factor-row');
                row.append(element('strong', `${number}:`));
                for (const value of values) row.append(element('span', value,
                    `lcm-tile${common.includes(value) ? ' is-shared' : ''}${value === smallest ? ' is-largest' : ''}`));
                host.append(row);
            }
            host.append(element('p', `LCM of ${rows[0][0]} and ${rows[1][0]} = ${smallest}`, 'lcm-formula'));
        } else {
            const pair = index === 4 ? [8, 15] : [24, 36];
            const picture = diagram(host, pair, index === 2 ? shared(pair).slice(0, matches) : shared(pair));
            if (index === 3 || index === 4) {
                picture.querySelectorAll('.lcm-zone:not(.shared) .lcm-tile').forEach(tile => tile.classList.add('is-lcm-side'));
                if (index === 3) host.append(element('p', 'HCF = 2 × 2 × 3 = 12', 'lcm-formula'));
                host.append(element('p', `LCM = ${diagramTiles(pair).map(tile => tile.value).join(' × ')} = ${lcm(pair)}`, 'lcm-formula'));
            }
        }
    }
    window.LCM = { primeFactors, shared, hcf, lcm, product, diagram, diagramTiles, matchingWidget, tileWidget,
        numberQuestion, matchQuestion, buildQuestion, examples, checks, types, generate, pick, prepare, learnScreens, drawLearn };
})();
