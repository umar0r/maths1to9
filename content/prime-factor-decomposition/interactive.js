(() => {
    'use strict';

    const SLUG = 'prime-factor-decomposition';
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const finishedTree = {
        value: 60, children: [
            { value: 6, children: [{ value: 2 }, { value: 3 }] },
            { value: 10, children: [{ value: 2 }, { value: 5 }] }
        ]
    };
    const alternativeTree = {
        value: 60, children: [
            { value: 3 },
            { value: 20, children: [
                { value: 4, children: [{ value: 2 }, { value: 2 }] },
                { value: 5 }
            ] }
        ]
    };

    function renderMaths(root = document) {
        root.querySelectorAll('[data-prime-maths]').forEach((element) => {
            if (element.dataset.mathsRendered === 'true' || !window.katex) return;
            window.katex.render(element.dataset.primeMaths, element, {
                throwOnError: false,
                displayMode: element.dataset.displayMaths === 'true'
            });
            element.dataset.mathsRendered = 'true';
        });
    }

    function firstWrongPrime(entries, expected) {
        const counts = new Map(expected.map(({ base, power }) => [base, power]));
        return entries.find(({ base, power }) => power !== counts.get(base))?.base ?? null;
    }

    function isPrime(value) {
        if (!Number.isInteger(value) || value < 2) return false;
        for (let factor = 2; factor * factor <= value; factor++) {
            if (value % factor === 0) return false;
        }
        return true;
    }

    // The same data-driven renderer can be reused by the later tree tool.
    // Paths identify leaves separately, so the two 2s remain distinct.
    function drawTree(tree, { fadeSplit = false, collected = [], matchColours = false, splitNote = '', onNodeTap = null, collectedNodeIds = [], locked = false } = {}) {
        function svgElement(tag, attributes = {}) {
            const element = document.createElementNS(SVG_NS, tag);
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            return element;
        }
        function leafCount(node) {
            return node.children?.length ? node.children.reduce((sum, child) => sum + leafCount(child), 0) : 1;
        }
        function describe(node) {
            if (!node.children?.length) return `${node.value}${isPrime(node.value) ? ', prime and finished' : ', not split yet'}`;
            return `${node.value} splits into ${node.children.map(child => child.value).join(' and ')}. ${node.children.map(describe).join('. ')}`;
        }
        function treeDepth(node) {
            return node.children?.length ? 1 + Math.max(...node.children.map(treeDepth)) : 0;
        }
        const height = 48 + treeDepth(tree) * 100 + 40;
        const svg = svgElement('svg', {
            viewBox: `0 0 520 ${height}`, role: 'img',
            'aria-label': describe(tree) + (splitNote ? `. ${splitNote}` : ''), class: 'prime-tree', preserveAspectRatio: 'xMidYMid meet'
        });
        const edges = svgElement('g', { class: 'prime-tree-edges' });
        const nodes = svgElement('g');
        const buttons = [];
        svg.append(edges, nodes);
        function place(node, left, right, depth, path) {
            const x = (left + right) / 2;
            const y = 48 + depth * 100;
            if (node.children?.length) {
                const total = leafCount(node);
                let start = left;
                node.children.forEach((child, index) => {
                    const end = start + (right - left) * leafCount(child) / total;
                    const cx = (start + end) / 2;
                    edges.append(svgElement('line', { x1: x, y1: y + 26, x2: cx, y2: y + 74 }));
                    place(child, start, end, depth + 1, `${path}-${index}`);
                    start = end;
                });
            }
            const prime = !node.children?.length && isPrime(node.value);
            const group = svgElement('g', {
                class: [
                    'prime-tree-node', prime ? 'is-prime' : '',
                    onNodeTap && !node.children?.length ? 'is-tappable-leaf' : '',
                    collectedNodeIds.includes(node.id) ? 'is-picked' : '',
                    fadeSplit && depth > 0 && node.children?.length ? 'is-split' : '',
                    collected.includes(path) ? 'is-collected' : '',
                    matchColours && prime ? `prime-match-${node.value}` : ''
                ].filter(Boolean).join(' '),
                'data-node-path': path
            });
            if (prime) group.append(svgElement('circle', { cx: x, cy: y, r: 28 }));
            if (node.value === '') group.append(svgElement('rect', { x: x - 28, y: y - 28, width: 56, height: 56, rx: 8, class: 'prime-tree-empty' }));
            if (onNodeTap && !prime && !node.children?.length) {
                group.append(svgElement('rect', { x: x - 28, y: y - 28, width: 56, height: 56, rx: 8, class: 'prime-tree-empty' }));
            }
            if (onNodeTap && !node.children?.length) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `prime-tree-tap ${prime ? 'is-prime' : 'is-composite'}`;
                button.textContent = node.value;
                button.dataset.nodeId = node.id;
                button.style.left = `${x / 520 * 100}%`;
                button.style.top = `${y / height * 100}%`;
                const collected = collectedNodeIds.includes(node.id);
                button.disabled = locked || collected;
                button.setAttribute('aria-label', prime ? `${node.value}, prime${collected ? ', collected' : ''}` : `${node.value}, not prime, tap to split`);
                button.addEventListener('click', () => onNodeTap(node));
                buttons.push(button);
            }
            const label = svgElement('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
            label.textContent = node.value;
            group.append(label);
            nodes.append(group);
        }
        place(tree, 0, 520, 0, 'root');
        if (fadeSplit && splitNote) {
            // Annotate the gap between the faded 6 and 10, at their own level.
            const note = svgElement('g', { class: 'prime-tree-note' });
            note.append(svgElement('rect', { x: 158, y: 121, width: 204, height: 54, rx: 8 }));
            note.append(svgElement('line', { x1: 158, y1: 148, x2: 150, y2: 148 }));
            note.append(svgElement('line', { x1: 362, y1: 148, x2: 370, y2: 148 }));
            const breakAt = splitNote.indexOf('. ') + 1;
            [splitNote.slice(0, breakAt), splitNote.slice(breakAt).trim()].forEach((line, index) => {
                const label = svgElement('text', { x: 260, y: 140 + index * 20, 'text-anchor': 'middle' });
                label.textContent = line;
                note.append(label);
            });
            svg.append(note);
        }
        if (!onNodeTap) return svg;
        const wrapper = document.createElement('div');
        wrapper.className = 'prime-try-tree';
        wrapper.append(svg, ...buttons);
        return wrapper;
    }

    Object.assign(window.Maths1to9PrimeFactors ??= {}, { renderMaths, drawTree });
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = async (root) => {
        if (!root || root.dataset.mounted === 'true') return;
        root.dataset.mounted = 'true';
        const api = window.Maths1to9Lesson;
        const progress = window.Maths1to9Progress;
        const logic = window.Maths1to9PrimeFactors;
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId: 'interactive' }
        }));
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick: () => {} });
        let state = await progress.getLessonActivityState(SLUG, 'interactive');
        if (state?.kind !== 'prime-tree-84' || state.version !== 1) {
            state = {
                kind: 'prime-tree-84', version: 1, tree: logic.createTree(84),
                activeNodeId: null, inputs: ['', ''], phase: 'answer', message: ''
            };
        }
        // Extend the D1 state in place so existing trees and partially typed
        // splits survive this upgrade. A finished D1 tree starts collection.
        if (!state.stage) {
            state.stage = logic.isFinished(state.tree) ? 'collect' : 'tree';
            if (state.stage === 'collect') { state.phase = 'answer'; state.message = ''; }
        }
        state.collected ??= [];
        state.builder ??= null;
        state.collectFinished ??= false;
        state.groupFinished ??= false;
        state.feedbackType ??= state.phase === 'wrong' ? 'is-incorrect' : 'is-correct';
        if ((state.stage === 'group' || state.stage === 'complete') &&
            (state.groupingVersion !== 1 || !Array.isArray(state.builder) ||
                !state.builder.every(row => row && 'prime' in row && 'count' in row))) {
            startGrouping();
        }
        let builder = null;

        function startGrouping() {
            state.stage = 'group';
            state.groupingVersion = 1;
            state.groupPart = 'watch';
            state.groupShowStep = 0;
            state.builder = [2, 3, 7].map(prime => ({ prime: String(prime), count: '' }));
            state.wrongPrime = null;
            state.collectFinished = true;
            state.groupFinished = false;
            clearFeedback();
        }
        function save() { progress.saveLessonActivityState(SLUG, 'interactive', state); }
        function reportProgress() {
            const done = state.groupFinished ? 5 : state.collectFinished ? 4 : logic.leaves(state.tree).length - 1;
            api.setSectionProgress('interactive', done, 5);
        }
        function activeNode(node = state.tree) {
            if (node.id === state.activeNodeId) return node;
            for (const child of node.children || []) {
                const found = activeNode(child);
                if (found) return found;
            }
            return null;
        }
        function firstSplit() { return !state.tree.children?.length; }
        function clearFeedback() { state.phase = 'answer'; state.message = ''; }
        function tapNode(node) {
            state.inputs = ['', ''];
            clearFeedback();
            if (logic.isPrime(node.value)) {
                state.activeNodeId = null;
                state.message = logic.feedback('is-prime', { n: node.value });
                state.feedbackType = 'is-correct';
                render();
                root.querySelector('[data-try-status]')?.focus({ preventScroll: true });
            } else {
                state.activeNodeId = node.id;
                render();
                root.querySelector('input')?.focus({ preventScroll: true });
            }
        }
        function collectNode(node) {
            if (state.collectFinished || state.collected.some(entry => entry.id === node.id)) return;
            state.collected.push({ id: node.id, value: node.value });
            clearFeedback();
            render();
        }
        function setResult(result) {
            state.phase = result.status === 'correct' ? 'correct' : 'wrong';
            state.message = result.message;
            state.feedbackType = state.phase === 'correct' ? 'is-correct' : 'is-incorrect';
        }
        function updateAction() {
            if (state.groupFinished) { api.clearSectionAction('interactive'); return; }
            if (state.stage === 'group' && state.groupPart === 'watch') {
                api.setSectionAction('interactive', {
                    label: state.groupShowStep < 3 ? 'Show me' : 'Your turn',
                    disabled: false, onClick: check
                });
                return;
            }
            if (state.stage === 'collect' || state.stage === 'group') {
                api.setSectionAction('interactive', {
                    label: state.phase === 'wrong' ? 'Try again' : state.collectFinished && state.stage === 'collect' ? 'Next' : 'Check',
                    disabled: state.phase !== 'wrong' && (state.stage === 'collect' ? state.collected.length === 0 : !builder.isComplete()),
                    onClick: check
                });
                return;
            }
            if (!firstSplit() && !activeNode()) { api.clearSectionAction('interactive'); return; }
            const ready = firstSplit() ? state.inputs[1].trim() !== '' : state.inputs.every(value => value.trim() !== '');
            api.setSectionAction('interactive', {
                label: state.phase === 'wrong' ? 'Try again' : firstSplit() ? 'Check' : 'Check split',
                disabled: state.phase !== 'wrong' && !ready,
                onClick: check
            });
        }
        function check() {
            if (state.groupFinished) return;
            if (state.stage === 'group' && state.groupPart === 'watch') {
                if (state.groupShowStep < 3) state.groupShowStep++;
                else state.groupPart = 'count';
                render();
                return;
            }
            if (state.phase === 'wrong') {
                if (state.stage === 'tree') state.inputs = ['', ''];
                if (state.stage === 'group') state.wrongPrime = null;
                clearFeedback();
                render();
                if (state.stage === 'tree') root.querySelector('input')?.focus({ preventScroll: true });
                return;
            }
            if (state.stage === 'collect') {
                if (state.collectFinished) {
                    startGrouping();
                } else {
                    if (!state.collected.length) return;
                    setResult(logic.markAnswer(84, state.collected.map(({ value }) => ({ base: value, power: 1 })), { indexForm: false }));
                    if (state.phase === 'correct') state.collectFinished = true;
                    reportProgress();
                }
                render();
                return;
            }
            if (state.stage === 'group') {
                if (!builder.isComplete()) return;
                const entries = builder.getEntries();
                setResult(logic.markAnswer(84, entries, { indexForm: true }));
                state.wrongPrime = state.phase === 'wrong'
                    ? firstWrongPrime(entries, logic.toIndexForm(logic.primeFactors(84))) : null;
                if (state.phase === 'correct') {
                    state.message = '2 appears twice, so we write 2². 3 and 7 appear once, so they have no power.';
                    state.groupFinished = true;
                    state.stage = 'complete';
                    reportProgress();
                }
                render();
                return;
            }
            const initial = firstSplit();
            const node = initial ? state.tree : activeNode();
            if (!node || (initial ? state.inputs[1].trim() === '' : state.inputs.some(value => value.trim() === ''))) return;
            const a = initial ? 7 : Number(state.inputs[0]);
            const b = Number(state.inputs[1]);
            const result = logic.checkSplit(node.value, a, b);
            if (!result.ok) {
                state.phase = 'wrong';
                state.message = logic.feedback(result.reason, { n: node.value });
                state.feedbackType = 'is-incorrect';
                render();
                return;
            }
            state.tree = logic.splitNode(state.tree, node.id, a, b).tree;
            state.activeNodeId = null;
            state.inputs = ['', ''];
            clearFeedback();
            if (logic.isFinished(state.tree)) state.stage = 'collect';
            reportProgress();
            render();
        }
        function render() {
            root.replaceChildren();
            const article = document.createElement('article');
            article.className = 'prime-try';
            root.append(article);
            function paragraph(text) {
                const p = document.createElement('p');
                p.textContent = text;
                article.append(p);
                return p;
            }
            function maths(latex) {
                const p = paragraph('');
                p.className = 'prime-try-maths';
                p.dataset.primeMaths = latex;
                return p;
            }
            function feedback() {
                const message = state.stage === 'group' && state.phase === 'wrong' && state.wrongPrime != null
                    ? `Count the ${state.wrongPrime}s again in 2 × 2 × 3 × 7.` : state.message;
                const status = paragraph(message);
                status.className = `question-feedback${message ? ` is-visible ${state.feedbackType}` : ''}`;
                status.dataset.tryStatus = 'true';
                status.setAttribute('role', 'status');
                status.tabIndex = -1;
            }
            if (state.stage === 'collect') {
                paragraph('Every end number is prime. The tree is finished.');
                paragraph('Tap every circled number to put it into your answer.');
                article.append(drawTree(state.tree, {
                    onNodeTap: collectNode,
                    collectedNodeIds: state.collected.map(({ id }) => id),
                    locked: state.collectFinished
                }));
                const line = document.createElement('div');
                line.className = 'prime-collected-answer';
                article.append(line);
                const equal = document.createElement('span');
                equal.dataset.primeMaths = '84 =';
                line.append(equal);
                if (!state.collected.length) {
                    const missing = document.createElement('span');
                    missing.dataset.primeMaths = '?';
                    line.append(missing);
                }
                state.collected.forEach((entry, index) => {
                    const item = document.createElement('span');
                    item.className = 'prime-collected-item';
                    line.append(item);
                    if (index > 0) {
                        const times = document.createElement('span');
                        times.dataset.primeMaths = '\\times';
                        item.append(times);
                    }
                    const factor = document.createElement('button');
                    factor.type = 'button';
                    factor.dataset.collectedId = entry.id;
                    factor.dataset.primeMaths = logic.toLatex([{ base: entry.value, power: 1 }]);
                    factor.setAttribute('aria-label', `Remove factor ${entry.value} from your answer`);
                    factor.disabled = state.collectFinished;
                    factor.addEventListener('click', () => {
                        state.collected = state.collected.filter(({ id }) => id !== entry.id);
                        clearFeedback();
                        render();
                    });
                    item.append(factor);
                });
                feedback();
                if (state.collectFinished) {
                    maths(`84 = ${logic.toLatex(logic.primeFactors(84).map(base => ({ base, power: 1 })))}`);
                    paragraph('Smallest to largest makes repeats easy to spot.');
                }
            } else if (state.stage === 'group' || state.stage === 'complete') {
                function tiles(target, entries, { highlightThrees = false, colours = false } = {}) {
                    const line = document.createElement('div');
                    line.className = `prime-count-tiles${colours ? ' is-coloured' : ''}`;
                    line.setAttribute('role', 'img');
                    line.setAttribute('aria-label', `${target} equals ${entries.map(({ base, power }) => power === 1 ? base : `${base} to the power ${power}`).join(' times ')}`);
                    const equal = document.createElement('span');
                    equal.dataset.primeMaths = `${target} =`;
                    line.append(equal);
                    const pairedThrees = highlightThrees && entries.filter(entry => entry.base === 3).length === 2;
                    let pair;
                    entries.forEach((entry, index) => {
                        if (pairedThrees && entry.base === 3 && !pair) {
                            pair = document.createElement('span');
                            pair.className = 'prime-example-pair';
                        }
                        const destination = pairedThrees && entry.base === 3 ? pair : line;
                        if (index > 0) {
                            const times = document.createElement('span');
                            times.dataset.primeMaths = '\\times';
                            if (destination === pair && pair.children.length > 0) pair.append(times);
                            else line.append(times);
                        }
                        const tile = document.createElement('span');
                        tile.className = `prime-number-tile${highlightThrees && entry.base === 3 ? ' is-matched' : ''}`;
                        tile.dataset.prime = String(entry.base);
                        tile.dataset.primeMaths = logic.toLatex([entry]);
                        destination.append(tile);
                        if (destination === pair && pair.parentNode !== line) line.append(pair);
                    });
                    if (pair) {
                        const label = document.createElement('span');
                        label.className = 'prime-example-pair-label';
                        label.textContent = 'two 3s';
                        pair.append(label);
                    }
                    article.append(line);
                }
                if (state.groupPart === 'watch') {
                    const title = document.createElement('h3');
                    title.textContent = 'Watch first';
                    article.append(title);
                    if (state.groupShowStep > 0) {
                        tiles(90, state.groupShowStep < 3
                            ? [2, 3, 3, 5].map(base => ({ base, power: 1 }))
                            : [{ base: 2, power: 1 }, { base: 3, power: 2 }, { base: 5, power: 1 }],
                        { highlightThrees: state.groupShowStep >= 2 });
                    }
                    if (state.groupShowStep === 3) paragraph('There are two 3s, so write 3². The 2 and the 5 appear once, so they have no power.');
                } else {
                    tiles(84, [2, 2, 3, 7].map(base => ({ base, power: 1 })), { colours: true });
                    paragraph('Count how many times each prime appears.');
                    const container = document.createElement('div');
                    article.append(container);
                    builder = logic.createAnswerBuilder(container, {
                        target: 84, initial: state.builder, fixedPrimes: [2, 3, 7],
                        onChange: (entries, raw) => {
                            state.builder = raw;
                            state.wrongPrime = null;
                            clearFeedback();
                            save();
                            const status = root.querySelector('[data-try-status]');
                            status.textContent = '';
                            status.className = 'question-feedback';
                            updateAction();
                        }
                    });
                    state.builder = builder.getState();
                    container.addEventListener('keydown', event => {
                        if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); check(); }
                    });
                    if (state.groupFinished) container.querySelectorAll('input, button').forEach(element => { element.disabled = true; });
                    feedback();
                    if (state.groupFinished) maths('\\boxed{84 = 2^2 \\times 3 \\times 7}');
                }
            } else {
                const initial = firstSplit();
                if (initial) {
                    article.append(drawTree({ ...state.tree, children: [{ value: 7 }, { value: '' }] }));
                } else {
                    paragraph("Tap a number that isn't prime to split it.");
                    article.append(drawTree(state.tree, { onNodeTap: tapNode }));
                }
                if (initial || activeNode()) {
                    const node = initial ? state.tree : activeNode();
                    const panel = document.createElement('div');
                    panel.className = 'prime-split-panel';
                    article.append(panel);
                    const instruction = document.createElement('p');
                    instruction.textContent = initial ? 'Start by splitting 84 into 7 and another number.' : `Split ${node.value} into two numbers:`;
                    panel.append(instruction);
                    const row = document.createElement('div');
                    row.className = 'prime-split-inputs';
                    panel.append(row);
                    if (initial) {
                        const expression = document.createElement('span');
                        expression.dataset.primeMaths = '84 = 7 \\times';
                        row.append(expression);
                    }
                    (initial ? [1] : [0, 1]).forEach((index, position) => {
                        if (!initial && position === 1) {
                            const times = document.createElement('span');
                            times.dataset.primeMaths = '\\times';
                            row.append(times);
                        }
                        const input = document.createElement('input');
                        input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off';
                        input.value = state.inputs[index]; input.readOnly = state.phase === 'wrong';
                        input.setAttribute('aria-label', initial ? 'Another factor of 84' : `${index === 0 ? 'First' : 'Second'} factor of ${node.value}`);
                        input.addEventListener('input', () => { state.inputs[index] = input.value; save(); updateAction(); });
                        input.addEventListener('keydown', event => {
                            if (event.key === 'Enter') { event.preventDefault(); check(); }
                        });
                        row.append(input);
                    });
                }
                feedback();
            }
            renderMaths(article);
            save();
            if (state.groupFinished) {
                document.dispatchEvent(new CustomEvent('maths1to9:section-complete', { detail: { sectionId: 'interactive' } }));
            }
            updateAction();
        }
        reportProgress();
        render();
    };

    function mountLearn(event) {
        if (event.detail?.slug !== SLUG) return;
        const section = document.getElementById('lesson-section-explanation');
        if (!section || section.querySelector('.prime-learn')) return;
        const screens = event.detail.lesson.learn_screens;
        const api = window.Maths1to9Lesson;
        const restoredComplete = api.getProgress().scoreActivities.some(activity =>
            activity.id === 'section:explanation' && activity.completed
        );
        let screen = restoredComplete ? 3 : 0;
        let splits = restoredComplete ? 3 : 0;
        let collection = restoredComplete ? 2 : 0;
        let collecting = false;
        let collectedPaths = restoredComplete ? ['root-0-0', 'root-0-1', 'root-1-0', 'root-1-1'] : [];
        const leafPaths = ['root-0-0', 'root-0-1', 'root-1-0', 'root-1-1'];
        const primeValues = [2, 3, 2, 5];
        const root = document.createElement('article');
        root.className = 'prime-learn';
        section.append(root);
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId: 'explanation' }
        }));

        function paragraph(text, className = '') {
            const p = document.createElement('p');
            p.className = className;
            // Wording comes from lesson.json; only formula fragments become maths spans.
            const expression = /\d+(?:²|(?: × \d+)+)/g;
            let end = 0;
            for (const match of text.matchAll(expression)) {
                p.append(document.createTextNode(text.slice(end, match.index)));
                const formula = document.createElement('span');
                formula.dataset.primeMaths = match[0].replaceAll('²', '^2').replaceAll(' × ', ' \\times ');
                p.append(formula);
                end = match.index + match[0].length;
            }
            p.append(document.createTextNode(text.slice(end)));
            root.append(p);
            return p;
        }
        function maths(latex) {
            const p = paragraph('', 'prime-learn-maths');
            p.dataset.primeMaths = latex;
            return p;
        }
        function currentTree() {
            if (splits === 0) return { value: 60 };
            if (splits === 1) return { value: 60, children: [{ value: 6 }, { value: 10 }] };
            if (splits === 2) return { value: 60, children: [finishedTree.children[0], { value: 10 }] };
            return finishedTree;
        }
        function advance() {
            screen++;
            render(true);
        }
        function collect() {
            if (collecting) return;
            collecting = true;
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reducedMotion) {
                collectedPaths = [...leafPaths];
                collection = 1;
                collecting = false;
                render();
                return;
            }
            function addPrime() {
                collectedPaths.push(leafPaths[collectedPaths.length]);
                if (collectedPaths.length === leafPaths.length) {
                    collecting = false;
                    collection = 1;
                }
                render();
                if (collecting) window.setTimeout(addPrime, 350);
            }
            addPrime();
        }
        function render(moveFocus = false) {
            root.replaceChildren();
            const data = screens[screen];
            root.dataset.screen = String(screen + 1);
            const heading = document.createElement('h3');
            heading.textContent = data.title;
            heading.tabIndex = -1;
            root.append(heading);
            let action = null;

            if (screen === 0) {
                paragraph(data.text);
                root.append(drawTree(currentTree()));
                paragraph(data.key, 'prime-learn-key');
                if (splits === 3) paragraph(data.finished);
                action = splits < 3
                    ? { label: data.split_button, onClick: () => { splits++; render(); } }
                    : { label: data.next_button, onClick: advance };
            } else if (screen === 1) {
                paragraph(data.text);
                root.append(drawTree(finishedTree, { fadeSplit: true, collected: collectedPaths, splitNote: data.note }));
                const expressions = document.createElement('div');
                expressions.className = 'prime-learn-collected';
                root.append(expressions);
                function collectedMaths(latex) { expressions.append(maths(latex)); }
                if (collecting) {
                    const shown = primeValues.slice(0, collectedPaths.length);
                    collectedMaths(`60 = ${shown.join(' \\times ')}`);
                } else if (collection > 0) {
                    collectedMaths(data.collected_maths);
                    if (collection === 2) collectedMaths(data.ordered_maths);
                }
                if (collection === 2) expressions.append(paragraph(data.ordered_text));
                action = collection === 0
                    ? { label: data.collect_button, disabled: collecting, onClick: collect }
                    : collection === 1
                        ? { label: data.order_button, onClick: () => { collection = 2; render(); } }
                        : { label: data.next_button, onClick: advance };
            } else if (screen === 2) {
                maths(data.underbrace_maths);
                maths(data.answer_maths);
                // Keep prose wrapping naturally while rendering its mathematical fragments.
                paragraph(data.text);
                maths(data.example_maths);
                paragraph(data.example_text);
                action = { label: data.next_button, onClick: advance };
            } else {
                paragraph(data.text);
                const trees = document.createElement('div');
                trees.className = 'prime-learn-trees';
                trees.append(
                    drawTree(finishedTree, { matchColours: true }),
                    drawTree(alternativeTree, { matchColours: true })
                );
                root.append(trees);
                maths(data.answer_maths);
                api.clearSectionAction('explanation');
                document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
                    detail: { sectionId: 'explanation' }
                }));
            }
            renderMaths(root);
            if (action) api.setSectionAction('explanation', { disabled: false, ...action });
            if (moveFocus) heading.focus({ preventScroll: true });
        }
        render();
    }

    document.addEventListener('maths1to9:lesson-rendered', mountLearn);
})();
