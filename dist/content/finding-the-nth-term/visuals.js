(() => {
    'use strict';

    const S = window.FindingNthTerm;
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }

    function boxes(host, terms, { selected = 0, jumps = 0, gap = 4 } = {}) {
        const row = node('div', '', 'nth-row nth-row--four');
        terms.forEach((value, i) => {
            const entry = node('div', '', `nth-entry${selected === i + 1 ? ' is-active' : ''}`);
            const arrow = node('span', i < jumps ? `+${gap} →` : '', 'find-jump');
            entry.append(arrow, node('span', S.number(value), 'nth-box'), node('span', String(i + 1), 'nth-position'));
            row.append(entry);
        });
        host.append(row);
    }

    function comparisonTable(host, rule, { filled = 4, compared = 0, sums = false } = {}) {
        const table = node('table', '', 'find-table');
        table.append(node('caption', 'Compare the times table with the sequence'));
        const head = node('tr');
        ['Position', '1', '2', '3', '4'].forEach(label => {
            const th = node('th', label);
            th.scope = label === 'Position' ? 'row' : 'col';
            head.append(th);
        });
        const top = node('tr');
        const topLabel = node('th', `${S.number(rule.d)}n`);
        topLabel.scope = 'row';
        top.append(topLabel);
        const arrows = node('tr', '', 'find-table__arrows');
        const arrowLabel = node('th', 'Change');
        arrowLabel.scope = 'row';
        arrows.append(arrowLabel);
        const bottom = node('tr');
        const bottomLabel = node('th', 'Terms');
        bottomLabel.scope = 'row';
        bottom.append(bottomLabel);
        for (let n = 1; n <= 4; n++) {
            top.append(node('td', n <= filled ? S.number(rule.d * n) : ''));
            const arrow = node('td');
            if (n <= compared) arrow.append(node('span', `${rule.c < 0 ? '−' : '+'}${Math.abs(rule.c)}`), node('span', '↓'));
            arrows.append(arrow);
            bottom.append(node('td', S.number(S.term(rule, n))));
        }
        table.append(head, top, arrows, bottom);
        host.append(table);
        if (sums) {
            const working = node('div', '', 'find-sums');
            for (let n = 1; n <= compared; n++) {
                working.append(node('p', `${S.number(rule.d * n)} + ${rule.c} = ${S.number(S.term(rule, n))}`));
            }
            host.append(working);
        }
    }

    function dots(host, rule) {
        host.append(node('p', `Pattern n has ${rule.d} rows of n red dots and ${rule.c} blue dots.`));
        const patterns = node('div', '', 'find-patterns');
        for (let n = 1; n <= 3; n++) {
            const pattern = node('figure');
            pattern.append(node('figcaption', `Pattern ${n}`));
            const red = node('div', '', 'find-dot-grid');
            red.style.setProperty('--columns', n);
            for (let i = 0; i < rule.d * n; i++) red.append(node('span', '', 'find-dot'));
            const blue = node('div', '', 'find-blue-dots');
            for (let i = 0; i < rule.c; i++) blue.append(node('span', '', 'find-dot find-dot--blue'));
            pattern.append(red, blue);
            pattern.setAttribute('role', 'img');
            pattern.setAttribute('aria-label', `Pattern ${n}: ${rule.d} rows of ${n} red dots and ${rule.c} blue dots`);
            patterns.append(pattern);
        }
        host.append(patterns);
    }

    function drawLearnPicture(host, index, value) {
        host.replaceChildren();
        if (index === 0) {
            boxes(host, [5, 9, 13, 17], { jumps: value });
        } else if (index === 5) {
            boxes(host, [5, 9, 13, 17], { selected: value });
            host.append(node('p', `4 × ${value} + 1 = ${4 * value + 1} ✓`, 'nth-working find-match'));
        } else {
            const rule = index === 3 ? { d: 3, c: -1 } : index === 4 ? { d: -3, c: 17 } : { d: 4, c: 1 };
            comparisonTable(host, rule, { filled: index === 1 ? value : 4, compared: index === 1 ? 0 : value, sums: index === 4 });
            if (index >= 2 && value === 4) host.append(node('p', S.ruleText(rule), 'nth-rule'));
        }
    }

    function drawCardVisual(host, question, correct = false) {
        host.replaceChildren();
        host.classList.add('nth-card-visual');
        if (question.dots) dots(host, question.rule);
        else if (question.table) comparisonTable(host, question.rule);
        else host.append(node('p', `${question.terms.map(S.number).join(', ')}, …`, 'nth-rule'));

    }

    Object.assign(S, { node, drawLearnPicture, drawCardVisual });
})();
