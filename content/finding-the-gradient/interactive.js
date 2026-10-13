(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const G = window.FindingGradient;
    const graphs = window.Maths1to9Graph;
    const d = G.definition;
    const learn = [
        { title: 'How steep is a line?', graph: d(2, 1, [1, 1], [2, 3]),
            text: ['The gradient tells you how far a line goes up for every 1 across.',
                'This line goes up 2 for every 1 across. Its gradient is 2.'] },
        { title: 'Measure a bigger step', graph: d(2, 1, [1, 1], [3, 5]),
            text: ['Up 4 for 2 across is the same as up 2 for every 1 across.'],
            maths: '\\text{gradient} = \\dfrac{\\text{vertical change}}{\\text{horizontal change}} = \\dfrac{4}{2} = 2' },
        { title: 'Any two points', graph: d(2, 1, [1, -3], [2, -1]),
            text: ['Drag the point. The triangle grows, but the gradient stays 2.'], movable: true },
        { title: 'Fractions', graph: d(1, 2, [2, 1], [4, 2]),
            maths: '\\frac{1}{2} = 0.5', text: ['It goes up half a unit for every 1 across. A gradient can be a fraction.'] },
        { title: 'Going down', graph: d(-2, 1, [2, 5], [5, -1]), labelSide: 'above',
            maths: '\\frac{-6}{3} = -2', text: ['Read from left to right. Going down makes the vertical change negative.',
                'Up: positive gradient. Down: negative gradient.'] },
        { title: 'Flat', graph: d(0, 1, [0, 3], [4, 3]), maths: '\\frac{0}{4} = 0',
            text: ['A horizontal line (across) doesn’t go up or down. Its gradient is 0.'] },
        { title: 'Read the scale', graph: d(2, 1, [1, 2], [4, 8], { x: 1, y: 2 }),
            maths: '\\frac{6}{3} = 2', text: ['Here one square up is 2 units.', 'Count the numbers on the axes, not the squares.'] }
    ];
    const triangle = d(2, 1, [1, -2], [4, 4]);
    const exampleGraphs = [triangle, d(1, 2, [1, 1], [5, 3]), d(-1, 2, [0, 3], [4, 1]),
        d(4, 1, [0, 2], [2, 10], { x: 1, y: 2 })];
    const hashes = ['try-it-1', 'try-it-1-up', 'try-it-1-across', 'try-it-1-change',
        'try-it-1-gradient', 'try-it-2', 'try-it-3', 'try-it-4', 'try-it-4-gradient', 'try-it-5'];
    const cardDefinitions = {
        2: { scene: 0, prompt: 'How far across did you go? (horizontal change)', answer: '3',
            rules: [{ value: '4', feedback: 'That’s the x-coordinate of (4, 4). Count the squares from 1 to 4.' }] },
        3: { scene: 0, prompt: 'How far up did you go? (vertical change)', answer: '6',
            rules: [{ value: '4', feedback: 'That’s the y-coordinate of (4, 4). Count from −2 up to 4.' }] },
        4: { scene: 0, prompt: 'What is the gradient?', answer: '2',
            rules: [{ value: '1/2', feedback: 'Divide the vertical change by the horizontal change.' },
                { value: '6', feedback: 'That’s the vertical change. Divide it by the horizontal change.' },
                { value: '18', feedback: 'Divide, don’t multiply.' }],
            feedback: 'Right. 6 ÷ 3 = 2. We measure across and up, not the sloping side.' },
        5: { scene: 1, prompt: 'Find the gradient of the line.', answer: '1/2',
            rules: [...G.wrongAnswerRules(exampleGraphs[1]),
                { value: '4', feedback: 'That’s the horizontal change. Divide the vertical change by it.' }],
            feedback: 'Right. 2/4 = 1/2. A bigger triangle, the same gradient as on the Learn screen.' },
        6: { scene: 2, prompt: 'Find the gradient of the line.', answer: '−1/2',
            rules: [...G.wrongAnswerRules(exampleGraphs[2]),
                { value: '2', feedback: 'Divide the vertical change by the horizontal change, and read from left to right.' }],
            feedback: 'Right. It goes 4 right and 2 down: −2 ÷ 4 = −1/2.' },
        7: { scene: 3, prompt: 'What is the vertical change?', answer: '8',
            rules: [{ value: '4', feedback: 'That’s 4 squares. Each square up is 2 units.' }] },
        8: { scene: 3, prompt: 'What is the gradient?', answer: '4', rules: G.wrongAnswerRules(exampleGraphs[3]) }
    };

    function node(tag, text, className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }
    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    }
    function maths(element, latex) {
        window.katex.render(latex, element, { throwOnError: false, displayMode: true });
    }
    function heading(root, title) {
        const h = node('h3', title);
        h.dataset.screenHeading = '';
        root.append(h);
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1, initial: () => ({ screen: 0, furthestScreen: 0, finished: false,
                position: [2, -1], moved: false, seen: [] })
        });
        const state = section.state;
        let board;
        let timers = [];
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
                if (screen === learn.length - 1) state.finished = true;
            });
            render();
        }
        function render() {
            timers.forEach(clearTimeout);
            timers = [];
            board?.destroy();
            root.replaceChildren();
            const screen = learn[state.screen];
            heading(root, screen.title);
            const host = document.createElement('div');
            root.append(host);
            const graph = { ...screen.graph };
            if (screen.movable) {
                graph.b = state.position;
                graph.label = 'Coordinate grid. A straight line through (1, −3), (2, −1), (3, 1), (4, 3) and (5, 5). Move the second marked point.';
            }
            board = G.setup(host, graph, { marked: !screen.movable });
            screen.text.forEach((text, index) => {
                const paragraph = node('p', text);
                if (state.screen === 0 && index === 0) {
                    const [before, after] = text.split('gradient');
                    paragraph.replaceChildren(document.createTextNode(before), node('strong', 'gradient'), document.createTextNode(after));
                }
                root.append(paragraph);
            });
            const expression = node('div', '', 'gradient-maths');
            if (screen.maths || screen.movable) root.append(expression);
            if (screen.maths) maths(expression, screen.maths);
            if (screen.movable) {
                const from = graph.a;
                board.point(from, { coordinates: true, size: 'large', labelSide: 'left' });
                const measures = G.arrows(board, from, state.position);
                const reveal = node('p', state.moved ? 'A straight line has the same gradient all the way along.' : '');
                root.append(reveal);
                function measure(position) {
                    const labels = G.changeLabels(from, position);
                    const corner = [position[0], from[1]];
                    measures.across.update({ value: { from, to: corner }, label: labels.across });
                    measures.vertical.update({ value: { from: corner, to: position }, label: labels.vertical });
                    maths(expression, `\\frac{${position[1] - from[1]}}{${position[0] - from[0]}} = 2`);
                }
                board.point(state.position, {
                    size: 'large', coordinates: true, labelSide: 'above', drag: 'positions',
                    positions: [[2, -1], [3, 1], [4, 3], [5, 5]],
                    onMove(position) {
                        section.update(state => { state.position = position; state.moved = true; });
                        measure(position);
                        reveal.textContent = 'A straight line has the same gradient all the way along.';
                    }
                });
                measure(state.position);
            } else {
                const labels = G.changeLabels(graph.a, graph.b);
                const corner = [graph.b[0], graph.a[1]];
                const across = () => board.arrow(graph.a, corner, { tone: 'ink', label: labels.across,
                    ...(screen.labelSide ? { labelSide: screen.labelSide } : {}) });
                const up = () => {
                    if (graph.b[1] !== graph.a[1]) board.arrow(corner, graph.b, { tone: 'ink', label: labels.vertical });
                };
                if (!state.seen[state.screen] && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    timers.push(setTimeout(across, 250), setTimeout(up, 750));
                } else { across(); up(); }
            }
            section.update(state => { state.seen[state.screen] = true; });
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen < state.furthestScreen) api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            else if (state.finished) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            syncHash();
        }
        learn.forEach((screen, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            api.goToSection('explanation', { moveFocus: false });
            showScreen(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-7])$/.exec(initialHash);
        if (requested) showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        else render();
    }

    function same(a, b) { return a[0] === b[0] && a[1] === b[1]; }
    function judgeLeg(line, vertical) {
        if (!line) return { correct: false, feedback: 'Draw a longer line.' };
        const start = vertical ? [4, -2] : [1, -2];
        const end = vertical ? [4, 4] : [4, -2];
        if ((same(line.from, start) && same(line.to, end)) || (same(line.to, start) && same(line.from, end))) {
            return { correct: true, feedback: vertical ? '✓ That’s the vertical change.' : '✓ That’s the horizontal change.' };
        }
        if (G.onLine(line.from, triangle) && G.onLine(line.to, triangle)) {
            return { correct: false, feedback: vertical ? 'That’s the line itself. Draw up from (4, −2).'
                : 'That’s the line itself. Draw across first, then up.' };
        }
        const kind = graphs.classify(line).kind;
        let feedback;
        if (kind === (vertical ? 'vertical' : 'horizontal')) {
            if (same(line.from, start) || same(line.to, start)) {
                const other = same(line.from, start) ? line.to : line.from;
                feedback = vertical ? (other[1] > 4 ? 'Stop at (4, 4).' : 'Keep going up to (4, 4).')
                    : (other[0] > 4 ? 'Stop directly below (4, 4).' : 'Keep going until you’re directly below (4, 4).');
            } else feedback = vertical ? 'Start where your horizontal line ended, (4, −2).' : 'Start at the left point, (1, −2).';
        } else feedback = vertical ? 'Draw straight up from (4, −2).'
            : 'Draw straight across, keeping the same height as (1, −2).';
        return { correct: false, feedback };
    }

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Next', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1, initial: () => ({ index: 0, screen: 0, finished: false, cards: {},
                horizontal: null, vertical: null, drafts: [null, null], feedback: '', correct: null })
        });
        const state = section.state;
        let boards = [];
        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') api.setSlideHash(hashes[state.screen], { replace: true });
        }
        function showScreen(screen) { section.update(state => { state.screen = screen; }); render(); }
        function reportProgress() {
            const completed = Number(state.horizontal !== null) + Number(state.vertical !== null) +
                Object.values(state.cards).filter(card => card.correct === true).length;
            api.setSectionProgress('interactive', completed, 9);
        }
        function advance() {
            section.update(state => { state.index++; state.screen = state.index; state.finished = state.index === 9; });
            render();
        }
        function triangleFigure(host, readOnly) {
            const board = G.setup(host, triangle, { readOnly: true });
            boards.push(board);
            const labels = state.cards['try-card-4']?.correct === true;
            const across = state.horizontal ? board.segment(state.horizontal.from, state.horizontal.to,
                { tone: 'correct', ...(labels ? { label: '3 right' } : {}) }) : null;
            const up = state.vertical ? board.segment(state.vertical.from, state.vertical.to,
                { tone: 'correct', ...(labels ? { label: '6 up' } : {}) }) : null;
            return { showLengths() { across?.update({ label: '3 right' }); up?.update({ label: '6 up' }); } };
        }
        function drawCard(container, index, readOnly) {
            const definition = cardDefinitions[index];
            let diagram;
            api.createQuestion(container, {
                input: 'number', fractions: true, ...definition,
                sectionId: 'interactive', questionId: `try-card-${index}`, scored: false, readOnly,
                feedback: definition.feedback || 'Right.', fallback: G.fallback,
                figure(host, { readOnly }) {
                    if (definition.scene === 0) diagram = triangleFigure(host, readOnly);
                    else G.figure(exampleGraphs[definition.scene])(host, { readOnly });
                },
                onFeedback(result) {
                    reportProgress();
                    if (index === 4 && result.correct) diagram.showLengths();
                },
                onContinue: advance
            });
        }
        function drawing(index, readOnly) {
            heading(root, index === 0
                ? 'Start at the left point, (1, −2). Draw across to the right until you’re directly below (4, 4).'
                : 'Now draw up to (4, 4).');
            const host = document.createElement('div');
            root.append(host);
            const board = G.setup(host, triangle);
            boards.push(board);
            if (state.horizontal) board.segment(state.horizontal.from, state.horizontal.to, { tone: 'correct' });
            if (state.vertical) board.segment(state.vertical.from, state.vertical.to, { tone: 'correct' });
            const shown = readOnly ? judgeLeg(state[index === 0 ? 'horizontal' : 'vertical'], index === 1)
                : { feedback: state.feedback, correct: state.correct };
            const feedback = node('p', shown.feedback, 'question-feedback');
            if (shown.feedback) feedback.classList.add('is-visible', shown.correct ? 'is-correct' : 'is-incorrect');
            feedback.setAttribute('aria-live', 'polite');
            root.append(feedback);
            if (!readOnly && !(index === 1 && state.vertical)) {
                const tool = board.drawLine({
                    line: state.drafts[index], extend: false, minLength: 1, movable: false,
                    tone: (line, { finished }) => finished ? (judgeLeg(line, index === 1).correct ? 'correct' : 'incorrect') : 'neutral',
                    onChange(line) {
                        const result = judgeLeg(line, index === 1);
                        board.describe('');
                        section.update(state => {
                            state.drafts[index] = line;
                            state.feedback = result.feedback;
                            state.correct = result.correct;
                            if (result.correct) state[index === 0 ? 'horizontal' : 'vertical'] = line;
                        });
                        feedback.textContent = result.feedback;
                        feedback.className = `question-feedback is-visible ${result.correct ? 'is-correct' : 'is-incorrect'}`;
                        reportProgress();
                        if (result.correct && index === 0) advance();
                        else if (result.correct) {
                            board.segment(line.from, line.to, { tone: 'correct' });
                            board.setEditable(false);
                            tool.set(null);
                            action();
                        }
                    }
                });
            }
            board.setEditable(!readOnly && !(index === 1 && state.vertical));
        }
        function action() {
            if (state.screen < state.index) api.setSectionAction('interactive', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            else if (state.screen < 2) api.setSectionAction('interactive', {
                label: 'Next', disabled: !state.vertical, onClick: advance
            });
        }
        function render() {
            boards.forEach(board => board.destroy());
            boards = [];
            root.replaceChildren();
            api.setSectionBack('interactive', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === 9) {
                heading(root, 'Your completed examples');
                for (const index of Object.keys(cardDefinitions).map(Number)) {
                    const container = document.createElement('article');
                    root.append(container);
                    drawCard(container, index, true);
                }
                api.clearSectionAction('interactive');
            } else if (state.screen < 2) drawing(state.screen, state.screen < state.index);
            else drawCard(root, state.screen, state.screen < state.index);
            action();
            reportProgress();
            syncHash();
        }
        hashes.forEach((hash, index) => api.registerHashRoute(hash, () => {
            if (api.goToSection('interactive', { moveFocus: false })) showScreen(Math.min(index, state.index));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = hashes.indexOf(initialHash.slice(1));
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false })) showScreen(Math.min(requested, state.index));
        else render();
    }
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
