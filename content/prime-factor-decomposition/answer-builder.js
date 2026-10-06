(() => {
    'use strict';

    function rowsToEntries(rows) {
        return rows.map(({ prime, count }) => ({ base: Number(prime), power: Number(count) }));
    }

    function areRowsComplete(rows) {
        return rows.length > 0 && rows.every(row =>
            row && String(row.prime ?? '').trim() !== '' && String(row.count ?? '').trim() !== ''
        );
    }

    function createAnswerBuilder(container, {
        target, initial = null, onChange = () => {}, fixedPrimes = null, empty = false
    }) {
        const logic = window.Maths1to9PrimeFactors;
        const fixed = Array.isArray(fixedPrimes);
        const savedRows = initial ?? [];
        let rows = fixed
            ? fixedPrimes.map(prime => {
                const saved = savedRows.find(entry => String(entry.prime ?? entry.base) === String(prime));
                return { prime: String(prime), count: String(saved?.count ?? saved?.power ?? '') };
            })
            : savedRows.map(entry => ({
                prime: String(entry.prime ?? entry.base ?? ''),
                count: String(entry.count ?? entry.power ?? '')
            }));
        if (!fixed && empty && initial === null) rows = [{ prime: '', count: '' }];
        let preview;
        const getEntries = () => rowsToEntries(rows);
        const getState = () => rows.map(row => ({ ...row }));
        const isComplete = () => areRowsComplete(rows);

        function updatePreview() {
            const entries = rows.map(row => ({
                base: row.prime === '' ? '?' : Number(row.prime),
                power: row.count === '' ? '?' : Number(row.count)
            }));
            preview.dataset.primeMaths = `${target} = ${entries.length ? logic.toLatex(entries) : '?'}`;
            delete preview.dataset.mathsRendered;
            logic.renderMaths(container);
        }
        function changed() {
            updatePreview();
            onChange(getEntries(), getState());
        }
        function numberBox(value, label, onInput) {
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.autocomplete = 'off';
            input.value = value;
            input.setAttribute('aria-label', label);
            input.addEventListener('input', () => {
                if (!/^\d*$/.test(input.value)) { input.value = value; return; }
                value = input.value;
                onInput(value);
                changed();
            });
            return input;
        }
        function field(text, input) {
            const label = document.createElement('label');
            const heading = document.createElement('span');
            heading.textContent = text;
            label.append(heading, input);
            return label;
        }
        function render() {
            container.replaceChildren();
            container.classList.add('prime-answer-builder');
            const table = document.createElement('div');
            table.className = `prime-count-table${fixed ? ' is-fixed' : ''}`;
            container.append(table);
            if (!fixed) {
                const headings = document.createElement('div');
                headings.className = 'prime-count-headings';
                for (const text of ['Prime', 'How many times?']) {
                    const heading = document.createElement('span');
                    heading.textContent = text;
                    headings.append(heading);
                }
                table.append(headings);
            }
            rows.forEach((row, index) => {
                const line = document.createElement('div');
                line.className = 'prime-count-row';
                line.dataset.prime = row.prime;
                table.append(line);
                const count = numberBox(row.count,
                    fixed ? `How many ${row.prime}s?` : `Count in row ${index + 1}`,
                    value => { row.count = value; });
                count.className = 'prime-count-number';
                if (fixed) {
                    const tile = document.createElement('span');
                    tile.className = 'prime-number-tile prime-count-prime-tile';
                    tile.dataset.primeMaths = row.prime;
                    line.append(tile, field(`How many ${row.prime}s?`, count));
                } else {
                    const prime = numberBox(row.prime, `Prime in row ${index + 1}`, value => {
                        row.prime = value;
                        line.dataset.prime = value;
                    });
                    prime.className = 'prime-count-prime';
                    line.append(prime, count);
                    const remove = document.createElement('button');
                    remove.type = 'button';
                    remove.className = 'prime-count-remove';
                    remove.textContent = '✕';
                    remove.setAttribute('aria-label', `Remove row ${index + 1}`);
                    remove.addEventListener('click', () => {
                        rows.splice(index, 1);
                        render();
                        changed();
                    });
                    line.append(remove);
                }
            });
            if (!fixed) {
                const addLine = document.createElement('div');
                addLine.className = 'prime-count-add-line';
                const add = document.createElement('button');
                add.type = 'button';
                add.className = 'prime-count-add';
                add.textContent = '+ Add a prime';
                add.setAttribute('aria-label', 'Add a prime');
                add.addEventListener('click', () => {
                    rows.push({ prime: '', count: '' });
                    render();
                    changed();
                    container.querySelectorAll('.prime-count-prime')[rows.length - 1]?.focus();
                });
                addLine.append(add);
                container.append(addLine);
            }
            preview = document.createElement('p');
            preview.className = 'prime-builder-preview';
            preview.setAttribute('aria-live', 'polite');
            container.append(preview);
            updatePreview();
        }
        render();
        return { getEntries, getState, isComplete };
    }

    Object.assign(window.Maths1to9PrimeFactors ??= {}, { createAnswerBuilder });
})();
