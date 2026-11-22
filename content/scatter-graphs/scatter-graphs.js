(() => {
    'use strict';

    const pairs = [[1, 3], [2, 2], [4, 5], [5, 4], [7, 7], [8, 9]];

    function makeGraph(host, { x, y, step, labelEvery, axisNames, label }) {
        return window.Maths1to9Graph.create(host, { x, y, step, labelEvery, axisNames, label });
    }

    function pairTable(host, { rows, values, selected = null, onPick = null }) {
        const table = document.createElement('div');
        table.className = 'scatter-pair-table';
        table.setAttribute('role', onPick ? 'group' : 'table');
        table.setAttribute('aria-label', onPick ? 'Choose a column from the table' : 'Pairs of numbers');
        const headings = document.createElement('div');
        headings.className = 'scatter-pair-table__headings';
        rows.forEach(text => {
            const cell = document.createElement('span');
            cell.textContent = text;
            headings.append(cell);
        });
        table.append(headings);
        values.forEach((pair, index) => {
            const column = document.createElement(onPick ? 'button' : 'div');
            column.className = 'scatter-pair-table__column';
            if (onPick) {
                column.type = 'button';
                column.setAttribute('aria-label', `${pair[0]} ${rows[0]}, ${pair[1]} ${rows[1]}`);
                column.setAttribute('aria-pressed', String(index === selected));
                column.addEventListener('click', () => onPick(index));
            }
            if (index === selected) column.classList.add('is-selected');
            pair.forEach(value => {
                const cell = document.createElement('span');
                cell.textContent = String(value);
                column.append(cell);
            });
            table.append(column);
        });
        host.append(table);
        return table;
    }

    window.ScatterGraphs = { pairs, makeGraph, pairTable };
})();
