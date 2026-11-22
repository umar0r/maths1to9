(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const screens = [
        {
            title: 'We multiply and divide decimals to work out costs and share things out.'
        },
        {
            title: 'To multiply decimals, first count the digits after each point.',
            line: 'Tap each digit that comes after a point.'
        },
        {
            title: 'Then put the point back, the same number of digits from the end.',
            line: '24 × 3 = 72. The answer needs 2 digits after the point.'
        },
        {
            title: 'When you divide by a whole number, the point goes straight up.',
            line: '84 ÷ 3 = 28, so 8.4 ÷ 3 has the digits 2 and 8.'
        },
        {
            title: 'To divide by a decimal, first make it a whole number.',
            line: 'Multiply both numbers by 10. The answer stays the same.'
        }
    ];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    }

    function drawUsePictures(host) {
        // Same frames, sizes and header colour as Adding and subtracting decimals.
        const headerFill = 'color-mix(in srgb, var(--primary) 25%, #fff)';
        const frame = '<rect x="9" y="9" width="162" height="132" rx="6" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        const header = title => `<path d="M15 9H165Q171 9 171 15V41H9V15Q9 9 15 9Z" fill="${headerFill}"/><text x="20" y="31" font-size="18" font-weight="800">${title}</text>`;
        const receiptEdge = 'M15 9H151L171 29V136Q164.25 144 157.5 136T144 136T130.5 136T117 136T103.5 136T90 136T76.5 136T63 136T49.5 136T36 136T22.5 136T9 136V15Q9 9 15 9Z';
        const pictures = [
            {
                label: 'Money', description: 'Receipt: 3 × Notebook £1.45, Total £4.35.',
                drawing: `<defs><clipPath id="multiply-receipt-clip"><path d="${receiptEdge}"/></clipPath></defs><path d="${receiptEdge}" fill="#f8fafc"/><g clip-path="url(#multiply-receipt-clip)">${header('Receipt')}</g><path d="M151 9V29H171Z" fill="var(--primary-dark)"/><text x="20" y="77" font-size="13.5">3 × Notebook £1.45</text><path d="M20 99H160" stroke="#94a3b8"/><text x="20" y="119" font-size="17" font-weight="800">Total</text><text x="160" y="119" text-anchor="end" font-size="17" font-weight="800">£4.35</text><path d="${receiptEdge}" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>`
            },
            {
                label: 'Sharing', description: 'Bill: £48.60, Shared by 4, £12.15 each.',
                drawing: `<rect x="9" y="9" width="162" height="132" rx="6" fill="#f8fafc"/>${header('Bill')}<text x="90" y="72" text-anchor="middle" font-size="25" font-weight="800">£48.60</text><text x="90" y="99" text-anchor="middle" font-size="17">Shared by 4</text><text x="90" y="124" text-anchor="middle" font-size="19" font-weight="800">£12.15 each</text>${frame}`
            },
            {
                label: 'Measuring', description: 'A 2.4 m plank cut into 3 equal pieces, each 0.8 m.',
                drawing: `<rect x="9" y="9" width="162" height="132" rx="6" fill="#f8fafc"/>${header('Plank')}<text x="90" y="65" text-anchor="middle" font-size="18">2.4 m</text><rect x="23" y="76" width="134" height="22" fill="#f6dfb6" stroke="#64748b"/><path d="M68 76V98M112 76V98" stroke="#64748b" stroke-dasharray="3 2"/><text x="90" y="116" text-anchor="middle" font-size="15">3 equal pieces</text><text x="90" y="134" text-anchor="middle" font-size="16">0.8 m each</text>${frame}`
            },
            {
                label: 'Fuel', description: 'Petrol pump: 20 litres at £1.48 per litre, £29.60.',
                drawing: `<rect x="9" y="9" width="162" height="132" rx="6" fill="#f8fafc"/>${header('Petrol pump')}<text x="90" y="70" text-anchor="middle" font-size="18">20 litres</text><text x="90" y="96" text-anchor="middle" font-size="16">£1.48 per litre</text><text x="90" y="125" text-anchor="middle" font-size="23" font-weight="800">£29.60</text>${frame}`
            }
        ];
        const grid = element('div', '', 'decimal-uses');
        pictures.forEach(picture => {
            const figure = element('figure'), drawing = element('div', '', 'decimal-use-picture');
            drawing.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150" fill="var(--text)" font-family="inherit" role="img" aria-label="${picture.description}">${picture.drawing}</svg>`;
            figure.append(drawing, element('figcaption', picture.label));
            grid.append(figure);
        });
        host.append(grid);
    }

    function button(text, label, action, className = 'decimal-gap') {
        const node = element('button', text, className);
        node.type = 'button';
        node.setAttribute('aria-label', label);
        node.addEventListener('click', () => action(node));
        return node;
    }

    // A quadratic curved hop, as on the Negative numbers line. SVG coordinates
    // follow the real digit positions so phone layouts keep the counts clear.
    function drawHops(host, hops) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('decimal-hops');
        svg.setAttribute('aria-hidden', 'true');
        host.append(svg);
        function draw() {
            if (!host.isConnected) return;
            const origin = host.getBoundingClientRect();
            svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
            svg.replaceChildren();
            hops.forEach(({ from, to, label }) => {
                const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
                const x1 = a.left + a.width / 2 - origin.left;
                const x2 = b.right - origin.left;
                const y = b.top - origin.top - 3;
                const path = document.createElementNS(svg.namespaceURI, 'path');
                path.setAttribute('d', `M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - 35} ${x2} ${y}`);
                const count = document.createElementNS(svg.namespaceURI, 'text');
                count.setAttribute('x', (x1 + x2) / 2);
                count.setAttribute('y', y - 24);
                count.textContent = label;
                svg.append(path, count);
            });
        }
        const observer = new ResizeObserver(draw);
        observer.observe(host);
        requestAnimationFrame(draw);
        document.fonts.ready.then(draw);
        return () => observer.disconnect();
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = element('article');
        document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('explanation', {
            version: 2,
            initial: () => ({ screen: 0, furthestScreen: 0, tapped: [], gaps: {}, moves: 0, feedback: {} }),
            upgrade: () => null
        });
        const state = section.state;
        let dispose = () => {};
        function done() {
            return state.screen === 0 || (state.screen === 1 ? state.tapped.length === 2
                : state.screen === 4 ? state.moves === 2 : state.gaps[state.screen] === (state.screen === 2 ? 0 : 1));
        }
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
            });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }
        function feedback(text, correct = false) {
            section.update(state => { state.feedback[state.screen] = { text, correct }; });
            render();
        }
        function chooseGap(index) {
            if (done()) return;
            section.update(state => { state.gaps[state.screen] = index; });
            if (state.screen === 2) {
                feedback(index === 0 ? "So 2.4 × 0.3 = 0.72. Put a 0 in front when there's no whole number."
                    : index === 1 ? 'That gives 7.2, with only 1 digit after the point. Count 2 digits from the end.'
                        : 'That gives 72, with no digits after the point. Count 2 digits from the end.', index === 0);
            } else {
                feedback(index === 1 ? '8.4 ÷ 3 = 2.8. The point sits right above the point in 8.4.'
                    : `That gives ${index === 0 ? '0.28' : '28'}. Put the point right above the point in 8.4.`, index === 1);
            }
        }
        function render() {
            dispose();
            dispose = () => {};
            root.replaceChildren();
            const screen = screens[state.screen], complete = done();
            const heading = element('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (screen.line) root.append(element('p', screen.line));
            if (state.screen === 0) drawUsePictures(root);
            if (state.screen === 1) drawCount();
            if (state.screen === 2) drawProduct();
            if (state.screen === 3) drawDivision();
            if (state.screen === 4) drawScale();
            const saved = state.feedback[state.screen];
            if (saved) root.append(window.Maths1to9LessonEngine.createFeedback('explanation', saved));
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            api.setSectionReset('explanation', state.screen > 0 ? () => {
                section.update(state => {
                    if (state.screen === 1) state.tapped = [];
                    else if (state.screen === 4) state.moves = 0;
                    else delete state.gaps[state.screen];
                    delete state.feedback[state.screen];
                });
                render();
            } : null);
            if (state.screen === 4 && complete) api.completeSection('explanation');
            // Stages 2 and 3 are deliberately unbuilt. Keep their sections locked.
            api.setSectionAction('explanation', {
                label: state.screen === 4 ? 'Continue' : 'Next',
                disabled: !complete || state.screen === 4,
                onClick: () => showScreen(state.screen + 1)
            });
            syncHash();
        }
        function drawCount() {
            const picture = element('div', '', 'decimal-number-picture');
            const row = element('div', '', 'decimal-big-number');
            const hops = [];
            ['2.4', '0.3'].forEach((number, factor) => {
                if (factor) row.append(element('span', '×', 'decimal-times'));
                const digits = [];
                [...number].forEach((digit, index) => {
                    const id = `${factor}:${index}`;
                    const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                        : button(digit, `Digit ${digit} in ${number}`, target => {
                            if (state.tapped.includes(id) || completeCount()) return;
                            if (index !== 2) {
                                target.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' },
                                    { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 180 });
                                return;
                            }
                            section.update(state => { state.tapped.push(id); });
                            if (completeCount()) feedback('There are 2 digits after the points. Take the points out and work out 24 × 3 = 72.', true);
                            else render();
                        }, 'decimal-digit');
                    if (digit !== '.') node.setAttribute('aria-pressed', String(state.tapped.includes(id)));
                    digits.push(node);
                    row.append(node);
                });
                const count = state.tapped.indexOf(`${factor}:2`);
                if (count >= 0) hops.push({ from: digits[1], to: digits[2], label: String(count + 1) });
            });
            picture.append(row);
            root.append(picture);
            dispose = drawHops(picture, hops);
        }
        function completeCount() { return state.tapped.length === 2; }
        function drawProduct() {
            const picture = element('div', '', 'decimal-number-picture');
            const row = element('div', '', 'decimal-big-number');
            const correct = state.gaps[2] === 0;
            if (correct) row.append(element('span', '0', 'decimal-digit'));
            row.classList.toggle('is-complete', correct);
            const gaps = [], digits = [];
            for (let index = 0; index <= 2; index++) {
                const selected = state.gaps[2] === index;
                const gap = button(selected ? '.' : '', `Put the point ${['before 7', 'between 7 and 2', 'after 2'][index]}`, () => chooseGap(index));
                gap.classList.toggle('is-placed', selected);
                gap.disabled = correct;
                gaps.push(gap);
                row.append(gap);
                if (index < 2) {
                    const digit = element('span', '72'[index], 'decimal-digit');
                    digits.push(digit);
                    row.append(digit);
                }
            }
            picture.append(row);
            root.append(picture);
            if (correct) dispose = drawHops(picture, [
                { from: gaps[0], to: digits[0], label: '1' },
                { from: gaps[1], to: digits[1], label: '2' }
            ]);
        }
        function drawDivision() {
            const chart = element('div', '', 'digit-card-chart decimal-division-picture');
            const chosen = state.gaps[3], correct = chosen === 1;
            chart.classList.toggle('is-complete', correct);
            const gap = button(chosen === 1 ? '.' : '', 'Put the point between 2 and 8', () => chooseGap(1));
            gap.classList.toggle('is-placed', chosen === 1);
            gap.disabled = correct;
            const built = window.Maths1to9DigitCards.shortDivision({
                label: '8.4 divided by 3', divisor: '3', dividend: '8.4', answer: { point: gap }, carries: { '2': '2' }
            });
            chart.append(built.table);
            built.slots.forEach((slot, index) => {
                slot.element.textContent = '28'[index];
                slot.element.classList.add('is-filled');
                slot.element.disabled = true;
            });
            const before = button(chosen === 0 ? '.' : '', 'Put the point before 2', () => chooseGap(0), 'decimal-gap decimal-division-gap');
            const after = button(chosen === 2 ? '.' : '', 'Put the point after 8', () => chooseGap(2), 'decimal-gap decimal-division-gap');
            before.disabled = after.disabled = correct;
            chart.append(before, after);
            root.append(chart);
            function position() {
                if (!chart.isConnected) return;
                const origin = chart.getBoundingClientRect();
                const first = built.cells.answer['0'].getBoundingClientRect();
                const last = built.cells.answer['2'].getBoundingClientRect();
                before.style.left = `${first.left - origin.left - 20}px`;
                after.style.left = `${last.right - origin.left - 20}px`;
                before.style.top = after.style.top = `${first.top - origin.top + first.height / 2 - 22}px`;
            }
            const observer = new ResizeObserver(position);
            observer.observe(chart);
            requestAnimationFrame(position);
            dispose = () => observer.disconnect();
        }
        function drawScale() {
            const fraction = element('div', '', 'decimal-fraction');
            const hops = [];
            ['11.07', '0.9'].forEach((number, rowIndex) => {
                const moved = rowIndex === 0 ? state.moves === 2 : state.moves >= 1;
                const active = rowIndex === 1 ? state.moves === 0 : state.moves === 1;
                const row = element('div', '', 'decimal-fraction-row');
                const digits = number.replace('.', '');
                const original = number.indexOf('.');
                const target = original + 1;
                const digitNodes = [], gapNodes = [];
                for (let index = 0; index <= digits.length; index++) {
                    const pointHere = index === (moved ? target : original);
                    const gap = button(pointHere && !(moved && rowIndex === 1) ? '.' : '',
                        `Move the point in ${number} to gap ${index + 1}`, () => {
                            if (!active) return;
                            if (index !== target) {
                                feedback('Move it one place to the right, the same as the other number.');
                                return;
                            }
                            section.update(state => { state.moves++; delete state.feedback[4]; });
                            if (state.moves === 2) feedback('11.07 ÷ 0.9 is the same as 110.7 ÷ 9. Now you can use short division.', true);
                            else render();
                        });
                    gap.disabled = !active;
                    gap.classList.toggle('is-placed', pointHere);
                    gapNodes.push(gap);
                    row.append(gap);
                    if (index < digits.length) {
                        const digit = element('span', moved && rowIndex === 1 && index === 0 ? '' : digits[index], 'decimal-digit');
                        digitNodes.push(digit);
                        row.append(digit);
                    }
                }
                // Hide empty columns once 0.9 has become 9, so it stays centred.
                if (moved && rowIndex === 1) row.classList.add('is-nine');
                fraction.append(row);
                if (moved) hops.push({ from: gapNodes[original], to: digitNodes[original], label: '× 10' });
            });
            root.append(fraction);
            if (state.moves < 2) root.append(element('p', state.moves === 0
                ? 'Move the point in 0.9 one place to the right.' : 'Now move the point in 11.07 one place too.', 'decimal-learn-instruction'));
            dispose = drawHops(fraction, hops);
        }
        screens.forEach((screen, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            api.goToSection('explanation', { moveFocus: false });
            showScreen(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        const requested = screens.findIndex((screen, index) => initialHash === `#learn-${index + 1}`);
        if (requested >= 0) showScreen(Math.min(requested, state.furthestScreen));
        else render();
    }

    // Retain four sections while the later stages await their own builds.
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = () => sectionEvent('interactive', 'gate');
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
