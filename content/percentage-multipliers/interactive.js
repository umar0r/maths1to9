(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const S = window.PercentageMultipliers;
    const screens = S.learnScreens;
    const examples = S.examples();
    const { number, pounds, power, multiplier } = S;

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

    // One bar: a grey part that is kept, a red part cut off, a dashed part
    // already gone and a green part added. Widths are shares of `scale`.
    function makeBar(host, caption = '') {
        const figure = node('figure', '', 'mx-bar');
        const title = node('figcaption', caption);
        const track = node('div', '', 'mx-track');
        track.setAttribute('role', 'img');
        const parts = {};
        for (const name of ['kept', 'rest', 'cut', 'gone', 'added']) {
            parts[name] = node('span', '', `mx-part mx-${name}`);
            track.append(parts[name]);
        }
        const note = node('p', '', 'mx-note');
        figure.append(title, track, note);
        host.append(figure);
        let shown = true;

        function widths(values, scale) {
            for (const [name, part] of Object.entries(parts)) {
                part.style.width = `${(values[name] || 0) / scale * 100}%`;
            }
            labels(values, scale);
        }

        // Only label a part wide enough to hold its text (about 32 px). A bar
        // drawn before it is on screen has no width yet, so try again next frame.
        function labels(values, scale, tries = 10) {
            const width = track.clientWidth;
            if (!width && tries > 0) {
                requestAnimationFrame(() => labels(values, scale, tries - 1));
                return;
            }
            for (const [name, part] of Object.entries(parts)) {
                const room = width * (values[name] || 0) / scale;
                part.textContent = room >= 32 ? values.labels?.[name] || '' : '';
            }
        }

        return {
            figure,
            set(values, scale, { caption: text, noteText = '', label = '' } = {}) {
                if (text !== undefined) title.textContent = text;
                note.textContent = noteText;
                track.setAttribute('aria-label', label || `${title.textContent}. ${noteText}`);
                widths(values, scale);
            },
            // A bar that appears starts as its whole amount, then the change grows.
            show(visible, values, scale, options) {
                if (visible && !shown) {
                    figure.hidden = false;
                    widths({ kept: (values.kept || 0) + (values.cut || 0), gone: values.gone }, scale);
                    void track.offsetWidth;
                }
                figure.hidden = !visible;
                shown = visible;
                if (visible) this.set(values, scale, options);
            }
        };
    }

    // "100% + 8% = 108%" → "× 1.08" → "200 × 1.08 = 216"
    function makeChain(host) {
        const chain = node('p', '', 'mx-chain');
        const percent = node('span', '', 'mx-sum');
        const pill = node('span', '', 'mx-pill');
        const result = node('span', '', 'mx-sum');
        chain.append(percent, node('span', '→', 'mx-arrow'), pill, node('span', '→', 'mx-arrow'), result);
        host.append(chain);
        return (start, percent_, direction) => {
            const kept = direction === 'up' ? 100 + percent_ : 100 - percent_;
            const m = multiplier(percent_, direction);
            percent.textContent = `100% ${direction === 'up' ? '+' : '−'} ${number(percent_)}% = ${number(kept)}%`;
            pill.textContent = `× ${number(m)}`;
            result.textContent = `${start} × ${number(m)} = ${number(Math.round(start * m * 100) / 100)}`;
        };
    }

    function lines(host, className = 'mx-working') {
        const holder = node('div', '', 'mx-lines');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(text => node('p', text, className)));
        };
    }

    // Builds a screen's picture once and returns paint(value), which only
    // changes widths and text, so the slider keeps focus while dragged.
    const pictures = [
        function shops(host) {
            const a = makeBar(host, 'Shop A: 10% off, then another 10% off at the till');
            const b = makeBar(host, 'Shop B: 20% off');
            const result = lines(host, 'mx-result');
            return step => {
                a.set(step === 1 ? { kept: 100, labels: { kept: '£100' } }
                    : step === 2 ? { kept: 90, cut: 10, labels: { kept: '£90', cut: '−£10' } }
                        : { kept: 81, cut: 9, gone: 10, labels: { kept: '£81', cut: '−£9' } }, 100, {
                    noteText: step === 1 ? '£100' : step === 2 ? '10% of £100 = £10 off. Now £90.' : '10% of £90 = £9 off. Now £81.'
                });
                b.set(step === 1 ? { kept: 100, labels: { kept: '£100' } }
                    : { kept: 80, cut: 20, labels: { kept: '£80', cut: '−£20' } }, 100, {
                    noteText: step === 1 ? '£100' : '20% of £100 = £20 off. Now £80.'
                });
                result([step === 3 ? screens[0].maths[1] : '']);
            };
        },
        function whole(host) {
            const bar = makeBar(host, '£200 = 100%');
            const working = lines(host);
            return percent => {
                const m = percent / 100;
                bar.set({ kept: percent, rest: 100 - percent, labels: { kept: `${percent}%` } }, 100, {
                    noteText: `${percent}% of £200`
                });
                working([`${percent}% = ${number(m)}`, `200 × ${number(m)} = ${number(200 * m)}`,
                    percent === 100 ? 'Multiplying by 1 keeps all of it.' : '']);
            };
        },
        function increase(host) {
            const bar = makeBar(host, '£200 = 100%');
            const chain = makeChain(host);
            return percent => {
                bar.set({ kept: 100, added: percent, labels: { kept: '100%', added: `+${percent}%` } }, 150, {
                    noteText: `£200 goes up by ${percent}%`
                });
                chain(200, percent, 'up');
            };
        },
        function decrease(host) {
            const bar = makeBar(host, '£200 = 100%');
            const chain = makeChain(host);
            return percent => {
                bar.set({ kept: 100 - percent, cut: percent, labels: { kept: `${100 - percent}%`, cut: `−${percent}%` } }, 150, {
                    noteText: `£200 goes down by ${percent}%`
                });
                chain(200, percent, 'down');
            };
        },
        function method(host, state, save) {
            const toggle = node('div', '', 'mx-toggle');
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
            const bar = makeBar(host, '£240 = 100%');
            const steps = node('ol', '', 'mx-steps');
            const items = screens[4].steps.map(step => {
                const item = node('li');
                item.append(node('strong', step.title), document.createTextNode(step.text ? ` ${step.text}` : ''));
                const maths = node('span', '', 'mx-step-maths');
                item.append(maths);
                steps.append(item);
                return maths;
            });
            host.append(steps);
            const check = node('p', '', 'mx-check');
            host.append(check);
            let current = 12.5;
            function paint(percent = current) {
                current = percent;
                const direction = state.direction;
                const kept = direction === 'up' ? 100 + percent : 100 - percent;
                const m = multiplier(percent, direction);
                buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.direction === direction)));
                bar.set(direction === 'up'
                    ? { kept: 100, added: percent, labels: { kept: '100%', added: `+${number(percent)}%` } }
                    : { kept: 100 - percent, cut: percent, labels: { kept: `${number(kept)}%`, cut: `−${number(percent)}%` } }, 150, {
                    noteText: `£240 goes ${direction} by ${number(percent)}%`
                });
                items[0].textContent = `100% ${direction === 'up' ? '+' : '−'} ${number(percent)}% = ${number(kept)}%`;
                items[1].textContent = `${number(kept)}% → ${number(m)}`;
                items[2].textContent = `240 × ${number(m)} = ${number(Math.round(240 * m * 100) / 100)}`;
                check.textContent = direction === 'up'
                    ? 'Up, so the answer must be more than £240 ✓' : 'Down, so the answer must be less than £240 ✓';
            }
            buttons.forEach(button => button.addEventListener('click', () => {
                save(state => { state.direction = button.dataset.direction; });
                paint();
            }));
            return paint;
        },
        function years(host) {
            const values = Array.from({ length: 6 }, (_, year) => 12000 * 0.85 ** year);
            const bars = values.map(() => makeBar(host));
            const working = lines(host);
            return count => {
                bars.forEach((bar, year) => {
                    const value = values[year];
                    const label = year === 0 ? `Start: £12 000` : `Year ${year}: ${pounds(value)}${year > 3 ? ' (to the nearest penny)' : ''}`;
                    bar.show(year <= count, year === 0 ? { kept: value, labels: { kept: '£12 000' } }
                        : { kept: value, cut: values[year - 1] - value, labels: { cut: '−15%' } }, 12000, {
                        caption: label, label
                    });
                });
                const times = Array(count).fill('0.85').join(' × ');
                working(count === 0 ? ['£12 000, no change yet']
                    : count === 1 ? [`12 000 × 0.85 = ${pounds(values[1])}`]
                        : [`12 000 × ${times}`, `= 12 000 × ${power(0.85, count)} = ${pounds(values[count])}`]);
            };
        },
        function coat(host) {
            const bars = [makeBar(host), makeBar(host), makeBar(host)];
            const working = lines(host);
            return step => {
                bars[0].show(true, { kept: 500, labels: { kept: '£500' } }, 500, { caption: 'Start: £500' });
                bars[1].show(step >= 2, { kept: 400, cut: 100, labels: { kept: '£400', cut: '−20%' } }, 500, { caption: 'Down 20%: £400' });
                bars[2].show(step >= 3, { kept: 400, added: 40, labels: { kept: '£400', added: '+10%' } }, 500, { caption: 'Up 10%: £440' });
                working([step >= 2 ? '500 × 0.8 = 400' : '', step >= 3 ? '400 × 1.1 = 440' : '', step >= 3 ? '500 × 0.8 × 1.1 = £440' : '']);
            };
        }
    ];

    async function mountLearn() {
        const root = node('article', '', 'mx-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                sliders: screens.map(screen => screen.start), direction: 'up'
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

        function paragraph(text) {
            const element = node('p');
            const parts = text.split('the multiplier.');
            element.append(document.createTextNode(parts[0]));
            if (parts.length > 1) {
                element.append(document.createTextNode('the '), node('strong', 'multiplier'), document.createTextNode(`.${parts[1]}`));
            }
            return element;
        }

        function render() {
            root.replaceChildren();
            const screen = screens[state.screen];
            const heading = node('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            for (const line of screen.lines) root.append(paragraph(line));
            const controls = node('label', '', 'mx-slider');
            const slider = node('input');
            const output = node('output');
            Object.assign(slider, {
                type: 'range', min: String(screen.min), max: String(screen.max), step: String(screen.step),
                value: String(state.sliders[state.screen]), id: `mx-slider-${state.screen + 1}`
            });
            slider.setAttribute('aria-label', screen.slider);
            output.htmlFor = slider.id;
            controls.append(node('span', screen.slider), slider, output);
            const picture = node('div', '', 'mx-picture');
            const paint = pictures[state.screen](picture, state, change => section.update(change));
            root.append(controls, picture);
            const unit = [1, 2, 3, 4].includes(state.screen) ? '%' : '';
            function update() {
                const value = Number(slider.value);
                output.textContent = `${screen.slider}: ${number(value)}${unit}`;
                paint(value);
            }
            slider.addEventListener('input', () => {
                section.update(state => { state.sliders[state.screen] = Number(slider.value); });
                update();
            });
            update();
            if (screen.callout) root.append(node('p', screen.callout, 'mx-callout'));
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
                onFeedback(result) {
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
