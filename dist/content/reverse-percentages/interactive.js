(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const S = window.ReversePercentages;
    const screens = S.learnScreens;
    const examples = S.examples();
    const { number, multiplier } = S;

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    // One bar: a grey part that is kept, an orange 1% slice, a pale part not
    // known yet, a red part cut off and a green part added. Widths are shares of `scale`.
    function makeBar(host, caption = '') {
        const figure = node('figure', '', 'rp-bar');
        const title = node('figcaption', caption);
        const track = node('div', '', 'rp-track');
        track.setAttribute('role', 'img');
        const parts = {};
        for (const name of ['kept', 'one', 'rest', 'cut', 'added']) {
            parts[name] = node('span', '', `rp-part rp-${name}`);
            track.append(parts[name]);
        }
        const note = node('p', '', 'rp-note');
        figure.append(title, track, note);
        host.append(figure);
        let shown = true;

        function widths(values, scale) {
            for (const [name, part] of Object.entries(parts)) {
                part.style.width = `${(values[name] || 0) / scale * 100}%`;
            }
            labels(values, scale);
        }

        // Only label a part wide enough to hold its text. A bar drawn before
        // it is on screen has no width yet, so try again next frame.
        function labels(values, scale, tries = 10) {
            const width = track.clientWidth;
            if (!width && tries > 0) {
                requestAnimationFrame(() => labels(values, scale, tries - 1));
                return;
            }
            for (const [name, part] of Object.entries(parts)) {
                const text = values.labels?.[name] || '';
                const room = width * (values[name] || 0) / scale;
                part.textContent = room >= text.length * 8 + 12 ? text : '';
            }
        }

        return {
            set(values, scale, { caption: text, noteText = '' } = {}) {
                if (text !== undefined) title.textContent = text;
                note.textContent = noteText;
                track.setAttribute('aria-label', `${title.textContent}. ${noteText}`);
                widths(values, scale);
            },
            show(visible, values, scale, options) {
                if (visible && !shown) {
                    figure.hidden = false;
                    widths({ kept: (values.kept || 0) + (values.cut || 0) + (values.added || 0) }, scale);
                    void track.offsetWidth;
                }
                figure.hidden = !visible;
                shown = visible;
                if (visible) this.set(values, scale, options);
            }
        };
    }

    // "£75" → "× 0.8" → "£60"
    function makeChain(host) {
        const chain = node('p', '', 'rp-chain');
        const from = node('span', '', 'rp-sum');
        const pill = node('span', '', 'rp-pill');
        const to = node('span', '', 'rp-sum');
        chain.append(from, node('span', '→', 'rp-arrow'), pill, node('span', '→', 'rp-arrow'), to);
        host.append(chain);
        return (start, step, end) => {
            from.textContent = start;
            pill.textContent = step;
            to.textContent = end;
        };
    }

    function lines(host, className = 'rp-working') {
        const holder = node('div', '', 'rp-lines');
        host.append(holder);
        return (values, last = '') => {
            holder.replaceChildren(...values.filter(Boolean).map((text, index, all) =>
                node('p', text, index === all.length - 1 && last ? last : className)));
        };
    }

    // Builds a screen's picture once and returns paint(value), which only
    // changes widths and text, so the slider keeps focus while dragged.
    const pictures = [
        function jo(host) {
            const maths = screens[0].maths;
            const first = makeBar(host, "Jo's answer");
            const second = makeBar(host, "Check Jo's answer: take 20% off £72");
            const working = lines(host);
            return step => {
                first.set({ kept: 60, added: 12, labels: { kept: '£60', added: '+£12' } }, 80, { noteText: maths[0] });
                second.show(step >= 2, { kept: 57.6, cut: 14.4, labels: { kept: '£57.60', cut: '−£14.40' } }, 80, {
                    noteText: maths[1]
                });
                working(step === 2 ? [maths[2]] : [], 'rp-result');
            };
        },
        function down(host) {
            const bar = makeBar(host, 'Price before the sale = 100%');
            const working = lines(host);
            return percent => {
                const kept = 100 - percent;
                bar.set({ kept, cut: percent, labels: { kept: `${kept}% = £60`, cut: `−${percent}%` } }, 100);
                working([`100% − ${percent}% = ${kept}%`, `So £60 is ${kept}% of the price before.`]);
            };
        },
        function up(host) {
            const bar = makeBar(host, 'Rent before = 100%');
            const working = lines(host);
            return percent => {
                const total = 100 + percent;
                bar.set({ kept: 100, added: percent, labels: { kept: '100%', added: `+${percent}%` } }, 150, {
                    noteText: `The whole bar is ${total}% = £150`
                });
                working([`100% + ${percent}% = ${total}%`, `So £150 is ${total}% of the rent before.`]);
            };
        },
        function oneThenHundred(host) {
            const maths = screens[3].maths;
            const bar = makeBar(host, 'Price before the sale = 100%');
            const working = lines(host);
            return step => {
                bar.set(step === 1 ? { kept: 80, rest: 20, labels: { kept: '80% = £60', rest: '?' } }
                    : step === 2 ? { kept: 79, one: 1, rest: 20, labels: { kept: '80% = £60', rest: '?' } }
                        : { kept: 79, one: 1, cut: 20, labels: { kept: '80% = £60', cut: '20%' } }, 100, {
                    noteText: step === 1 ? 'We know 80%. We want 100%.'
                        : step === 2 ? 'The orange slice is 1%. It is £0.75.' : 'The whole bar is 100%. That is £75.'
                });
                working(maths.slice(0, step === 3 ? 5 : step + 1), step === 3 ? 'rp-result' : '');
            };
        },
        function divide(host) {
            const maths = screens[4].maths;
            const bar = makeBar(host);
            const chain = makeChain(host);
            const working = lines(host);
            return step => {
                if (step === 1) {
                    bar.set({ kept: 60, cut: 15, labels: { kept: '£60', cut: '−20%' } }, 80, {
                        caption: 'Forwards: take 20% off £75', noteText: '£75 becomes £60'
                    });
                    chain('£75', '× 0.8', '£60');
                } else {
                    bar.set({ kept: 75, labels: { kept: '£75' } }, 80, {
                        caption: 'Backwards: undo it', noteText: '£60 goes back to £75'
                    });
                    chain('£60', '÷ 0.8', '£75');
                }
                working([maths[step - 1]]);
            };
        },
        function method(host, state, save) {
            const screen = screens[5];
            const toggle = node('div', '', 'rp-toggle');
            toggle.setAttribute('role', 'group');
            toggle.setAttribute('aria-label', 'Up or down');
            const buttons = ['up', 'down'].map(direction => {
                const button = node('button', direction === 'up' ? 'Up' : 'Down');
                button.type = 'button';
                button.dataset.direction = direction;
                toggle.append(button);
                return button;
            });
            host.append(toggle);
            const bar = makeBar(host);
            const steps = node('ol', '', 'rp-steps');
            const items = screen.steps.map(step => {
                const item = node('li');
                item.append(node('strong', step.title), document.createTextNode(` ${step.text}`));
                const maths = node('span', '', 'rp-step-maths');
                item.append(maths);
                steps.append(item);
                return maths;
            });
            host.append(steps);
            const check = node('p', '', 'rp-result');
            host.append(check);
            let current = screen.start;
            function paint(percent = current) {
                current = percent;
                const direction = state.direction;
                const kept = direction === 'up' ? 100 + percent : 100 - percent;
                const m = multiplier(percent, direction);
                const before = Number(number(396 / m));
                buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.direction === direction)));
                bar.set(direction === 'up'
                    ? { kept: 100, added: percent, labels: { kept: '100%', added: `+${percent}%` } }
                    : { kept: kept, cut: percent, labels: { kept: `${kept}%`, cut: `−${percent}%` } }, 150, {
                    caption: `Price before = 100%. It went ${direction} by ${percent}%.`,
                    noteText: `£396 is ${kept}% of the price before.`
                });
                items[0].textContent = `100% ${direction === 'up' ? '+' : '−'} ${percent}% = ${kept}%`;
                items[1].textContent = `${kept}% → ${number(m)}`;
                items[2].textContent = `396 ÷ ${number(m)} = ${number(before)}`;
                check.textContent = `Check: ${number(before)} × ${number(m)} = 396 ✓`;
            }
            buttons.forEach(button => button.addEventListener('click', () => {
                save(state => { state.direction = button.dataset.direction; });
                paint();
            }));
            return paint;
        },
        function words(host) {
            const examples = screens[6].examples;
            const phrase = node('p', '', 'rp-phrase');
            const extra = node('p', '', 'rp-note');
            host.append(phrase, extra);
            const bar = makeBar(host);
            const working = lines(host);
            return index => {
                const example = examples[index - 1];
                const up = example.direction === 'up';
                phrase.textContent = `“${example.text}”`;
                extra.textContent = example.note || '';
                extra.hidden = !example.note;
                bar.set(up ? { kept: 100, added: 20, labels: { kept: '100%', added: '+20%' } }
                    : { kept: 80, cut: 20, labels: { kept: '80%', cut: '−20%' } }, 120, {
                    caption: `${example.whole} = 100%`,
                    noteText: `${example.now} = ${up ? 120 : 80}%`
                });
                working([up ? 'Up: 100% + 20% = 120%' : 'Down: 100% − 20% = 80%']);
            };
        }
    ];

    async function mountLearn() {
        const root = node('article', '', 'rp-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                sliders: screens.map(screen => screen.start), direction: 'down'
            }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') {
                api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
                if (screen === screens.length - 1) state.finished = true;
            });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        // Text inside **…** is shown in bold.
        function paragraph(text) {
            const element = node('p');
            text.split('**').forEach((part, index) => {
                element.append(index % 2 ? node('strong', part) : document.createTextNode(part));
            });
            return element;
        }

        function render() {
            root.replaceChildren();
            const screen = screens[state.screen];
            const heading = node('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            for (const line of screen.lines) root.append(paragraph(line));
            // A screen with `values` steps through that list; the others use min, max and step.
            const values = screen.values;
            const controls = node('label', '', 'rp-slider');
            const slider = node('input');
            const output = node('output');
            Object.assign(slider, values
                ? { type: 'range', min: '0', max: String(values.length - 1), step: '1', value: String(values.indexOf(state.sliders[state.screen])) }
                : { type: 'range', min: String(screen.min), max: String(screen.max), step: String(screen.step), value: String(state.sliders[state.screen]) });
            slider.id = `rp-slider-${state.screen + 1}`;
            slider.setAttribute('aria-label', screen.slider);
            output.htmlFor = slider.id;
            controls.append(node('span', screen.slider), slider, output);
            const picture = node('div', '', 'rp-picture');
            const paint = pictures[state.screen](picture, state, change => section.update(change));
            root.append(controls, picture);
            const read = () => values ? values[Number(slider.value)] : Number(slider.value);
            function update() {
                const value = read();
                output.textContent = `${screen.slider}: ${value}${screen.unit || ''}`;
                slider.setAttribute('aria-valuetext', output.textContent);
                paint(value);
            }
            slider.addEventListener('input', () => {
                section.update(state => { state.sliders[state.screen] = read(); });
                update();
            });
            update();
            if (screen.callout) root.append(node('p', screen.callout, 'rp-callout'));
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen < state.furthestScreen) {
                api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            } else if (state.finished) {
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', { label: 'Next idea', onClick: () => showScreen(state.screen + 1) });
            }
            syncHash();
        }

        screens.forEach((screen, index) => {
            api.registerHashRoute(`learn-${index + 1}`, () => {
                api.goToSection('explanation', { moveFocus: false });
                showScreen(Math.min(index, state.furthestScreen));
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        const requested = screens.findIndex((screen, index) => initialHash === `#learn-${index + 1}`);
        if (requested >= 0) showScreen(Math.min(requested, state.furthestScreen));
        else render();
    }

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295) }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function reportProgress() {
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? examples.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, examples.length);
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === examples.length;
            });
            render();
        }

        function drawExample(container, index, readOnly) {
            const example = examples[index];
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...S.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)), sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback() {
                    reportProgress();
                },
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === examples.length ? 'Your completed examples' : `Example ${state.screen + 1}`;
            root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) {
                examples.forEach((example, index) => {
                    const completed = document.createElement('article');
                    root.append(completed);
                    drawExample(completed, index, true);
                });
                api.clearSectionAction('interactive');
            } else {
                const readOnly = state.screen < state.index;
                drawExample(root, state.screen, readOnly);
                if (readOnly) api.setSectionAction('interactive', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        for (let index = 0; index <= examples.length; index++) {
            api.registerHashRoute(`try-it-${index + 1}`, () => {
                if (!api.goToSection('interactive', { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(index, state.furthestScreen));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = Array.from({ length: examples.length + 1 }, (_, index) => index)
            .find(index => initialHash === `#try-it-${index + 1}`);
        if (requested !== undefined && api.goToSection('interactive', { moveFocus: false })) {
            showScreen(Math.min(requested, state.furthestScreen));
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
