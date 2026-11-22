(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const screens = [
        {
            title: 'We multiply and divide decimals to work out costs and share things out.'
        },
        {
            title: 'To multiply decimals, take the points out, then put them back at the end.'
        },
        {
            title: 'When you divide by a whole number, the point goes straight up.'
        },
        {
            title: 'To divide by a decimal, times both numbers by 10 first.'
        }
    ];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function downArrow() {
        const arrow = element('div', '↓', 'decimal-learn-arrow');
        arrow.setAttribute('aria-hidden', 'true');
        return arrow;
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
            if (!host.isConnected) { observer.disconnect(); return; }
            const origin = host.getBoundingClientRect();
            svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
            svg.replaceChildren();
            hops.forEach(({ from, to, label, startEdge }) => {
                const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
                const x1 = (startEdge ? a.left : a.left + a.width / 2) - origin.left;
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

    // A hop over one digit, edge to edge, so neighbouring hops meet end to end
    // instead of crossing over each other.
    function digitHop(digit, label) {
        return { from: digit, to: digit, label, startEdge: true };
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = element('article');
        document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('explanation', {
            version: 4,
            initial: () => ({ screen: 0, furthestScreen: 0 }),
            upgrade: () => null
        });
        const state = section.state;
        let dispose = () => {};
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
        // Learn 2: the whole method as a finished picture, nothing to tap.
        function drawMultiplyPicture() {
            const picture = element('div', '', 'decimal-learn-steps');
            const factorsRow = element('div', '', 'decimal-learn-step decimal-learn-step--hops');
            const factors = element('div', '', 'decimal-big-number');
            const counted = [];
            ['2.4', '0.3'].forEach((number, factor) => {
                if (factor) factors.append(element('span', '×', 'decimal-times'));
                const characters = [];
                [...number].forEach(digit => {
                    const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                        : element('span', digit, 'decimal-digit');
                    characters.push(node);
                    factors.append(node);
                });
                counted.push(digitHop(characters[2], String(factor + 1)));
            });
            factorsRow.append(factors, element('p', '2 digits after the points', 'decimal-learn-note'));

            const answerRow = element('div', '', 'decimal-learn-step decimal-learn-step--hops');
            const answer = element('div', '', 'decimal-big-number');
            answer.append(element('span', '=', 'decimal-times'));
            const product = [];
            [...'0.72'].forEach(digit => {
                const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                    : element('span', digit, 'decimal-digit');
                product.push(node);
                answer.append(node);
            });
            answerRow.append(answer);

            picture.append(factorsRow, downArrow(), element('div', '24 × 3 = 72', 'decimal-big-number'),
                downArrow(), answerRow);
            root.append(picture);
            const stopFactors = drawHops(factorsRow, counted);
            const stopAnswer = drawHops(answerRow, [digitHop(product[2], '1'), digitHop(product[3], '2')]);
            dispose = () => { stopFactors(); stopAnswer(); };
        }

        // A finished bus stop: the answer is printed, not filled in.
        function showBusStop(host, { label, divisor, dividend, answer, carries }) {
            const chart = element('div', '', 'digit-card-chart decimal-division-picture');
            const built = window.Maths1to9DigitCards.shortDivision({ label, divisor, dividend, carries });
            chart.append(built.table);
            built.slots.forEach(slot => {
                const digit = answer[slot.column];
                if (digit != null) slot.element.textContent = digit;
                slot.element.classList.add('is-filled');
                slot.element.disabled = true;
            });
            host.append(chart);
        }

        // Learn 3: divide by a whole number, so the point goes straight up.
        function drawDivisionPicture() {
            showBusStop(root, {
                label: '8.4 divided by 3', divisor: '3', dividend: '8.4',
                answer: { '0': '2', '2': '8' }, carries: { '2': '2' }
            });
        }

        // Learn 4: times both numbers by 10, then divide as in Learn 3.
        function drawScalePicture() {
            const picture = element('div', '', 'decimal-learn-steps');
            const scaleRow = element('div', '', 'decimal-learn-step decimal-learn-step--hops');
            const sums = element('div', '', 'decimal-big-number');
            const hops = [];
            ['11.07', '0.9'].forEach((number, term) => {
                if (term) sums.append(element('span', '÷', 'decimal-times'));
                [...number].forEach(digit => {
                    const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                        : element('span', digit, 'decimal-digit');
                    const movedPoint = (term === 0 && digit === '0') || (term === 1 && digit === '9');
                    if (movedPoint) hops.push(digitHop(node, '× 10'));
                    sums.append(node);
                });
            });
            scaleRow.append(sums);
            const scaled = element('div', '', 'decimal-big-number');
            [...'110.7'].forEach(digit => scaled.append(digit === '.'
                ? element('span', '.', 'decimal-number-point')
                : element('span', digit, 'decimal-digit')));
            scaled.append(element('span', '÷', 'decimal-times'), element('span', '9', 'decimal-digit'));
            picture.append(scaleRow, downArrow(), scaled, downArrow());
            root.append(picture);
            dispose = drawHops(scaleRow, hops);
            showBusStop(picture, {
                label: '110.7 divided by 9', divisor: '9', dividend: '110.7',
                answer: { '1': '1', '2': '2', '4': '3' }, carries: { '2': '2', '4': '2' }
            });
        }
        function render() {
            dispose();
            dispose = () => {};
            root.replaceChildren();
            const screen = screens[state.screen];
            const heading = element('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (screen.line) root.append(element('p', screen.line));
            if (state.screen === 0) drawUsePictures(root);
            if (state.screen === 1) drawMultiplyPicture();
            if (state.screen === 2) drawDivisionPicture();
            if (state.screen === 3) drawScalePicture();
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            api.setSectionReset('explanation', null);
            if (state.screen === screens.length - 1) api.completeSection('explanation');
            api.setSectionAction('explanation', {
                label: state.screen === screens.length - 1 ? 'Continue' : 'Next',
                disabled: false,
                onClick: () => state.screen === screens.length - 1 ? api.continueSection() : showScreen(state.screen + 1)
            });
            syncHash();
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

    window.DecimalCalculations = { element, button, drawHops };
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
