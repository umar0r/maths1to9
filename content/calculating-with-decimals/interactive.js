(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const screens = [
        {
            title: 'We multiply and divide decimals to work out costs and share things out.'
        },
        {
            title: 'To multiply decimals, count how many digits there are after the decimal points.'
        },
        {
            title: 'To divide by a whole number, count how many digits there are after the decimal point.'
        },
        {
            title: 'To divide by a decimal, count how many digits there are after the decimal points.'
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

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = element('article');
        document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('explanation', {
            version: 10,
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
        // A textbook hop: one small arch over one digit, from one gap to the next.
        // Both ends sit just above the digit tops, and a small open head points
        // down into the gap it lands in. Each number carries one label over its
        // group of hops.
        function drawArrows(host, hops) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('decimal-hops');
            svg.setAttribute('aria-hidden', 'true');
            host.append(svg);
            function draw() {
                if (!host.isConnected) { observer.disconnect(); return; }
                const origin = host.getBoundingClientRect();
                svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
                svg.replaceChildren();
                const row = host.querySelector('.decimal-digit')?.getBoundingClientRect();
                if (!row) return;
                const y = row.top - origin.top - 2;
                const rise = 22;
                const place = ({ node, side }) => {
                    const box = node.getBoundingClientRect();
                    const x = side === 'centre' ? box.left + box.width / 2
                        : side === 'left' ? box.left : box.right;
                    return x - origin.left;
                };
                const groups = new Map();
                hops.forEach(({ from, to, label, group, head }) => {
                    const x1 = place(from), x2 = place(to);
                    const path = document.createElementNS(svg.namespaceURI, 'path');
                    // Vertical tangents at both ends keep the hop the same on each side.
                    // Only the hop that finishes a group carries an open head.
                    path.setAttribute('d', `M ${x1} ${y} C ${x1} ${y - rise} ${x2} ${y - rise} ${x2} ${y}`
                        + (head ? ` M ${x2 - 5} ${y - 7} L ${x2} ${y} L ${x2 + 5} ${y - 7}` : ''));
                    svg.append(path);
                    // Two numbers on one row can share a count, so groups may be named.
                    const key = group ?? label;
                    const span = groups.get(key) || { min: Infinity, max: -Infinity, label };
                    groups.set(key, { min: Math.min(span.min, x1, x2), max: Math.max(span.max, x1, x2), label: span.label });
                });
                groups.forEach(({ min, max, label }) => {
                    const count = document.createElementNS(svg.namespaceURI, 'text');
                    count.setAttribute('x', (min + max) / 2);
                    count.setAttribute('y', y - rise * .75 - 6);
                    count.textContent = label;
                    svg.append(count);
                });
            }
            const observer = new ResizeObserver(draw);
            observer.observe(host);
            requestAnimationFrame(draw);
            document.fonts.ready.then(draw);
            return () => observer.disconnect();
        }

        // Learn 2: count the digits, multiply, then move the point back.
        function drawMultiplyPicture() {
            const picture = element('div', '', 'decimal-learn-steps');
            const factorsRow = element('div', '', 'decimal-learn-step decimal-learn-step--arch');
            const factors = element('div', '', 'decimal-big-number');
            const digits = [];
            ['0.24', '0.003'].forEach((number, factor) => {
                if (factor) factors.append(element('span', '\u00d7', 'decimal-times'));
                [...number].forEach(digit => {
                    const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                        : element('span', digit, 'decimal-digit');
                    digits.push(node);
                    factors.append(node);
                });
            });
            factorsRow.append(factors);
            const answerStep = element('div', '', 'decimal-learn-step decimal-learn-step--arch');
            const answer = element('div', '', 'decimal-big-number');
            const product = [];
            [...'0.00072'].forEach(digit => {
                const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                    : element('span', digit, 'decimal-digit');
                product.push(node);
                answer.append(node);
            });
            answerStep.append(answer);

            picture.append(factorsRow,
                element('p', 'In this example there are 5 in total.', 'decimal-learn-line'),
                element('p', 'Take the decimal points out and use long multiplication.', 'decimal-learn-line'));
            picture.append(element('div', '24 \u00d7 3 = 72', 'decimal-big-number'));
            picture.append(
                element('p', 'Move the point back 5 digits. Put 0s in the gaps.', 'decimal-learn-line'),
                element('p', 'So 72 becomes', 'decimal-learn-line'),
                answerStep);
            root.append(picture);

            // The first number's digits after its point, and the second's.
            const firstPoint = digits.findIndex(node => node.textContent === '.');
            const secondPoint = digits.findIndex((node, index) => index > firstPoint && node.textContent === '.');
            const stopFactors = drawArrows(factorsRow, [
                { from: { node: digits[firstPoint], side: 'centre' }, to: { node: digits[firstPoint + 1], side: 'right' }, label: '2' },
                { from: { node: digits[firstPoint + 1], side: 'right' }, to: { node: digits[firstPoint + 2], side: 'right' }, label: '2', head: true },
                { from: { node: digits[secondPoint], side: 'centre' }, to: { node: digits[secondPoint + 1], side: 'right' }, label: '3' },
                { from: { node: digits[secondPoint + 1], side: 'right' }, to: { node: digits[secondPoint + 2], side: 'right' }, label: '3' },
                { from: { node: digits[secondPoint + 2], side: 'right' }, to: { node: digits[secondPoint + 3], side: 'right' }, label: '3', head: true }
            ]);
            // Back from the last digit to where the point lands, 5 places away.
            const productPoint = product.findIndex(node => node.textContent === '.');
            // Five hops back from the right, one digit each, the last landing on the point.
            const answerHops = product.slice(productPoint + 1).map((node, index) => ({
                from: { node, side: 'right' },
                to: index === 0 ? { node: product[productPoint], side: 'centre' } : { node, side: 'left' },
                label: '5',
                head: index === 0
            }));
            const stopAnswer = drawArrows(answerStep, answerHops);
            dispose = () => { stopFactors(); stopAnswer(); };
        }

        // Learn 3: count the digits, divide, then move the point back.
        function drawDivisionPicture() {
            const picture = element('div', '', 'decimal-learn-steps');
            const sumRow = element('div', '', 'decimal-learn-step decimal-learn-step--arch');
            const sum = element('div', '', 'decimal-big-number');
            const sumDigits = [];
            [...'0.24'].forEach(digit => {
                const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                    : element('span', digit, 'decimal-digit');
                sumDigits.push(node);
                sum.append(node);
            });
            sum.append(element('span', '\u00f7', 'decimal-times'), element('span', '3', 'decimal-digit'));
            sumRow.append(sum);

            const answerStep = element('div', '', 'decimal-learn-step decimal-learn-step--arch');
            const answer = element('div', '', 'decimal-big-number');
            const answerDigits = [];
            [...'0.08'].forEach(digit => {
                const node = digit === '.' ? element('span', '.', 'decimal-number-point')
                    : element('span', digit, 'decimal-digit');
                answerDigits.push(node);
                answer.append(node);
            });
            answerStep.append(answer);

            picture.append(sumRow,
                element('p', 'In this example there are 2.', 'decimal-learn-line'),
                element('p', 'Take the decimal point out and divide.', 'decimal-learn-line'),
                element('div', '24 \u00f7 3 = 8', 'decimal-big-number'),
                element('p', 'Move the point back 2 digits. Put 0s in the gaps.', 'decimal-learn-line'),
                element('p', 'So 8 becomes', 'decimal-learn-line'),
                answerStep);
            root.append(picture);

            // Two hops over the 24, one digit each, head on the last. None on the 3.
            const sumPoint = sumDigits.findIndex(node => node.textContent === '.');
            const stopSum = drawArrows(sumRow, [
                { from: { node: sumDigits[sumPoint], side: 'centre' }, to: { node: sumDigits[sumPoint + 1], side: 'right' }, label: '2' },
                { from: { node: sumDigits[sumPoint + 1], side: 'right' }, to: { node: sumDigits[sumPoint + 2], side: 'right' }, label: '2', head: true }
            ]);
            // Two hops back from the 8, the last landing on the point.
            const answerPoint = answerDigits.findIndex(node => node.textContent === '.');
            const answerHops = answerDigits.slice(answerPoint + 1).map((node, index) => ({
                from: { node, side: 'right' },
                to: index === 0 ? { node: answerDigits[answerPoint], side: 'centre' } : { node, side: 'left' },
                label: '2',
                head: index === 0
            }));
            const stopAnswer = drawArrows(answerStep, answerHops);
            dispose = () => { stopSum(); stopAnswer(); };
        }

        // Learn 4: count both numbers' digits, take them away, then divide.
        function drawScalePicture() {
            const picture = element('div', '', 'decimal-learn-steps');
            const sumRow = element('div', '', 'decimal-learn-step decimal-learn-step--arch');
            const sum = element('div', '', 'decimal-big-number');
            const build = (text, host) => [...text].map(character => {
                const node = character === '.' ? element('span', '.', 'decimal-number-point')
                    : element('span', character, 'decimal-digit');
                host.append(node);
                return node;
            });
            const dividend = build('11.07', sum);
            sum.append(element('span', '\u00f7', 'decimal-times'));
            const divisor = build('0.9', sum);
            sumRow.append(sum);

            const answerStep = element('div', '', 'decimal-learn-step decimal-learn-step--arch');
            const answer = element('div', '', 'decimal-big-number');
            const product = build('12.3', answer);
            answerStep.append(answer);

            picture.append(sumRow,
                element('p', 'In this example there are 2 and 1. When you divide, take them away: 2 \u2212 1 = 1.', 'decimal-learn-line'),
                element('p', 'Take the decimal points out and divide.', 'decimal-learn-line'),
                element('div', '1107 \u00f7 9 = 123', 'decimal-big-number'),
                element('p', 'Move the point back 1 digit.', 'decimal-learn-line'),
                element('p', 'So 123 becomes', 'decimal-learn-line'),
                answerStep);
            root.append(picture);

            // Two hops over the 07, then one over the 9; a head on each last hop.
            const dividendPoint = dividend.findIndex(node => node.textContent === '.');
            const divisorPoint = divisor.findIndex(node => node.textContent === '.');
            const stopSum = drawArrows(sumRow, [
                { from: { node: dividend[dividendPoint], side: 'centre' }, to: { node: dividend[dividendPoint + 1], side: 'right' }, label: '2' },
                { from: { node: dividend[dividendPoint + 1], side: 'right' }, to: { node: dividend[dividendPoint + 2], side: 'right' }, label: '2', head: true },
                { from: { node: divisor[divisorPoint], side: 'centre' }, to: { node: divisor[divisorPoint + 1], side: 'right' }, label: '1', head: true }
            ]);
            // Back over the 3, landing on the point.
            const answerPoint = product.findIndex(node => node.textContent === '.');
            const stopAnswer = drawArrows(answerStep, [
                { from: { node: product[answerPoint + 1], side: 'right' }, to: { node: product[answerPoint], side: 'centre' }, label: '1', head: true }
            ]);
            dispose = () => { stopSum(); stopAnswer(); };
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
