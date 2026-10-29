(() => {
    'use strict';

    const S = window.Sequences;
    const node = (tag, text = '', className = '') => {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    };
    const sequenceText = terms => `${terms.map(S.number).join(', ')}, …`;
    const symbol = rule => ({ add: '+', subtract: '−', multiply: '×', divide: '÷' })[rule.op];
    const ruleLabel = rule => rule.op === 'two-step'
        ? rule.steps.map(step => `${symbol(step)}${step.value}`).join(', then ')
        : `${symbol(rule)}${rule.value}`;

    function drawChain(host, terms, labels = [], shown = terms.length - 1) {
        const list = node('div', '', 'sequence-chain');
        list.setAttribute('role', 'img');
        list.setAttribute('aria-label', terms.map((term, i) => `${S.number(term)}${i < shown && labels[i] ? `, ${labels[i]}, then` : ','}`).join(' '));
        if (labels.some(label => label.length > 5)) list.style.setProperty('--sequence-gap', '7rem');
        host.append(list);

        function drawRow(start, end) {
            const row = node('div', '', 'sequence-chain__row');
            for (let index = start; index <= end; index++) {
                const box = node('span', S.number(terms[index]), 'sequence-box');
                if (start > 0 && index === start) box.setAttribute('aria-hidden', 'true');
                row.append(box);
                if (index === end) continue;
                const jump = node('span', '', 'sequence-jump');
                if (index < shown && labels[index]) {
                    const label = node('span', labels[index], 'sequence-jump__label');
                    if (labels[index].startsWith('+')) label.classList.add('sequence-label--add');
                    const svg = svgElement('svg', { viewBox: '0 0 64 52', 'aria-hidden': 'true', class: 'sequence-jump__curve' });
                    svg.append(
                        svgElement('path', { d: 'M 3 45 Q 32 0 61 45' }),
                        svgElement('path', { d: 'M 51 41 L 61 45 L 60 34' })
                    );
                    jump.append(label, svg);
                }
                row.append(jump);
            }
            list.append(row);
        }

        function layout(boxesPerRow) {
            list.replaceChildren();
            if (terms.length === 1) drawRow(0, 0);
            for (let start = 0; start < terms.length - 1;) {
                const end = Math.min(terms.length - 1, start + boxesPerRow - 1);
                drawRow(start, end);
                // Repeat the boundary term on the new row, keeping every gap
                // and its curved arrow together between the same two boxes.
                start = end;
            }
        }

        layout(2);
        let previousWidth = -1;
        const observer = new ResizeObserver(entries => {
            if (!list.isConnected) { observer.disconnect(); return; }
            const width = Math.floor(entries[0].contentRect.width);
            if (width === previousWidth || width === 0) return;
            previousWidth = width;
            const boxes = Array.from(list.querySelectorAll('.sequence-box'));
            const boxWidth = Math.max(...boxes.map(box => box.getBoundingClientRect().width));
            const gapWidth = list.querySelector('.sequence-jump')?.getBoundingClientRect().width || 0;
            const count = Math.max(2, Math.floor((width + gapWidth) / (boxWidth + gapWidth)));
            layout(count);
            // Keep Learn 4's red gap labels and green multiplication labels.
            if (host.dataset.multiplyGaps === 'true') colourMultiplyGaps(host);
        });
        observer.observe(list);
    }

    function colourMultiplyGaps(host) {
        host.querySelectorAll('.sequence-jump__label').forEach(label => {
            const wrong = label.textContent.startsWith('+');
            label.classList.add(wrong ? 'sequence-label--wrong' : 'sequence-label--right');
            label.parentElement.classList.add(wrong ? 'sequence-label--wrong' : 'sequence-label--right');
        });
    }

    function drawCardVisual(host, question, correct = false) {
        host.classList.add('sequence-card-visual');
        host.replaceChildren();
        if (question.context) host.append(node('p', question.context));
        if (question.table) {
            const table = node('table', '', 'sequence-table');
            const caption = node('caption', 'Sticks in each pattern');
            table.append(caption);
            const head = node('tr');
            for (const label of ['Pattern', '1', '2', '3']) {
                const th = node('th', label);
                th.scope = label === 'Pattern' ? 'row' : 'col';
                head.append(th);
            }
            const row = node('tr');
            const label = node('th', 'Sticks');
            label.scope = 'row';
            row.append(label, ...question.terms.map(value => node('td', S.number(value))));
            table.append(head, row);
            host.append(table);
        } else if (question.showTerms !== false && question.terms.length > 1) {
            host.append(node('p', sequenceText(question.terms), 'sequence-list'));
        }
        if (correct) {
            const terms = [...question.terms];
            const target = Math.max(...(question.asked.positions || [terms.length]));
            while (terms.length < target) terms.push(S.apply(terms[terms.length - 1], question.rule));
            drawChain(host, terms, terms.slice(1).map(() => ruleLabel(question.rule)));
        }
    }

    function svgElement(tag, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
        return element;
    }

    function drawNumberLine(host, jumps) {
        const svg = svgElement('svg', { viewBox: '0 0 620 172', role: 'img', 'aria-label': `Number line from −8 to 12. ${jumps} jumps of 4 to the left from 10.` });
        const x = value => 30 + (value + 8) * 28;
        svg.append(svgElement('line', { x1: x(-8), x2: x(12), y1: 130, y2: 130, class: 'sequence-axis' }));
        for (let value = -8; value <= 12; value += 2) {
            svg.append(svgElement('line', { x1: x(value), x2: x(value), y1: 125, y2: 135, class: 'sequence-axis' }));
            const text = svgElement('text', { x: x(value), y: 157, 'text-anchor': 'middle' });
            text.textContent = S.number(value);
            svg.append(text);
        }
        for (let i = 0; i < jumps; i++) {
            const from = x(10 - 4 * i), to = x(6 - 4 * i);
            svg.append(svgElement('path', { d: `M ${from} 116 Q ${(from + to) / 2} 20 ${to} 116`, class: 'sequence-arc' }));
            svg.append(svgElement('path', { d: `M ${to - 3} 106 L ${to} 116 L ${to + 10} 112`, class: 'sequence-arc' }));
            const label = svgElement('text', { x: (from + to) / 2, y: 57, 'text-anchor': 'middle' });
            label.textContent = '−4';
            svg.append(label);
        }
        host.append(svg);
    }

    function drawLearnPicture(host, index, value) {
        host.replaceChildren();
        if (index === 0) {
            const rows = node('ol', '', 'sequence-seat-rows');
            [3, 7, 11, 15].slice(0, value).forEach(count => {
                const row = node('li', '', 'sequence-seat-row');
                const seats = node('span', '', 'sequence-seats');
                seats.setAttribute('aria-hidden', 'true');
                for (let seat = 0; seat < count; seat++) seats.append(node('i', '', 'sequence-seat'));
                row.append(seats, node('strong', String(count)));
                rows.append(row);
            });
            host.append(rows);
        } else if (index === 1) {
            const terms = [3, 7, 11, 15, 19].slice(0, value === 4 ? 5 : 4);
            drawChain(host, terms, ['+4', '+4', '+4', '+4'], value);
            if (value === 4) host.append(node('p', '15 + 4 = 19', 'sequence-working'));
        } else if (index === 2) {
            host.append(node('p', sequenceText(value === 4 ? [10, 6, 2, -2, -6] : [10, 6, 2, -2]), 'sequence-list'));
            drawNumberLine(host, value);
        } else if (index === 3) {
            const terms = [2, 6, 18, 54, 162].slice(0, value === 4 ? 5 : 4);
            const labels = ['+4', '+12', '', ''];
            for (let i = 0; i < value; i++) labels[i] = '×3';
            host.dataset.multiplyGaps = 'true';
            drawChain(host, terms, labels);
            colourMultiplyGaps(host);
            if (value === 4) host.append(node('p', '54 × 3 = 162', 'sequence-working'));
        } else if (index === 4) {
            const terms = [80, 40, 20, 10, 5].slice(0, value === 4 ? 5 : 4);
            drawChain(host, terms, ['÷2', '÷2', '÷2', '÷2'], value);
            if (value === 4) host.append(node('p', '10 ÷ 2 = 5', 'sequence-working'));
        } else {
            const terms = [3, 7, 15, 31].slice(0, value);
            const list = node('div', '', 'sequence-two-step');
            terms.forEach((term, i) => {
                list.append(node('span', String(term), 'sequence-box'));
                if (i < terms.length - 1) {
                    const working = node('div', '', 'sequence-two-step__working');
                    working.append(node('span', `${term} × 2 = ${term * 2}`), node('span', `${term * 2} + 1 = ${terms[i + 1]}`), node('span', '↓'));
                    list.append(working);
                }
            });
            host.append(list);
        }
    }

    Object.assign(S, { node, sequenceText, drawCardVisual, drawLearnPicture });
})();
