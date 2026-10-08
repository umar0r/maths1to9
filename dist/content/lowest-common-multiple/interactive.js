(() => {
    'use strict';

    const SLUG = 'lowest-common-multiple';
    const PRACTICE_GROUPS = [
        [[10, 15], [6, 14], [15, 20], [21, 35]],
        [[16, 24], [20, 50], [18, 27]],
        [[6, 18], [8, 24]],
        [[4, 9], [5, 8], [7, 10]]
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

    function diagramEntries(question) {
        const entries = question.overlap.map((value, index) => ({
            id: `shared:${index}`, value, zone: 'shared'
        }));
        for (let row = 0; row < 2; row++) {
            const zone = row === 0 ? 'left' : 'right';
            remainingTiles(question, row).forEach(tile => {
                entries.push({ id: `${zone}:${tile.i}`, value: tile.v, zone });
            });
        }
        return entries;
    }

    function mathsLine(latex, className = '') {
        const paragraph = element('p', '', className);
        window.katex.render(latex, paragraph, { throwOnError: false });
        return paragraph;
    }

    function colouredFactors(entries) {
        return entries.map(entry => {
            const colour = entry.zone === 'shared' ? '#15803d' : '#0369a1';
            return `\\textcolor{${colour}}{${entry.value}}`;
        }).join(' \\times ');
    }

    function drawDiagram(question, onTileTap, onDiagramTap = null) {
        const wrapper = element('div', '', 'lcm-model');
        const venn = element('div', '', 'lcm-venn');
        const shared = question.overlap.join(', ') || 'none';
        venn.setAttribute('aria-label', `Prime factors of ${question.pair.join(' and ')}: shared ${shared}`);
        venn.append(
            element('div', '', 'lcm-circle lcm-circle-left'),
            element('div', '', 'lcm-circle lcm-circle-right'),
            element('strong', question.pair[0], 'lcm-label left'),
            element('strong', question.pair[1], 'lcm-label right')
        );
        const zones = {
            left: element('div', '', 'lcm-zone left'),
            shared: element('div', '', 'lcm-zone shared'),
            right: element('div', '', 'lcm-zone right')
        };
        diagramEntries(question).forEach(entry => {
            if (question.stage === 'match' && entry.zone !== 'shared') return;
            const tile = element(onDiagramTap ? 'button' : 'span', entry.value, 'lcm-tile');
            tile.dataset.tileId = entry.id;
            tile.dataset.zone = entry.zone;
            tile.classList.toggle('is-shared', entry.zone === 'shared');
            tile.classList.toggle('is-lcm-side', entry.zone !== 'shared' && Boolean(question.highlightSides));
            tile.classList.toggle('is-flashing', question.flashZones?.includes(entry.zone));
            if (onDiagramTap) {
                tile.type = 'button';
                const picked = question.pickedTiles?.includes(entry.id);
                tile.disabled = question.phase !== 'answer' || picked;
                tile.classList.toggle('is-picked', Boolean(picked) && question.phase !== 'correct');
                tile.setAttribute('aria-label', `${entry.value}, ${entry.zone} tile, ${entry.id}`);
                tile.addEventListener('click', () => onDiagramTap(entry));
            }
            zones[entry.zone].append(tile);
        });
        venn.append(zones.left, zones.shared, zones.right);
        wrapper.append(venn);
        for (let row = 0; row < 2; row++) {
            const tiles = remainingTiles(question, row);
            if (question.stage === 'match' && tiles.length > 0) {
                const tileRow = element('div', '', 'lcm-row');
                tileRow.append(element('span', `${question.pair[row]}:`));
                tiles.forEach(tile => {
                    const button = element('button', tile.v, 'lcm-tile');
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
            wrapper.append(element('p', `${question.pair[row]} = ${primeFactors(question.pair[row]).join(' × ')}`, 'lcm-formula'));
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

    function diagramTiles(question) {
        return [
            ...question.overlap,
            ...remainingTiles(question, 0).map(tile => tile.v),
            ...remainingTiles(question, 1).map(tile => tile.v)
        ];
    }

    function wrongAnswerFeedback(question, value, guided, index) {
        const hcf = product(question.overlap);
        const multiplied = product(question.pair);
        const sum = diagramTiles(question).reduce((total, factor) => total + factor, 0);
        if (value === hcf) {
            if (guided && index === 1) return "That's the HCF. Use the blue tiles too.";
            return "That's the HCF: the overlap only. The LCM uses every tile.";
        }
        if (value === multiplied) {
            if (guided) {
                return `That's ${question.pair[0]} × ${question.pair[1]}. It uses the green tiles twice.`;
            }
            return 'That multiplies the two numbers, so the overlap is used twice.';
        }
        for (let row = 0; row < 2; row++) {
            if (value !== question.pair[row]) continue;
            const other = question.pair[1 - row];
            if (guided && index === 0) return "You left out 12's side. 30 isn't a multiple of 12.";
            if (guided) return `You left out ${other}'s side.`;
            return `${value} isn't a multiple of ${other}. Include ${other}'s side tiles.`;
        }
        if (value === sum) return 'You added. Multiply the tiles.';
        return `Multiply every tile: ${diagramTiles(question).join(' × ')}.`;
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
                index: 0, order: guided ? [[12, 30], [18, 24]] : pickSession(),
                items: [], finished: false
            };
        }

        if (guided && state.items[0]?.stage === 'answer') {
            const first = state.items[0];
            if (first.phase === 'correct') {
                first.pickedTiles ??= diagramEntries(first).map(entry => entry.id);
            } else {
                first.pickedTiles ??= [];
            }
        }

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
                questionType: 'lcm-prime-match',
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
        function selectDiagramTile(entry) {
            const question = state.items[state.index];
            question.pickedTiles ??= [];
            if (question.phase !== 'answer' || question.pickedTiles.includes(entry.id)) return;
            question.pickedTiles.push(entry.id);
            render();
        }
        function renderTileBar(question) {
            const entries = diagramEntries(question);
            const picked = (question.pickedTiles || []).map(id => entries.find(entry => entry.id === id));
            const bar = element('div', '', 'lcm-tile-bar');
            const formula = colouredFactors(picked);
            let latex = '\\mathrm{LCM} = \\ldots';
            if (picked.length > 0) latex = `\\mathrm{LCM} = ${formula} \\times \\ldots`;
            if (question.phase === 'correct') latex = `\\mathrm{LCM} = ${formula} = 60`;
            bar.append(mathsLine(latex));
            const choices = element('div', '', 'lcm-bar-tiles');
            picked.forEach(entry => {
                const button = element('button', entry.value, 'lcm-tile');
                button.type = 'button';
                button.classList.toggle('is-shared', entry.zone === 'shared');
                button.classList.toggle('is-lcm-side', entry.zone !== 'shared');
                button.disabled = question.phase !== 'answer';
                button.setAttribute('aria-label', `Remove ${entry.value}, ${entry.zone} tile from LCM`);
                button.addEventListener('click', () => {
                    question.pickedTiles = question.pickedTiles.filter(id => id !== entry.id);
                    render();
                });
                choices.append(button);
            });
            bar.append(choices);
            root.append(bar);
        }
        function renderInput(question) {
            const label = element('label', 'LCM = ', 'lcm-input');
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
        function completedAnswer(question) {
            const entries = diagramEntries(question);
            const factors = colouredFactors(entries);
            const answer = product(entries.map(entry => entry.value));
            return mathsLine(`\\mathrm{LCM} = ${factors} = ${answer}`, 'lcm-answer-line');
        }
        function renderCompletedWork() {
            const heading = guided ? 'Your completed examples' : 'Your practice results';
            root.append(element('h3', heading));
            const answers = api.getProgress().scoreActivities;
            const list = element(guided ? 'div' : 'ol', '', 'lesson-revision-list');
            state.order.forEach((pair, index) => {
                const question = state.items[index];
                const card = element(guided ? 'article' : 'li', '', 'lesson-revision-item');
                card.append(element(guided ? 'h3' : 'strong', `${pair[0]} and ${pair[1]}`));
                if (guided) {
                    // Clear transient feedback on a copy; saved attempts stay unchanged.
                    const completed = {
                        ...question, stage: 'answer', phase: 'correct',
                        flashZones: [], shake: false, highlightSides: true
                    };
                    card.append(drawDiagram(completed, null));
                }
                card.append(completedAnswer(question));
                if (!guided) {
                    const activity = answers.find(answer => answer.id === `answer:question-bank:${index + 1}`);
                    let accuracy = 'Corrected';
                    if (activity?.firstCorrect === true) accuracy = '✓ Right first time';
                    card.append(element('span', accuracy, 'lesson-revision-accuracy'));
                }
                list.append(card);
            });
            root.append(list);
        }
        function render() {
            root.replaceChildren();
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
            root.append(element('p', position, 'question-number'));
            const tileBarStep = guided && state.index === 0 && question.stage === 'answer';
            let caption = 'Match the shared primes, then press Done matching.';
            if (guided && state.index === 1 && question.stage === 'match') {
                caption = 'Your turn. Match the shared primes, then press Done matching.';
            } else if (tileBarStep) {
                caption = 'Tap the tiles that make the LCM.';
            } else if (question.stage === 'answer') {
                caption = 'Multiply every tile, green and blue. LCM = ?';
            }
            root.append(element('p', caption));
            if (question.stage === 'answer') {
                question.highlightSides = true;
            }
            const diagram = drawDiagram(question, tapTile, tileBarStep ? selectDiagramTile : null);
            diagram.classList.toggle('is-shaking', Boolean(question.shake));
            root.append(diagram);
            if (question.stage === 'answer') {
                if (tileBarStep) renderTileBar(question);
                else renderInput(question);
            }
            const feedback = element('p', question.message, 'question-feedback');
            feedback.setAttribute('role', 'status');
            feedback.classList.toggle('is-visible', Boolean(question.message));
            feedback.classList.toggle('is-correct', question.phase === 'correct');
            feedback.classList.toggle('is-incorrect', question.phase !== 'correct');
            if (question.phase === 'correct' && !(guided && state.index === 0)) {
                const answer = product(diagramTiles(question));
                feedback.textContent = '';
                window.katex.render(`\\mathrm{LCM} = ${colouredFactors(diagramEntries(question))} = ${answer}`, feedback, { throwOnError: false });
            }
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
                disabled: answerIsEmpty(question),
                onClick: handleAction
            });
        }
        function answerIsEmpty(question) {
            if (question.stage !== 'answer' || question.phase !== 'answer') return false;
            if (guided && state.index === 0) return !question.pickedTiles?.length;
            return question.value.trim() === '';
        }
        function flashForValue(question, value) {
            question.flashZones = [];
            if (value === product(question.overlap)) {
                question.flashZones = ['left', 'right'];
            } else if (value === product(question.pair)) {
                question.flashZones = ['shared'];
            } else if (value === question.pair[0]) {
                question.flashZones = ['right'];
            } else if (value === question.pair[1]) {
                question.flashZones = ['left'];
            }
        }
        function checkTileBar(question) {
            const entries = diagramEntries(question);
            const picked = entries.filter(entry => question.pickedTiles?.includes(entry.id));
            const omitted = entries.filter(entry => !question.pickedTiles?.includes(entry.id));
            question.flashZones = [...new Set(omitted.map(entry => entry.zone))];
            if (omitted.length === 0) {
                question.phase = 'correct';
                question.message = '60 ÷ 12 = 5 and 60 ÷ 30 = 2.';
                question.flashZones = [];
            } else {
                question.phase = 'wrong';
                const value = product(picked.map(entry => entry.value));
                if (picked.every(entry => entry.zone === 'shared') && picked.length === question.overlap.length) {
                    question.message = 'That makes 6, the HCF. The LCM needs the side tiles too.';
                } else if (value === 30 && omitted.every(entry => entry.zone === 'left')) {
                    question.message = "That makes 30, which isn't a multiple of 12.";
                } else if (value === 12 && omitted.every(entry => entry.zone === 'right')) {
                    question.message = "That makes 12, which isn't a multiple of 30.";
                } else {
                    question.message = 'Use every tile in the diagram, each once.';
                }
            }
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
            question.shake = false;
        }
        function checkAnswer(question) {
            if (guided && state.index === 0) {
                checkTileBar(question);
                return;
            }
            if (question.value.trim() === '') return;
            const value = Number(question.value);
            const answer = product(diagramTiles(question));
            const correct = value === answer;
            assess(correct);
            question.phase = correct ? 'correct' : 'wrong';
            if (!correct) {
                question.message = wrongAnswerFeedback(question, value, guided, state.index);
                flashForValue(question, value);
            } else if (guided && state.index === 0) {
                question.message = '2 × 3 × 2 × 5 = 60. Check: 60 ÷ 12 = 5 and 60 ÷ 30 = 2.';
            } else {
                question.message = `LCM = ${answer}.`;
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
                question.flashZones = [];
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
        if (!section || section.querySelector('.lcm-learn')) return;
        const root = element('article', '', 'lcm-learn');
        section.append(root);
        const api = window.Maths1to9Lesson;
        const store = window.Maths1to9Progress;
        let state = await store.getLessonActivityState(SLUG, 'learn');
        if (state?.version !== 2) {
            state = {
                version: 2, screen: state?.finished ? 5 : 0,
                fours: 0, sixes: 0, bigger: 0,
                first: newChoice(), venn: newChoice()
            };
        }
        let listing = false;
        function newChoice() {
            return { selected: null, phase: 'answer', rejected: [] };
        }
        function dispatch(name) {
            document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
                detail: { sectionId: 'explanation' }
            }));
        }
        function save() {
            store.saveLessonActivityState(SLUG, 'learn', state);
        }
        dispatch('gate');

        function multiplesRow(number, values, common = [], smallest = null) {
            const row = element('div', '', 'lcm-row lcm-multiples');
            row.append(element('strong', `${number}:`));
            values.forEach(value => {
                const tile = element('span', value, 'lcm-tile');
                tile.classList.toggle('is-shared', common.includes(value));
                tile.classList.toggle('is-largest', value === smallest);
                row.append(tile);
            });
            return row;
        }
        function smallLists() {
            const fours = [4, 8, 12, 16, 20, 24].slice(0, state.fours);
            const sixes = [6, 12, 18, 24, 30].slice(0, state.sixes);
            const common = fours.filter(value => sixes.includes(value));
            let smallest = null;
            if (state.first.phase === 'correct') smallest = 12;
            root.append(multiplesRow(4, fours, common, smallest));
            if (state.screen > 0) root.append(multiplesRow(6, sixes, common, smallest));
        }
        function finishedDiagram(pair) {
            const model = newQuestion(pair);
            let tile = nextMatch(model);
            while (tile) {
                const other = remainingTiles(model, 1).find(other => other.v === tile.v);
                addMatch(model, 0, tile, { row: 1, ...other });
                tile = nextMatch(model);
            }
            model.stage = 'answer';
            return model;
        }
        function choices(choice, options, answer, feedback, flash = null) {
            const group = element('div', '', 'lcm-options');
            group.setAttribute('role', 'group');
            group.setAttribute('aria-label', 'Choose an answer');
            options.forEach((text, index) => {
                const rejected = choice.rejected.includes(index);
                const button = element('button', text, 'button');
                button.type = 'button';
                button.disabled = rejected || choice.phase !== 'answer';
                button.classList.toggle('is-rejected', rejected);
                button.setAttribute('aria-pressed', String(choice.selected === index));
                if (rejected) button.append(element('span', ' ×', 'lcm-wrong-mark'));
                else if (choice.selected === index) {
                    button.classList.toggle('is-correct', choice.phase === 'correct');
                    button.classList.toggle('is-selected', choice.phase === 'answer');
                }
                button.addEventListener('click', () => {
                    choice.selected = index;
                    render();
                });
                group.append(button);
            });
            root.append(group);
            if (choice.phase !== 'answer') {
                const message = element('p', feedback[choice.selected], 'question-feedback is-visible');
                message.setAttribute('role', 'status');
                message.classList.toggle('is-correct', choice.phase === 'correct');
                root.append(message);
            }
            let label = 'Check';
            if (choice.phase === 'wrong') label = 'Try again';
            else if (choice.phase === 'correct') label = 'Continue';
            api.setSectionAction('explanation', {
                label, disabled: choice.phase === 'answer' && choice.selected === null,
                onClick: () => {
                    if (choice.phase === 'correct') state.screen++;
                    else if (choice.phase === 'wrong') {
                        choice.phase = 'answer';
                        choice.selected = null;
                    } else if (choice.selected === answer) choice.phase = 'correct';
                    else {
                        choice.rejected.push(choice.selected);
                        choice.phase = 'wrong';
                    }
                    if (flash) flash(choice);
                    render();
                }
            });
        }
        function listTiles(key, total) {
            if (listing) return;
            listing = true;
            function addNext() {
                state[key]++;
                if (state[key] >= total) listing = false;
                render();
                if (listing) setTimeout(addNext, 320);
            }
            addNext();
        }
        function listingAction(key, total, label) {
            let actionLabel = label;
            if (state[key] >= total) actionLabel = 'Next';
            api.setSectionAction('explanation', {
                label: actionLabel, disabled: listing,
                onClick: () => {
                    if (state[key] < total) listTiles(key, total);
                    else {
                        state.screen++;
                        render();
                    }
                }
            });
        }
        function renderVennQuestion() {
            const model = finishedDiagram([24, 36]);
            model.highlightSides = state.venn.phase === 'correct';
            if (state.venn.phase === 'wrong') {
                model.flashZones = state.venn.selected === 1 ? ['left', 'right'] : ['shared'];
            }
            root.append(drawDiagram(model, null));
            root.append(mathsLine('\\mathrm{HCF} = \\textcolor{#15803d}{2 \\times 2 \\times 3} = 12', 'lcm-answer-line'));
            if (state.venn.phase === 'correct') {
                root.append(mathsLine(`\\mathrm{LCM} = ${colouredFactors(diagramEntries(model))} = 72`, 'lcm-answer-line'));
            }
            choices(state.venn, [
                'Every tile, once', 'The green overlap only', "All of 24's tiles and all of 36's tiles"
            ], 0, [
                "That's HCF × the side tiles.", 'That makes 12, the HCF.',
                '24 × 36 = 864 uses the green tiles twice.'
            ]);
        }
        function render() {
            root.replaceChildren();
            const titles = [
                'List the 4s', 'List the 6s', 'What is the lowest number in both lists?',
                'What about bigger numbers?', 'Which tiles multiply to 72?', 'Nothing shared'
            ];
            root.append(element('h3', titles[state.screen]));
            if (state.screen === 0) {
                smallLists();
                if (state.fours > 0) root.append(element('p', 'These are the multiples of 4.'));
                listingAction('fours', 6, 'List the 4s');
            } else if (state.screen === 1) {
                smallLists();
                if (state.sixes === 5) {
                    root.append(element('p', 'Green numbers are in both lists.'));
                }
                listingAction('sixes', 5, 'List the 6s');
            } else if (state.screen === 2) {
                smallLists();
                choices(state.first, ['12', '10', '24', '2'], 0, [
                    '12 is the lowest common multiple (LCM) of 4 and 6.',
                    "That's 4 + 6. 10 isn't in either list.",
                    '24 is in both lists, but 12 comes first.',
                    '2 divides both. Multiples are 4, 8, 12 …'
                ]);
            } else if (state.screen === 3) {
                const fours = [24, 48, 72].slice(0, Math.min(state.bigger, 3));
                const sixes = [36, 72].slice(0, Math.max(0, state.bigger - 3));
                const common = sixes.includes(72) ? [72] : [];
                root.append(multiplesRow(24, fours, common), multiplesRow(36, sixes, common));
                if (state.bigger === 5) {
                    root.append(element('p', 'The LCM of 24 and 36 is 72.'));
                    root.append(element('p', 'Lists get long. The prime factors find it faster.'));
                }
                listingAction('bigger', 5, 'List them');
            } else if (state.screen === 4) {
                renderVennQuestion();
            } else {
                const model = finishedDiagram([8, 15]);
                model.highlightSides = true;
                root.append(drawDiagram(model, null));
                root.append(element('p', 'Nothing is shared, so use every tile.'));
                root.append(mathsLine(`\\mathrm{LCM} = ${colouredFactors(diagramEntries(model))} = 120 = 8 \\times 15`, 'lcm-answer-line'));
                state.finished = true;
                dispatch('complete');
                api.clearSectionAction('explanation');
            }
            renderMaths(root);
            save();
        }
        render();
    }

    // Check owns its renderer in questions.js; this event keeps the maths helper private.
    document.addEventListener('maths1to9:lcm-render-maths', event => {
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
