(() => {
    'use strict';

    const practiceTypes = ['multiplyVariable', 'addFixedAmount', 'twoStep', 'notation', 'orderSensitive', 'matchStory', 'spotMistake'];
    const words = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times', 6: 'six times' };
    const sameModel = (left, right) => left && right && left.every((value, index) => value === right[index]);

    function expressionQuestion({ type, kind, letter, k = 1, n = 0, story, mode = 'choice', usual = false, prefix = '' }) {
        let answer, wrong, target, numbers, correctTokens;
        const common = 'Start with the letter. Follow each change in the story, in order.';
        if (kind === 'multiply') {
            answer = `${k}${letter}`; target = [0, k, 0]; numbers = [k]; correctTokens = ['A', 'letter'];
            wrong = [[`${letter} + ${k}`, `That adds ${k}. ${k} lots means multiply by ${k}.`],
                [`${letter}${k}`, 'In the usual algebra notation, put the number before the letter.'],
                [`${k} − ${letter}`, 'That subtracts the starting number. The story asks for multiplication.']];
            if (usual) wrong = [[`${k} × ${letter}`, `That has the right value. The usual short form leaves out ×: ${answer}.`], ...wrong.slice(0, 2)];
        } else if (kind === 'add' || kind === 'subtract') {
            const sign = kind === 'add' ? '+' : '−';
            answer = `${letter} ${sign} ${n}`; target = [kind === 'add' ? n : -n, 1, 0]; numbers = [n]; correctTokens = ['letter', sign, 'A'];
            wrong = [[`${n}${letter}`, `That multiplies by ${n}. The story ${kind === 'add' ? 'adds' : 'takes away'} ${n} once.`],
                [`${letter} ${kind === 'add' ? '−' : '+'} ${n}`, `The amount ${kind === 'add' ? 'increases, so add' : 'decreases, so subtract'}.`],
                [`${n} − ${letter}`, 'That starts with the fixed number. Start with the letter, then follow the change.']];
        } else if (kind === 'twoStep') {
            answer = `${k}${letter} + ${n}`; target = [n, k, 0]; numbers = [k, n]; correctTokens = ['A', 'letter', '+', 'B'];
            wrong = [[`${k}${letter}`, `That stops before the extra ${n} is added.`],
                [`${letter} + ${n}`, `That misses the ${k} lots of ${letter}.`],
                [`${k + n}${letter}`, `The ${n} is added once. It is not ${n} extra lots of ${letter}.`]];
        } else if (kind === 'brackets') {
            answer = `${k}(${letter} + ${n})`; target = [k * n, k, 0]; numbers = [k, n]; correctTokens = ['A', '(', 'letter', '+', 'B', ')'];
            wrong = [[`${letter} + ${n} × ${k}`, 'Without brackets, only the added number is multiplied. The whole new amount must be multiplied.'],
                [`${k}${letter} + ${n}`, 'That multiplies the starting number before adding. The story adds first.'],
                [`${k + n}${letter}`, 'That adds the two fixed numbers together. Follow the two changes in order.']];
        } else if (kind === 'square') {
            answer = `${letter}²`; target = [0, 0, 1]; numbers = []; correctTokens = ['square'];
            wrong = [[`2${letter}`, `That is two lots of ${letter}. Squared means ${letter} multiplied by itself.`],
                [`${letter} + 2`, 'The small raised 2 does not mean add 2.'],
                [`${letter}³`, 'A raised 3 means three factors. Squared means two factors.']];
        } else if (kind === 'money') {
            answer = `${n} − ${k}${letter}`; target = [n, -k, 0]; numbers = [n, k]; correctTokens = ['A', '−', 'B', 'letter'];
            wrong = [[`${n} + ${k}${letter}`, 'The money is spent, so subtract the cost.'],
                [`${k}${letter} − ${n}`, 'Start with the money available, then take away the cost.'],
                [`(${n} − ${k})${letter}`, 'Subtract the total cost from the starting money. Do not multiply the starting money by the number of items.']];
        } else throw new Error(`Unknown expression kind: ${kind}`);
        const model = { kind, letter, k, n, target, numbers, correctTokens, usual };
        const feedback = kind === 'square' ? `${letter} × ${letter} is written ${answer}.`
            : kind === 'multiply' ? `${k} × ${letter} is written ${answer}.`
                : `Following the story gives ${answer}.`;
        const prompt = prefix + story + (kind === 'brackets' ? ' Write the final expression.' : '')
            + (usual ? ' Use the usual short algebra notation.' : '');
        if (mode !== 'choice') return { input: 'custom', questionType: type, prompt, model, feedback,
            widget: tileWidget(model, feedback, common) };
        const candidates = wrong.filter(([label], index, list) => label !== answer && list.findIndex(([other]) => other === label) === index);
        if (candidates.length < 3) throw new Error(`Missing expression mistakes for ${type}/${kind}`);
        return { input: 'choice', questionType: type, prompt, model, feedback,
            options: [{ label: answer, correct: true, feedback }, ...candidates.slice(0, 3).map(([label, feedback]) => ({ label, correct: false, feedback }))] };
    }

    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type,
            mode: index % 2 ? 'custom' : 'choice', seed: E.randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const E = window.Maths1to9LessonEngine;
        const choose = values => values[E.randomInt(0, values.length - 1, random)];
        const mode = item.mode || 'choice';
        if (item.type === 'multiplyVariable') {
            const [first, second, noun, letter] = choose([['Sam', 'Amir', 'coins', 'c'], ['Priya', 'Leah', 'points', 'p'],
                ['Josh', 'Dan', 'cards', 'd'], ['Mia', 'Kai', 'goals', 'g'], ['Ella', 'Theo', 'songs', 's']]);
            const k = choose([2, 3, 4, 5]);
            return expressionQuestion({ type: item.type, mode, kind: 'multiply', letter, k,
                story: `${second} has ${letter} ${noun}. ${first} has ${words[k]} as many. Write an expression for ${first}'s number of ${noun}.` });
        }
        if (item.type === 'addFixedAmount') {
            const add = choose([true, false]), n = choose(add ? [3, 5, 6, 8, 10] : [2, 3, 4, 5, 7]);
            const letter = choose(add ? ['t', 'r', 'v'] : ['m', 'k', 'w']);
            return expressionQuestion({ type: item.type, mode, kind: add ? 'add' : 'subtract', letter, n,
                story: `You start with ${letter} points. You ${add ? 'gain' : 'lose'} ${n} points. Write the new total.` });
        }
        if (item.type === 'twoStep') {
            const [first, middle, last, noun, letter] = choose([['Miguel', 'Adam', 'Josh', 'songs', 'p'],
                ['Ravi', 'Beth', 'Cara', 'points', 'q'], ['Omar', 'Lily', 'Zed', 'coins', 'w']]);
            const k = choose([2, 3, 4]), n = choose([5, 6, 10, 20, 30]);
            return expressionQuestion({ type: item.type, mode, kind: 'twoStep', letter, k, n,
                story: `${first} has ${letter} ${noun}. ${middle} has ${words[k]} as many. ${last} has ${n} more than ${middle}. Write ${last}'s number of ${noun}.` });
        }
        if (item.type === 'notation') {
            const letter = choose(['n', 'x', 'y', 'a', 'p', 't']), k = choose([2, 3, 4, 5, 6]), squared = choose([true, false]);
            return expressionQuestion({ type: item.type, mode, kind: squared ? 'square' : 'multiply', letter, k, usual: true,
                story: squared ? `Write ${letter} multiplied by itself.` : `Write ${k} lots of ${letter}.` });
        }
        if (item.type === 'orderSensitive') {
            const letter = choose(['n', 'b', 'h']), n = choose([4, 5, 6, 7, 9]), grouped = choose([true, false]), k = choose([2, 3, 4]);
            return expressionQuestion({ type: item.type, mode, kind: grouped ? 'brackets' : 'subtract', letter, k, n,
                story: grouped ? `Start with ${letter}. Add ${n}, then multiply the whole new amount by ${k}.`
                    : `You have ${letter} stickers. You use ${n} of them. Write how many are left.` });
        }
        if (item.type === 'matchStory') {
            const [itemName, plural, letter, fee] = choose([['song', 'songs', 's', 'membership fee'],
                ['burger', 'burgers', 'b', 'delivery charge'], ['game', 'games', 'g', 'entry fee']]);
            const k = choose([2, 3, 4]), n = choose([2, 3, 5]);
            return expressionQuestion({ type: item.type, mode, kind: 'twoStep', letter, k, n,
                story: `One ${itemName} costs ${letter} pounds. You buy ${k} ${plural} and pay a £${n} ${fee} once. Write the total cost in pounds.` });
        }
        if (item.type === 'spotMistake') {
            const variant = choose(['orderWrong', 'addVsMultiply', 'foundMore']);
            if (variant === 'orderWrong') {
                const letter = choose(['p', 'g', 'b']), k = choose([3, 4, 5, 6]);
                return expressionQuestion({ type: item.type, mode, kind: 'multiply', letter, k, usual: true,
                    story: `Leah writes ${k} pens at ${letter} pounds each as ${letter}${k}. Write the cost correctly.` });
            }
            const letter = choose(variant === 'addVsMultiply' ? ['x', 'n', 'y'] : ['m', 'c', 'k']);
            const n = variant === 'addVsMultiply' ? 3 : choose([4, 5, 6]);
            return expressionQuestion({ type: item.type, mode, kind: 'add', letter, n,
                story: variant === 'addVsMultiply' ? `Aran writes “${letter} add ${n}” as ${n}${letter}. Write the expression correctly.`
                    : `Sam has ${letter} marbles and finds ${n} more. Sam writes ${n}${letter}. Write the correct total.` });
        }
        throw new Error(`Unknown algebra type: ${item.type}`);
    }

    function examples() {
        const start = { input: 'choice', questionType: 'multiplyVariable',
            model: { kind: 'start', letter: 'p', target: [0, 1, 0], numbers: [], correctTokens: ['letter'], usual: false }, prompt: 'Miguel has p songs. What expression do you start with?',
            options: [{ label: 'p', correct: true, feedback: 'The starting number of songs is p.' },
                { label: '2p', correct: false, feedback: 'That is twice the starting number. Start with Miguel’s p songs.' },
                { label: '30', correct: false, feedback: '30 is the extra number later in the story. The starting number is unknown.' },
                { label: 'p + 30', correct: false, feedback: 'That adds the extra songs too soon. Start with p.' }] };
        return [start,
            expressionQuestion({ type: 'multiplyVariable', kind: 'multiply', letter: 'p', k: 2, mode: 'custom', story: 'Miguel has p songs. Adam has twice as many. Write an expression for Adam’s number of songs.' }),
            expressionQuestion({ type: 'twoStep', kind: 'twoStep', letter: 'p', k: 2, n: 30, mode: 'custom', story: 'Adam has twice Miguel’s p songs. Josh has 30 more songs than Adam. Write an expression for Josh’s number of songs.' }),
            expressionQuestion({ type: 'addFixedAmount', kind: 'add', letter: 'c', n: 200, story: 'You start with c coins and win 200 more. Write the new total.' }),
            expressionQuestion({ type: 'addFixedAmount', kind: 'add', letter: 't', n: 6, mode: 'custom', story: 'A team starts with t points. Two wins add 3 points each. Write the new total.' }),
            expressionQuestion({ type: 'matchStory', kind: 'twoStep', letter: 'b', k: 3, n: 2, story: 'One burger costs b pounds. You buy three burgers and pay £2 delivery once. Write the total cost.' }),
            expressionQuestion({ type: 'orderSensitive', kind: 'brackets', letter: 'n', k: 3, n: 2, mode: 'custom', story: 'Start with n. Add 2, then multiply the whole new amount by 3.' }),
            expressionQuestion({ type: 'notation', kind: 'square', letter: 'n', usual: true, story: 'Write n multiplied by itself.' })];
    }
    function checks() {
        return [expressionQuestion({ type: 'multiplyVariable', kind: 'multiply', letter: 'n', k: 3, mode: 'custom', story: 'A bag holds n counters. Write the number in three bags.' }),
            expressionQuestion({ type: 'addFixedAmount', kind: 'add', letter: 'n', n: 3, story: 'Start with n. Add 3.' }),
            expressionQuestion({ type: 'orderSensitive', kind: 'brackets', letter: 'n', k: 3, n: 2, mode: 'custom', story: 'Start with n. Add 2, then multiply the whole new amount by 3.' }),
            expressionQuestion({ type: 'notation', kind: 'square', letter: 'n', usual: true, story: 'Write n multiplied by itself.' }),
            expressionQuestion({ type: 'matchStory', kind: 'money', letter: 'n', k: 4, n: 50, mode: 'custom', story: 'You start with £50. Each game costs £4. Write the money left after n games, in pounds.' })];
    }

    const numberValue = value => {
        const text = String(value ?? '').trim().replace(/−/g, '-');
        if (!/^-?\d+$/.test(text)) return null;
        const number = Number(text);
        return Number.isSafeInteger(number) && Math.abs(number) <= 1000000 ? number : null;
    };
    function normalise(value) {
        return { numbers: { A: String(value?.numbers?.A ?? ''), B: String(value?.numbers?.B ?? '') },
            tokens: Array.isArray(value?.tokens) ? value.tokens.filter(token => typeof token === 'string').slice(0, 12) : [] };
    }

    // These are finite tile layouts, not a parser for typed algebra. Each layout has a known mathematical structure.
    function tileModel(value) {
        const state = normalise(value), numbers = [];
        const key = state.tokens.map(token => {
            if (token === 'A' || token === 'B') { numbers.push(numberValue(state.numbers[token])); return 'N'; }
            return token;
        }).join(' ');
        if (numbers.some(number => number === null)) return null;
        const [a, b] = numbers;
        const layouts = {
            'letter': () => [0, 1, 0], 'square': () => [0, 0, 1],
            'N letter': () => [0, a, 0], 'N × letter': () => [0, a, 0], 'letter × N': () => [0, a, 0],
            'letter × letter': () => [0, 0, 1], 'N square': () => [0, 0, a],
            'letter + N': () => [a, 1, 0], 'N + letter': () => [a, 1, 0],
            'letter − N': () => [-a, 1, 0], 'N − letter': () => [a, -1, 0],
            'N letter + N': () => [b, a, 0], 'N letter − N': () => [-b, a, 0],
            'N + N letter': () => [a, b, 0], 'N − N letter': () => [a, -b, 0],
            'N × letter + N': () => [b, a, 0], 'letter × N + N': () => [b, a, 0], 'N + letter × N': () => [a, b, 0],
            'N ( letter + N )': () => [a * b, a, 0], 'N × ( letter + N )': () => [a * b, a, 0],
            '( letter + N ) × N': () => [a * b, b, 0], '( letter + N ) N': () => [a * b, b, 0],
            'letter + N × N': () => [a * b, 1, 0]
        };
        return Object.hasOwn(layouts, key) ? layouts[key]() : null;
    }
    function tokenText(token, state, letter) {
        if (token === 'A' || token === 'B') return state.numbers[token] ? state.numbers[token].replace(/-/g, '−') : `Number ${token}`;
        return token === 'letter' ? letter : token === 'square' ? `${letter}²` : token;
    }
    function expressionText(value, letter) {
        const state = normalise(value);
        return state.tokens.map(token => tokenText(token, state, letter)).join(' ')
            .replace(/(\d) ([a-z])/g, '$1$2').replace(/([a-z]) (\d)/g, '$1$2')
            .replace(/\( /g, '(').replace(/ \)/g, ')').replace(/(\d) \(/g, '$1(');
    }
    function tileWidget(model, feedback, fallback) {
        function correctValue() {
            return { numbers: { A: String(model.numbers[0] ?? ''), B: String(model.numbers[1] ?? '') }, tokens: [...model.correctTokens] };
        }
        function mark(value) {
            const state = normalise(value), actual = tileModel(state);
            if (!actual) return { correct: false, feedback: state.tokens.join(' ') === 'letter A'
                ? 'In the usual algebra notation, put the number before the letter.'
                : 'Build one expression with the tiles. Put a number before a letter to multiply. Use an operation between amounts.' };
            const correct = sameModel(actual, model.target);
            if (correct && model.usual && state.tokens.join(' ') !== model.correctTokens.join(' ')) {
                return { correct: false, feedback: 'That has the right value. Use the usual short notation: number first, with no × sign. For a letter multiplied by itself, use the squared tile.' };
            }
            if (correct) return { correct: true, feedback };
            let message = fallback;
            if (actual[2] !== model.target[2]) message = 'Squared means the letter multiplied by itself. Two lots of a letter is a different calculation.';
            else if (model.kind === 'brackets') message = 'The story adds first, then multiplies the whole new amount. Use brackets to keep that amount together.';
            else if (model.kind === 'subtract' || model.kind === 'money') message = 'Start with the original amount, then subtract what is lost or spent. Check the order of the two amounts.';
            else if (model.kind === 'multiply') message = 'Lots of a number means multiply. Adding a fixed number gives a different expression.';
            else if (model.kind === 'add') message = 'More means add that number once. It does not mean multiply the starting amount.';
            else if (model.kind === 'twoStep') message = 'Multiply the starting number first, then add the extra amount once. Check that both changes are included.';
            return { correct: false, feedback: message };
        }
        return { mark, correctValue,
            isEmpty: value => { const state = normalise(value); return !state.tokens.length || model.numbers.some((n, index) => !state.numbers[index ? 'B' : 'A'].trim()); },
            answerText: value => expressionText(value, model.letter),
            render(host, { value, editable, onChange }) {
                let state = normalise(value), canEdit = editable;
                const fields = {}, bankButtons = {};
                const numberFields = element('div', '', 'ae-number-fields');
                model.numbers.forEach((number, index) => {
                    const id = index ? 'B' : 'A', label = element('label', `Number ${id}`), input = document.createElement('input');
                    input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off';
                    input.addEventListener('input', () => { state.numbers[id] = input.value; changed(); });
                    label.append(input); numberFields.append(label); fields[id] = input;
                });
                const bank = element('div', '', 'ae-tile-bank'); bank.setAttribute('role', 'group'); bank.setAttribute('aria-label', 'Expression tiles');
                const sequence = element('div', '', 'ae-sequence'); sequence.setAttribute('role', 'group'); sequence.setAttribute('aria-label', 'Your expression. Choose a placed tile to remove it.');
                const preview = element('p', '', 'ae-expression-preview'); preview.setAttribute('aria-live', 'polite');
                host.append(numberFields, element('p', 'Type any numbers you need. Choose tiles in order. Choose a placed tile to remove it.'), bank, sequence, preview);
                const tokens = [...model.numbers.map((number, index) => index ? 'B' : 'A'), 'letter', 'square', '+', '−', '×', '(', ')'];
                for (const token of tokens) {
                    const button = element('button', ''); button.type = 'button'; bankButtons[token] = button;
                    button.addEventListener('click', () => { if (!canEdit || state.tokens.length >= 12) return; state.tokens.push(token); changed(); });
                    bank.append(button);
                }
                function draw() {
                    for (const [id, input] of Object.entries(fields)) { if (input.value !== state.numbers[id]) input.value = state.numbers[id]; input.disabled = !canEdit; }
                    for (const [token, button] of Object.entries(bankButtons)) {
                        button.textContent = tokenText(token, state, model.letter); button.disabled = !canEdit || state.tokens.length >= 12;
                        button.setAttribute('aria-label', `Add ${token === 'A' || token === 'B' ? `number ${token}: ` : ''}${tokenText(token, state, model.letter)} tile`);
                    }
                    sequence.replaceChildren();
                    if (!state.tokens.length) sequence.append(element('span', 'Your tiles go here'));
                    state.tokens.forEach((token, index) => {
                        const button = element('button', tokenText(token, state, model.letter)); button.type = 'button'; button.disabled = !canEdit;
                        button.setAttribute('aria-label', `Remove tile ${index + 1}: ${tokenText(token, state, model.letter)}`);
                        button.addEventListener('click', () => { if (!canEdit) return; state.tokens.splice(index, 1); changed(); }); sequence.append(button);
                    });
                    preview.textContent = expressionText(state, model.letter);
                    preview.hidden = !canEdit;
                }
                function changed() { onChange(JSON.parse(JSON.stringify(state))); draw(); }
                draw();
                return { update(next) { state = normalise(next.value); canEdit = next.editable; draw(); },
                    focus() { (fields.A || bankButtons.letter).focus(); } };
            }
        };
    }

    const learnScreens = [
        { title: 'A letter stands for the starting number', lines: ['A coin counter starts at c. The letter c stands for the number of coins you have.',
            'You win 200 more coins. The new total is c + 200.', 'An expression is a maths phrase that tells you a calculation. It can use letters as well as numbers.'], maths: ['c', 'c + 200'], pictures: ['c', '+ 200', 'c + 200'] },
        { title: 'A number beside a letter means multiply', lines: ['Three lots of n is n + n + n. Write it as 3n.',
            'Put the number before the letter. The usual short form is 3n, not n3.',
            '3n means 3 × n. It is different from n + 3, which adds 3 once. Twice p is 2p.'], maths: ['n + n + n = 3n', '3n = 3 × n', 'n + 3', '2p = 2 × p'], pictures: ['n', 'n', 'n', '3n'] },
        { title: 'Add or take away a fixed amount', lines: ['A football team starts with t points. A win adds 3 points. Two wins add 2 × 3 = 6 points.',
            'The new total is t + 6. Add the extra points once.', 'If you start with n stickers and use 7, the number left is n − 7. Start with n, then take away 7.'], maths: ['2 × 3 = 6', 't + 6', 'n − 7'], pictures: ['t', '+ 3', '+ 3', 't + 6'] },
        { title: 'Follow the song story in order', lines: ['Miguel has p songs. Adam has twice as many, so Adam has 2p songs.',
            'Josh has 30 more songs than Adam. Add 30 to Adam’s number, not Miguel’s starting number.', 'Josh has 2p + 30 songs.'], maths: ['p', '2p', '2p + 30'], pictures: ['p', '2p', '2p + 30'] },
        { title: 'Add a fixed charge once', lines: ['One burger costs b pounds. Three burgers cost 3b pounds.',
            'Delivery costs £2 for the whole order. Add it once, after finding the cost of the burgers.', 'The total cost is 3b + 2 pounds.'], maths: ['3b + 2'], pictures: ['b', 'b', 'b', '+ 2', '3b + 2'] },
        { title: 'Multiply first, then add the bonus', lines: ['Your score starts at s. A power-up triples it, so it becomes 3s.',
            'Then you collect 50 bonus points. Add 50 once.', 'Your final score is 3s + 50.'], maths: ['s', '3s', '3s + 50'], pictures: ['s', '× 3', '+ 50', '3s + 50'] },
        { title: 'Use brackets when the whole amount changes', lines: ['Start with n. Add 2, then multiply the whole new amount by 3.',
            'After adding, the amount is n + 2. Brackets keep it together: 3(n + 2).',
            'n + 2 × 3 does something different. Multiplication comes first, so only the 2 is multiplied. Use brackets for three lots of the whole new amount.'], maths: ['n + 2', '3(n + 2)', 'n + 2 × 3'], pictures: ['(n + 2)', '(n + 2)', '(n + 2)', '3(n + 2)'] },
        { title: 'Squared is different from twice', lines: ['n squared is written n². Squared means n multiplied by itself: n × n.',
            '2n means two lots of n. It does not mean n × n.', 'The small raised number is called a power. A raised 3 means three factors: n³ = n × n × n. A factor here is a number being multiplied.'], maths: ['n² = n × n', '2n = 2 × n', 'n³ = n × n × n'], pictures: ['n × n', 'n²', '2 × n', '2n'] },
        { title: 'Subtract the total amount spent', lines: ['You start with £50. Each game costs £4. For n games, the cost is 4n pounds.',
            'Take that cost away from 50. The money left is 50 − 4n pounds.', 'The order matters: start with 50, then subtract 4n.'], maths: ['4n', '50 − 4n'], pictures: ['50', '− 4n', '50 − 4n'] }
    ];
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function drawLearn(host, screen) {
        const row = element('div', '', 'ae-story-picture'); row.setAttribute('role', 'img');
        row.setAttribute('aria-label', learnScreens[screen].pictures.join(', then '));
        for (const text of learnScreens[screen].pictures) row.append(element('span', text, 'ae-story-tile'));
        host.append(row);
    }
    const prepare = (question, random) => question.options
        ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    window.AlgebraicExpressions = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn,
        expressionQuestion, tileWidget, tileModel, expressionText, numberValue, sameModel,
        correctValue: question => question.widget.correctValue() };
})();
