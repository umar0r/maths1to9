(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const S = window.ScatterGraphs;
    const titles = [
        'A scatter graph shows pairs of numbers as points, so we can see how they go together.',
        'Each point is one pair from the table.',
        'To read a point, go straight down to the bottom axis, then straight across to the side axis.'
    ];
    const tryItTitles = [
        'Read the big point.',
        'Tap the point for 3 rainy days and 7 accidents.',
        'Fill in the table for the big point.'
    ];
    const tryItPoints = [[1, 3], [3, 7], [6, 3], [7, 3], [8, 9]];

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

    async function mountTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const DC = window.Maths1to9DigitCards;
        const id = section.id;
        root.closest('.lesson-section').removeAttribute('aria-labelledby');
        root.closest('.lesson-section').setAttribute('aria-label', 'Read Try it');
        api.gateSection(id);
        const sectionState = await api.useSectionState(`interactive:read`, {
            version: 2, upgrade: () => null,
            initial: () => ({
                screen: 0, furthest: 0,
                t1Stage: 0, t1Hint: '', t1Done: false,
                t2Done: false, t2Hint: '',
                t3Value: null, t3Marks: {}, t3Done: false, t3Hint: ''
            })
        });
        const state = sectionState.state;
        let graph = null;
        let digitView = null;

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`read-try-it-${state.screen + 1}`, { replace: true });
            }
        }
        function show(index) {
            sectionState.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            if (heading) { heading.tabIndex = -1; heading.focus(); }
        }
        function progress() {
            const completed = Number(state.t1Done) + Number(state.t2Done) + Number(state.t3Done);
            api.setSectionProgress(id, completed, 3);
            if (completed === 3) api.completeSection(id);
        }

        function makeGraph(host, opts) {
            return S.makeGraph(host, opts);
        }

        function render() {
            graph?.destroy(); graph = null;
            if (digitView) { digitView.destroy(); digitView = null; }
            root.replaceChildren();
            const index = state.screen;
            const heading = element('h2', tryItTitles[index]);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            root.append(heading);
            const prompt = element('p');
            root.append(prompt);
            const graphHost = element('div', '', 'scatter-graph-host');
            root.append(graphHost);
            const feedback = E.createFeedback('interactive', { visible: false });
            root.append(feedback);

            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);

            if (index === 0) {
                prompt.textContent = 'Tap the bottom axis under the point.';
                graph = makeGraph(graphHost, { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                    axisNames: { x: 'Rainy days', y: 'Road accidents' },
                    label: 'Scatter graph of rainy days and road accidents, with one big point.' });
                tryItPoints.forEach(p => {
                    const big = p[0] === 6 && p[1] === 3;
                    graph.point(p, { size: big ? 'large' : 'small', tone: big ? 'neutral' : 'muted', coordinates: false });
                });
                let picker = null;
                let arrows = [];
                function paint() {
                    arrows.forEach(a => a.remove()); arrows = [];
                    if (state.t1Stage >= 1) arrows.push(graph.arrow([6, 3], [6, 0], { dash: true, tone: 'ink' }));
                    if (state.t1Stage === 2) arrows.push(graph.arrow([6, 3], [0, 3], { dash: true, tone: 'ink' }));
                    prompt.textContent = state.t1Stage === 0 ? 'Tap the bottom axis under the point.'
                        : state.t1Stage === 1 ? 'Now tap the side axis level with it.' : '';
                    const msg = state.t1Hint || (state.t1Done ? '6 rainy days and 3 accidents.' : '');
                    feedback.textContent = msg;
                    feedback.className = E.feedbackClassName('interactive', { visible: Boolean(msg), correct: state.t1Done });
                    api.setSectionAction(id, {
                        label: 'Next', disabled: !state.t1Done,
                        onClick: () => show(1)
                    });
                    syncHash();
                }
                if (!state.t1Done) {
                    picker = graph.pick({ label: prompt.textContent, onPick([x, y]) {
                    const stage = state.t1Stage;
                    sectionState.update(saved => {
                            if (stage === 0) {
                                if (y !== 0) saved.t1Hint = 'Tap on the bottom axis, the line along the bottom.';
                                else if (x === 6) { saved.t1Stage = 1; saved.t1Hint = ''; }
                                else saved.t1Hint = `That's ${x}. Go straight down from the point.`;
                            } else {
                                if (x !== 0) saved.t1Hint = 'Tap on the side axis, the line up the left.';
                                else if (y === 3) { saved.t1Stage = 2; saved.t1Done = true; saved.t1Hint = '6 rainy days and 3 accidents.'; }
                                else if (y === 6) saved.t1Hint = "That's 6, the number from the bottom axis. Go straight across from the point.";
                                else saved.t1Hint = `That's ${y}. Go straight across from the point.`;
                            }
                        });
                        graph.describe(stage === 0 && y === 0 ? `You tapped ${x} on the bottom axis.`
                            : stage === 1 && x === 0 ? `You tapped ${y} on the side axis.` : 'You tapped the grid, not an axis.');
                        if (state.t1Done) picker.stop();
                        paint();
                        progress();
                    } });
                }
                paint();
            } else if (index === 1) {
                prompt.remove();
                graph = makeGraph(graphHost, { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                    axisNames: { x: 'Rainy days', y: 'Road accidents' },
                    label: 'Scatter graph of rainy days and road accidents.' });
                tryItPoints.forEach(p => graph.point(p, { size: 'small', tone: 'neutral', coordinates: false }));
                let picker = null;
                let arrows = [];
                function paint() {
                    arrows.forEach(a => a.remove()); arrows = [];
                    if (state.t2Picked && state.t2Done) {
                        const [px, py] = state.t2Picked;
                        arrows.push(graph.arrow([px, py], [px, 0], { dash: true, tone: 'ink' }));
                        arrows.push(graph.arrow([px, py], [0, py], { dash: true, tone: 'ink' }));
                    }
                    const msg = state.t2Hint || (state.t2Done ? 'Yes. Down to 3, across to 7.' : '');
                    feedback.textContent = msg;
                    feedback.className = E.feedbackClassName('interactive', { visible: Boolean(msg), correct: state.t2Done });
                    api.setSectionAction(id, {
                        label: 'Next', disabled: !state.t2Done,
                        onClick: () => show(2)
                    });
                    syncHash();
                }
                if (!state.t2Done) {
                    picker = graph.pick({ label: tryItTitles[index], onPick([x, y]) {
                        const match = tryItPoints.find(p => p[0] === x && p[1] === y);
                        sectionState.update(saved => {
                            if (!match) {
                                saved.t2Hint = 'There\'s no point there. Tap one of the points.';
                                saved.t2Done = false;
                                return;
                            }
                            if (x === 3 && y === 7) {
                                saved.t2Done = true;
                                saved.t2Picked = [3, 7];
                                saved.t2Hint = 'Yes. Down to 3, across to 7.';
                            } else if (x === 7 && y === 3) {
                                saved.t2Hint = 'That point is 7 rainy days and 3 accidents. Find the one above 3 on the bottom axis.';
                                saved.t2Done = false;
                            } else {
                                saved.t2Hint = `That point is ${x} rainy days and ${y} accidents. Find the one above 3 on the bottom axis.`;
                                saved.t2Done = false;
                            }
                        });
                        graph.describe(match ? `You tapped the point for ${x} rainy days and ${y} accidents.`
                            : 'You tapped the grid, not a point.');
                        if (state.t2Done) picker.stop();
                        paint();
                        progress();
                    } });
                }
                paint();
            } else {
                prompt.textContent = 'Fill in the table for the big point.';
                const allPoints = tryItPoints.concat([[5, 8]]);
                graph = makeGraph(graphHost, { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                    axisNames: { x: 'Rainy days', y: 'Road accidents' },
                    label: 'Scatter graph of rainy days and road accidents, with one big point.' });
                allPoints.forEach(p => {
                    const big = p[0] === 5 && p[1] === 8;
                    graph.point(p, { size: big ? 'large' : 'small', tone: big ? 'neutral' : 'muted', coordinates: false });
                });
                // one-column table
                const t = document.createElement('div');
                t.className = 'scatter-pair-table';
                t.style.gridTemplateColumns = 'minmax(3.5rem, 1.3fr) minmax(0, 1fr)';
                const headings = document.createElement('div');
                headings.className = 'scatter-pair-table__headings';
                headings.style.gridTemplateRows = 'repeat(2, 2.5rem)';
                ['Rainy days', 'Accidents'].forEach(txt => {
                    const c = document.createElement('span'); c.textContent = txt; headings.append(c);
                });
                t.append(headings);
                const col = document.createElement('div');
                col.className = 'scatter-pair-table__column';
                col.style.gridTemplateRows = 'repeat(2, 2.5rem)';
                const rainySlot = document.createElement('button');
                rainySlot.type = 'button'; rainySlot.className = 'digit-slot';
                rainySlot.setAttribute('aria-label', 'Rainy days answer digit');
                const accSlot = document.createElement('button');
                accSlot.type = 'button'; accSlot.className = 'digit-slot';
                accSlot.setAttribute('aria-label', 'Accidents answer digit');
                col.append(rainySlot, accSlot);
                t.append(col);
                root.append(t);

                const trayHost = element('div');
                root.append(trayHost);

                const slots = [
                    { id: 'rainy', element: rainySlot, group: 'answer', column: 'rainy',
                        allowed: value => value?.marks?.rainy !== 'right' },
                    { id: 'accidents', element: accSlot, group: 'answer', column: 'accidents',
                        allowed: value => value?.marks?.accidents !== 'right' }
                ];
                const groups = { answer: { advance: 'none' } };

                digitView = DC.create(trayHost, {
                    slots, groups,
                    active: state.t3Value?.active || 'rainy',
                    value: state.t3Value,
                    editable: !state.t3Done,
                    disabledDigits: [],
                    onChange(value) {
                        sectionState.update(saved => { saved.t3Value = value; });
                        state.t3Value = value;
                        const digits = value?.digits || {};
                        const rainy = digits.rainy || '';
                        const acc = digits.accidents || '';
                        const marks = {};
                        let hint = '';
                        let done = false;
                        if (rainy) {
                            if (rainy === '5') marks.rainy = 'right';
                            else { marks.rainy = 'wrong'; hint = (rainy === '8') ? '8 is on the side axis. Go straight down for the rainy days.' : 'Count again from 0.'; }
                        }
                        if (acc) {
                            if (acc === '8') marks.accidents = 'right';
                            else { marks.accidents = 'wrong'; if (!hint) hint = (acc === '5') ? '5 is on the bottom axis. Go straight across for the accidents.' : 'Count again from 0.'; }
                        }
                        if (rainy === '5' && acc === '8') { done = true; hint = '5 rainy days and 8 accidents.'; }
                        sectionState.update(saved => { saved.t3Marks = marks; saved.t3Done = done; saved.t3Hint = hint; });
                        state.t3Marks = marks;
                        state.t3Done = done;
                        state.t3Hint = hint;
                        const marked = DC.markedValue(value, marks);
                        sectionState.update(saved => { saved.t3Value = marked; });
                        digitView.update({ value: marked, editable: !done, phase: 'answer' });
                        const msg = hint;
                        feedback.textContent = msg;
                        feedback.className = E.feedbackClassName('interactive', { visible: Boolean(msg), correct: done });
                        progress();
                        api.setSectionAction(id, {
                            label: 'Continue', disabled: !state.t3Done,
                            onClick: () => { if (state.t3Done) api.continueSection(); }
                        });
                        syncHash();
                    }
                });
                if (state.t3Value) digitView.update({ value: state.t3Value, editable: !state.t3Done, phase: 'answer' });

                const msg = state.t3Hint || (state.t3Done ? '5 rainy days and 8 accidents.' : '');
                feedback.textContent = msg;
                feedback.className = E.feedbackClassName('interactive', { visible: Boolean(msg), correct: state.t3Done });
                progress();
                api.setSectionAction(id, {
                    label: 'Continue', disabled: !state.t3Done,
                    onClick: () => { if (state.t3Done) api.continueSection(); }
                });
                syncHash();
            }

            api.setSectionReset(id, () => {
                if (index === 0) sectionState.resetFields(['t1Stage', 't1Hint', 't1Done']);
                else if (index === 1) sectionState.resetFields(['t2Done', 't2Hint', 't2Picked']);
                else {
                    sectionState.update(s => { s.t3Value = null; s.t3Marks = {}; s.t3Done = false; s.t3Hint = ''; });
                    if (digitView) digitView.update({ value: null, editable: true, phase: 'answer' });
                }
                render();
            });
        }

        tryItTitles.forEach((_, index) => api.registerHashRoute(`read-try-it-${index + 1}`, () => {
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
        if (section.part === 'read') {
            await mountRead(api);
            await mountTryIt(api, root, section);
        } else {
            placeholder(api, document.getElementById(`lesson-section-explanation--${section.part}`), `explanation--${section.part}`);
            placeholder(api, root, section.id);
        }
    };
})();