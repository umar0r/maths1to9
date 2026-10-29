(() => {
    'use strict';

    const S = window.Fibonacci;
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }

    function row(host, terms, { pair = -1, selected = 0 } = {}) {
        const grid = node('div', '', 'fib-row');
        grid.style.setProperty('--terms', terms.length);
        grid.setAttribute('role', 'list');
        terms.forEach((value, i) => {
            const active = i === pair || i === pair + 1 && pair >= 0;
            const entry = node('div', '', `nth-entry${active ? ' is-active' : ''}`);
            entry.setAttribute('role', 'listitem');
            entry.append(node('span', value === null ? '□' : S.number(value), 'nth-box'));
            entry.append(node('span', String(i + 1), `nth-position${selected === i + 1 ? ' fib-position-active' : ''}`));
            grid.append(entry);
        });
        if (pair >= 0 && pair + 1 < terms.length) {
            const bracket = node('span', '', 'fib-bracket');
            bracket.style.gridColumn = `${pair + 1} / span 2`;
            bracket.setAttribute('aria-label', `Add terms at positions ${pair + 1} and ${pair + 2}`);
            grid.append(bracket);
        }
        host.append(grid);
    }

    function sum(host, terms, position) {
        if (position < 3) return;
        const i = position - 1;
        host.append(node('p', `${S.number(terms[i - 2])} + ${S.number(terms[i - 1])} = ${S.number(terms[i])}`, 'nth-working'));
    }

    function gapRow(host, terms, gaps, shown) {
        const grid = node('div', '', 'fib-gaps');
        terms.forEach((value, i) => {
            const entry = node('div', '', 'nth-entry');
            entry.append(node('span', i < shown ? `+${gaps[i]} →` : '', 'fib-gap'), node('span', S.number(value), 'nth-box'));
            grid.append(entry);
        });
        host.append(grid);
    }

    function drawLearnPicture(host, index, value) {
        host.replaceChildren();
        if (index === 2) {
            gapRow(host, [2, 5, 8, 11], [3, 3, 3], value);
            gapRow(host, [2, 5, 7, 12], [3, 2, 5], value);
            return;
        }
        if (index === 3) {
            const terms = S.extend(1, 3, 8);
            row(host, terms.map((term, i) => i < value ? term : null), { pair: value - 3, selected: value });
            sum(host, terms, value);
            return;
        }
        const start = index === 0 ? [2, 5] : index === 1 ? [1, 1] : [-2, 3];
        const terms = S.extend(...start, value + 2);
        row(host, terms, { pair: value > 0 ? value - 1 : -1, selected: value > 0 ? terms.length : 0 });
        if (value > 0) sum(host, terms, terms.length);
    }

    function drawCardVisual(host, question, correct = false) {
        host.replaceChildren();
        host.classList.add('nth-card-visual');
        if (question.showTerms === false) {
            if (correct) row(host, question.terms, { pair: 1 });
            return;
        }
        const asked = Array.isArray(question.asked) ? question.asked : question.positions;
        const target = asked ? Math.max(...asked) : question.terms.length;
        const count = Math.max(target, question.terms.length);
        let terms;
        if (correct && question.asked !== 'wrong-term') terms = S.extend(...question.start, count);
        else terms = Array.from({ length: count }, (_, i) => question.terms[i] ?? null);
        const position = question.asked === 'wrong-term' ? question.wrongPosition : target;
        row(host, terms, { pair: correct ? position - 3 : -1, selected: correct ? position : 0 });
        // The engine shows the card's own working once, in its feedback below.
    }

    Object.assign(S, { node, drawLearnPicture, drawCardVisual });
})();
