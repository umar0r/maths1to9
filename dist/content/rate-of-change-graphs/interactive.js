(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const J = window.RateOfChangeGraphs;

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }
    function focusScreen(root) {
        const heading = root.querySelector('[data-screen-heading]');
        if (heading) { heading.tabIndex = -1; heading.focus(); }
    }
    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    }
    function paragraphs(root, lines, className = '') {
        lines.forEach(line => root.append(node('p', line, className)));
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article');
        document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1, upgrade: () => null,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, week: 0, chosen: 0 })
        });
        const state = section.state;
        let graphs = [];

        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
                if (screen === J.learnScreens.length - 1) state.finished = true;
            });
            render();
            focusScreen(root);
        }
        function graphAt(parent, data, options) {
            const host = node('div');
            parent.append(host);
            const graph = J.drawGraph(host, data, options);
            graphs.push(graph);
            return graph;
        }
        function slider(labelText, min, max, value) {
            const label = node('label', labelText, 'rates-slider');
            const input = node('input');
            input.type = 'range'; input.min = min; input.max = max; input.step = 1; input.value = value;
            label.append(input); root.append(label);
            return input;
        }
        function workedGraph() {
            const graph = graphAt(root, J.plantA, { highlight: 1 });
            graph.point([2, 8], { coordinates: true, size: 'large' });
            graph.point([4, 20], { coordinates: true, size: 'large' });
            graph.arrow([2, 8], [4, 8], { tone: 'ink', label: '2 weeks', labelSide: 'below' });
            graph.arrow([4, 8], [4, 20], { tone: 'ink', label: '12 cm', labelSide: 'right' });
        }
        function render() {
            graphs.forEach(graph => graph.destroy()); graphs = [];
            root.replaceChildren();
            const screen = J.learnScreens[state.screen];
            const heading = node('h3', screen.title); heading.dataset.screenHeading = ''; root.append(heading);
            if (state.screen === 0) {
                paragraphs(root, [screen.lines[0]]);
                const graph = graphAt(root, J.plantA);
                const input = slider('Move the dot week by week.', 0, 8, state.week);
                const readout = node('p', '', 'rates-working'); readout.setAttribute('aria-live', 'polite'); root.append(readout);
                const dot = graph.point([state.week, heightAt(state.week)], { size: 'large' });
                function paint() {
                    const week = Number(input.value), height = heightAt(week);
                    dot.update({ value: [week, height] });
                    readout.textContent = `Week ${week}: ${height} cm`;
                    input.setAttribute('aria-valuetext', readout.textContent);
                    graph.describe(readout.textContent);
                }
                input.addEventListener('input', () => { section.update(state => { state.week = Number(input.value); }); paint(); });
                paint(); paragraphs(root, [screen.lines[1]]);
            } else if (state.screen === 1) {
                const row = node('div', '', 'rates-small-graphs'); root.append(row);
                const lines = [[[0, 2], [4, 6]], [[0, 6], [4, 2]], [[0, 4], [4, 4]]];
                lines.forEach((corners, index) => {
                    const cell = node('section'); row.append(cell);
                    graphAt(cell, { context: 'changing value', corners, time: 'hours', unit: 'units',
                        axisNames: { x: 'Time', y: 'Value' }, step: 1, maxValue: 8 });
                    cell.append(node('p', screen.captions[index]));
                });
                paragraphs(root, screen.lines);
            } else if (state.screen === 2) {
                const graph = graphAt(root, J.plantA, { highlight: state.chosen });
                const input = slider('Move to a section.', 0, 3, state.chosen);
                const caption = node('p'); caption.setAttribute('aria-live', 'polite'); root.append(caption);
                function paint() {
                    const chosen = Number(input.value);
                    graph.sections.forEach((line, index) => line.update({ tone: index === chosen ? 'neutral' : 'muted' }));
                    caption.textContent = screen.captions[chosen];
                    input.setAttribute('aria-valuetext', `Weeks ${J.plantA.corners[chosen][0]} to ${J.plantA.corners[chosen + 1][0]}`);
                    graph.describe(caption.textContent);
                }
                input.addEventListener('input', () => { section.update(state => { state.chosen = Number(input.value); }); paint(); });
                paint();
            } else if (state.screen === 3) {
                workedGraph();
                paragraphs(root, screen.maths, 'rates-working');
                paragraphs(root, screen.lines);
            } else if (state.screen === 4) {
                workedGraph();
                paragraphs(root, screen.lines);
                const row = node('div', '', 'rates-calculations');
                const wrong = node('p'); wrong.append(node('s', screen.maths[0]), node('span', ' — wrong'));
                const right = node('p', screen.maths[1], 'rates-working');
                row.append(wrong, right); root.append(row);
            } else {
                graphAt(root, J.tank);
                paragraphs(root, screen.lines);
            }
            if (state.finished || state.screen < state.furthestScreen) {
                root.querySelectorAll('input').forEach(input => { input.disabled = true; });
            }
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen === J.learnScreens.length - 1) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            syncHash();
        }
        function heightAt(week) {
            const index = Math.min(3, Math.floor(week / 2));
            const [start, end] = [J.plantA.corners[index], J.plantA.corners[index + 1]];
            return start[1] + (week - start[0]) * (end[1] - start[1]) / (end[0] - start[0]);
        }
        J.learnScreens.forEach((screen, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            if (api.goToSection('explanation', { moveFocus: false })) showScreen(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-6])$/.exec(initialHash);
        if (requested) showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen)); else render();
    }
    const examples = J.examples();

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        const { shuffle } = window.Maths1to9LessonEngine;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1, upgrade: () => null, initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                order: examples.map(example => shuffle((example.options || []).map((option, index) => index))) })
        });
        const state = section.state;
        function syncHash() { if (api.getCurrentSection().id === 'interactive') api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true }); }
        function show(screen) { section.update(state => { state.screen = screen; }); render(); focusScreen(root); }
        function report() {
            const card = state.cards[`example-${state.index + 1}`];
            api.setSectionProgress('interactive', state.finished ? examples.length : state.index + Number(card?.correct === true), examples.length);
        }
        function draw(container, index, readOnly) {
            const example = examples[index], cardRoot = node('div'); container.append(cardRoot);
            const visual = J.cardVisual(example.graph, state.cards[`example-${index + 1}`]?.correct === true);
            return api.createQuestion(cardRoot, { ...example, ...visual, options: state.order[index].map(option => example.options[option]),
                sectionId: 'interactive', questionId: `example-${index + 1}`, scored: false, readOnly,
                onFeedback(result) { visual.onFeedback(result); report(); }, onContinue() {
                    section.update(state => { state.index++; state.screen = state.index; state.furthestScreen = state.screen; state.finished = state.index === examples.length; }); render();
                } });
        }
        function render() {
            root.replaceChildren();
            const heading = node('h3', state.screen === examples.length ? 'Your completed examples' : `Example ${state.screen + 1}`); heading.dataset.screenHeading = ''; root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) { examples.forEach((example, index) => draw(root, index, true)); api.clearSectionAction('interactive'); }
            else { draw(root, state.screen, state.screen < state.index); if (state.screen < state.index) api.setSectionAction('interactive', { label: 'Next', onClick: () => show(state.screen + 1) }); }
            syncHash();
        }
        for (let index = 0; index <= examples.length; index++) api.registerHashRoute(`try-it-${index + 1}`, () => {
            if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(index, state.furthestScreen));
            else document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        report(); render();
        const requested = /^#try-it-([1-9])$/.exec(initialHash);
        if (requested && api.goToSection('interactive', { moveFocus: false })) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
    }
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => { if (event.detail?.slug === SLUG) mountLearn(); });
})();
