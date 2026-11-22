(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const S = window.ScatterGraphs;
    const titles = [
        'A scatter graph shows pairs of numbers as points, so we can see how they go together.',
        'Each point is one pair from the table.',
        'To read a point, go straight down to the bottom axis, then straight across to the side axis.'
    ];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    async function mountRead(api) {
        const E = window.Maths1to9LessonEngine;
        const id = 'explanation--read';
        const host = document.getElementById(`lesson-section-${id}`);
        const root = element('article');
        host.append(root);
        api.gateSection(id);
        const section = await api.useSectionState('learn:read', {
            version: 1, upgrade: () => null,
            initial: () => ({ screen: 0, furthest: 0, columnDone: false, columnHint: '',
                axisStage: 0, axisHint: '' })
        });
        const state = section.state;
        let graph = null;
        let initialRender = true;

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`read-learn-${state.screen + 1}`, { replace: true });
            }
        }
        function show(index) {
            section.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            heading.tabIndex = -1;
            if (!initialRender) heading.focus();
            initialRender = false;
        }
        function progress() {
            const completed = Number(state.furthest >= 1) + Number(state.columnDone) + Number(state.axisStage === 2);
            api.setSectionProgress(id, completed, 3);
            if (state.columnDone && state.axisStage === 2) api.completeSection(id);
        }
        function render() {
            graph?.destroy();
            graph = null;
            root.replaceChildren();
            const index = state.screen;
            const heading = element('h2', titles[index]);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            root.append(heading);
            const prompt = element('p');
            if (index === 1) prompt.textContent = 'Tap the column in the table that the big point shows.';
            if (index === 2) prompt.textContent = state.axisStage === 0
                ? 'Tap the bottom axis right under the big point.'
                : state.axisStage === 1 ? 'Now tap the side axis level with the big point.' : '';
            if (index > 0) root.append(prompt);
            const tableHost = element('div');
            if (index < 2) root.append(tableHost);
            const graphHost = element('div', '', 'scatter-graph-host');
            root.append(graphHost);
            const feedback = E.createFeedback('explanation', { visible: false });
            if (index > 0) root.append(feedback);

            function drawTable() {
                tableHost.replaceChildren();
                S.pairTable(tableHost, {
                    rows: ['Hours', 'Mark'], values: S.pairs,
                    selected: index === 1 && state.columnDone ? 2 : null,
                    onPick: index === 1 ? chooseColumn : null
                });
                if (state.columnDone) tableHost.querySelectorAll('button').forEach(button => { button.disabled = true; });
            }
            function chooseColumn(column) {
                if (state.columnDone) return;
                section.update(saved => {
                    saved.columnDone = column === 2;
                    saved.columnHint = column === 2 ? 'Yes. This point shows 4 hours and a mark of 5.'
                        : column === 3 ? "That column is 5 hours and a mark of 4. Look straight down from the point first. It's above 4."
                            : 'Look straight down from the point to the bottom axis. Which number is it above?';
                });
                drawTable();
                paint();
            }
            if (index < 2) drawTable();
            graph = S.makeGraph(graphHost, {
                x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                axisNames: { x: 'Hours of revision', y: 'Test mark' },
                label: index === 0 ? 'Scatter graph of hours of revision and test marks.'
                    : 'Scatter graph of hours of revision and test marks, with one big point.'
            });
            const target = index === 1 ? [4, 5] : [5, 4];
            S.pairs.forEach(pair => {
                const big = index > 0 && pair[0] === target[0] && pair[1] === target[1];
                graph.point(pair, { size: big ? 'large' : 'small', tone: index === 0 || big ? 'neutral' : 'muted', coordinates: false });
            });
            let arrows = [];
            let picker = null;
            function paint() {
                arrows.forEach(arrow => arrow.remove());
                arrows = [];
                if (index === 1 && state.columnDone) {
                    arrows.push(graph.arrow([4, 5], [4, 0], { dash: true, tone: 'ink' }));
                    arrows.push(graph.arrow([4, 5], [0, 5], { dash: true, tone: 'ink' }));
                }
                if (index === 2 && state.axisStage >= 1) {
                    arrows.push(graph.arrow([5, 4], [5, 0], { dash: true, tone: 'ink' }));
                    if (state.axisStage === 2) arrows.push(graph.arrow([5, 4], [0, 4], { dash: true, tone: 'ink' }));
                    prompt.textContent = state.axisStage === 1 ? 'Now tap the side axis level with the big point.' : '';
                }
                const message = index === 1 ? state.columnHint : index === 2 ? state.axisHint : '';
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('explanation', {
                    visible: Boolean(message), correct: index === 1 ? state.columnDone : state.axisStage === 2
                });
                progress();
                api.setSectionAction(id, {
                    label: index === 2 ? 'Continue' : 'Next',
                    disabled: index === 1 ? !state.columnDone : index === 2 ? state.axisStage !== 2 : false,
                    onClick: () => index === 2 ? api.continueSection() : show(index + 1)
                });
                syncHash();
            }
            if (index === 2 && state.axisStage < 2) {
                picker = graph.pick({ label: prompt.textContent, onPick([x, y]) {
                    const stage = state.axisStage;
                    section.update(saved => {
                        if (stage === 0) {
                            if (y !== 0) saved.axisHint = 'Tap on the bottom axis, the line along the bottom.';
                            else if (x === 5) { saved.axisStage = 1; saved.axisHint = ''; }
                            else saved.axisHint = `That's ${x}. Go straight down from the point.`;
                        } else {
                            if (x !== 0) saved.axisHint = 'Tap on the side axis, the line up the left.';
                            else if (y === 4) {
                                saved.axisStage = 2;
                                saved.axisHint = 'This point shows 5 hours of revision and a test mark of 4.';
                            } else if (y === 5) saved.axisHint = "That's 5, the number from the bottom axis. Go straight across from the point.";
                            else saved.axisHint = `That's ${y}. Go straight across from the point.`;
                        }
                    });
                    graph.describe(stage === 0 && y === 0 ? `You tapped ${x} on the bottom axis.`
                        : stage === 1 && x === 0 ? `You tapped ${y} on the side axis.` : 'You tapped the grid, not an axis.');
                    if (state.axisStage === 2) picker.stop();
                    paint();
                } });
            }
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, index === 0 ? null : () => {
                section.resetFields(index === 1 ? ['columnDone', 'columnHint'] : ['axisStage', 'axisHint']);
                render();
            });
            paint();
        }
        titles.forEach((_, index) => api.registerHashRoute(`read-learn-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.furthest));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    function placeholder(api, host, id) {
        host.append(element('h2', 'Coming soon.'));
        api.gateSection(id);
        api.setSectionBack(id, null);
        api.setSectionReset(id, null);
        api.setSectionAction(id, { label: 'Continue', disabled: true, onClick() {} });
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        if (section.part === 'read') await mountRead(api);
        else placeholder(api, document.getElementById(`lesson-section-explanation--${section.part}`), `explanation--${section.part}`);
        placeholder(api, root, section.id);
    };
})();
