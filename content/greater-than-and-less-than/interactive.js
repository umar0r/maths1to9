(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function mouthSign(sign) {
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('viewBox', '0 0 60 68');
        svg.setAttribute('class', 'pv-mouth');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', sign === '>' ? 'is greater than' : 'is less than');

        const drawing = document.createElementNS(svgNs, 'g');
        if (sign === '<') drawing.setAttribute('transform', 'translate(60 0) scale(-1 1)');

        const along = [0.838, 0.545];
        const inward = [-0.545, 0.838];
        const point = (forward, inside) => [
            10 + along[0] * forward + inward[0] * inside,
            8 + along[1] * forward + inward[1] * inside
        ];
        for (const distance of [6, 15, 24]) {
            const corners = [point(distance - 4, 5), point(distance, 13), point(distance + 4, 5)];
            for (const flip of [false, true]) {
                const tooth = document.createElementNS(svgNs, 'polygon');
                tooth.setAttribute('points', corners.map(([x, y]) => `${x.toFixed(1)},${(flip ? 68 - y : y).toFixed(1)}`).join(' '));
                drawing.append(tooth);
            }
        }

        const jaws = document.createElementNS(svgNs, 'polyline');
        jaws.setAttribute('points', '10,8 50,34 10,60');
        drawing.append(jaws);
        svg.append(drawing);
        return svg;
    }

    function mountLearn() {
        const root = document.createElement('article');
        const heading = element('h3', 'The wide side of the sign faces the bigger number.', 'lesson-section__title');
        heading.setAttribute('data-screen-heading', '');
        root.append(heading, element('p', 'Think of the sign as an open mouth. It always wants to eat the bigger number.'));
        const cards = element('div', '', 'pv-sign-cards');
        for (const [said, left, sign, right] of [['0.80 is greater than 0.75', '0.80', '>', '0.75'], ['0.75 is less than 0.80', '0.75', '<', '0.80']]) {
            const card = element('div', '', 'pv-sign-card');
            const written = element('strong');
            written.append(left, mouthSign(sign), right);
            card.append(element('span', said), written);
            cards.append(card);
        }
        root.append(cards);

        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') {
                api.setSlideHash('learn-1', { replace: true });
            }
        }
        api.registerHashRoute('learn-1', () => api.goToSection('explanation', { moveFocus: false }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        api.setSectionAction('explanation', {
            label: 'Next',
            onClick: () => {
                sectionEvent('explanation', 'complete');
                api.goToSection('interactive', { unlock: true });
            }
        });
        syncHash();
    }

    function tapCardsWidget(numbers, target, { inRow = false, tip = 'Add zeros so both have the same number of digits, then compare.' } = {}) {
        const isBelow = number => Number(number) < Number(target);
        const expected = numbers.filter(isBelow);
        const normalise = value => Array.isArray(value) ? [...value] : [];
        return {
            isEmpty(value) { return normalise(value).length === 0; },
            answerText(value) { return normalise(value).join(', '); },
            mark(value) {
                const chosen = normalise(value);
                const wrongPick = chosen.find(number => !isBelow(number));
                const missed = expected.find(number => !chosen.includes(number));
                if (wrongPick !== undefined) {
                    if (wrongPick === target) {
                        return { correct: false, feedback: `${target} is not less than ${target}. They are the same number.` };
                    }
                    if (Number(wrongPick) === Number(target)) {
                        return { correct: false, feedback: `${wrongPick} is the same as ${target}, so it is not less than ${target}.` };
                    }
                    return { correct: false, feedback: `${wrongPick} is bigger than ${target}. ${tip}` };
                }
                if (missed !== undefined) {
                    return { correct: false, feedback: `${missed} is less than ${target} too. ${tip}` };
                }
                return { correct: true, feedback: `${expected.slice(0, -1).join(', ')} and ${expected.at(-1)} are all less than ${target}.` };
            },
            render(host, { value, editable, onChange }) {
                let chosen = normalise(value), canEdit = editable;
                const grid = element('div', '', inRow ? 'pv-tap-cards pv-tap-cards--row' : 'pv-tap-cards');
                grid.setAttribute('role', 'group');
                grid.setAttribute('aria-label', 'Numbers to choose from');
                host.append(grid);
                const cards = numbers.map(number => {
                    const card = element('button', number, 'pv-tap-card');
                    card.type = 'button';
                    card.addEventListener('click', () => {
                        if (!canEdit) return;
                        chosen = chosen.includes(number) ? chosen.filter(other => other !== number) : [...chosen, number];
                        paint();
                        onChange(chosen);
                    });
                    grid.append(card);
                    return card;
                });
                function paint() {
                    cards.forEach((card, index) => {
                        card.setAttribute('aria-pressed', String(chosen.includes(numbers[index])));
                        card.disabled = !canEdit;
                    });
                }
                paint();
                return {
                    update(next) { chosen = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { cards[0]?.focus(); }
                };
            }
        };
    }

    function priceTagsWidget() {
        const cheapest = '£1.09';
        const feedback = {
            '£1.90': '£1.90 has 9 tenths. Look for the price with the fewest tenths.',
            '£1.09': '£1.09 is cheapest. All four start with £1. Then £1.09 has 0 tenths, and the others have 1 or 9.',
            '£1.99': "That's the dearest. Look for the fewest tenths.",
            '£1.19': 'Look at the tenths first. 0 tenths is less than 1 tenth, so £1.09 is cheaper.'
        };
        return {
            isEmpty(value) { return value === null; },
            answerText(value) { return value; },
            mark(value) { return { correct: value === cheapest, feedback: feedback[value] }; },
            render(host, { value, editable, onChange }) {
                let selected = value;
                let canEdit = editable;
                let phase = 'answer';
                const grid = element('div', '', 'price-tags');
                grid.setAttribute('role', 'group');
                grid.setAttribute('aria-label', 'Price tags');
                host.append(grid);

                const tags = Object.keys(feedback).map(price => {
                    const tag = element('button', '', 'button price-tag');
                    tag.innerHTML = `<svg class="price-tag__drawing" viewBox="0 0 150 80" preserveAspectRatio="none"
                        aria-hidden="true" focusable="false">
                        <path class="price-tag__outline" d="M3 40L29 3H140Q147 3 147 10V70Q147 77 140 77H29Z"/>
                        <circle class="price-tag__hole" cx="30" cy="40" r="4"/>
                        <path class="price-tag__string" d="M30 40C22 26 11 32 14 41C17 48 25 44 30 40Z"/>
                    </svg>`;
                    tag.append(element('span', price, 'price-tag__amount'));
                    tag.type = 'button';
                    tag.addEventListener('click', () => {
                        if (!canEdit) return;
                        selected = price;
                        paint();
                        onChange(price);
                    });
                    grid.append(tag);
                    return { tag, price };
                });

                function paint() {
                    for (const { tag, price } of tags) {
                        const picked = selected === price;
                        tag.setAttribute('aria-pressed', String(picked));
                        tag.classList.toggle('is-selected', picked && phase === 'answer');
                        tag.classList.toggle('is-incorrect', picked && phase === 'wrong');
                        tag.classList.toggle('is-correct', picked && phase === 'correct');
                        tag.disabled = !canEdit;
                    }
                }

                paint();
                return {
                    update(next) {
                        selected = next.value;
                        canEdit = next.editable;
                        phase = next.phase;
                        paint();
                    },
                    focus() { tags[0].tag.focus(); }
                };
            }
        };
    }

    function balanceSignWidget() {
        const less = '<';
        const greater = '>';
        return {
            isEmpty() { return false; },
            answerText(value) { return `9 ${value ?? less} 4 + 3`; },
            mark(value) {
                return value === greater
                    ? { correct: true, feedback: '4 + 3 = 7, and 9 > 7. The heavy side goes down, and the wide side of the sign faces it.' }
                    : { correct: false, feedback: '4 + 3 = 7. Is 9 less than 7?' };
            },
            render(host, { value, editable, onChange }) {
                let sign = value ?? less;
                let canEdit = editable;
                const equation = element('div', '', 'balance-equation');
                const signButton = element('button', '', 'balance-equation__sign');
                signButton.type = 'button';
                equation.append(element('span', '9'), signButton, element('span', '4 + 3'));
                const figure = element('div', '', 'balance-figure');
                figure.innerHTML = `<svg class="balance-scale" viewBox="0 0 360 177" role="img">
                    <path class="balance-scale__stand" d="M180 57L157 153H203Z"/>
                    <path class="balance-scale__base" d="M142 155H218"/>
                    <path class="balance-scale__beam" d="M75 56H285"/>
                    <circle class="balance-scale__pivot" cx="180" cy="56" r="6"/>
                    <g class="balance-scale__pan balance-scale__pan--left">
                        <path class="balance-scale__cord" d="M75 56L10 126M75 56L140 126"/>
                        <rect class="balance-scale__weight" x="58" y="89" width="34" height="35" rx="5"/>
                        <text x="75" y="112">9</text>
                        <path class="balance-scale__tray" d="M9 126H141Q135 139 122 139H28Q15 139 9 126Z"/>
                    </g>
                    <g class="balance-scale__pan balance-scale__pan--right">
                        <path class="balance-scale__cord" d="M285 56L220 126M285 56L350 126"/>
                        <rect class="balance-scale__weight" x="255" y="93" width="28" height="31" rx="5"/>
                        <rect class="balance-scale__weight" x="287" y="97" width="28" height="27" rx="5"/>
                        <text x="269" y="114">4</text>
                        <text x="301" y="116">3</text>
                        <path class="balance-scale__tray" d="M219 126H351Q345 139 332 139H238Q225 139 219 126Z"/>
                    </g>
                </svg>`;
                host.append(equation, figure);
                const scale = figure.firstElementChild;

                function paint(tipped) {
                    signButton.textContent = sign;
                    signButton.setAttribute('aria-label', sign === less ? 'Less than' : 'Greater than');
                    signButton.disabled = !canEdit;
                    scale.classList.toggle('is-tipped', tipped);
                    scale.setAttribute('aria-label', tipped
                        ? 'The scale tips down on the left, with 9 on the left and 4 and 3 on the right.'
                        : 'A level scale with 9 on the left and 4 and 3 on the right.');
                }

                signButton.addEventListener('click', () => {
                    if (!canEdit) return;
                    sign = sign === less ? greater : less;
                    paint(false);
                    onChange(sign);
                });
                paint(false);
                return {
                    update(next) {
                        sign = next.value ?? less;
                        canEdit = next.editable;
                        paint(next.phase !== 'answer');
                    },
                    focus() { signButton.focus(); }
                };
            }
        };
    }

    function tryItExamples() {
        const lessThanWhole = { questionType: 'compare', input: 'custom', prompt: 'Tap the numbers that are less than 7.',
            widget: tapCardsWidget(['3', '4', '5', '6', '7', '8', '9'], '7', { inRow: true, tip: 'Every card to the left of 7 is less than 7.' }) };
        const cheapestDrink = {
            questionType: 'compare',
            input: 'custom',
            prompt: 'Which drink is cheapest? Tap its price tag.',
            widget: priceTagsWidget()
        };
        const balance = {
            questionType: 'compare',
            input: 'custom',
            prompt: 'Make this true. Tap the sign to turn it round.',
            widget: balanceSignWidget()
        };
        const lessThan = { questionType: 'compare', input: 'custom', prompt: 'Tap the numbers that are less than 0.8.',
            widget: tapCardsWidget(['0.75', '0.9', '0.08', '0.805', '0.79', '0.80'], '0.8') };
        return [lessThanWhole, cheapestDrink, balance, lessThan];
    }

    async function mountTryIt(root) {
        const examples = tryItExamples();
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 3,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {} }),
            upgrade: (saved, version) => version === 2 ? { ...saved, finished: false } : null
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
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
                ...example, sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback: reportProgress,
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) {
                const heading = element('h3', 'Your completed examples');
                heading.dataset.screenHeading = '';
                root.append(heading);
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
