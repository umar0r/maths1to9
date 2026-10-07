(() => {
    'use strict';

    const SLUG = 'highest-common-factor';
    const PRACTICE_GROUPS = [
        [[18, 30], [42, 70], [45, 75], [30, 50]],
        [[48, 72], [36, 54], [16, 40]],
        [[14, 28], [12, 60]],
        [[9, 20], [15, 28]]
    ];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

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

    function product(factors) {
        return factors.reduce((result, factor) => result * factor, 1);
    }

    function renderMaths(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            if (!walker.currentNode.parentElement.closest('.katex, script')) {
                nodes.push(walker.currentNode);
            }
        }
        nodes.forEach(node => {
            const expression = /\b(?:(?:HCF|LCM|\d+) = )?\d+(?: [×÷+] \d+)+(?: = \d+)*|\b(?:HCF|LCM) = \d+(?: = \d+)*/g;
            const fragment = document.createDocumentFragment();
            let end = 0;
            for (const match of node.textContent.matchAll(expression)) {
                fragment.append(node.textContent.slice(end, match.index));
                const span = element('span');
                const latex = match[0]
                    .replace(/\b(HCF|LCM)\b/g, '\\mathrm{$1}')
                    .replaceAll(' × ', ' \\times ')
                    .replaceAll(' ÷ ', ' \\div ');
                window.katex.render(latex, span, {
                    throwOnError: false
                });
                fragment.append(span);
                end = match.index + match[0].length;
            }
            if (end > 0) {
                fragment.append(node.textContent.slice(end));
                node.replaceWith(fragment);
            }
        });
    }

    function newQuestion(pair) {
        return {
            pair, used: [[], []], overlap: [], selected: null,
            stage: 'match', value: '', message: '', phase: 'answer'
        };
    }

    // Tile indices distinguish repeated primes and survive reloads.
    function remainingTiles(question, row) {
        return primeFactors(question.pair[row])
            .map((value, index) => ({ v: value, i: index }))
            .filter(tile => !question.used[row].includes(tile.i));
    }

    function nextMatch(question) {
        const otherRow = remainingTiles(question, 1);
        return remainingTiles(question, 0).find(tile =>
            otherRow.some(other => other.v === tile.v)
        );
    }

    function addMatch(question, row, tile, other) {
        question.used[row].push(tile.i);
        question.used[other.row].push(other.i);
        question.overlap.push(tile.v);
    }

    function drawDiagram(question, onTileTap) {
        const wrapper = element('div', '', 'hcf-model');
        const venn = element('div', '', 'hcf-venn');
        const shared = question.overlap.join(', ') || 'none';
        venn.setAttribute('aria-label', `Prime factors of ${question.pair.join(' and ')}: shared ${shared}`);
        venn.append(
            element('div', '', 'hcf-circle hcf-circle-left'),
            element('div', '', 'hcf-circle hcf-circle-right'),
            element('strong', question.pair[0], 'hcf-label left'),
            element('strong', question.pair[1], 'hcf-label right')
        );
        const zones = [
            element('div', '', 'hcf-zone left'),
            element('div', '', 'hcf-zone shared'),
            element('div', '', 'hcf-zone right')
        ];
        question.overlap.forEach(value => {
            zones[1].append(element('span', value, 'hcf-tile is-shared'));
        });
        if (question.stage !== 'match') {
            for (let row = 0; row < 2; row++) {
                const zone = zones[row === 0 ? 0 : 2];
                remainingTiles(question, row).forEach(tile => {
                    zone.append(element('span', tile.v, 'hcf-tile'));
                });
            }
        }
        venn.append(...zones);
        wrapper.append(venn);

        for (let row = 0; row < 2; row++) {
            const tiles = remainingTiles(question, row);
            if (question.stage === 'match' && tiles.length > 0) {
                const tileRow = element('div', '', 'hcf-row');
                tileRow.append(element('span', `${question.pair[row]}:`));
                tiles.forEach(tile => {
                    const button = element('button', tile.v, 'hcf-tile');
                    const selected = question.selected?.row === row && question.selected.i === tile.i;
                    button.type = 'button';
                    button.disabled = !onTileTap;
                    button.setAttribute('aria-pressed', String(selected));
                    button.setAttribute('aria-label', `${tile.v}, prime tile ${tile.i + 1} of ${question.pair[row]}`);
                    button.classList.toggle('is-selected', selected);
                    button.addEventListener('click', () => onTileTap(row, tile));
                    tileRow.append(button);
                });
                wrapper.append(tileRow);
            }
            wrapper.append(element('p', `${question.pair[row]} = ${primeFactors(question.pair[row]).join(' × ')}`, 'hcf-formula'));
        }
        renderMaths(wrapper);
        return wrapper;
    }

    function shuffle(values) {
        const result = [...values];
        for (let index = result.length - 1; index > 0; index--) {
            const other = Math.floor(Math.random() * (index + 1));
            [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
    }

    function pickSession() {
        const pairs = shuffle([
            ...shuffle(PRACTICE_GROUPS[0]).slice(0, 2),
            ...PRACTICE_GROUPS.slice(1).map(group => shuffle(group)[0])
        ]);
        const startsWithoutMatches = PRACTICE_GROUPS[3].some(pair =>
            pair[0] === pairs[0][0] && pair[1] === pairs[0][1]
        );
        if (startsWithoutMatches) {
            [pairs[0], pairs[1]] = [pairs[1], pairs[0]];
        }
        return pairs;
    }

    function wrongAnswerFeedback(question, value, guided, index) {
        const answer = product(question.overlap);
        const sum = question.overlap.reduce((total, factor) => total + factor, 0);
        const lcm = product(question.pair) / answer;
        if (question.overlap.length === 0 && value === 0) {
            return 'Nothing shared means the HCF is 1, not 0.';
        }
        if (value === sum) {
            if (!guided) return 'You added. Multiply the overlap.';
            if (index === 0) return 'You added 2 + 3 + 5. Multiply them.';
            return "Multiply, don't add.";
        }
        if (value === lcm) {
            return 'That uses every tile. Use the overlap only.';
        }
        if (guided && value === question.pair[0]) {
            if (index === 0) {
                return '60 uses both 2s, but 90 has only one 2. Only one 2 is shared.';
            }
            return '60 has only two 2s, so only two can be shared.';
        }
        if (question.overlap.length === 0) {
            return 'No shared primes: remember that 1 divides every number.';
        }
        return `Multiply the tiles in the overlap: ${question.overlap.join(' × ')}.`;
    }

    async function mountActivity(root, guided) {
        if (!root || root.dataset.mounted) return;
        root.dataset.mounted = 'true';
        const api = window.Maths1to9Lesson;
        const store = window.Maths1to9Progress;
        const sectionId = guided ? 'interactive' : 'question-bank';
        const total = guided ? 4 : 5;
        function dispatch(name) {
            document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
                detail: { sectionId }
            }));
        }
        dispatch('gate');
        let state = await store.getLessonActivityState(SLUG, sectionId);
        if (!state) {
            state = {
                index: 0, order: guided ? [[60, 90], [40, 60]] : pickSession(),
                items: [], finished: false
            };
        }
        // Retain saved tiles and attempts from the first lesson version.
        state.items.forEach(question => { delete question.failed; });

        function save() {
            store.saveLessonActivityState(SLUG, sectionId, state);
        }
        function reportProgress() {
            let completed = state.index;
            if (guided) completed *= 2;
            if (state.finished) {
                completed = total;
            } else {
                const question = state.items[state.index];
                if (guided && question.stage !== 'match') completed++;
                if (question.phase === 'correct') completed++;
            }
            api.setSectionProgress(sectionId, completed, total);
        }
        function assess(correct) {
            if (guided) return;
            api.recordAssessment({
                questionType: 'hcf-prime-match',
                questionId: `question-bank:${state.index + 1}`, correct
            });
        }
        function tapTile(row, tile) {
            const question = state.items[state.index];
            const selected = question.selected;
            if (selected?.row === row && selected.i === tile.i) {
                question.selected = null;
            } else if (!selected || selected.row === row) {
                question.selected = { row, ...tile };
            } else if (selected.v !== tile.v) {
                question.message = `${selected.v} and ${tile.v} aren't the same prime.`;
                question.shake = true;
                question.selected = null;
            } else {
                addMatch(question, row, tile, selected);
                question.selected = null;
                question.message = '';
                question.shake = false;
            }
            render();
        }
        function renderOptions(question) {
            const options = element('div', '', 'hcf-options');
            options.setAttribute('role', 'group');
            options.setAttribute('aria-label', 'Choose the HCF');
            [30, 10, 60, 180].forEach(value => {
                const button = element('button', value, 'button');
                const selected = question.value === String(value);
                button.type = 'button';
                button.disabled = question.phase !== 'answer';
                button.setAttribute('aria-pressed', String(selected));
                if (selected) {
                    if (question.phase === 'correct') button.classList.add('is-correct');
                    else if (question.phase === 'wrong') button.classList.add('is-incorrect');
                    else button.classList.add('is-selected');
                }
                button.addEventListener('click', () => {
                    question.value = String(value);
                    render();
                });
                options.append(button);
            });
            root.append(options);
        }
        function renderInput(question) {
            const label = element('label', 'HCF = ', 'hcf-input');
            const input = element('input');
            input.type = 'number';
            input.min = '0';
            input.step = '1';
            input.value = question.value;
            input.disabled = question.phase !== 'answer';
            input.addEventListener('input', () => {
                question.value = input.value;
                save();
                updateAction();
            });
            input.addEventListener('keydown', event => {
                if (event.key !== 'Enter' || question.value.trim() === '') return;
                event.preventDefault();
                if (question.phase === 'answer') handleAction();
            });
            label.append(input);
            root.append(label);
        }
        function render() {
            root.replaceChildren();
            if (state.finished) {
                root.append(element('h3', guided ? 'Both examples complete' : 'Five questions complete'));
                dispatch('complete');
                api.clearSectionAction(sectionId);
                reportProgress();
                save();
                return;
            }
            const question = state.items[state.index] ??= newQuestion(state.order[state.index]);
            const position = guided ? `Example ${state.index + 1} of 2` : `Question ${state.index + 1} of 5`;
            root.append(element('p', position, 'question-number'));
            if (!guided || state.index === 0) {
                const caption = question.stage === 'match'
                    ? 'Tap a prime, then the same prime in the other row.'
                    : 'Multiply the overlap. HCF = ?';
                root.append(element('p', caption));
            }
            const diagram = drawDiagram(question, tapTile);
            diagram.classList.toggle('is-shaking', Boolean(question.shake));
            root.append(diagram);
            if (question.stage === 'answer') {
                if (guided && state.index === 0) renderOptions(question);
                else renderInput(question);
            }
            const feedback = element('p', question.message, 'question-feedback');
            feedback.setAttribute('role', 'status');
            feedback.classList.toggle('is-visible', Boolean(question.message));
            feedback.classList.toggle('is-correct', question.phase === 'correct');
            feedback.classList.toggle('is-incorrect', question.phase !== 'correct');
            root.append(feedback);
            renderMaths(root);
            reportProgress();
            save();
            updateAction();
        }
        function updateAction() {
            const question = state.items[state.index];
            let label = 'Check';
            if (question.stage === 'match') label = 'Done matching';
            else if (question.phase === 'correct') label = 'Continue';
            else if (question.phase === 'wrong') label = 'Try again';
            api.setSectionAction(sectionId, {
                label,
                disabled: question.stage === 'answer' && question.phase === 'answer' && question.value.trim() === '',
                onClick: handleAction
            });
        }
        function finishMatching(question) {
            const match = nextMatch(question);
            if (match) {
                question.message = `There's still a ${match.v} in both rows. Match it first.`;
                assess(false);
                return;
            }
            question.stage = 'answer';
            question.message = '';
        }
        function checkAnswer(question) {
            if (question.value.trim() === '') return;
            const value = Number(question.value);
            const answer = product(question.overlap);
            const correct = value === answer;
            assess(correct);
            question.phase = correct ? 'correct' : 'wrong';
            if (!correct) {
                question.message = wrongAnswerFeedback(question, value, guided, state.index);
            } else if (guided && state.index === 0) {
                question.message = '2 × 3 × 5 = 30. Check: 60 ÷ 30 = 2 and 90 ÷ 30 = 3.';
            } else {
                question.message = `HCF = ${answer}.`;
            }
        }
        function handleAction() {
            if (state.finished) return;
            const question = state.items[state.index];
            if (question.stage === 'match') {
                finishMatching(question);
            } else if (question.phase === 'wrong') {
                question.phase = 'answer';
                question.value = '';
                question.message = '';
            } else if (question.phase === 'correct') {
                state.index++;
                state.finished = state.index === state.order.length;
            } else {
                checkAnswer(question);
            }
            render();
        }
        render();
    }

    async function mountLearn(event) {
        if (event.detail?.slug !== SLUG) return;
        const section = document.getElementById('lesson-section-explanation');
        if (!section || section.querySelector('.hcf-learn')) return;
        const root = element('article', '', 'hcf-learn');
        section.append(root);
        const api = window.Maths1to9Lesson;
        const store = window.Maths1to9Progress;
        const state = await store.getLessonActivityState(SLUG, 'learn') || {
            screen: 0, matches: 0, finished: false
        };
        function dispatch(name) {
            document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
                detail: { sectionId: 'explanation' }
            }));
        }
        dispatch('gate');

        function renderFactorLists() {
            root.append(element('p', 'The highest common factor (HCF) is the biggest number that divides both.'));
            const lists = [[12, [1, 2, 3, 4, 6, 12]], [18, [1, 2, 3, 6, 9, 18]]];
            lists.forEach(([number, factors]) => {
                const row = element('div', '', 'hcf-row');
                row.append(element('strong', `${number}:`));
                factors.forEach(value => {
                    const tile = element('span', value, 'hcf-tile');
                    tile.classList.toggle('is-shared', [1, 2, 3, 6].includes(value));
                    tile.classList.toggle('is-largest', value === 6);
                    row.append(tile);
                });
                root.append(row);
            });
            root.append(element('p', '6 is the largest common factor. The HCF of 12 and 18 is 6.'));
        }
        function renderPrimeDiagram() {
            const pair = state.screen === 3 ? [8, 15] : [24, 36];
            const model = newQuestion(pair);
            let matches = 0;
            if (state.screen === 1) matches = state.matches;
            else if (state.screen === 2) matches = 3;
            for (let index = 0; index < matches; index++) {
                const tile = nextMatch(model);
                const other = remainingTiles(model, 1).find(other => other.v === tile.v);
                addMatch(model, 0, tile, { row: 1, ...other });
            }
            if (state.screen !== 1) model.stage = 'answer';
            root.append(drawDiagram(model, null));
            if (state.screen === 1 && state.matches === 3) {
                root.append(element('p', '36 has no 2 left.'));
            }
            if (state.screen === 2) {
                root.append(element('p', 'HCF = 2 × 2 × 3 = 12. Every shared prime is in the overlap, so nothing bigger divides both.'));
            }
            if (state.screen === 3) {
                root.append(element('p', 'No shared primes: the HCF is 1, because 1 divides every number.'));
            }
        }
        function advance() {
            if (state.screen === 1 && state.matches < 3) state.matches++;
            else if (state.screen < 3) state.screen++;
            render();
        }
        function render() {
            root.replaceChildren();
            const titles = ['What HCF means', 'Match the prime factors', 'Multiply the overlap', 'No matches'];
            root.append(element('h3', titles[state.screen]));
            if (state.screen === 0) renderFactorLists();
            else renderPrimeDiagram();
            renderMaths(root);
            // Reaching the final screen completes Learn; the engine supplies Continue.
            if (state.screen === 3) state.finished = true;
            store.saveLessonActivityState(SLUG, 'learn', state);
            if (state.finished) {
                dispatch('complete');
                api.clearSectionAction('explanation');
                return;
            }
            let label = 'Next';
            if (state.screen === 1 && state.matches < 3) label = 'Next match';
            api.setSectionAction('explanation', { label, disabled: false, onClick: advance });
        }
        render();
    }

    // Check owns its renderer in questions.js; this event keeps the maths helper private.
    document.addEventListener('maths1to9:hcf-render-maths', event => {
        renderMaths(event.detail.root);
    });
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = root => mountActivity(root, true);
    window.Maths1to9QuestionBanks ??= {};
    window.Maths1to9QuestionBanks[SLUG] = root => mountActivity(root, false);
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug !== SLUG) return;
        mountLearn(event);
        mountActivity(event.detail.questionsRoot, false);
    });
})();
