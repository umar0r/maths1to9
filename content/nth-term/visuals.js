(() => {
    'use strict';

    const S = window.NthTerm;

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    function row(host, positions, termAt, selected) {
        const list = node('div', '', 'nth-row');
        list.setAttribute('role', 'list');
        for (const position of positions) {
            if (position === '…') {
                list.append(node('span', '…', 'nth-dots'));
                continue;
            }
            const item = node('div', '', `nth-entry${position === selected ? ' is-active' : ''}`);
            item.setAttribute('role', 'listitem');
            item.append(node('span', S.number(termAt(position)), 'nth-box'), node('span', String(position), 'nth-position'));
            item.setAttribute('aria-label', `Position ${position}, term ${S.number(termAt(position))}`);
            list.append(item);
        }
        host.append(list);
    }

    function working(host, parts) {
        const line = node('p', '', 'nth-working');
        for (const part of parts) {
            line.append(typeof part === 'number' ? node('strong', S.number(part), 'nth-substitute') : document.createTextNode(part));
        }
        host.append(line);
    }

    function tiles(host, n) {
        const picture = node('div', '', 'nth-tiles');
        picture.setAttribute('role', 'img');
        picture.setAttribute('aria-label', `${n} by ${n} square of tiles, plus 3 extra tiles`);
        const square = node('div', '', 'nth-square');
        square.style.setProperty('--tile-count', n);
        for (let i = 0; i < n * n; i++) square.append(node('span', '', 'nth-tile'));
        const extra = node('div', '', 'nth-extra');
        for (let i = 0; i < 3; i++) extra.append(node('span', '', 'nth-tile nth-tile--extra'));
        picture.append(square, node('span', '+', 'nth-plus'), extra);
        host.append(picture);
    }

    function drawLearnPicture(host, index, n) {
        host.replaceChildren();
        if (index < 3) {
            const positions = index === 2 ? [1, 2, 3, '…', n] : [1, 2, 3, 4, 5, 6];
            row(host, positions, n => 3 * n + 2, n);
            if (index === 0) host.append(node('p', `Position ${n} → term ${3 * n + 2}`, 'nth-working'));
            else working(host, ['3 × ', n, ` + 2 = ${3 * n} + 2 = ${3 * n + 2}`]);
        } else if (index === 3) {
            row(host, Array.from({ length: n }, (_, i) => i + 1), n => 30 - 4 * n, n);
            working(host, ['30 − 4 × ', n, ` = 30 − ${4 * n} = ${S.number(30 - 4 * n)}`]);
            if (n >= 8) host.append(node('p', S.learnScreens[index].belowZero));
        } else if (index === 4) {
            tiles(host, n);
            working(host, [n, '² + 3 = ', n, ' × ', n, ` + 3 = ${n * n} + 3 = ${n * n + 3}`]);
        } else {
            row(host, [1, 2, 3, 4, 5, 6], n => n * n + 2 * n, n);
            working(host, [n, '² + 2 × ', n, ` = ${n * n} + ${2 * n} = ${n * n + 2 * n}`]);
        }
    }

    function drawCardVisual(host, question) {
        host.replaceChildren();
        host.className = 'nth-card-visual';
        host.append(node('p', question.ruleText, 'nth-rule'));
        if (question.parts) host.append(node('p', question.parts, 'nth-working'));
    }

    Object.assign(S, { node, drawLearnPicture, drawCardVisual });
})();
