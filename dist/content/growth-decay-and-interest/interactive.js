(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const S = window.GrowthDecay;
    const screens = S.learnScreens;
    const examples = S.examples();
    const { number, pounds, power } = S;

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

    function lines(host, className = 'mx-working') {
        const holder = node('div', '', 'mx-lines');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(text => node('p', text, className)));
        };
    }

    const compound = years => 1000 * 1.05 ** years;
    const yearsOf = (count, base) => Array(count).fill(base).join(' × ');

    // Screens 2 and 3 show only each year's interest, so the pupil can
    // compare the green bars: the same for simple, growing for compound.
    function interestBars(host, interestFor, totalFor) {
        const bars = Array.from({ length: 5 }, () => makeBar(host));
        return count => bars.forEach((bar, index) => {
            const year = index + 1;
            const interest = interestFor(year);
            const caption = `Year ${year}: ${pounds(interest)} interest. Total ${pounds(totalFor(year))}.`;
            bar.show(year <= count, { added: interest, labels: { added: pounds(interest) } }, 70, { caption, label: caption });
        });
    }

    // Builds a screen's picture once and returns paint(value), which only
    // changes widths and text, so the slider keeps focus while dragged.
    const pictures = [
        function money(host) {
            const bar = makeBar(host, '£1000 in a savings account');
            const working = lines(host);
            return rate => {
                bar.set({ kept: 1000, added: 10 * rate, labels: { kept: '£1000' } }, 1100, {
                    noteText: `Grey: the money you put in. Green: £${10 * rate} interest.`
                });
                working([`${rate}% of £1000 = £${10 * rate}`, `After 1 year, you have £${1000 + 10 * rate}.`]);
            };
        },
        function simple(host) {
            const paintBars = interestBars(host, () => 50, year => 1000 + 50 * year);
            const working = lines(host);
            return count => {
                paintBars(count);
                working(count === 0 ? ['£1000, no interest yet']
                    : [`£50 × ${count} = £${50 * count} interest`, `£1000 + £${50 * count} = £${1000 + 50 * count}`]);
            };
        },
        function compoundYears(host) {
            const paintBars = interestBars(host, year => compound(year) - compound(year - 1), compound);
            const working = lines(host);
            return count => {
                paintBars(count);
                working(count === 0 ? ['£1000, no interest yet']
                    : count === 1 ? ['1000 × 1.05 = £1050']
                        : [`1000 × ${yearsOf(count, '1.05')}`, `1000 × ${power(1.05, count)} = ${pounds(compound(count))}`]);
            };
        },
        function compare(host) {
            const simpleBar = makeBar(host);
            const compoundBar = makeBar(host);
            const result = lines(host, 'mx-result');
            return count => {
                const simpleTotal = 1000 + 50 * count;
                const compoundTotal = compound(count);
                simpleBar.set({ kept: 1000, added: 50 * count, labels: { kept: '£1000', added: `+£${50 * count}` } }, 1650, {
                    caption: `Simple: £${simpleTotal}`
                });
                compoundBar.set({ kept: 1000, added: compoundTotal - 1000, labels: { kept: '£1000', added: `+${pounds(compoundTotal - 1000)}` } }, 1650, {
                    caption: `Compound: ${pounds(compoundTotal)}`
                });
                const gap = Math.round((compoundTotal - simpleTotal) * 100) / 100;
                result([gap === 0 ? "After 1 year, they're the same." : `Compound gives ${pounds(gap)} more.`]);
            };
        },
        function interestOnly(host) {
            const bar = makeBar(host, '£2000 at 8% compound interest for 3 years');
            const working = lines(host);
            return step => {
                bar.set(step === 1 ? { kept: 2519.42, labels: { kept: 'Total: £2519.42' } }
                    : { kept: 2000, added: 519.42, labels: { kept: '£2000 you put in', added: '£519.42' } }, 2600, {
                    noteText: step === 1 ? 'The total in the account after 3 years.' : 'Grey: the £2000 you put in. Green: £519.42 interest.'
                });
                working(step === 1 ? [screens[4].maths[0]] : screens[4].maths);
            };
        },
        function phone(host) {
            const values = Array.from({ length: 5 }, (_, year) => 800 * 0.8 ** year);
            const bars = values.map(() => makeBar(host));
            const working = lines(host);
            return count => {
                bars.forEach((bar, year) => {
                    const caption = year === 0 ? 'Start: £800' : `Year ${year}: ${pounds(values[year])}`;
                    bar.show(year <= count, year === 0 ? { kept: 800, labels: { kept: '£800' } }
                        : { kept: values[year], cut: values[year - 1] - values[year], labels: { cut: '−20%' } }, 800, { caption, label: caption });
                });
                working(count === 0 ? ['£800, no change yet']
                    : count === 1 ? ['800 × 0.8 = £640']
                        : [`800 × ${yearsOf(count, '0.8')}`, `800 × ${power(0.8, count)} = ${pounds(values[count])}`]);
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
            // Bold a new word where the screen names it: "This is called interest."
            const parts = text.split(/(?<=is called )(\w+)(?=\.)/);
            element.append(document.createTextNode(parts[0]));
            if (parts.length > 1) element.append(node('strong', parts[1]), document.createTextNode(parts[2]));
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
            const unit = screen.unit || '';
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
