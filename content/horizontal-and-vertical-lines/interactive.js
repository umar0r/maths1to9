(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const { equation, judge } = window.HorizontalVerticalLines;
    const graphs = window.Maths1to9Graph;
    const node = (tag, text) => {
        const element = document.createElement(tag);
        element.textContent = text;
        return element;
    };
    function event(id, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId: id } }));
    }
    function maths(parent, axis, value) {
        const span = document.createElement('span');
        window.katex.render(equation(axis, value).replace('−', '-'), span, { throwOnError: false });
        parent.append(span);
    }
    // Live activities retain their drawing; only the feedback and action change on release.
    function live(container, target, saved, readOnly, onChange) {
        const host = document.createElement('div');
        const feedback = node('p', '');
        feedback.setAttribute('aria-live', 'polite');
        container.append(host, feedback);
        const graph = graphs.create(host, { label: `Coordinate grid for drawing ${equation(target.axis, target.value)}` });
        const show = line => {
            if (!line) {
                feedback.className = '';
                feedback.textContent = '';
                return;
            }
            const result = judge(line, target);
            feedback.className = `question-feedback is-visible ${result.correct ? 'is-correct' : 'is-incorrect'}`;
            feedback.textContent = result.feedback;
            graph.describe('');
        };
        graph.drawLine({
            line: saved,
            tone: line => judge(line, target).correct ? 'correct' : 'incorrect',
            label: line => judge(line, target).correct ? equation(target.axis, target.value) : null,
            onChange(line) { show(line); onChange(line); }
        });
        show(saved);
        graph.setEditable(!readOnly);
        return graph;
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        event('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false,
                items: Array.from({ length: 4 }, () => ({ visited: [1], position: 1, line: null, correct: false })) })
        });
        const state = section.state;
        let graph;
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) {
            section.update(state => { state.screen = screen; state.furthestScreen = Math.max(state.furthestScreen, screen); });
            render();
        }
        function action() {
            const done = state.items[state.screen].correct;
            if (state.screen < state.furthestScreen) api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            else if (state.screen === 3 && done) {
                section.update(state => { state.finished = true; });
                event('explanation', 'complete');
                api.clearSectionAction('explanation');
            } else api.setSectionAction('explanation', {
                label: state.screen === 3 ? 'Continue' : 'Next idea', disabled: !done,
                onClick: () => showScreen(state.screen + 1)
            });
        }
        function render() {
            graph?.destroy();
            root.replaceChildren();
            const index = state.screen;
            const axis = index < 2 ? 'y' : 'x';
            const target = { axis, value: 4 };
            const item = state.items[index];
            const heading = node('h3', index % 2 === 0 ? 'What does ' : 'Draw ');
            maths(heading, axis, 4);
            if (index % 2 === 0) heading.append(' mean?');
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (index % 2 === 0) {
                const rule = node('p', '');
                maths(rule, axis, 4);
                rule.append(` is a rule: the ${axis}-coordinate must be 4.`);
                root.append(rule, node('p', axis === 'y' ? 'Drag the dot left and right.' : 'Drag the dot up and down.'));
                const host = document.createElement('div');
                const caption = node('p', '');
                root.append(host, caption);
                graph = graphs.create(host, { label: `Coordinate grid for exploring ${equation(axis, 4)}` });
                const point = value => axis === 'y' ? [value, 4] : [4, value];
                let trail = [];
                function paintTrail() {
                    trail.forEach(dot => dot.remove());
                    trail = item.visited.filter(value => value !== item.position)
                        .map(value => graph.point(point(value), { tone: 'muted' }));
                }
                paintTrail();
                let joined = false;
                function join() {
                    if (joined || item.visited.length < 4) return;
                    joined = true;
                    graph.line(target, { label: equation(axis, 4) });
                    caption.textContent = axis === 'y'
                        ? 'Every point on this line has a y-coordinate of 4. '
                        : 'Every point on this line has an x-coordinate of 4. ';
                    maths(caption, axis, 4);
                    caption.append(axis === 'y' ? ' is a horizontal line (across), 4 up from the x-axis.' : ' is a vertical line (up and down), 4 right of the y-axis.');
                    section.update(() => { item.correct = true; });
                    action();
                }
                const draggable = graph.point(point(item.position), {
                    size: 'large', coordinates: true, highlight: axis, drag: axis === 'y' ? 'x' : 'y',
                    labelSide: axis === 'y' ? 'below' : 'left',
                    onMove(position) {
                        const value = position[axis === 'y' ? 0 : 1];
                        section.update(() => {
                            item.position = value;
                            if (!item.visited.includes(value)) {
                                item.visited.push(value);
                            }
                        });
                        paintTrail();
                        join();
                        // Repaint last so the solid blue point stays above the trail and line.
                        draggable.update();
                    }
                });
                join();
                draggable.update();
                graph.setEditable(index === state.furthestScreen && !state.finished);
            } else {
                const instruction = node('p', 'Drag across the graph to draw ');
                if (axis === 'x') instruction.textContent = 'Drag up and down on the graph to draw ';
                maths(instruction, axis, 4);
                instruction.append('.');
                root.append(instruction);
                graph = live(root, target, item.line, index < state.furthestScreen || state.finished, line => {
                    section.update(() => { item.line = line; item.correct = line !== null && judge(line, target).correct; });
                    action();
                });
            }
            api.setSectionBack('explanation', index > 0 ? { onClick: () => showScreen(index - 1) } : null);
            if (state.finished) event('explanation', 'complete');
            action();
            syncHash();
        }
        for (let index = 0; index < 4; index++) api.registerHashRoute(`learn-${index + 1}`, () => {
            api.goToSection('explanation', { moveFocus: false });
            showScreen(Math.min(index, state.furthestScreen));
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        // The router ignores hash writes during navigation; normalize after it returns,
        // including a deep link rejected by a locked section.
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-4])$/.exec(initialHash);
        if (requested) showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        else render();
    }

    const examples = [
        { axis: 'y', value: -2, guidance: 'The y-coordinate must be −2. Find −2 on the y-axis, then draw across.', ending: `This line is 2 below the x-axis. Every point on it has ${equation('y', -2)}.` },
        { axis: 'x', value: -3, guidance: 'Which coordinate must be −3?', ending: 'The x-coordinate stays at −3, so the line goes up and down, 3 left of the y-axis.' },
        { axis: 'y', value: 0, ending: `${equation('y', 0)} is the x-axis itself. Every point on the x-axis has a y-coordinate of 0.` },
        { axis: 'x', value: 0, ending: `${equation('x', 0)} is the y-axis itself. Every point on the y-axis has an x-coordinate of 0.` }
    ];
    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        event('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Continue', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false,
                items: examples.map(() => ({ line: null, correct: false })) })
        });
        const state = section.state;
        let mounted = [];
        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) { section.update(state => { state.screen = screen; }); render(); }
        function reportProgress() {
            api.setSectionProgress('interactive', state.finished ? 4 : state.index + Number(state.items[state.index]?.correct === true), 4);
        }
        function action() {
            if (state.screen === 4) api.clearSectionAction('interactive');
            else if (state.screen < state.index) api.setSectionAction('interactive', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            else api.setSectionAction('interactive', {
                label: 'Continue', disabled: !state.items[state.screen].correct,
                onClick() {
                    section.update(state => { state.index++; state.screen = state.index; state.furthestScreen = state.screen; state.finished = state.index === 4; });
                    render();
                }
            });
        }
        function draw(index, readOnly) {
            const target = examples[index];
            const item = state.items[index];
            const container = document.createElement('article');
            root.append(container);
            const heading = node('h3', `Draw ${equation(target.axis, target.value)}.`);
            heading.dataset.screenHeading = '';
            container.append(heading);
            if (target.guidance) container.append(node('p', target.guidance));
            const ending = node('p', item.correct ? target.ending : '');
            mounted.push(live(container, target, item.line, readOnly || item.correct, line => {
                section.update(() => { item.line = line; item.correct = line !== null && judge(line, target).correct; });
                ending.textContent = item.correct ? target.ending : '';
                if (item.correct) mounted.at(-1).setEditable(false);
                reportProgress(); action();
            }));
            container.append(ending);
        }
        function render() {
            mounted.forEach(graph => graph.destroy()); mounted = [];
            root.replaceChildren();
            if (state.screen === 4) {
                const heading = node('h3', 'Your completed examples'); heading.dataset.screenHeading = ''; root.append(heading);
                examples.forEach((example, index) => draw(index, true));
            } else draw(state.screen, state.screen < state.index);
            api.setSectionBack('interactive', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            if (state.finished) event('interactive', 'complete');
            action(); syncHash();
        }
        for (let index = 0; index <= 4; index++) api.registerHashRoute(`try-it-${index + 1}`, () => {
            if (!api.goToSection('interactive', { moveFocus: false })) {
                document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                return;
            }
            showScreen(Math.min(index, state.furthestScreen));
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        // The router ignores hash writes during navigation; normalize after it returns,
        // including a deep link rejected by a locked section.
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        reportProgress(); render();
        const requested = /^#try-it-([1-5])$/.exec(initialHash);
        if (requested && api.goToSection('interactive', { moveFocus: false })) showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen));
    }
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => { if (event.detail?.slug === SLUG) mountLearn(); });
})();
