(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const E = window.GradientIntercept;
    const graphs = window.Maths1to9Graph;
    const titles = ['An equation is a rule.', 'Where does it cross the y-axis?', 'How steep is it?',
        'The pattern: y = mx + c.', 'Negative numbers.', 'Hidden numbers.'];
    const positions = [[0, 3], [1, 5], [2, 7]];
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }
    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    }
    function equation(root, m, c, options) {
        const element = node('div', '', 'lesson-equation');
        element.innerHTML = E.equationHtml(m, c, options);
        root.append(element);
        return element;
    }
    function paragraphs(root, texts) {
        root.replaceChildren(...texts.map(text => node('p', text)));
    }
    function stepArrows(graph, m, c) {
        const step = E.step(m, c);
        if (!step) return [];
        return [graph.arrow(step.from, step.corner, { tone: 'ink' }),
            graph.arrow(step.corner, step.to, { tone: 'ink' })];
    }
    function stepText(m) {
        return m === 0 ? 'Flat: 0 up for every 1 right' : `1 right, ${Math.abs(m)} ${m < 0 ? 'down' : 'up'}`;
    }
    function tapFeedback([x, y]) {
        if (x === 0 && y === 3) return `✓ The line crosses the y-axis at ${E.coordinate(0, 3)}.`;
        if (x === 0) return "That's on the y-axis, but the line isn't there. Follow the line to the y-axis.";
        if (y === 2 * x + 3) return 'That point is on the line. Now follow it to the y-axis, the up-and-down axis.';
        if (y === 0) return "That's on the x-axis. The y-axis is the up-and-down one.";
        return 'Tap where the line meets the y-axis, the up-and-down axis.';
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1, initial: () => ({ screen: 0, furthestScreen: 0, finished: false,
                tap: null, found: false, position: 0, visited: [0], reached: false,
                sliders: { m: 2, c: 3, stage: 0 }, hidden: 0 })
        });
        const state = section.state;
        let graph;
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
                if (screen === 5) state.finished = true;
            });
            render();
        }
        function action() {
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen === 5) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', {
                label: 'Next', disabled: state.screen === 1 && !state.found || state.screen === 2 && !state.reached || state.screen === 4 && state.sliders.stage < 2,
                onClick: () => showScreen(state.screen + 1)
            });
        }
        function createGraph(host, label) {
            return graphs.create(host, { x: [-6, 6], y: [-6, 8], step: { x: 1, y: 1 }, label });
        }
        function render() {
            graph?.destroy();
            root.replaceChildren();
            const heading = node('h3', titles[state.screen]);
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (state.screen === 3) {
                const pattern = node('div', '', 'lesson-equation');
                pattern.innerHTML = 'y&nbsp;=&nbsp;<i>mx</i>&nbsp;+&nbsp;<i>c</i>';
                root.append(pattern);
            }
            const eq = equation(root, 2, 3, { highlight: state.screen === 3 ? 'both' : undefined });
            const prompt = node('p');
            const controls = node('div');
            const host = node('div');
            const stepLine = node('p', '', 'gradient-step-line');
            stepLine.hidden = true;
            const content = node('div');
            root.append(prompt, controls, host, stepLine, content);
            graph = createGraph(host, state.screen === 4 ? 'Coordinate grid. Change the gradient and y-intercept to explore the line.'
                : state.screen === 5 ? 'Coordinate grid. Lines with hidden numbers in their equations.' : `Coordinate grid. The line ${E.equationText(2, 3)}.`);
            if (state.screen < 4) graph.line({ m: 2, c: 3 }, { tone: 'neutral' });
            if (state.screen === 0) paragraphs(content, [
                `${E.equationText(2, 3)} is a rule: multiply x by 2, then add 3 to get y.`,
                'Every x and y that fit the rule make a point. Here, the points make a straight line.',
                'The 2 and the 3 tell you two things about the line.'
            ]);
            if (state.screen === 1) {
                prompt.textContent = 'Tap where the line crosses the y-axis.';
                const feedback = node('p');
                feedback.setAttribute('role', 'status');
                const explanation = node('div');
                content.append(feedback, explanation);
                let marker;
                function paint() {
                    marker?.remove();
                    if (state.tap) marker = graph.point(state.tap, { tone: state.found ? 'correct' : 'incorrect',
                        size: state.found ? 'large' : 'small', coordinates: state.found });
                    feedback.textContent = state.tap ? tapFeedback(state.tap) : '';
                    feedback.className = state.tap ? `question-feedback is-visible ${state.found ? 'is-correct' : 'is-incorrect'}` : '';
                    if (state.found) {
                        eq.innerHTML = E.equationHtml(2, 3, { highlight: 'c' });
                        paragraphs(explanation, [`Every point on the y-axis has ${E.nb('x = 0')}. Put ${E.nb('x = 0')} in: ${E.nb('y = 2 × 0 + 3 = 3')}.`]);
                        const sentence = node('p'); sentence.append('So 3 is the ', node('strong', 'y-intercept'), '.'); explanation.append(sentence);
                    }
                }
                paint();
                if (!state.found) {
                    const picker = graph.pick({ label: prompt.textContent, onPick(position) {
                        section.update(state => { state.tap = position; state.found = position[0] === 0 && position[1] === 3; });
                        if (state.found) picker.stop();
                        paint(); action();
                    } });
                }
            }
            if (state.screen === 2) {
                prompt.textContent = `Drag the point along the line to ${E.nb('x = 2')}.`;
                const table = node('table');
                table.setAttribute('aria-label', 'Points reached on the line');
                const head = node('tr'); head.append(node('th', 'x\u00a0\u00a0'), node('th', 'y')); table.append(head);
                [...head.children].forEach(cell => cell.scope = 'col');
                const rows = positions.map(() => { const row = node('tr'); row.append(node('td'), node('td')); table.append(row); return row; });
                const explanation = node('div'); content.append(table, explanation);
                let arrows = [];
                function paint() {
                    arrows.forEach(arrow => arrow.remove()); arrows = [];
                    stepLine.hidden = state.visited.length < 2;
                    stepLine.textContent = stepText(2);
                    for (let index = 0; index < state.position; index++) {
                        const from = positions[index], to = positions[index + 1], latest = index === state.position - 1;
                        const corner = [to[0], from[1]];
                        arrows.push(graph.arrow(from, corner, { tone: 'ink', dash: !latest }));
                        arrows.push(graph.arrow(corner, to, { tone: 'ink', dash: !latest }));
                    }
                    rows.forEach((row, index) => {
                        row.children[0].textContent = state.visited.includes(index) ? `${positions[index][0]}\u00a0\u00a0` : '';
                        row.children[1].textContent = state.visited.includes(index) ? String(positions[index][1]) : '';
                    });
                    eq.innerHTML = E.equationHtml(2, 3, { highlight: state.reached ? 'm' : undefined });
                    if (state.reached) {
                        paragraphs(explanation, ['Each time x goes up by 1, y goes up by 2: 1 right, 2 up.']);
                        const sentence = node('p'); sentence.append('The ', node('strong', 'gradient'), ' is 2. It tells you how much y changes when x goes up by 1.'); explanation.append(sentence);
                    }
                }
                graph.point(positions[state.position], { size: 'large', coordinates: true, drag: 'positions', positions,
                    onMove(position) {
                        const index = positions.findIndex(point => point[0] === position[0]);
                        section.update(state => { state.position = index; if (!state.visited.includes(index)) state.visited.push(index); if (index === 2) state.reached = true; });
                        paint(); action();
                    } });
                paint();
            }
            if (state.screen === 3) {
                stepLine.hidden = false;
                stepLine.textContent = stepText(2);
                graph.point([0, 3], { size: 'large', coordinates: true }); stepArrows(graph, 2, 3);
                paragraphs(content, ['m is the gradient: the number multiplying x.', 'c is the y-intercept: the number added or subtracted.', E.nb('mx means m × x.')]);
            }
            if (state.screen === 4) {
                const current = { ...state.sliders };
                const line = graph.line({ m: current.m, c: current.c }, { tone: 'neutral' });
                const point = graph.point([0, current.c], { size: 'large', coordinates: true });
                let arrows = [];
                const sliders = {};
                const values = {};
                for (const [id, label, min, max] of [['m', 'Gradient m', -3, 3], ['c', 'y-intercept c', -4, 4]]) {
                    const wrapper = node('label', `${label} `, 'lesson-slider');
                    values[id] = node('output', E.number(current[id])); wrapper.append(values[id]);
                    const input = node('input'); input.type = 'range'; input.min = min; input.max = max; input.step = 1; input.value = current[id];
                    input.setAttribute('aria-label', label); wrapper.append(input);
                    const row = node('p'); row.append(wrapper); content.append(row);
                    sliders[id] = input;
                    input.addEventListener('input', () => { current[id] = Number(input.value); paint(); });
                    input.addEventListener('change', () => {
                        const wasFocused = document.activeElement === input;
                        if (current.stage === 0 && current.m === -2) current.stage = 1;
                        else if (current.stage === 1 && current.c === -3) current.stage = 2;
                        section.update(state => { state.sliders = { ...current }; });
                        paint(); action();
                        if (wasFocused && input.disabled) sliders[id === 'm' ? 'c' : 'm'].focus();
                    });
                }
                const explanation = node('div'); content.append(explanation);
                function paint() {
                    stepLine.hidden = false;
                    stepLine.textContent = stepText(current.m);
                    eq.innerHTML = E.equationHtml(current.m, current.c);
                    line.update({ value: { m: current.m, c: current.c } }); point.update({ value: [0, current.c] });
                    arrows.forEach(arrow => arrow.remove()); arrows = stepArrows(graph, current.m, current.c);
                    for (const id of ['m', 'c']) { values[id].textContent = E.number(current[id]); sliders[id].setAttribute('aria-valuetext', E.number(current[id])); }
                    sliders.m.disabled = current.stage === 1; sliders.c.disabled = current.stage === 0;
                    prompt.textContent = current.stage === 0 ? 'Keep the y-intercept at 3. Change the gradient from 2 to −2.'
                        : current.stage === 1 ? 'Keep the gradient at −2. Change the y-intercept from 3 to −3.' : '';
                    const messages = [];
                    if (current.stage >= 1) messages.push(`The gradient is −2: 1 right, 2 down. The line still crosses at ${E.coordinate(0, 3)}.`);
                    if (current.stage >= 2) messages.push(`The line moves down but stays just as steep. It crosses at ${E.coordinate(0, -3)}.`);
                    paragraphs(explanation, messages);
                    if (current.stage === 2) { const sentence = node('p'); sentence.append(node('strong', 'Keep the sign with the number.')); explanation.append(sentence); }
                }
                paint();
            }
            if (state.screen === 5) {
                controls.setAttribute('role', 'group');
                controls.setAttribute('aria-label', 'Choose an equation');
                controls.className = 'lesson-equation-options';
                const variants = [[1, 4], [-1, 4], [3, 0]];
                const texts = ['x means 1x, so the gradient is 1.', '−x means −1x, so the gradient is −1.',
                    `Nothing is added, so ${E.equationText(3, 0)} means ${E.nb('y = 3x + 0')}. The y-intercept is 0.`];
                const [m, c] = variants[state.hidden];
                const line = graph.line({ m, c }, { tone: 'neutral' });
                const point = graph.point([0, c], { size: 'large', coordinates: true });
                let arrows = [];
                const buttons = variants.map(([m, c], index) => {
                    const button = node('button', E.equationText(m, c), 'button'); button.type = 'button'; controls.append(button);
                    button.addEventListener('click', () => { section.update(state => { state.hidden = index; }); paint(); });
                    return button;
                });
                function paint() {
                    const [m, c] = variants[state.hidden];
                    stepLine.hidden = false;
                    stepLine.textContent = stepText(m);
                    eq.innerHTML = E.equationHtml(m, c, { showHidden: true });
                    line.update({ value: { m, c } }); point.update({ value: [0, c] });
                    arrows.forEach(arrow => arrow.remove()); arrows = stepArrows(graph, m, c);
                    buttons.forEach((button, index) => { button.className = `button${index === state.hidden ? ' is-selected' : ''}`; button.setAttribute('aria-pressed', String(index === state.hidden)); });
                    paragraphs(content, [texts[state.hidden]]);
                }
                paint();
            }
            action(); syncHash();
        }
        titles.forEach((title, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            api.goToSection('explanation', { moveFocus: false }); showScreen(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-6])$/.exec(initialHash);
        if (requested) showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen)); else render();
    }

    const examples = [
        { prompt: `Look at ${E.equationText(4, 2)}. What is the gradient?`, input: 'choice', options: [
            { label: '4', correct: true, feedback: 'Right. The 4 multiplies x: the line goes 4 up for every 1 right.' },
            { label: '2', feedback: '2 is added at the end. The gradient is the number multiplying x.' },
            { label: '6', feedback: "Don't add them. The gradient is just the number multiplying x." }] },
        { prompt: `Look at ${E.equationText(4, 2)}. What is the y-intercept?`, input: 'number', fractions: true, answer: '2',
            rules: [{ value: '4', feedback: "4 multiplies x, so it's the gradient. The y-intercept is the number added." }], feedback: `Right. The line crosses the y-axis at ${E.coordinate(0, 2)}.` },
        { prompt: `Look at ${E.equationText(-3, -5)}. What is the gradient?`, input: 'number', fractions: true, answer: '-3',
            rules: [{ value: '3', feedback: 'Keep the minus sign. The number multiplying x is −3.' },
                ...['-5', '5'].map(value => ({ value, feedback: "That's the number subtracted at the end. Look at the number multiplying x." }))],
            feedback: 'Right. −3 means 3 down for every 1 right.' },
        { prompt: `Look at ${E.equationText(-3, -5)}. Where does the line cross the y-axis?`, input: 'choice', options: [
            { label: E.coordinate(0, -5), correct: true, feedback: 'Right. The equation subtracts 5, so the y-intercept is −5.' },
            { label: E.coordinate(0, 5), feedback: 'Keep the sign. The equation subtracts 5.' },
            { label: E.coordinate(-5, 0), feedback: `On the y-axis, x is 0. So the point is ${E.coordinate(0, -5)}.` },
            { label: E.coordinate(0, -3), feedback: "−3 multiplies x, so it's the gradient. Look at the number at the end." }] },
        E.typed(-1, 6, 'Right. −x means −1x. The gradient is −1 and the y-intercept is 6.'),
        { prompt: 'Which line has gradient −2 and y-intercept 3?', input: 'choice', options: [
            { label: E.equationText(-2, 3), correct: true, feedback: 'Right. −2 multiplies x and 3 is added.' },
            { label: E.equationText(3, -2), feedback: 'That swaps them. The gradient is the number multiplying x.' },
            { label: E.equationText(2, 3), feedback: 'That line has gradient 2. Keep the minus sign with the 2.' },
            { label: E.equationText(-2, -3), feedback: `That line crosses at ${E.coordinate(0, -3)}. The y-intercept here is 3, so add 3.` }] }
    ];
    E.examples = examples;

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        const { shuffle } = window.Maths1to9LessonEngine;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1, initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                order: examples.map(example => shuffle((example.options || []).map((option, index) => index))) })
        });
        const state = section.state;
        const hashes = ['try-it-1', 'try-it-1-intercept', 'try-it-2', 'try-it-2-crossing', 'try-it-3', 'try-it-4', 'try-it-results'];
        function syncHash() { if (api.getCurrentSection().id === 'interactive') api.setSlideHash(hashes[state.screen], { replace: true }); }
        function show(screen) { section.update(state => { state.screen = screen; }); render(); }
        function report() {
            const card = state.cards[`example-${state.index + 1}`];
            api.setSectionProgress('interactive', state.finished ? examples.length : state.index + Number(card?.correct === true), examples.length);
        }
        function draw(container, index, readOnly) {
            const example = examples[index];
            const cardRoot = node('div'); container.append(cardRoot);
            return api.createQuestion(cardRoot, { ...example, options: state.order[index].map(option => example.options[option]),
                fallback: example.fallback || E.fallback, sectionId: 'interactive', questionId: `example-${index + 1}`, scored: false, readOnly,
                onFeedback: report, onContinue() {
                    section.update(state => { state.index++; state.screen = state.index; state.furthestScreen = state.screen; state.finished = state.index === examples.length; });
                    render();
                } });
        }
        function render() {
            root.replaceChildren();
            const heading = node('h3', state.screen === examples.length ? 'Your completed examples' : state.screen === 5 ? 'The other way round' : `Example ${[1, 1, 2, 2, 3][state.screen]}`);
            heading.dataset.screenHeading = ''; root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) { examples.forEach((example, index) => draw(root, index, true)); api.clearSectionAction('interactive'); }
            else { draw(root, state.screen, state.screen < state.index); if (state.screen < state.index) api.setSectionAction('interactive', { label: 'Next', onClick: () => show(state.screen + 1) }); }
            syncHash();
        }
        hashes.forEach((hash, index) => api.registerHashRoute(hash, () => {
            if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(index, state.furthestScreen));
            else document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        report(); render();
        const requested = hashes.indexOf(initialHash.slice(1));
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false })) show(Math.min(requested, state.furthestScreen));
    }
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => { if (event.detail?.slug === SLUG) mountLearn(); });
})();
