(() => {
    'use strict';

    const SLUG = 'highest-common-factor';
    const initialScreenHash = window.location.hash;
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

    function shuffle(values, random = Math.random) {
        const result = [...values];
        for (let index = result.length - 1; index > 0; index--) {
            const other = Math.floor(random() * (index + 1));
            [result[index], result[other]] = [result[other], result[index]];
        }
        return result;
    }

    function pickSession(random = Math.random) {
        const pairs = shuffle([
            ...shuffle(PRACTICE_GROUPS[0], random).slice(0, 2),
            ...PRACTICE_GROUPS.slice(1).map(group => shuffle(group, random)[0])
        ], random);
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
        const engine = window.Maths1to9LessonEngine;
        function freshPractice(excluded = []) {
            let seed = Math.floor(Math.random() * 4294967296);
            const used = new Set(excluded.map(session => session.seed));
            while (used.has(seed)) seed = (seed + 1) >>> 0;
            return {
                seed, session: 1, earlier: [], cards: {}, index: 0, screen: 0,
                furthestScreen: 0, order: pickSession(engine.seededRandom(seed)), items: [], finished: false
            };
        }
        function upgradePractice(saved, version) {
            if (version !== 0 || !Array.isArray(saved?.order) || saved.order.length !== 5 ||
                !Array.isArray(saved.items) || !Number.isInteger(saved.index) || saved.index < 0 || saved.index > 5) return null;
            const assessments = api.getProgress().scoreActivities;
            const next = { ...saved, session: 1, seed: 0, earlier: [], cards: {} };
            for (const [index, question] of next.items.entries()) {
                delete question.failed;
                const assessment = assessments.find(item => item.id === `answer:question-bank:${index + 1}`);
                question.firstCorrect = assessment?.firstCorrect ?? null;
                if (question.stage !== 'answer') continue;
                next.cards[`question-bank:1:${index + 1}`] = {
                    selected: null, rejected: [], value: question.value, phase: question.phase,
                    firstCorrect: question.firstCorrect, correct: question.phase === 'correct' ? true : question.phase === 'wrong' ? false : null,
                    feedback: question.message || '', hint: null, invalid: false
                };
            }
            return next;
        }
        const section = guided ? null : await api.useSectionState(sectionId, {
            version: 1, initial: freshPractice, upgrade: upgradePractice
        });
        let state = guided ? await store.getLessonActivityState(SLUG, sectionId) : section.state;
        if (!state) state = {
            index: 0, order: [[60, 90], [40, 60]], items: [], finished: false
        };
        state.screen ??= state.index;
        state.furthestScreen ??= state.index;
        function showScreen(screen) {
            state.screen = screen;
            render();
            api.setSlideHash(`hcf-${sectionId}-${screen + 1}`, { replace: true });
        }
        for (let screen = 0; screen <= state.order.length; screen++) {
            api.registerHashRoute(`hcf-${sectionId}-${screen + 1}`, () => {
                if (!api.goToSection(sectionId, { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(screen, state.furthestScreen));
            });
        }
        function syncScreenHash() {
            if (api.getCurrentSection().id === sectionId) {
                api.setSlideHash(`hcf-${sectionId}-${state.screen + 1}`, { replace: true });
            }
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncScreenHash));
        // Retain saved tiles and attempts from the first lesson version.
        state.items.forEach(question => { delete question.failed; });

        function save() {
            if (section) section.save();
            else store.saveLessonActivityState(SLUG, sectionId, state);
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
            const question = state.items[state.index];
            question.firstCorrect ??= correct;
            const card = state.cards[`question-bank:${state.session}:${state.index + 1}`];
            if (card && card.firstCorrect === null) card.firstCorrect = correct;
            api.recordAssessment({
                questionType: 'hcf-prime-match',
                questionId: `question-bank:${state.session}:${state.index + 1}`, correct
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
        function completedExpression(question) {
            const answer = product(question.overlap);
            let latex = `\\mathrm{HCF} = ${answer}`;
            if (question.overlap.length > 0) {
                const factors = question.overlap.join(' \\times ');
                latex = `\\mathrm{HCF} = \\textcolor{#15803d}{${factors}} = ${answer}`;
            }
            return latex;
        }
        function completedAnswer(question) {
            const paragraph = element('p', '', 'hcf-answer-line');
            window.katex.render(completedExpression(question), paragraph, { throwOnError: false });
            return paragraph;
        }
        function renderCompletedWork() {
            if (!guided) {
                function rows(session) {
                    return session.order.map((pair, index) => {
                        const question = session.items[index];
                        return {
                            prompt: `${pair[0]} and ${pair[1]}`,
                            answer: { latex: completedExpression(question) },
                            firstCorrect: question.firstCorrect ?? null, correct: true,
                            explanation: question.overlap.length > 0
                                ? 'Multiply only the shared prime factors.'
                                : 'With no shared prime factors, the HCF is 1.'
                        };
                    });
                }
                const score = element('div');
                const results = element('div');
                root.append(score, results);
                const currentRows = rows(state);
                engine.renderScorePanel(score, {
                    correct: currentRows.filter(row => row.firstCorrect === true).length,
                    total: currentRows.length, readyScore: api.getLesson().question_bank.ready_score
                });
                engine.renderResults(results, currentRows, { heading: 'Your practice results' });
                const again = element('button', 'Practise again', 'lesson-secondary-action');
                again.type = 'button';
                again.addEventListener('click', () => {
                    const fresh = freshPractice([state, ...state.earlier]);
                    section.update(state => { engine.archivePractice(state, fresh); });
                    render();
                    const heading = root.querySelector('[data-screen-heading]');
                    heading.tabIndex = -1;
                    heading.focus();
                });
                root.append(again, element('p', "Practising again doesn't change your score."));
                for (const earlier of state.earlier) {
                    const details = element('details');
                    const results = element('div');
                    details.append(element('summary', `Earlier practice ${earlier.session}`), results);
                    engine.renderResults(results, rows(earlier));
                    root.append(details);
                }
                return;
            }

            const heading = 'Your completed examples';
            root.append(element('h3', heading));
            const list = element('div', '', 'lesson-revision-list');
            state.order.forEach((pair, index) => {
                const question = state.items[index];
                const card = element('article', '', 'lesson-revision-item');
                card.append(element('h3', `${pair[0]} and ${pair[1]}`));
                if (guided) {
                    // Clear transient feedback on a copy; saved attempts stay unchanged.
                    const completed = {
                        ...question, stage: 'answer', phase: 'correct',
                        flashZones: [], shake: false, highlightSides: true
                    };
                    card.append(drawDiagram(completed, null));
                }
                card.append(completedAnswer(question));
                list.append(card);
            });
            root.append(list);
        }
        function render() {
            root.replaceChildren();
            syncScreenHash();
            api.setSectionBack(sectionId, state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.screen < state.index) {
                if (state.finished) dispatch('complete');
                reportProgress();
                const question = state.items[state.screen];
                const heading = element('h3', `${question.pair[0]} and ${question.pair[1]}`);
                heading.dataset.screenHeading = '';
                const completed = { ...question, stage: 'answer', phase: 'correct', shake: false };
                root.append(heading, drawDiagram(completed, null), completedAnswer(question));
                api.setSectionAction(sectionId, {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
                save();
                return;
            }
            if (state.finished) {
                renderCompletedWork();
                dispatch('complete');
                api.clearSectionAction(sectionId);
                reportProgress();
                save();
                return;
            }
            const question = state.items[state.index] ??= newQuestion(state.order[state.index]);
            const position = guided ? `Example ${state.index + 1} of 2` : `Question ${state.index + 1} of 5`;
            const heading = element('h3', position, 'question-number');
            heading.dataset.screenHeading = '';
            root.append(heading);
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
                else if (guided) renderInput(question);
            }
            const message = !guided && question.stage === 'answer' ? '' : question.message;
            const feedback = element('p', message, 'question-feedback');
            feedback.setAttribute('role', 'status');
            feedback.classList.toggle('is-visible', Boolean(message));
            feedback.classList.toggle('is-correct', question.phase === 'correct');
            feedback.classList.toggle('is-incorrect', question.phase !== 'correct');
            root.append(feedback);
            renderMaths(root);
            reportProgress();
            save();
            if (!guided && question.stage === 'answer') {
                const cardRoot = element('div');
                root.append(cardRoot);
                const questionId = `question-bank:${state.session}:${state.index + 1}`;
                if (!state.cards[questionId]) {
                    state.cards[questionId] = {
                        selected: null, rejected: [], value: question.value, phase: question.phase,
                        firstCorrect: question.firstCorrect ?? null, correct: null,
                        feedback: '', hint: null, invalid: false
                    };
                }
                const answer = product(question.overlap);
                const candidates = [...new Set([0, question.overlap.reduce((sum, factor) => sum + factor, 0),
                    product(question.pair) / answer, ...question.pair])].filter(value => value !== answer);
                api.createQuestion(cardRoot, {
                    sectionId, questionId, questionType: 'hcf-prime-match', scored: true,
                    prompt: 'What is the HCF?', input: 'number', inputLabel: 'HCF =', answer,
                    rules: candidates.map(value => ({ value, feedback: wrongAnswerFeedback(question, value, false, state.index) })),
                    fallback: wrongAnswerFeedback(question, NaN, false, state.index), feedback: `HCF = ${answer}.`,
                    onFeedback: result => {
                        question.firstCorrect = result.firstCorrect;
                        question.phase = result.correct ? 'correct' : 'wrong';
                        question.value = result.value;
                        question.message = '';
                        reportProgress();
                        save();
                    },
                    onContinue: () => { question.phase = 'correct'; handleAction(); }
                });
            } else updateAction();
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
                state.screen = state.index;
                state.furthestScreen = state.index;
                state.finished = state.index === state.order.length;
            } else {
                checkAnswer(question);
            }
            render();
        }
        render();
        const requested = initialScreenHash.match(new RegExp(`^#hcf-${sectionId}-(\\d+)$`));
        if (requested) {
            if (!api.goToSection(sectionId, { moveFocus: false })) {
                document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                return;
            }
            showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        }
    }

    async function mountLearn(event) {
        if (event.detail?.slug !== SLUG) return;
        const section = document.getElementById('lesson-section-explanation');
        if (!section || section.querySelector('.hcf-learn')) return;
        const root = element('article', '', 'hcf-learn');
        section.append(root);
        const api = window.Maths1to9Lesson;
        const store = window.Maths1to9Progress;
        const savedSection = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, matches: 0, finished: false }),
            upgrade(saved, version) {
                if (version !== 0) return null;
                return { ...saved, furthestScreen: saved.finished ? 3 : saved.screen };
            }
        });
        const state = savedSection.state;
        function showScreen(screen) {
            state.screen = screen;
            render();
            api.setSlideHash(`hcf-learn-${screen + 1}`, { replace: true });
        }
        for (let screen = 0; screen < 4; screen++) {
            api.registerHashRoute(`hcf-learn-${screen + 1}`, () => {
                api.goToSection('explanation', { moveFocus: false });
                showScreen(Math.min(screen, state.furthestScreen));
            });
        }
        function syncScreenHash() {
            if (api.getCurrentSection().id === 'explanation') {
                api.setSlideHash(`hcf-learn-${state.screen + 1}`, { replace: true });
            }
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncScreenHash));
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
            state.furthestScreen = Math.max(state.furthestScreen, state.screen);
            showScreen(state.screen);
        }
        function render() {
            root.replaceChildren();
            syncScreenHash();
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            const titles = ['What HCF means', 'Match the prime factors', 'Multiply the overlap', 'No matches'];
            const heading = element('h3', titles[state.screen]);
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (state.screen === 0) renderFactorLists();
            else renderPrimeDiagram();
            renderMaths(root);
            // Reaching the final screen completes Learn; the engine supplies Continue.
            if (state.screen === 3) state.finished = true;
            savedSection.save();
            if (state.finished) dispatch('complete');
            if (state.screen < state.furthestScreen) {
                api.setSectionAction('explanation', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
                return;
            }
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
        const requested = initialScreenHash.match(/^#hcf-learn-(\d+)$/);
        if (requested) {
            api.goToSection('explanation', { unlock: true, moveFocus: false });
            showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        }
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
