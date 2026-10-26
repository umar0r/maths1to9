(() => {
    'use strict';

    const FEEDBACK = Object.freeze({
        'is-prime': '{n} is prime. This branch is finished.',
        'not-whole': 'Use whole numbers bigger than 0.',
        'not-product': 'These numbers must multiply to make {n}. Try again.',
        'uses-one': '1 × {n} just gives you {n} again. Use two numbers bigger than 1.',
        'not-finished': "One end number isn't prime yet. Split it.",
        'includes-one': "Leave out 1. It isn't prime, and multiplying by 1 changes nothing.",
        'wrong-product': "Your answer makes {p}, not {n}. Check you've included every prime, including repeats.",
        'not-prime': "{x} isn't prime. Split it into prime factors.",
        'not-grouped': 'Your prime factors are correct. Now group the repeated factors using powers.',
        correct: 'All your factors are prime, and they multiply to make {n}.',
        empty: 'Add at least one factor.',
        invalid: 'Use whole numbers bigger than 0 for every factor and count.'
    });

    function feedback(reason, values = {}) {
        return FEEDBACK[reason].replace(/\{([nxp])\}/g, (_, key) => String(values[key]));
    }

    function isPrime(n) {
        if (!Number.isInteger(n) || n < 2) return false;
        for (let factor = 2; factor * factor <= n; factor++) {
            if (n % factor === 0) return false;
        }
        return true;
    }

    function primeFactors(n) {
        if (!Number.isSafeInteger(n) || n < 2) {
            throw new RangeError('Use a safe whole number greater than 1.');
        }
        const factors = [];
        let remaining = n;
        for (let factor = 2; factor * factor <= remaining; factor++) {
            while (remaining % factor === 0) {
                factors.push(factor);
                remaining /= factor;
            }
        }
        if (remaining > 1) factors.push(remaining);
        return factors;
    }

    function toIndexForm(factors) {
        const counts = new Map();
        factors.forEach(base => counts.set(base, (counts.get(base) || 0) + 1));
        return [...counts].sort(([a], [b]) => a - b).map(([base, power]) => ({ base, power }));
    }

    function toLatex(entries) {
        return entries.map(({ base, power }) => power === 1 ? String(base) : `${base}^{${power}}`).join(' \\times ');
    }

    function checkSplit(value, a, b) {
        if (isPrime(value)) return { ok: false, reason: 'is-prime' };
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) {
            return { ok: false, reason: 'not-whole' };
        }
        if (a * b !== value) return { ok: false, reason: 'not-product' };
        if (a === 1 || b === 1) return { ok: false, reason: 'uses-one' };
        return { ok: true };
    }

    function createTree(n) {
        if (!Number.isSafeInteger(n) || n < 2) {
            throw new RangeError('Use a safe whole number greater than 1.');
        }
        return { id: 'root', value: n };
    }

    function splitNode(tree, nodeId, a, b) {
        function find(node) {
            if (node.id === nodeId) return node;
            for (const child of node.children || []) {
                const found = find(child);
                if (found) return found;
            }
            return null;
        }
        const node = find(tree);
        // Model errors are distinct from mathematical factor-pair mistakes.
        if (!node) return { error: 'not-found' };
        if (node.children?.length) return { error: 'already-split' };
        const result = checkSplit(node.value, a, b);
        if (!result.ok) return { error: result.reason };
        function copy(current) {
            if (current.id === nodeId) {
                return { ...current, children: [
                    { id: `${current.id}-0`, value: a },
                    { id: `${current.id}-1`, value: b }
                ] };
            }
            return current.children?.length
                ? { ...current, children: current.children.map(copy) }
                : { ...current };
        }
        return { tree: copy(tree) };
    }

    function leaves(tree) {
        return tree.children?.length ? tree.children.flatMap(leaves) : [tree.value];
    }

    function isFinished(tree) {
        return leaves(tree).every(isPrime);
    }

    function markAnswer(target, entries, { indexForm = false } = {}) {
        const answer = (status, values = {}) => ({ status, message: feedback(status, { n: target, ...values }) });
        if (Array.isArray(entries) && entries.length === 0) return answer('empty');
        if (!Array.isArray(entries) || entries.some(entry =>
            !entry || !Number.isInteger(entry.base) || entry.base < 1 || !Number.isInteger(entry.power) || entry.power < 1
        )) return answer('invalid');
        if (entries.some(({ base }) => base === 1)) return answer('includes-one');
        const product = entries.reduce((total, { base, power }) => total * base ** power, 1);
        if (product !== target) return answer('wrong-product', { p: product });
        const nonPrime = entries.find(({ base }) => !isPrime(base));
        if (nonPrime) return answer('not-prime', { x: nonPrime.base });
        if (indexForm && new Set(entries.map(({ base }) => base)).size !== entries.length) {
            return answer('not-grouped');
        }
        return answer('correct');
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const finishedTree = {
        value: 60, children: [
            { value: 6, children: [{ value: 2 }, { value: 3 }] },
            { value: 10, children: [{ value: 2 }, { value: 5 }] }
        ]
    };
    const alternativeTree = {
        value: 60, children: [
            { value: 3 },
            { value: 20, children: [
                { value: 4, children: [{ value: 2 }, { value: 2 }] },
                { value: 5 }
            ] }
        ]
    };

    function renderMaths(root = document) {
        root.querySelectorAll('[data-prime-maths]').forEach((element) => {
            if (element.dataset.mathsRendered === 'true' || !window.katex) return;
            window.katex.render(element.dataset.primeMaths, element, {
                throwOnError: false,
                displayMode: element.dataset.displayMaths === 'true'
            });
            element.dataset.mathsRendered = 'true';
        });
    }

    function firstWrongPrime(entries, expected) {
        const counts = new Map(expected.map(({ base, power }) => [base, power]));
        return entries.find(({ base, power }) => power !== counts.get(base))?.base ?? null;
    }

    function drawTree(tree, { fadeSplit = false, collected = [], matchColours = false, splitNote = '', onNodeTap = null, collectedNodeIds = [], locked = false, activeNodeId = null } = {}) {
        function svgElement(tag, attributes = {}) {
            const element = document.createElementNS(SVG_NS, tag);
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            return element;
        }
        function leafCount(node) {
            return node.children?.length ? node.children.reduce((sum, child) => sum + leafCount(child), 0) : 1;
        }
        function describe(node) {
            if (!node.children?.length) return `${node.value}${isPrime(node.value) ? ', prime and finished' : ', not split yet'}`;
            return `${node.value} splits into ${node.children.map(child => child.value).join(' and ')}. ${node.children.map(describe).join('. ')}`;
        }
        function treeDepth(node) {
            return node.children?.length ? 1 + Math.max(...node.children.map(treeDepth)) : 0;
        }
        const height = 48 + treeDepth(tree) * 100 + 40;
        const svg = svgElement('svg', {
            viewBox: `0 0 520 ${height}`, role: 'img',
            'aria-label': describe(tree) + (splitNote ? `. ${splitNote}` : ''), class: 'prime-tree', preserveAspectRatio: 'xMidYMid meet'
        });
        const edges = svgElement('g', { class: 'prime-tree-edges' });
        const nodes = svgElement('g');
        const buttons = [];
        let endNumber = 0;
        svg.append(edges, nodes);
        function place(node, left, right, depth, path) {
            const x = (left + right) / 2;
            const y = 48 + depth * 100;
            if (node.children?.length) {
                const total = leafCount(node);
                let start = left;
                node.children.forEach((child, index) => {
                    const end = start + (right - left) * leafCount(child) / total;
                    const cx = (start + end) / 2;
                    edges.append(svgElement('line', { x1: x, y1: y + 26, x2: cx, y2: y + 74 }));
                    place(child, start, end, depth + 1, `${path}-${index}`);
                    start = end;
                });
            }
            const prime = !node.children?.length && isPrime(node.value);
            const group = svgElement('g', {
                class: [
                    'prime-tree-node', prime ? 'is-prime' : '',
                    node.id === activeNodeId ? 'is-active' : '',
                    onNodeTap && !node.children?.length ? 'is-tappable-leaf' : '',
                    collectedNodeIds.includes(node.id) ? 'is-picked' : '',
                    fadeSplit && depth > 0 && node.children?.length ? 'is-split' : '',
                    collected.includes(path) ? 'is-collected' : '',
                    matchColours && prime ? `prime-match-${node.value}` : ''
                ].filter(Boolean).join(' '),
                'data-node-path': path
            });
            if (prime) group.append(svgElement('circle', { cx: x, cy: y, r: 28 }));
            if (node.value === '') group.append(svgElement('rect', { x: x - 28, y: y - 28, width: 56, height: 56, rx: 8, class: 'prime-tree-empty' }));
            if (onNodeTap && !prime && !node.children?.length) {
                group.append(svgElement('rect', { x: x - 28, y: y - 28, width: 56, height: 56, rx: 8, class: 'prime-tree-empty' }));
            }
            if (onNodeTap && !node.children?.length) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `prime-tree-tap ${prime ? 'is-prime' : 'is-composite'}`;
                button.textContent = node.value;
                button.dataset.nodeId = node.id;
                button.style.left = `${x / 520 * 100}%`;
                button.style.top = `${y / height * 100}%`;
                const collected = collectedNodeIds.includes(node.id);
                const end = ++endNumber;
                button.disabled = locked || collected;
                button.setAttribute('aria-label', prime ? `${node.value}, prime end ${end}${collected ? ', collected' : ''}` : `${node.value}, not prime, tap to split`);
                button.addEventListener('click', () => onNodeTap(node));
                buttons.push(button);
            }
            const label = svgElement('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
            label.textContent = node.value;
            group.append(label);
            nodes.append(group);
        }
        place(tree, 0, 520, 0, 'root');
        if (fadeSplit && splitNote) {
            // Annotate the gap between the faded 6 and 10, at their own level.
            const note = svgElement('g', { class: 'prime-tree-note' });
            note.append(svgElement('rect', { x: 158, y: 121, width: 204, height: 54, rx: 8 }));
            note.append(svgElement('line', { x1: 158, y1: 148, x2: 150, y2: 148 }));
            note.append(svgElement('line', { x1: 362, y1: 148, x2: 370, y2: 148 }));
            const breakAt = splitNote.indexOf('. ') + 1;
            [splitNote.slice(0, breakAt), splitNote.slice(breakAt).trim()].forEach((line, index) => {
                const label = svgElement('text', { x: 260, y: 140 + index * 20, 'text-anchor': 'middle' });
                label.textContent = line;
                note.append(label);
            });
            svg.append(note);
        }
        if (!onNodeTap) return svg;
        const wrapper = document.createElement('div');
        wrapper.className = 'prime-try-tree';
        wrapper.append(svg, ...buttons);
        return wrapper;
    }

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

    const element = (tag, text = '', className = '') => {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    };
    const product = values => values.reduce((total, value) => total * value, 1);
    const superscript = value => String(value).replace(/\d/g, digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]);
    const formatIndex = entries => entries.map(({ base, power }) => `${base}${power === 1 ? '' : superscript(power)}`).join(' × ');
    const expanded = number => primeFactors(number).join(' × ');
    function withIds(node, id = 'root') {
        return { ...node, id, ...(node.children ? { children: node.children.map((child, index) => withIds(child, `${id}-${index}`)) } : {}) };
    }
    function treeNodes(tree) {
        return [tree, ...(tree.children || []).flatMap(treeNodes)];
    }
    const nextBranch = tree => treeNodes(tree).find(node => !node.children?.length && !isPrime(node.value));
    function validTree(tree, number) {
        if (!tree || tree.value !== number || !Number.isSafeInteger(tree.value) || tree.value < 2) return false;
        if (!tree.children) return true;
        return tree.children.length === 2 && checkSplit(number, ...tree.children.map(child => child.value)).ok
            && tree.children.every(child => validTree(child, child.value));
    }

    function treeWidget(number) {
        const normalise = value => ({ tree: value?.tree || createTree(number), active: value?.active || 'root',
            inputs: [...(value?.inputs || ['', ''])], message: value?.message || '' });
        return {
            isEmpty(value) {
                const state = normalise(value);
                return !state.tree.children?.length && !state.inputs.every(input => String(input).trim() !== '');
            },
            answerText(value) { return `${number} = ${leaves(normalise(value).tree).slice().sort((a, b) => a - b).join(' × ')}`; },
            mark(value) {
                const state = normalise(value);
                if (state.inputs.every(input => String(input).trim() !== '')) {
                    const node = treeNodes(state.tree).find(node => node.id === state.active) || nextBranch(state.tree);
                    if (node) {
                        const result = checkSplit(node.value, ...state.inputs.map(Number));
                        if (!result.ok) return { correct: false, feedback: feedback(result.reason, { n: node.value }) };
                    }
                }
                if (!validTree(state.tree, number)) return { correct: false, feedback: 'Each pair must multiply to the number above it.' };
                const correct = isFinished(state.tree);
                return { correct, feedback: correct ? `Every end is prime: ${number} = ${leaves(state.tree).slice().sort((a, b) => a - b).join(' × ')}`
                    : feedback('not-finished') };
            },
            render(host, { value, editable, onChange }) {
                let state = normalise(value);
                let canEdit = editable;
                let phase = 'answer';
                const directions = element('p', 'Choose an end number that is not prime. Type two factors. A correct pair grows the tree. Check when every end is prime.');
                const panel = element('div', '', 'prime-split-panel');
                const heading = element('p');
                const fields = element('div', '', 'prime-split-inputs');
                const picture = element('div');
                const status = element('p', '', 'prime-widget-status');
                status.setAttribute('role', 'status');
                status.tabIndex = -1;
                const inputs = ['First factor', 'Second factor'].map((label, index) => {
                    const field = element('input');
                    field.type = 'text'; field.inputMode = 'numeric'; field.autocomplete = 'off';
                    field.setAttribute('aria-label', label);
                    field.addEventListener('input', () => {
                        if (!canEdit) return;
                        state.inputs[index] = field.value;
                        state.message = '';
                        const node = active();
                        if (node && state.inputs.every(value => value.trim() !== '')) {
                            const [first, second] = state.inputs.map(Number);
                            const result = checkSplit(node.value, first, second);
                            if (result.ok) {
                                state.tree = splitNode(state.tree, node.id, first, second).tree;
                                state.active = nextBranch(state.tree)?.id || null;
                                state.inputs = ['', ''];
                                state.message = isFinished(state.tree) ? 'Every end is prime. Check your tree.' : `${node.value} = ${first} × ${second}`;
                            } else state.message = feedback(result.reason, { n: node.value });
                        }
                        paint(); onChange(state);
                        if (isFinished(state.tree)) status.focus();
                    });
                    const wrapper = element('label', label);
                    wrapper.append(field); fields.append(wrapper);
                    return field;
                });
                panel.append(heading, fields);
                host.append(directions, panel, status, picture);
                function active() {
                    const selected = treeNodes(state.tree).find(node => node.id === state.active && !node.children?.length && !isPrime(node.value));
                    return selected || nextBranch(state.tree);
                }
                function paint() {
                    const node = active();
                    heading.textContent = node ? `Split ${node.value} into two factors` : 'Every end is prime';
                    fields.hidden = !node;
                    inputs.forEach((input, index) => {
                        if (input.value !== state.inputs[index]) input.value = state.inputs[index];
                        input.disabled = !canEdit || !node;
                    });
                    status.textContent = state.message;
                    status.hidden = phase !== 'answer' || !state.message;
                    picture.replaceChildren();
                    picture.append(drawTree(state.tree, {
                        locked: !canEdit || isFinished(state.tree), activeNodeId: node?.id,
                        onNodeTap(node) {
                            if (!canEdit) return;
                            if (isPrime(node.value)) state.message = feedback('is-prime', { n: node.value });
                            else { state.active = node.id; state.inputs = ['', '']; state.message = ''; }
                            paint(); onChange(state);
                            if (!isPrime(node.value)) inputs[0].focus();
                        }
                    }));
                }
                paint();
                return {
                    update(next) { state = normalise(next.value); canEdit = next.editable; phase = next.phase; paint(); },
                    focus() { (active() ? inputs[0] : status).focus(); }
                };
            }
        };
    }

    function builderWidget(number) {
        const rows = value => Array.isArray(value) ? value : [{ prime: '', count: '' }];
        return {
            isEmpty(value) { return !areRowsComplete(rows(value)); },
            answerText(value) { return `${number} = ${formatIndex(rowsToEntries(rows(value)))}`; },
            mark(value) {
                const result = markAnswer(number, rowsToEntries(rows(value)), { indexForm: true });
                const entries = rowsToEntries(rows(value));
                const wrongPrime = firstWrongPrime(entries, toIndexForm(primeFactors(number)));
                const message = result.status === 'wrong-product' && entries.every(entry => isPrime(entry.base)) && wrongPrime !== null
                    ? `Count the ${wrongPrime}s again. Include every copy from the tree.` : result.message;
                return { correct: result.status === 'correct', feedback: message };
            },
            render(host, { value, editable, onChange }) {
                let builder;
                let canEdit = editable;
                function mount(value) {
                    builder = createAnswerBuilder(host, { target: number, initial: rows(value), empty: true,
                        onChange(entries, nextRows) { if (canEdit) onChange(nextRows); } });
                }
                mount(value);
                function lock() { host.querySelectorAll('input, button').forEach(control => { control.disabled = !canEdit; }); }
                lock();
                return {
                    update(next) {
                        canEdit = next.editable;
                        if (JSON.stringify(rows(next.value)) !== JSON.stringify(builder.getState())) mount(next.value);
                        lock();
                    },
                    focus() { host.querySelector('input')?.focus(); }
                };
            }
        };
    }

    const option = (label, message, correct = false) => ({ label: String(label), feedback: message, correct });
    function distinctWrong(candidates, answer) {
        return candidates.filter(([value], index, values) => String(value) !== String(answer)
            && values.findIndex(([other]) => String(other) === String(value)) === index);
    }
    function numericQuestion(number, kind, mode = 'number') {
        const primes = primeFactors(number);
        const entries = toIndexForm(primes);
        const repeated = entries.find(entry => entry.power > 1) || entries[0];
        const answer = kind === 'missing' ? primes.at(-1) : repeated.power;
        const prefix = primes.slice(0, -1);
        const prompt = kind === 'missing' ? `Find the missing prime: ${number} = ${prefix.join(' × ')} × □`
            : `${number} = ${primes.join(' × ')}. What is the small power on ${repeated.base} in index form?`;
        const wrong = kind === 'missing' ? [
            [1, '1 is not prime. Keep every prime factor in the product.'],
            [number, 'That is the original number. Divide it by the shown prime factors.'],
            [product(prefix), 'That is the product of the shown factors. Find the missing prime.'],
            [0, 'A factor of 0 would make the whole product 0.']
        ] : [
            [repeated.base, 'That is the prime. The small power is the number of copies.'],
            [repeated.base * repeated.power, 'That multiplies the prime by the count. Give just the count.'],
            [answer - 1, 'A copy is missing. Count every repeated prime.'],
            [answer + 1, 'That counts one extra copy.']
        ];
        const rules = distinctWrong(wrong, answer);
        const result = { number, kind, prime: repeated.base, input: mode, prompt,
            questionType: kind === 'missing' ? 'missing-prime' : 'missing-power',
            feedback: kind === 'missing' ? `${product(prefix)} × ${answer} = ${number}`
                : `${repeated.base} appears ${answer} times, so its small power is ${answer}` };
        if (mode === 'choice') result.options = [option(answer, result.feedback, true), ...rules.slice(0, 3).map(([value, message]) => option(value, message))];
        else Object.assign(result, { answer: String(answer), rules: rules.map(([value, feedback]) => ({ value: String(value), feedback })),
            fallback: kind === 'missing' ? 'Divide the number by the product of the shown primes.' : 'Count how many times this prime appears.' });
        return result;
    }
    function productQuestion(number, indexForm = false) {
        const primes = primeFactors(number);
        const entries = toIndexForm(primes);
        const answer = indexForm ? formatIndex(entries) : primes.join(' × ');
        const combined = [primes[0] * primes[1], ...primes.slice(2)].join(' × ');
        const candidates = indexForm ? [
            [primes.join(' × '), 'The primes are right. Group repeated primes using small powers.'],
            [[...new Set(primes)].join(' × '), 'That leaves out repeated prime factors.'],
            [combined, 'One written factor is not prime. Split it into primes.'],
            [`1 × ${answer}`, '1 is not prime. Leave it out.'],
            [primes.join(' + '), 'A product multiplies the primes. Use ×, not +.']
        ] : [
            [primes.join(' + '), 'A product multiplies the primes. Use ×, not +.'],
            [combined, 'That stops at a number which is not prime. Split it further.'],
            [primes.slice(0, -1).join(' × '), 'A prime factor is missing. Include every end of the tree.'],
            [`1 × ${answer}`, '1 is not prime. Leave it out of the product.']
        ];
        const repeated = entries.find(entry => entry.power > 1 && entry.base !== entry.power);
        if (indexForm && repeated) {
            const swapped = entries.map(entry => entry === repeated ? { base: entry.power, power: entry.base } : entry);
            candidates.unshift([formatIndex(swapped), 'The prime is the big number. The small power counts its copies.']);
        }
        return { number, kind: indexForm ? 'index' : 'product', input: 'choice',
            questionType: indexForm ? 'index-form' : 'product-meaning',
            prompt: indexForm ? `Which answer writes ${number} in index form using prime factors?`
                : `Which answer writes ${number} as a product of prime factors?`,
            options: [option(answer, `${number} = ${answer}`, true), ...distinctWrong(candidates, answer).slice(0, 3).map(([label, message]) => option(label, message))] };
    }
    function treeQuestion(number) {
        return { number, kind: 'tree', input: 'custom', questionType: 'finished-tree', prompt: `Build a complete factor tree for ${number}.`, widget: treeWidget(number) };
    }
    function builderQuestion(number) {
        return { number, kind: 'builder', input: 'custom', questionType: 'prime-index-form',
            prompt: `Write ${number} as a product of prime factors in index form.`, widget: builderWidget(number) };
    }
    function meaningQuestion() {
        return { number: 45, kind: 'meaning', input: 'choice', questionType: 'power-meaning',
            prompt: '45 = 3² × 5. What does 3² mean?', options: [
                option('3 × 2', '3 × 2 = 6. The small 2 means two 3s multiplied together.'),
                option('3 + 3', '3 + 3 = 6. A power multiplies the copies together.'),
                option('3 × 3', 'Two 3s multiply to make 9.', true),
                option('2 × 2 × 2', 'That is 2³. In 3², the 3 is repeated.')
            ] };
    }
    function examples() {
        return [treeQuestion(84), numericQuestion(84, 'missing'), productQuestion(60), builderQuestion(84), numericQuestion(84, 'power'), meaningQuestion()];
    }
    function checks() {
        const first = productQuestion(60);
        first.prompt = 'A finished tree for 60 has end numbers 2, 2, 3 and 5. Which answer writes 60 as a product of prime factors?';
        first.options = [
            option('2, 2, 3, 5', 'This is a list. A product uses ×.'),
            option('2 + 2 + 3 + 5', 'This adds the numbers. A product multiplies them.'),
            option('2 × 2 × 3 × 5', 'A product uses ×, and every factor is prime.', true),
            option('4 × 3 × 5', "These multiply to 60, but 4 is not prime. Split it into 2 × 2.")
        ];
        const second = { number: 90, kind: 'unfinished', input: 'choice', questionType: 'finished-tree',
            prompt: "Amir writes 90 = 9 × 2 × 5. He says he is finished because the numbers multiply to 90. Is he right?", options: [
                option('Yes. The numbers multiply to 90.', 'Multiplying to 90 is not enough. Every factor must be prime, and 9 is not.'),
                option('Yes. 9, 2 and 5 are all prime.', '9 is not prime: 9 = 3 × 3'),
                option('No. 9 is not prime, so split it into 3 × 3.', '90 = 2 × 3² × 5', true),
                option('No. Replace 9 with 1 × 9.', '1 is not prime, and 9 still needs splitting.')
            ] };
        return [first, second, numericQuestion(90, 'missing'), numericQuestion(28, 'power'), builderQuestion(28)];
    }

    const PRACTICE_NUMBERS = Object.freeze(Array.from({ length: 197 }, (_, index) => index + 4).filter(number => {
        const count = primeFactors(number).length;
        return count >= 2 && count <= 4;
    }));
    const types = ['product-meaning', 'index-form', 'missing-prime', 'missing-power', 'finished-tree', 'prime-index-form'];
    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const repeated = item.type === 'index-form' || item.type === 'missing-power';
        const pool = repeated ? PRACTICE_NUMBERS.filter(number => toIndexForm(primeFactors(number)).some(entry => entry.power > 1)) : PRACTICE_NUMBERS;
        const number = pool[randomInt(0, pool.length - 1, random)];
        const mode = item.mode || 'number';
        let question;
        if (mode === 'custom') question = item.type === 'finished-tree' ? treeQuestion(number) : builderQuestion(number);
        else if (mode === 'choice' && ['product-meaning', 'finished-tree'].includes(item.type)) question = productQuestion(number);
        else if (mode === 'choice' && ['index-form', 'prime-index-form'].includes(item.type)) question = productQuestion(number, true);
        else question = numericQuestion(number, ['index-form', 'missing-power', 'prime-index-form'].includes(item.type) ? 'power' : 'missing', mode);
        return { ...question, questionType: item.type };
    }
    function pick(random) {
        const { randomInt, seededRandom } = window.Maths1to9LessonEngine;
        const used = new Set();
        return [['product-meaning', 'choice'], ['index-form', 'choice'], ['missing-prime', 'number'],
            ['missing-power', 'number'], ['finished-tree', 'custom'], ['prime-index-form', 'custom']].map(([type, mode]) => {
            let seed = randomInt(0, 4294967295, random);
            for (let attempt = 0; attempt < 1000; attempt++) {
                const question = generate({ type, mode }, seededRandom(seed));
                if (!used.has(question.number)) { used.add(question.number); return { type, mode, seed }; }
                seed = (seed + 2654435761) >>> 0;
            }
            throw new Error('Could not make six different practice numbers.');
        });
    }
    const prepare = (question, random) => question.options
        ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };

    const learnScreens = [
        { title: 'Prime factors make a number', lines: [
            'A factor divides a number exactly. A prime number has just two factors: 1 and itself.',
            'Prime factor decomposition means writing a number as prime numbers multiplied together.',
            'A product means multiply. Here, 2 × 2 × 3 × 5 = 60. Include both 2s.'
        ] },
        { title: 'Grow a factor tree', lines: [
            'A factor tree splits a number into pairs of factors. Use two numbers bigger than 1.',
            'Move the slider to see each split. Keep splitting any end that is not prime. A green circle means that end is prime and finished.',
            'Leave out 1. It is not prime. A correct factor pair grows a new pair of branches.'
        ] },
        { title: 'Collect every prime', lines: [
            'Tap each prime at an end of the tree. Use each end once, even when two ends are both 2.',
            'Do not collect 6 or 10. They have already been split. Multiply all the end primes.'
        ] },
        { title: 'Group the repeats', lines: [
            'An index, or power, is the small number that counts how many copies to multiply.',
            'Two 2s make 2². This shorter way of writing the product is called index form.',
            'Matching colours help you spot repeated primes.',
            '3² means 3 × 3 = 9. It does not mean 3 × 2.',
            'In the answer builder, write each prime once and give its count. A prime used once has a count of 1.'
        ] },
        { title: 'Start a different way', lines: [
            'You can start with any factor pair bigger than 1. Both trees for 60 finish with the same primes.',
            'Whichever tree you build, include every end prime and group the repeats.'
        ] },
        { title: 'Find a missing prime', lines: [
            'Multiply the primes that are shown. Divide the original number by that product.',
            'For 60 = 2 × 2 × 3 × □, the shown primes make 12. Then 60 ÷ 12 = 5, so the missing prime is 5.'
        ] }
    ];
    function drawLearn(host, index, section) {
        const state = section.state;
        if (index === 0) {
            host.append(element('p', '60 = 2 × 2 × 3 × 5', 'prime-learn-maths'));
            const row = element('div', '', 'prime-count-tiles');
            for (const prime of [2, 2, 3, 5]) row.append(element('span', prime, 'prime-number-tile'));
            host.append(row);
        } else if (index === 1) {
            const stages = [createTree(60), withIds({ value: 60, children: [{ value: 6 }, { value: 10 }] }),
                withIds({ value: 60, children: [{ value: 6, children: [{ value: 2 }, { value: 3 }] }, { value: 10 }] }), withIds(finishedTree)];
            host.append(drawTree(stages[state.splits]));
        } else if (index === 2) {
            const tree = withIds(finishedTree);
            host.append(drawTree(tree, { fadeSplit: true, collectedNodeIds: state.collected,
                onNodeTap(node) {
                    if (state.collected.includes(node.id)) return;
                    section.update(state => { state.collected.push(node.id); });
                    if (state.collected.length === 4) window.Maths1to9Lesson.recordActivity({ id: 'prime:collect', kind: 'explore' });
                    host.replaceChildren(); drawLearn(host, index, section);
                    host.querySelector('.prime-tree-tap:not(:disabled)')?.focus();
                }
            }));
            const values = treeNodes(tree).filter(node => state.collected.includes(node.id)).map(node => node.value).sort((a, b) => a - b);
            host.append(element('p', values.length ? `Collected primes: ${values.join(' × ')}` : 'No primes collected yet', 'prime-learn-maths'));
        } else if (index === 3) {
            host.append(drawTree(withIds(finishedTree), { matchColours: true }));
            host.append(element('p', '60 = 2 × 2 × 3 × 5 = 2² × 3 × 5', 'prime-learn-maths'));
            host.append(element('p', 'Prime 2: count 2. Prime 3: count 1. Prime 5: count 1.'));
        } else if (index === 4) {
            const trees = element('div', '', 'prime-learn-trees');
            trees.append(drawTree(withIds(finishedTree)), drawTree(withIds(alternativeTree)));
            host.append(trees, element('p', '60 = 2² × 3 × 5', 'prime-learn-maths'));
        } else host.append(element('p', '60 = 2 × 2 × 3 × 5', 'prime-learn-maths'));
    }

    Object.assign(window.Maths1to9PrimeFactors ??= {}, {
        FEEDBACK, feedback, isPrime, primeFactors, toIndexForm, toLatex, checkSplit, createTree, splitNode, leaves,
        isFinished, markAnswer, validTree, drawTree, renderMaths, firstWrongPrime, rowsToEntries, areRowsComplete, createAnswerBuilder,
        treeWidget, builderWidget, numericQuestion, productQuestion, treeQuestion, builderQuestion, meaningQuestion,
        examples, checks, types, PRACTICE_NUMBERS, generate, pick, prepare, learnScreens, drawLearn, withIds, treeNodes
    });
})();
