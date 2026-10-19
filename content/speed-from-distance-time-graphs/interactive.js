(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const J = window.SpeedJourneys;
    const titles = ['Speed is distance each second.', 'The same walk as a graph.', 'Speed for one section.', 'Steeper is faster.', 'A flat section.'];
    const walk = [[0, 0], [4, 8], [10, 26]];
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = J.nb(text);
        element.className = className;
        return element;
    }
    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    }
    function paragraphs(root, texts) {
        root.replaceChildren(...texts.map(text => {
            const p = node('p'); p.innerHTML = J.nb(text); return p;
        }));
    }
    function walker(root, maximum) {
        const strip = node('div', '', 'walker');
        strip.setAttribute('role', 'img');
        const track = node('div', '', 'walker__track');
        track.append(node('span', 'Start', 'walker__start'));
        for (let metre = 0; metre <= maximum; metre += 2) {
            const mark = node('span', `${metre} m`, 'walker__mark');
            mark.style.left = `${100 * metre / maximum}%`; track.append(mark);
        }
        const dot = node('span', '', 'walker__dot'); track.append(dot);
        const caption = node('p', '', 'walker__caption'); strip.append(track, caption); root.append(strip);
        return (time, distance) => {
            dot.style.left = `${100 * distance / maximum}%`;
            const text = J.nb(`Time: ${time} s · Distance from the start: ${distance} m`);
            caption.textContent = text; strip.setAttribute('aria-label', text);
        };
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article');
        document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false,
                time: 0, sliderReached: false, position: 0, visited: [0], walkReached: false,
                tap: null, tapFeedback: '', foundStart: false, foundEnd: false,
                chosen: 0, chosenSections: [0], flatTime: 4, flatReached: false })
        });
        const state = section.state;
        let graph, timers = [];
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) {
            section.update(state => { state.screen = screen; state.furthestScreen = Math.max(state.furthestScreen, screen); });
            render();
        }
        function action() {
            const ready = [state.sliderReached, state.walkReached, state.foundEnd, state.chosenSections.length === 2, state.flatReached][state.screen];
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen === 4 && ready) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', { label: 'Next', disabled: !ready, onClick: () => showScreen(state.screen + 1) });
        }
        function render() {
            timers.forEach(clearTimeout); timers = [];
            graph?.destroy(); graph = null;
            root.replaceChildren();
            const heading = node('h3', titles[state.screen]); heading.dataset.screenHeading = ''; root.append(heading);
            if (state.screen === 0) {
                const updateWalker = walker(root, 12);
                const prompt = node('p', 'Move the time to 6 seconds.');
                const label = node('label', 'Time (s)', 'speed-slider');
                const slider = node('input'); slider.type = 'range'; slider.min = 0; slider.max = 6; slider.step = 1; slider.value = state.time;
                slider.setAttribute('aria-label', 'Time (s)'); label.append(slider);
                const content = node('div'); root.append(prompt, label, content);
                let current = state.time, reached = state.sliderReached;
                function paint() {
                    updateWalker(current, current * 2);
                    if (reached) paragraphs(content, ['You walked 12 m in 6 seconds: 2 m every second.',
                        "That's your <strong>speed</strong>: 2 metres per second, written <strong>2 m/s</strong>.",
                        'Speed = distance travelled ÷ time taken = 12 ÷ 6 = 2 m/s.']);
                }
                slider.addEventListener('input', () => { current = Number(slider.value); reached ||= current === 6; paint(); });
                slider.addEventListener('change', () => {
                    section.update(state => { state.time = current; state.sliderReached = reached; }); action();
                });
                paint();
            } else if (state.screen === 1 || state.screen === 4) {
                const flat = state.screen === 4;
                const updateWalker = walker(root, 12);
                root.append(node('p', flat ? 'Drag the point from 4 to 8 seconds. Watch the walker.' : 'Drag the point forward one second at a time.'));
                const host = node('div'); root.append(host);
                const corners = flat ? [[0, 0], [4, 12], [8, 12]] : [[0, 0], [6, 12]];
                graph = J.journeyGraph(host, { corners, maxDistance: 12, draw: flat || state.walkReached, ...(flat ? { section: [4, 8] } : {}) });
                const positions = Array.from({ length: flat ? 5 : 7 }, (_, i) => flat ? [i + 4, 12] : [i, i * 2]);
                const working = node('p', '', 'speed-working');
                const content = node('div'); root.append(working, content);
                let helpers = [], dots = [], completedLine = null;
                function paint() {
                    helpers.forEach(item => item.remove()); dots.forEach(item => item.remove());
                    const time = flat ? state.flatTime : state.position, distance = flat ? 12 : 2 * time;
                    updateWalker(time, distance);
                    helpers = J.guides(graph, [time, distance], { horizontal: !flat });
                    graph.describe(J.pointText([time, distance]));
                    dots = flat ? [] : state.visited.filter(i => i < time).map(i => graph.point(positions[i], { tone: 'muted' }));
                    if (!flat && state.walkReached && graph.journeyLines.length === 0 && !completedLine) completedLine = graph.segment([0, 0], [6, 12]);
                    working.hidden = flat || time === 0;
                    working.textContent = J.nb(`At ${time} s you've gone ${distance} m. ${J.speedText(distance, time || 1)}.`);
                    if (flat && state.flatReached) paragraphs(content, ['Time goes on, but the distance stays at 12 m.',
                        'Distance travelled: 12 − 12 = 0 m, so the speed is 0 ÷ 4 = <strong>0 m/s</strong>.',
                        'A <strong>flat</strong> section means <strong>stopped</strong>.']);
                    if (!flat && state.walkReached) paragraphs(content, ['Across: time. Up: distance from the start.',
                        'The dots make a straight line, because you go the same distance every second: a <strong>steady speed</strong>.']);
                }
                graph.point(flat ? [state.flatTime, 12] : positions[state.position], {
                    size: 'large', drag: 'positions', positions,
                    onMove([time]) {
                        section.update(state => {
                            if (flat) { state.flatTime = time; if (time === 8) state.flatReached = state.finished = true; }
                            else { state.position = time; if (!state.visited.includes(time)) state.visited.push(time); if (time === 6) state.walkReached = true; }
                        });
                        paint(); action();
                    }
                });
                paint();
            } else if (state.screen === 2) {
                const prompt = node('p'); root.append(prompt);
                const host = node('div'); root.append(host);
                graph = J.journeyGraph(host, { corners: walk, section: [4, 10] });
                const feedback = node('p'); feedback.setAttribute('role', 'status');
                const content = node('div'); root.append(feedback, content);
                let helpers = [], marker;
                function paint(reveal = false) {
                    helpers.forEach(item => item.remove()); helpers = []; marker?.remove();
                    prompt.textContent = state.foundEnd ? '' : state.foundStart ? 'Now tap the end.'
                        : 'Find the speed between 4 and 10 seconds. Tap the start of the highlighted section.';
                    if (state.foundStart) helpers.push(...J.guides(graph, [4, 8]));
                    if (state.foundEnd) helpers.push(...J.guides(graph, [10, 26], { verticalTo: 8 }), ...J.sectionArrows(graph, [4, 8], [10, 26]));
                    if (state.tap && state.tapFeedback) marker = graph.point(state.tap, { tone: 'incorrect' });
                    if (state.tap) graph.describe(J.pointText(state.tap));
                    feedback.textContent = state.tapFeedback;
                    feedback.className = state.tapFeedback ? 'question-feedback is-visible is-incorrect' : '';
                    if (state.foundEnd) {
                        const texts = ['Distance travelled: 26 − 8 = 18 m.', 'Time taken: 10 − 4 = 6 s.', 'Speed = 18 ÷ 6 = <strong>3 m/s</strong>.', 'Use only the start and end of the section.'];
                        paragraphs(content, texts);
                        if (reveal && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                            [...content.children].forEach((line, i) => { line.hidden = i > 0; if (i > 0) timers.push(setTimeout(() => { line.hidden = false; }, 450 * i)); });
                        }
                    }
                }
                paint();
                if (!state.foundEnd) {
                    const picker = graph.pick({ label: prompt.textContent, onPick(position) {
                        const [t, d] = position;
                        section.update(state => {
                            state.tap = position;
                            const target = state.foundStart ? [10, 26] : [4, 8];
                            if (t === target[0] && d === target[1]) {
                                if (state.foundStart) state.foundEnd = true; else state.foundStart = true;
                                state.tapFeedback = '';
                            } else if (t === 0 && d === 0) state.tapFeedback = "That's the start of the whole journey. Find where the highlighted section starts.";
                            else if (!state.foundStart && t === 10 && d === 26) state.tapFeedback = "That's the end. Tap where the highlighted section starts first.";
                            else if (t >= 0 && t <= 10 && d === (t <= 4 ? 2 * t : 3 * t - 4)) state.tapFeedback = `That's on the line. Tap the ${state.foundStart ? 'end' : 'start'} of the highlighted section.`;
                            else state.tapFeedback = 'Tap a corner of the highlighted line.';
                        });
                        if (state.foundEnd) picker.stop();
                        paint(state.foundEnd); action();
                    } });
                }
            } else {
                const controls = node('div', '', 'speed-section-options'); controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Choose a section'); root.append(controls);
                const host = node('div'); root.append(host);
                graph = J.journeyGraph(host, { corners: walk, section: state.chosen === 0 ? [0, 4] : [4, 10] });
                const working = node('p', '', 'speed-working'); root.append(working);
                const content = node('div'); root.append(content);
                paragraphs(content, ['The steeper section is faster.', 'Distance ÷ time is the <strong>gradient</strong> of the line, so on a distance–time graph the gradient is the speed.']);
                let arrows = [];
                const buttons = ['0 to 4 s', '4 to 10 s'].map((text, index) => {
                    const button = node('button', text, 'button'); button.type = 'button'; controls.append(button);
                    button.addEventListener('click', () => {
                        section.update(state => { state.chosen = index; if (!state.chosenSections.includes(index)) state.chosenSections.push(index); }); paint(); action();
                    }); return button;
                });
                function paint() {
                    graph.journeyLines.forEach((line, i) => line.update({ tone: i === state.chosen ? 'neutral' : 'muted' }));
                    arrows.forEach(item => item.remove()); arrows = J.sectionArrows(graph, walk[state.chosen], walk[state.chosen + 1]);
                    working.textContent = J.nb(state.chosen === 0 ? '8 m in 4 s: 8 ÷ 4 = 2 m/s' : '18 m in 6 s: 18 ÷ 6 = 3 m/s');
                    buttons.forEach((button, index) => { button.className = `button${index === state.chosen ? ' is-selected' : ''}`; button.setAttribute('aria-pressed', String(index === state.chosen)); });
                }
                paint();
            }
            action(); syncHash();
        }
        titles.forEach((title, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            if (api.goToSection('explanation', { moveFocus: false })) showScreen(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-5])$/.exec(initialHash);
        if (requested) showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen)); else render();
    }

    const examples = [
        J.withFigure({ prompt: 'Someone walks at a steady speed. What is their speed?',
            ...J.numberCard(4, 'Right. 20 ÷ 5 = 4 m/s: 4 metres every second.', [
                { value: '0.25', feedback: "That's time ÷ distance. Speed is distance ÷ time: 20 ÷ 5." },
                { value: '20', feedback: '20 m is the distance. Divide it by the time taken.' },
                { value: '5', feedback: '5 s is the time taken. Divide the distance by it.' }
            ]) }, { corners: [[0, 0], [5, 20]] }),
        J.withFigure(J.distanceAndTime({ corners: [[0, 0], [3, 6], [7, 18]], section: [3, 7] }), { corners: [[0, 0], [3, 6], [7, 18]], section: [3, 7] }),
        J.withFigure({ input: 'choice', prompt: 'So what was the speed between 3 and 7 seconds?', options: [
            J.choice('3 m/s', 'Right. 12 ÷ 4 = 3 m/s.', true),
            J.choice('2 m/s', "That's the speed of the first section, 0 to 3 s. Use the highlighted one."),
            J.choice('0.33 m/s', "That's 4 ÷ 12, time ÷ distance. Speed is distance ÷ time."),
            J.choice('12 m/s', '12 m is the distance travelled. Divide it by the 4 s taken.')
        ] }, { corners: [[0, 0], [3, 6], [7, 18]], section: [3, 7] }),
        J.withFigure({ input: 'choice', prompt: 'What is happening between 4 and 8 seconds?', options: [
            J.choice('They have stopped.', 'Right. The distance stays at 12 m, so the speed is 0 m/s.', true),
            J.choice('They are going at 12 m/s.', "12 m is how far they are from the start. It doesn't change, so they aren't moving."),
            J.choice('They are going at a steady speed.', "A steady speed is a sloping straight line. A flat line means the distance doesn't change."),
            J.choice('They are going back to the start.', 'Going back would make the line go down, towards 0 m. This line stays at 12 m.')
        ] }, { corners: [[0, 0], [4, 12], [8, 12], [10, 20]], section: [4, 8] })
    ];
    J.examples = examples;

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
        function syncHash() { if (api.getCurrentSection().id === 'interactive') api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true }); }
        function show(screen) { section.update(state => { state.screen = screen; }); render(); }
        function report() {
            const card = state.cards[`example-${state.index + 1}`];
            api.setSectionProgress('interactive', state.finished ? examples.length : state.index + Number(card?.correct === true), examples.length);
        }
        function draw(container, index, readOnly) {
            const example = examples[index], cardRoot = node('div'); container.append(cardRoot);
            return api.createQuestion(cardRoot, { ...example, options: state.order[index].map(option => example.options[option]),
                sectionId: 'interactive', questionId: `example-${index + 1}`, scored: false, readOnly,
                onFeedback: report, onContinue() {
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
        const requested = /^#try-it-([1-5])$/.exec(initialHash);
        if (requested && api.goToSection('interactive', { moveFocus: false })) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
    }
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => { if (event.detail?.slug === SLUG) mountLearn(); });
})();
