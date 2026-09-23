(() => {
    'use strict';

    function gateSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent(
                'maths1to9:section-gate',
                {
                    detail: { sectionId }
                }
            )
        );
    }

    function completeSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent(
                'maths1to9:section-complete',
                {
                    detail: { sectionId }
                }
            )
        );
    }

    function escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[character]
        );
    }

    function addThousandsSeparators(value) {
        const text = String(value);
        const parts = text.split('.');

        parts[0] = parts[0].replace(
            /\B(?=(\d{3})+(?!\d))/g,
            ','
        );

        return parts.join('.');
    }

    function parseJsonData(value, fallback = []) {
        try {
            const parsed = JSON.parse(value || '[]');

            return parsed;
        } catch (error) {
            return fallback;
        }
    }

    function findOnesIndex(columns) {
        return columns.findIndex(
            (column) => (
                String(column).toLowerCase() === 'ones'
            )
        );
    }

    function getMovementBounds(
        digitStrings,
        columns,
        onesIndex
    ) {
        const starts = digitStrings.map(
            (digits) => (
                onesIndex - digits.length + 1
            )
        );

        const minimumOffset = Math.max(
            ...starts.map((start) => -start)
        );

        const maximumOffset = Math.min(
            ...digitStrings.map((digits, index) => (
                columns.length
                - digits.length
                - starts[index]
            ))
        );

        return {
            starts,
            minimumOffset,
            maximumOffset
        };
    }

    function getDisplayCells(
        digits,
        offset,
        columnsLength,
        onesIndex,
        originalStart
    ) {
        const cells = Array(columnsLength).fill('');
        const start = originalStart + offset;

        [...digits].forEach((digit, index) => {
            const cellIndex = start + index;

            if (
                cellIndex >= 0
                && cellIndex < cells.length
            ) {
                cells[cellIndex] = digit;
            }
        });

        const firstDigitIndex = cells.findIndex(
            (cell) => cell !== ''
        );

        const lastDigitIndex = cells.findLastIndex(
            (cell) => cell !== ''
        );

        if (
            firstDigitIndex === -1
            || lastDigitIndex === -1
        ) {
            return cells;
        }

        if (lastDigitIndex < onesIndex) {
            for (
                let index = lastDigitIndex + 1;
                index <= onesIndex;
                index += 1
            ) {
                cells[index] = '0';
            }
        }

        if (firstDigitIndex > onesIndex) {
            for (
                let index = onesIndex;
                index < firstDigitIndex;
                index += 1
            ) {
                cells[index] = '0';
            }
        }

        return cells;
    }

    function getDisplayedNumber(cells, onesIndex) {
        const firstIndex = cells.findIndex(
            (cell) => cell !== ''
        );

        const lastIndex = cells.findLastIndex(
            (cell) => cell !== ''
        );

        if (firstIndex === -1 || lastIndex === -1) {
            return '0';
        }

        const integerStart = Math.min(
            firstIndex,
            onesIndex
        );

        const integerDigits = cells
            .slice(integerStart, onesIndex + 1)
            .map((cell) => cell || '0')
            .join('')
            .replace(/^0+(?=\d)/, '');

        const formattedInteger = addThousandsSeparators(
            integerDigits || '0'
        );

        if (lastIndex <= onesIndex) {
            return formattedInteger;
        }

        const decimalDigits = cells
            .slice(onesIndex + 1, lastIndex + 1)
            .map((cell) => cell || '0')
            .join('');

        return `${formattedInteger}.${decimalDigits}`;
    }

    function shiftWholeNumber(digits, placesRight) {
        const cleanDigits = String(digits)
            .replace(/[^0-9]/g, '')
            .replace(/^0+(?=\d)/, '') || '0';

        if (placesRight === 0) {
            return addThousandsSeparators(cleanDigits);
        }

        if (placesRight < 0) {
            return addThousandsSeparators(
                cleanDigits + '0'.repeat(
                    Math.abs(placesRight)
                )
            );
        }

        if (placesRight >= cleanDigits.length) {
            return (
                '0.'
                + '0'.repeat(
                    placesRight - cleanDigits.length
                )
                + cleanDigits
            );
        }

        const splitIndex =
            cleanDigits.length - placesRight;

        return addThousandsSeparators(
            cleanDigits.slice(0, splitIndex)
            + '.'
            + cleanDigits.slice(splitIndex)
        );
    }

    function formatCalculationNumber(value) {
        return String(value)
            .replace(/(\.\d*?)0+$/, '$1')
            .replace(/\.$/, '');
    }

    function createDragController({
        root,
        state,
        minimumOffset,
        maximumOffset,
        getRows,
        getMovableDigits,
        render
    }) {
        function getColumnWidth() {
            const rows = getRows();
            const row = rows[0];

            if (!row) {
                return 1;
            }

            const cells = row.querySelectorAll(
                '.place-value-cell'
            );

            if (cells.length < 2) {
                return 1;
            }

            return cells[1]
                .getBoundingClientRect()
                .width;
        }

        function moveDigits(distance) {
            getMovableDigits().forEach((digit) => {
                digit.style.transform =
                    `translateX(${distance}px)`;
            });
        }

        function finishDrag(event) {
            if (!state.dragging) {
                return;
            }

            const threshold = Math.max(
                24,
                getColumnWidth() * 0.3
            );

            if (
                state.distance <= -threshold
                && state.offset > minimumOffset
            ) {
                state.offset -= 1;
            } else if (
                state.distance >= threshold
                && state.offset < maximumOffset
            ) {
                state.offset += 1;
            }

            const activeRow = getRows().find(
                (row) => (
                    event
                    && row.hasPointerCapture(
                        event.pointerId
                    )
                )
            );

            if (activeRow && event) {
                activeRow.releasePointerCapture(
                    event.pointerId
                );
            }

            state.dragging = false;
            state.pointerId = null;
            state.distance = 0;

            render();
        }

        getRows().forEach((row) => {
            row.addEventListener(
                'pointerdown',
                (event) => {
                    state.dragging = true;
                    state.pointerId = event.pointerId;
                    state.startX = event.clientX;
                    state.distance = 0;

                    row.style.cursor = 'grabbing';
                    row.setPointerCapture(
                        event.pointerId
                    );
                }
            );

            row.addEventListener(
                'pointermove',
                (event) => {
                    if (
                        !state.dragging
                        || event.pointerId
                            !== state.pointerId
                    ) {
                        return;
                    }

                    const maximum =
                        getColumnWidth() * 0.9;

                    state.distance = Math.max(
                        -maximum,
                        Math.min(
                            maximum,
                            event.clientX
                                - state.startX
                        )
                    );

                    moveDigits(state.distance);
                }
            );

            row.addEventListener(
                'pointerup',
                finishDrag
            );

            row.addEventListener(
                'pointercancel',
                finishDrag
            );

            row.addEventListener(
                'keydown',
                (event) => {
                    if (
                        event.key === 'ArrowLeft'
                        && state.offset
                            > minimumOffset
                    ) {
                        event.preventDefault();
                        state.offset -= 1;
                        render();
                    }

                    if (
                        event.key === 'ArrowRight'
                        && state.offset
                            < maximumOffset
                    ) {
                        event.preventDefault();
                        state.offset += 1;
                        render();
                    }

                    if (event.key === 'Home') {
                        event.preventDefault();
                        state.offset = 0;
                        render();
                    }
                }
            );
        });
    }

    function mountSingleNumber(root) {
        const number = root.dataset.number || '107389.4828';
        const columns = parseJsonData(root.dataset.columns);
        const digits = number.replace('.', '').split('');
        const onesIndex = findOnesIndex(columns);
        if (onesIndex < 0 || digits.length !== columns.length) {
            root.textContent = 'The place-value table could not be loaded.';
            return;
        }

        const placeValue = (index) => {
            const exponent = onesIndex - index;
            return exponent >= 0 ? String(10 ** exponent) : (10 ** exponent).toFixed(-exponent);
        };
        const digitValue = (index) => {
            const exponent = onesIndex - index;
            return exponent >= 0
                ? String(Number(digits[index]) * 10 ** exponent)
                : (Number(digits[index]) * 10 ** exponent).toFixed(-exponent);
        };
        const format = (value) => {
            const [whole, fraction] = value.split('.');
            return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction ? '.' + fraction : '');
        };
        const renderTable = (start, end, caption) => `
            <div class="place-value-chart-wrapper">
                <table class="place-value-explorer">
                    <caption class="place-value-explorer__caption">${escapeHtml(caption)}</caption>
                    <thead><tr>${columns.slice(start, end).map((column, offset) => `
                        <th scope="col" class="${start + offset === onesIndex + 1 ? 'place-value-cell--decimal-start' : ''}">${escapeHtml(column)}</th>
                    `).join('')}</tr></thead>
                    <tbody><tr>${digits.slice(start, end).map((digit, offset) => {
                        const index = start + offset;
                        return `<td class="${index === onesIndex + 1 ? 'place-value-cell--decimal-start' : ''}">
                            ${index === onesIndex + 1 ? '<span class="place-value-explorer__point" aria-hidden="true">.</span>' : ''}
                            <button type="button" data-digit-index="${index}" aria-pressed="false" aria-label="${digit} in the ${escapeHtml(columns[index].toLowerCase())} column">${digit}</button>
                        </td>`;
                    }).join('')}</tr></tbody>
                </table>
            </div>`;
        root.innerHTML = `
            <p class="place-value-explorer__number">${escapeHtml(number)}</p>
            <div class="place-value-explorer__desktop">
                ${renderTable(0, digits.length, 'The digits of ' + number)}
            </div>
            <div class="place-value-explorer__mobile">
                <p class="place-value-explorer__tap-hint">Tap a row to explore its place value.</p>
                <div class="place-value-vertical">
                    <div class="place-value-vertical__head" aria-hidden="true"><span>Place</span><span>Digit</span><span>Value</span></div>
                    ${digits.map((digit, index) => `
                        ${index === onesIndex + 1 ? '<p class="place-value-vertical__divider">Decimal point</p>' : ''}
                        <button type="button" class="place-value-vertical__row" data-digit-index="${index}" aria-pressed="false" aria-label="${digit} in the ${escapeHtml(columns[index].toLowerCase())} column, value ${format(digitValue(index))}">
                            <span>${escapeHtml(columns[index])}</span>
                            <strong>${digit}</strong>
                            <span>${format(digitValue(index))}</span>
                            <span class="place-value-vertical__explanation" hidden>${digit} × ${format(placeValue(index))} = ${format(digitValue(index))}${digit === '0' ? '. Zero holds this place.' : ''}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="place-value-scaling-result" aria-live="polite" aria-atomic="true" data-digit-detail></div>
            <p class="place-value-explorer__note">The decimal point separates whole-number places from decimal places. Each place to the right is worth one tenth as much.</p>
            <p class="place-value-explorer__note">Say this number as: <strong>one hundred and seven thousand, three hundred and eighty-nine point four eight two eight.</strong></p>
        `;
        const buttons = Array.from(root.querySelectorAll('[data-digit-index]'));
        const detail = root.querySelector('[data-digit-detail]');
        function selectDigit(index) {
            buttons.forEach((button) => {
                const i = Number(button.dataset.digitIndex);
                button.setAttribute('aria-pressed', String(i === index));
                button.closest('td')?.classList.toggle('is-selected', i === index);
                const explanation = button.querySelector('.place-value-vertical__explanation');
                if (explanation) explanation.hidden = i !== index;
            });
            detail.innerHTML = `
                <p class="place-value-scaling-result__explanation">The digit <strong>${digits[index]}</strong> is in the <strong>${escapeHtml(columns[index].toLowerCase())}</strong> column.</p>
                <p class="place-value-scaling-result__equation">${digits[index]} × ${format(placeValue(index))} = <strong>${format(digitValue(index))}</strong></p>
                ${digits[index] === '0' ? '<p class="place-value-scaling-result__note">The zero holds this place. It contributes 0 to the number.</p>' : ''}
            `;
        }
        buttons.forEach((button) => {
            const index = Number(button.dataset.digitIndex);
            ['mouseenter', 'focus', 'click'].forEach((event) => {
                button.addEventListener(event, () => selectDigit(index));
            });
        });
        selectDigit(onesIndex);
    }

    function mountProductScaling(root) {
        const asArray = (value) => (
            Array.isArray(value) ? value : []
        );
        const columns = parseJsonData(root.dataset.columns);
        const onesIndex = findOnesIndex(columns);
        const configuredExamples = parseJsonData(root.dataset.productExamples);
        const fallbackExample = {
            factors: parseJsonData(root.dataset.factors),
            product: root.dataset.product,
            minimum_offsets: [Number(root.dataset.minimumOffset)],
            maximum_offsets: [Number(root.dataset.maximumOffset)],
            target_offsets: [1, 1]
        };
        const examples = (Array.isArray(configuredExamples)
            && configuredExamples.length > 0
            ? configuredExamples
            : [fallbackExample]
        ).map((example) => ({
            ...example,
            factors: asArray(example.factors)
                .map((factor) => String(factor).replace(/[^0-9]/g, ''))
                .filter(Boolean),
            product: String(example.product || '').replace(/[^0-9]/g, '')
        })).filter((example) => (
            example.factors.length === 2 && example.product !== ''
        ));

        if (!Array.isArray(columns) || columns.length === 0 || onesIndex === -1 || examples.length === 0) {
            root.textContent = 'The multiplication interactive could not be loaded.';
            return;
        }

        gateSection('product-interactive');
        let exampleIndex = 0;

        function setContinue(disabled, onClick) {
            window.Maths1to9Lesson?.setSectionAction?.('product-interactive', {
                label: 'Continue',
                disabled,
                onClick
            });
        }

        function renderExample() {
            window.Maths1to9Lesson?.setSectionProgress?.('product-interactive', exampleIndex, examples.length);
            const example = examples[exampleIndex];
            const bounds = getMovementBounds(example.factors, columns, onesIndex);
            const minimumOffsets = example.factors.map((factor, index) => {
                const configured = Number(asArray(example.minimum_offsets)[index]);
                return Number.isFinite(configured)
                    ? Math.max(bounds.minimumOffset, configured)
                    : bounds.minimumOffset;
            });
            const maximumOffsets = example.factors.map((factor, index) => {
                const configured = Number(asArray(example.maximum_offsets)[index]);
                return Number.isFinite(configured)
                    ? Math.min(bounds.maximumOffset, configured)
                    : bounds.maximumOffset;
            });
            const targetOffsets = example.factors.map((factor, index) => {
                const configured = Number(asArray(example.target_offsets)[index]);
                return Number.isFinite(configured) ? configured : 0;
            });
            const state = {
                offsets: example.factors.map(() => 0),
                draggingIndex: null,
                pointerId: null,
                startX: 0,
                distance: 0
            };
            const rowTemplate = `120px repeat(${columns.length}, minmax(90px, 1fr))`;
            const chartWidth = 120 + (columns.length * 110);

            function isDecimalStart(index) {
                return index === onesIndex + 1;
            }

            function hasReachedTarget() {
                return state.offsets.every((offset, index) => offset === targetOffsets[index]);
            }

            function getMessage() {
                if (hasReachedTarget()) {
                    return example.complete_message || 'Correct.';
                }

                return '';
            }

            function render() {
                const displayedRows = example.factors.map((factor, index) => getDisplayCells(
                    factor,
                    state.offsets[index],
                    columns.length,
                    onesIndex,
                    bounds.starts[index]
                ));
                const displayedFactors = displayedRows.map((cells) => getDisplayedNumber(cells, onesIndex));
                const displayedProduct = formatCalculationNumber(
                    shiftWholeNumber(
                        example.product,
                        state.offsets.reduce((total, offset) => total + offset, 0)
                    )
                );
                const hasMoved = state.offsets.some((offset) => offset !== 0);
                const message = getMessage();

                root.innerHTML = `
                    <p class="place-value-method__prompt">${escapeHtml(example.question || example.prompt || 'Drag the numbers into the correct columns.')}</p>
                    ${example.question && example.prompt ? `<p class="interactive-explanation">${escapeHtml(example.prompt)}</p>` : ''}
                    <p class="interactive-explanation"><strong>← One place left: ×10</strong>&nbsp;&nbsp; <strong>One place right: ÷10 →</strong></p>
                    <p class="place-value-scroll-hint">Swipe the table to see every place-value column.</p>
                    <div class="place-value-chart-wrapper">
                        <div class="place-value-chart place-value-chart--slider" style="min-width: ${chartWidth}px; --place-value-column-count: ${columns.length};">
                            <div class="place-value-row" style="grid-template-columns: ${rowTemplate};">
                                <div class="place-value-cell place-value-cell--heading"></div>
                                ${columns.map((column, index) => `<div class="place-value-cell place-value-cell--heading ${isDecimalStart(index) ? 'place-value-cell--decimal-start' : ''}">${escapeHtml(column)}</div>`).join('')}
                            </div>
                            ${displayedRows.map((cells, rowIndex) => `
                                <div class="place-value-row ${cells.slice(onesIndex + 1).some(Boolean) ? 'place-value-row--has-decimal' : ''}" data-role="product-digit-row" data-row-index="${rowIndex}" role="slider" tabindex="0" aria-label="Move number ${rowIndex + 1}" aria-valuemin="${minimumOffsets[rowIndex]}" aria-valuemax="${maximumOffsets[rowIndex]}" aria-valuenow="${state.offsets[rowIndex]}" style="grid-template-columns: ${rowTemplate}; cursor: grab; touch-action: pan-y; user-select: none;">
                                    <div class="place-value-cell place-value-cell--row-label">Number ${rowIndex + 1}</div>
                                    ${cells.map((digit, index) => `
                                        <div class="place-value-cell place-value-cell--digit ${
                                            isDecimalStart(index)
                                                ? 'place-value-cell--decimal-start'
                                                : ''
                                        }">
                                            ${isDecimalStart(index)
                                                && cells.slice(onesIndex + 1).some(Boolean)
                                                ? '<span class="place-value-decimal-marker" aria-hidden="true">.</span>'
                                                : ''}
                                            <span data-role="product-movable-digit" style="display: inline-block; will-change: transform;">${escapeHtml(digit)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ${message ? `<p class="interactive-explanation" aria-live="polite">${escapeHtml(message)}</p>` : ''}
                    ${hasMoved ? `<div class="interactive-equation" aria-live="polite">${escapeHtml(`${displayedFactors[0]} × ${displayedFactors[1]} = ${displayedProduct}`)}</div>` : ''}
                `;

                setContinue(!hasReachedTarget(), () => {
                    if (exampleIndex === examples.length - 1) {
                        window.Maths1to9Lesson?.clearSectionAction?.('product-interactive');
                        completeSection('product-interactive');
                        return;
                    }
                    exampleIndex += 1;
                    renderExample();
                });

                root.querySelectorAll('[data-role="product-digit-row"]').forEach((row) => {
                    const rowIndex = Number(row.dataset.rowIndex);
                    const getColumnWidth = () => row.querySelector('.place-value-cell:nth-child(2)')?.getBoundingClientRect().width || 1;
                    const moveDigits = (distance) => row.querySelectorAll('[data-role="product-movable-digit"]').forEach((digit) => {
                        digit.style.transform = `translateX(${distance}px)`;
                    });
                    const finishDrag = (event) => {
                        if (state.draggingIndex !== rowIndex) return;
                        const threshold = Math.max(24, getColumnWidth() * 0.3);
                        if (state.distance <= -threshold && state.offsets[rowIndex] > minimumOffsets[rowIndex]) state.offsets[rowIndex] -= 1;
                        if (state.distance >= threshold && state.offsets[rowIndex] < maximumOffsets[rowIndex]) state.offsets[rowIndex] += 1;
                        if (event && row.hasPointerCapture(event.pointerId)) row.releasePointerCapture(event.pointerId);
                        state.draggingIndex = null;
                        state.pointerId = null;
                        state.distance = 0;
                        render();
                    };
                    row.addEventListener('pointerdown', (event) => {
                        state.draggingIndex = rowIndex;
                        state.pointerId = event.pointerId;
                        state.startX = event.clientX;
                        state.distance = 0;
                        row.setPointerCapture(event.pointerId);
                    });
                    row.addEventListener('pointermove', (event) => {
                        if (state.draggingIndex !== rowIndex || state.pointerId !== event.pointerId) return;
                        const maximum = getColumnWidth() * 0.9;
                        state.distance = Math.max(-maximum, Math.min(maximum, event.clientX - state.startX));
                        moveDigits(state.distance);
                    });
                    row.addEventListener('pointerup', finishDrag);
                    row.addEventListener('pointercancel', finishDrag);
                    row.addEventListener('keydown', (event) => {
                        if (event.key === 'ArrowLeft' && state.offsets[rowIndex] > minimumOffsets[rowIndex]) {
                            event.preventDefault();
                            state.offsets[rowIndex] -= 1;
                            render();
                        }
                        if (event.key === 'ArrowRight' && state.offsets[rowIndex] < maximumOffsets[rowIndex]) {
                            event.preventDefault();
                            state.offsets[rowIndex] += 1;
                            render();
                        }
                    });
                });
            }

            render();
        }

        renderExample();
    }

    function mountGuidedMethod(root) {
        const examples = parseJsonData(
            root.dataset.guidedMethod
        ).filter((example) => (
            example
            && Array.isArray(example.columns)
            && Array.isArray(example.digits)
        ));

        if (examples.length === 0) {
            return;
        }

        gateSection('method');

        let exampleIndex = 0;

        function setContinue(disabled, onClick) {
            window.Maths1to9Lesson?.setSectionAction?.('method', {
                label: 'Continue',
                disabled,
                onClick
            });
        }

        function render() {
            window.Maths1to9Lesson?.setSectionProgress?.('method', exampleIndex, examples.length);
            const example = examples[exampleIndex];
            const columns = example.columns;
            const digits = example.digits;
            const correctIndex = Number(example.correct_index);
            // Keep the answers visible while a student works through the
            // related questions for the same number. This lets the three
            // whole-number questions build a complete place-value chart.
            const previousCorrectIndices = examples
                .slice(0, exampleIndex)
                .filter((previousExample) => (
                    previousExample.number === example.number
                    && JSON.stringify(previousExample.columns) ===
                        JSON.stringify(columns)
                    && JSON.stringify(previousExample.digits) ===
                        JSON.stringify(digits)
                ))
                .map((previousExample) => Number(previousExample.correct_index));
            const decimalSeparatorIndex = columns.indexOf('.');
            const decimalIndex = decimalSeparatorIndex === -1
                ? -1
                : decimalSeparatorIndex + 1;
            const template = `repeat(${columns.length}, minmax(78px, 1fr))`;
            const chartWidth = Math.max(360, columns.length * 104);

            root.innerHTML = `
                <article class="place-value-method__card">
                    <p class="place-value-method__prompt">
                        ${escapeHtml(example.prompt)}
                    </p>
                    <div class="place-value-chart-wrapper">
                        <div
                            class="place-value-chart place-value-method__chart"
                            style="min-width: ${chartWidth}px;"
                        >
                            <div
                                class="place-value-row"
                                style="grid-template-columns: ${template};"
                            >
                                ${digits.map((digit, index) => {
                                    const isPreviouslyCorrect = previousCorrectIndices.includes(index);

                                    return `
                                    <div class="place-value-cell place-value-cell--digit place-value-method__digit-cell ${
                                        index === decimalIndex
                                            ? 'place-value-cell--decimal-start'
                                            : ''
                                    } ${isPreviouslyCorrect ? 'is-revealed' : ''}">
                                        ${digit === '.'
                                            ? '<span aria-hidden="true">.</span>'
                                            : `${isPreviouslyCorrect
                                                ? `<span class="place-value-method__answer-column">${escapeHtml(columns[index])}</span>`
                                                : ''}<button
                                                class="place-value-method__digit ${isPreviouslyCorrect ? 'is-correct' : ''}"
                                                type="button"
                                                data-digit-index="${index}"
                                                aria-label="Select digit ${escapeHtml(digit)}"
                                                ${isPreviouslyCorrect ? 'disabled' : ''}
                                            >${escapeHtml(digit)}</button>`
                                        }
                                    </div>
                                `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    <p class="place-value-method__feedback" hidden></p>
                </article>
            `;

            const feedback = root.querySelector(
                '.place-value-method__feedback'
            );

            setContinue(true, () => {});

            root.querySelectorAll('[data-digit-index]').forEach((button) => {
                button.addEventListener('click', () => {
                    const selectedIndex = Number(
                        button.dataset.digitIndex
                    );

                    if (selectedIndex !== correctIndex) {
                        button.classList.add('is-wrong');
                        feedback.textContent = example.incorrect_feedback ||
                            'Not quite. Try again.';
                        feedback.className =
                            'place-value-method__feedback is-wrong';
                        feedback.hidden = false;
                        return;
                    }

                    root.querySelectorAll('[data-digit-index]').forEach((item) => {
                        item.disabled = true;
                    });
                    button.classList.add('is-correct');
                    const digitCell = button.closest(
                        '.place-value-method__digit-cell'
                    );
                    const columnLabel = document.createElement('span');

                    columnLabel.className =
                        'place-value-method__answer-column';
                    columnLabel.textContent = columns[correctIndex];
                    digitCell?.prepend(columnLabel);
                    digitCell?.classList.add('is-revealed');
                    feedback.textContent = example.correct_feedback ||
                        'Correct.';
                    feedback.className =
                        'place-value-method__feedback is-correct';
                    feedback.hidden = false;

                    setContinue(false, () => {
                        if (exampleIndex === examples.length - 1) {
                            window.Maths1to9Lesson
                                ?.clearSectionAction?.('method');
                            completeSection('method');
                            root.innerHTML = `
                                <p class="place-value-method__complete">
                                    You can now identify a digit, name its
                                    column and find its value.
                                </p>
                            `;
                            return;
                        }

                        exampleIndex += 1;
                        render();
                    });
                });
            });
        }

        render();
    }

    /* ---------- mounting ----------
       The lesson engine renders the mount points after fetching
       lesson.json, so this script must wait for that render. It
       mounts on the engine's maths1to9:lesson-rendered event, and also tries
       immediately in case the DOM is already present (static pages).
       The data-mounted guard makes mounting idempotent. */

    function mountAll() {
        const singleRoot = document.getElementById(
            'place-value-interactive'
        );

        if (singleRoot && !singleRoot.dataset.mounted) {
            singleRoot.dataset.mounted = 'true';
            mountSingleNumber(singleRoot);
        }

        const productRoot = document.getElementById(
            'place-value-product-interactive'
        );

        if (productRoot && !productRoot.dataset.mounted) {
            productRoot.dataset.mounted = 'true';
            mountProductScaling(productRoot);
        }

        const guidedMethodRoot = document.getElementById(
            'place-value-guided-method'
        );

        if (guidedMethodRoot && !guidedMethodRoot.dataset.mounted) {
            guidedMethodRoot.dataset.mounted = 'true';
            mountGuidedMethod(guidedMethodRoot);
        }
    }

    document.addEventListener(
        'maths1to9:lesson-rendered',
        mountAll
    );

    document.addEventListener(
        'lesson:rendered',
        mountAll
    );

    mountAll();
})();
