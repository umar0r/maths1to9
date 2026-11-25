(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const S = window.ScatterGraphs;
    const titles = [
        "A bar chart shows one set of numbers. It can't tell us why some marks are higher.",
        'A scatter graph shows pairs of numbers as points, so we can see how they go together.',
        'Each point is one pair from the table.',
        'To read a point, go straight down to the bottom axis, then straight across to the side axis.'
    ];
    const tryItTitles = [
        'Read the blue point.',
        'Tap the point for 3 rainy days and 7 accidents.',
        'Fill in the table for the blue point.'
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
            version: 2, upgrade: () => null,
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
            const completed = Number(state.furthest >= 1) + Number(state.furthest >= 2) +
                Number(state.columnDone) + Number(state.axisStage === 2);
            api.setSectionProgress(id, completed, 4);
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
            if (index === 2) prompt.textContent = 'Tap the column in the table that the blue point shows.';
            if (index === 3) prompt.textContent = state.axisStage === 0
                ? 'Tap the bottom axis right under the blue point.'
                : state.axisStage === 1 ? 'Now tap the side axis level with the blue point.' : '';
            if (index > 1) root.append(prompt);
            const tableHost = element('div');
            if (index === 1 || index === 2) root.append(tableHost);
            const graphHost = element('div', '', 'scatter-graph-host');
            root.append(graphHost);
            const feedback = E.createFeedback('explanation', { visible: false });
            if (index > 1) root.append(feedback);

            function drawTable() {
                tableHost.replaceChildren();
                S.pairTable(tableHost, {
                    rows: ['Hours', 'Mark'], values: S.pairs,
                    selected: index === 2 && state.columnDone ? 2 : null,
                    onPick: index === 2 ? chooseColumn : null
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
            if (index === 1 || index === 2) drawTable();
            if (index === 0) {
                S.barChart(graphHost, {
                    labels: S.pairs.map((pair, position) => `Pupil ${'ABCDEF'[position]}`),
                    values: S.pairs.map(pair => pair[1]),
                    max: 10, axisName: 'Test mark',
                    description: "Bar chart of the six pupils' test marks: 3, 2, 5, 4, 7 and 9."
                });
            } else {
                graph = S.makeGraph(graphHost, {
                    x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                    axisNames: { x: 'Hours of revision', y: 'Test mark' },
                    label: index === 1 ? 'Scatter graph of hours of revision and test marks.'
                        : 'Scatter graph of hours of revision and test marks, with one blue point.'
                });
                const target = index === 2 ? [4, 5] : [5, 4];
                S.pairs.forEach(pair => {
                    const big = index > 1 && pair[0] === target[0] && pair[1] === target[1];
                    graph.point(pair, { size: big ? 'large' : 'small', tone: index === 1 || big ? 'neutral' : 'muted', coordinates: false });
                });
            }
            let arrows = [];
            let picker = null;
            function paint() {
                arrows.forEach(arrow => arrow.remove());
                arrows = [];
                if (index === 2 && state.columnDone) {
                    arrows.push(graph.arrow([4, 5], [4, 0], { dash: true, tone: 'ink' }));
                    arrows.push(graph.arrow([4, 5], [0, 5], { dash: true, tone: 'ink' }));
                }
                if (index === 3 && state.axisStage >= 1) {
                    arrows.push(graph.arrow([5, 4], [5, 0], { dash: true, tone: 'ink' }));
                    if (state.axisStage === 2) arrows.push(graph.arrow([5, 4], [0, 4], { dash: true, tone: 'ink' }));
                    prompt.textContent = state.axisStage === 1 ? 'Now tap the side axis level with the blue point.' : '';
                }
                const message = index === 2 ? state.columnHint : index === 3 ? state.axisHint : '';
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('explanation', {
                    visible: Boolean(message), correct: index === 2 ? state.columnDone : state.axisStage === 2
                });
                progress();
                api.setSectionAction(id, {
                    label: index === 3 ? 'Continue' : 'Next',
                    disabled: index === 2 ? !state.columnDone : index === 3 ? state.axisStage !== 2 : false,
                    onClick: () => index === 3 ? api.continueSection() : show(index + 1)
                });
                syncHash();
            }
            if (index === 3 && state.axisStage < 2) {
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
            api.setSectionReset(id, index < 2 ? null : () => {
                section.resetFields(index === 2 ? ['columnDone', 'columnHint'] : ['axisStage', 'axisHint']);
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
            version: 3, upgrade: () => null,
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
                    label: 'Scatter graph of rainy days and road accidents, with one blue point.' });
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
                const points = tryItPoints.map(p => graph.point(p, { size: 'small', tone: 'neutral', coordinates: false }));
                let picker = null;
                let arrows = [];
                function paint() {
                    arrows.forEach(a => a.remove()); arrows = [];
                    if (state.t2Picked && state.t2Done) {
                        points[1].update({ size: 'large' });
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
                                saved.t2Hint = `That point is ${S.quantity(x, 'rainy days')} and ${S.quantity(y, 'accidents')}. Find the one above 3 on the bottom axis.`;
                                saved.t2Done = false;
                            }
                        });
                        graph.describe(match ? `You tapped the point for ${S.quantity(x, 'rainy days')} and ${S.quantity(y, 'accidents')}.`
                            : 'You tapped the grid, not a point.');
                        if (state.t2Done) picker.stop();
                        paint();
                        progress();
                    } });
                }
                paint();
            } else {
                prompt.remove();
                const allPoints = tryItPoints.concat([[5, 8]]);
                graph = makeGraph(graphHost, { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                    axisNames: { x: 'Rainy days', y: 'Road accidents' },
                    label: 'Scatter graph of rainy days and road accidents, with one blue point.' });
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

    const plotAxes = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1 };
    const plotLearn = [
        {
            title: 'To plot a pair, go across to the first number, then up to the second.',
            rows: ['Shots', 'Goals'], values: [[2, 1], [4, 3], [6, 5], [5, 3]],
            points: [[2, 1], [4, 3], [6, 5]], targets: [[5, 3]], column: 3,
            line: 'Tap where the point for the orange column goes.',
            axisNames: { x: 'Shots on target', y: 'Goals' },
            success: 'Across to 5, then up to 3.',
            hint: point => S.samePoint(point, [3, 5]) ? 'You went across to 3. Across is the top number in the table, 5.'
                : 'Go along the bottom to 5 first, then up to 3.'
        },
        {
            title: 'Two pairs can start with the same number. Each pair still gets its own point.',
            rows: ['Shots', 'Goals'], values: [[4, 2], [6, 3], [6, 5]],
            points: [[4, 2], [6, 3]], targets: [[6, 5]], column: 2,
            line: 'Tap where the point for the orange column goes.',
            axisNames: { x: 'Shots on target', y: 'Goals' },
            success: 'Both pairs start at 6, so their points sit one above the other.',
            hint: point => S.samePoint(point, [6, 3]) ? "That's the point for 6 shots and 3 goals. This pair goes up to 5, so it needs its own point."
                : S.samePoint(point, [5, 6]) ? 'You went across to 5. Across is the top number, 6.'
                    : 'Go along the bottom to 6, then up to 5.'
        }
    ];
    const sunshineAxes = { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' };
    const plotTryIt = [
        {
            title: 'Plot the pair in the table.', rows: ['Sunshine', 'Boxes'], values: [[6, 2]],
            points: [], targets: [[6, 2]], axisNames: sunshineAxes,
            success: 'Across to 6, up to 2.',
            hint: point => S.samePoint(point, [2, 6]) ? "That's across 2. The top number, 6, goes across."
                : 'Go across to 6 first, then up to 2.'
        },
        {
            title: 'Plot every pair in the table.', rows: ['Sunshine', 'Boxes'],
            values: [[1, 4], [3, 6], [3, 2], [5, 7], [8, 9]],
            points: [], targets: [[1, 4], [3, 6], [3, 2], [5, 7], [8, 9]], column: 0,
            axisNames: sunshineAxes,
            success: 'All five pairs are plotted. The two pairs that start at 3 sit one above the other.',
            hint(point, [a, b]) {
                return S.samePoint(point, [b, a]) ? `That's across ${b}. The top number, ${a}, goes across.`
                    : `Go across to ${a} first, then up to ${b}.`;
            }
        },
        {
            title: 'One point is in the wrong place. Drag it to where it belongs.',
            rows: ['Sunshine', 'Boxes'], values: [[2, 3], [4, 8], [7, 5], [9, 6]], column: 1,
            points: [[2, 3], [7, 5], [9, 6]], targets: [[4, 8]], drag: [8, 4],
            axisNames: sunshineAxes, success: "Now it's across 4 and up 8.",
            hint: () => 'Across 4, then up 8.'
        }
    ];

    async function mountGraphScreens(api, root, id, key, screens, kind) {
        const E = window.Maths1to9LessonEngine;
        const part = api.getSection(id).part;
        const route = `${part}-${kind === 'explanation' ? 'learn' : 'try-it'}`;
        const section = await api.useSectionState(key, {
            version: 1, upgrade: () => null,
            initial: () => ({ screen: 0, furthest: 0,
                cards: screens.map(screen => ({ count: 0, done: false, hint: '', value: null, position: screen.drag || null })) })
        });
        const state = section.state;
        let graph = null;
        let digitView = null;
        api.gateSection(id);
        function syncHash() {
            if (api.getCurrentSection().id === id) api.setSlideHash(`${route}-${state.screen + 1}`, { replace: true });
        }
        function show(index) {
            section.update(saved => { saved.screen = index; saved.furthest = Math.max(saved.furthest, index); });
            render();
            root.querySelector('h2').focus();
        }
        function render() {
            graph?.destroy();
            digitView?.destroy();
            digitView = null;
            root.replaceChildren();
            const index = state.screen;
            const screen = screens[index];
            const card = state.cards[index];
            const heading = element('h2', screen.title);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            if (screen.line) root.append(element('p', screen.line));
            const tableHost = element('div');
            const graphHost = element('div', '', 'scatter-graph-host');
            const feedback = E.createFeedback(kind, { visible: false });
            root.append(tableHost, graphHost, feedback);
            graph = S.makeGraph(graphHost, { ...(screen.graph || plotAxes), axisNames: screen.axisNames, label: screen.title });
            screen.points.forEach(point => {
                const big = S.samePoint(point, screen.bigPoint);
                graph.point(point, { size: big ? 'large' : 'small', tone: screen.bigPoint && !big ? 'muted' : 'neutral', coordinates: false });
            });
            if (!screen.drag && !screen.digits) screen.targets.slice(0, card.count).forEach(point => {
                graph.point(point, { size: screen.big ? 'large' : 'small', tone: 'neutral', coordinates: false });
            });
            let picker = null;
            let dragging = false;
            let arrows = [];
            function paint() {
                if (screen.values) {
                    tableHost.replaceChildren();
                    S.pairTable(tableHost, { rows: screen.rows, values: screen.values,
                        selected: screen.column === undefined ? null : screen.column + (screen.targets.length > 1 ? Math.min(card.count, screen.targets.length - 1) : 0) });
                }
                feedback.textContent = card.hint;
                feedback.className = E.feedbackClassName(kind, { visible: Boolean(card.hint), correct: card.done });
                arrows.forEach(arrow => arrow.remove());
                arrows = [];
                if (card.count > 0 && !screen.drag && screen.guides !== false) {
                    const [x, y] = screen.targets[card.count - 1];
                    arrows.push(graph.arrow([0, 0], [x, 0], { dash: true, tone: 'ink' }));
                    arrows.push(graph.arrow([x, 0], [x, y], { dash: true, tone: 'ink' }));
                }
                const completed = state.cards.filter(saved => saved.done).length;
                api.setSectionProgress(id, completed, screens.length);
                if (completed === screens.length) api.completeSection(id);
                api.setSectionAction(id, {
                    label: index < screens.length - 1 ? 'Next' : 'Continue', disabled: !card.done,
                    onClick() {
                        if (index < screens.length - 1) show(index + 1);
                        else { api.completeSection(id); api.continueSection(); }
                    }
                });
                syncHash();
            }
            function choose(point) {
                if (card.done) return;
                const target = screen.targets[card.count];
                const correct = S.samePoint(point, target);
                section.update(() => {
                    if (correct) card.count++;
                    card.done = card.count === screen.targets.length;
                    card.hint = card.done ? screen.success : correct ? '' : screen.hint(point, target);
                });
                if (correct && !screen.drag) graph.point(point, { size: screen.big ? 'large' : 'small', tone: 'neutral', coordinates: false });
                if (screen.axis === 'y') graph.describe(point[0] === 0
                    ? `You tapped ${point[1]} on the side axis.` : 'You tapped the grid, not the side axis.');
                else if (screen.axis === 'x') graph.describe(point[1] === 0
                    ? `You tapped ${point[0]} on the bottom axis.` : 'You tapped the grid, not the bottom axis.');
                else graph.describe(`You ${screen.drag ? 'moved' : 'tapped'} across ${point[0]} and up ${point[1]}.`);
                if (card.done) {
                    picker?.stop();
                    graph.setEditable(false);
                }
                paint();
            }
            if (screen.digits) {
                digitView = scaleDigitTable(root, card, (value, done, hint) => {
                    section.update(() => { card.value = value; card.done = done; card.count = Number(done); card.hint = hint; });
                    paint();
                });
            } else if (screen.drag) {
                graphHost.addEventListener('pointerdown', () => { dragging = true; });
                graphHost.addEventListener('pointerup', () => {
                    dragging = false;
                    if (!card.done) choose(card.position);
                });
                graphHost.addEventListener('pointercancel', () => { dragging = false; });
                graph.point(card.position, { size: 'large', tone: 'neutral', coordinates: false,
                    drag: card.done ? false : 'free', onMove(point) {
                        section.update(() => { card.position = point; });
                        graph.describe(`You moved across ${point[0]} and up ${point[1]}.`);
                        if (!dragging) choose(point);
                    } });
                graph.setEditable(!card.done);
            } else if (!card.done) picker = graph.pick({ label: screen.line || screen.title, onPick: choose });
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, () => {
                section.resetFields([['cards', index]]);
                render();
            });
            paint();
        }
        screens.forEach((_, index) => api.registerHashRoute(`${route}-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.furthest));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    async function mountPlot(api, root, section) {
        const learn = document.getElementById('lesson-section-explanation--plot');
        const article = element('article');
        learn.append(article);
        await mountGraphScreens(api, article, 'explanation--plot', 'learn:plot', plotLearn, 'explanation');
        root.closest('.lesson-section').removeAttribute('aria-labelledby');
        root.closest('.lesson-section').setAttribute('aria-label', 'Plot Try it');
        await mountGraphScreens(api, root, section.id, 'interactive:plot', plotTryIt, 'interactive');
    }

    const sunshineScale = {
        x: [0, 10], y: [0, 100], step: { x: 1, y: 10 }, labelEvery: { x: 1, y: 2 }
    };
    const temperatureScale = {
        x: [0, 30], y: [0, 100], step: { x: 2, y: 10 }, labelEvery: { x: 5, y: 2 }
    };
    const iceCreamAxes = { x: 'Hours of sunshine', y: 'Ice creams sold' };
    const temperatureAxes = { x: 'Temperature (°C)', y: 'Ice creams sold' };
    const scalesLearn = [{
        title: 'Before you read or plot, find what one square is worth.',
        line: 'Tap where 30 goes on the side axis.', graph: sunshineScale, axisNames: iceCreamAxes,
        points: [], targets: [[0, 30]], big: true, guides: false, axis: 'y',
        success: 'Two squares make 20, so one square is 10. 30 is three squares up.',
        hint: ([x, y]) => x !== 0 ? 'Tap on the side axis, the line up the left.'
            : y === 60 ? "That's 60. You counted three numbers, but there are two squares between each number."
                : 'Two squares make 20, so one square is 10. Count up 10, 20, 30.'
    }];
    const scalesTryIt = [
        {
            title: 'Plot 6 hours of sunshine and 70 ice creams.', graph: sunshineScale, axisNames: iceCreamAxes,
            points: [], targets: [[6, 70]], success: 'Across to 6, then up 7 squares to 70.',
            hint: ([x]) => x === 6 ? 'One square is 10. Count up 10, 20, 30… to 70.' : 'Go across to 6 first.'
        },
        {
            title: 'Plot 14 °C and 50 ice creams.', graph: temperatureScale, axisNames: temperatureAxes,
            points: [], targets: [[14, 50]], success: 'One square across is 2, so 14 is seven squares across.',
            hint: ([x, y]) => y !== 50 ? 'One square up is 10. Count up to 50.'
                : 'Five squares make 10 across, so one square is 2. Count 2, 4, 6… to 14.'
        },
        {
            title: 'Fill in the table for the blue point.', graph: temperatureScale, axisNames: temperatureAxes,
            points: [[6, 30], [10, 40], [22, 80], [18, 90]], bigPoint: [18, 90], targets: [[18, 90]],
            digits: true, guides: false, success: '18 °C and 90 ice creams.'
        }
    ];

    function scaleDigitTable(host, card, onChange) {
        const DC = window.Maths1to9DigitCards;
        const table = element('div', '', 'scatter-pair-table');
        table.style.gridTemplateColumns = 'minmax(8.5rem, 1.5fr) minmax(0, 1fr)';
        const headings = element('div', '', 'scatter-pair-table__headings');
        const column = element('div', '', 'scatter-pair-table__column');
        const slots = [];
        const expected = { 'temperature:tens': '1', 'temperature:units': '8', 'icecreams:tens': '9', 'icecreams:units': '0' };
        for (const [group, label] of [['temperature', 'Temperature (°C)'], ['icecreams', 'Ice creams']]) {
            headings.append(element('span', label));
            const cell = element('div');
            cell.style.display = 'flex';
            cell.style.justifyContent = 'center';
            cell.style.gap = '0.25rem';
            for (const place of ['tens', 'units']) {
                const id = `${group}:${place}`;
                const button = element('button');
                button.type = 'button';
                button.setAttribute('aria-label', `${label}, ${place} digit`);
                cell.append(button);
                slots.push({ id, element: button, group, column: place, allowed: value => value?.marks?.[id] !== 'right' });
            }
            column.append(cell);
        }
        table.append(headings, column);
        host.append(table);
        const tray = element('div');
        host.append(tray);
        let view;
        view = DC.create(tray, {
            slots, active: 'temperature:tens', value: card.value, editable: !card.done,
            onChange(value) {
                const digits = value?.digits || {};
                const marks = {};
                Object.keys(expected).forEach(id => {
                    if (digits[id] !== undefined) marks[id] = digits[id] === expected[id] ? 'right' : 'wrong';
                });
                const done = Object.keys(expected).every(id => marks[id] === 'right');
                let hint = done ? '18 °C and 90 ice creams.' : '';
                for (const group of ['temperature', 'icecreams']) {
                    const ids = [`${group}:tens`, `${group}:units`];
                    if (!hint && ids.some(id => marks[id] === 'wrong')) {
                        const number = Number(ids.map(id => digits[id] || '').join(''));
                        hint = number === 9 ? group === 'temperature'
                            ? "That's the number of squares. Each square across is 2."
                            : "That's the number of squares. Each square up is 10."
                            : 'Count the squares, then times by what one square is worth.';
                    }
                }
                const marked = DC.markedValue(value, marks);
                view.update({ value: marked, editable: !done, phase: 'answer' });
                onChange(marked, done, hint);
            }
        });
        return view;
    }

    async function mountScales(api, root, section) {
        const learn = document.getElementById('lesson-section-explanation--scales');
        const article = element('article');
        learn.append(article);
        await mountGraphScreens(api, article, 'explanation--scales', 'learn:scales', scalesLearn, 'explanation');
        root.closest('.lesson-section').removeAttribute('aria-labelledby');
        root.closest('.lesson-section').setAttribute('aria-label', 'Scales Try it');
        await mountGraphScreens(api, root, section.id, 'interactive:scales', scalesTryIt, 'interactive');
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        if (section.part === 'read') {
            await mountRead(api);
            await mountTryIt(api, root, section);
        } else if (section.part === 'plot') {
            await mountPlot(api, root, section);
        } else if (section.part === 'scales') {
            await mountScales(api, root, section);
        } else {
            throw new Error(`Unknown scatter graph part: ${section.part}`);
        }
    };
})();