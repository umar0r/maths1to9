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
        const originalNumber = String(
            root.dataset.number || '4270'
        ).replace(/[^0-9]/g, '');

        const columns = parseJsonData(
            root.dataset.columns
        );

        const onesIndex = findOnesIndex(columns);

        if (
            originalNumber === ''
            || !Array.isArray(columns)
            || columns.length === 0
            || onesIndex === -1
        ) {
            root.textContent =
                'The place-value interactive could not be loaded.';
            return;
        }

        const bounds = getMovementBounds(
            [originalNumber],
            columns,
            onesIndex
        );

        const originalStart = bounds.starts[0];

        gateSection('interactive');

        const state = {
            offset: 0,
            dragging: false,
            pointerId: null,
            startX: 0,
            distance: 0,
            completed: false
        };

        function isDecimalStart(index) {
            return index === onesIndex + 1;
        }

        function render() {
            if (!state.completed && state.offset !== 0) {
                state.completed = true;
                completeSection('interactive');
            }

            const displayedCells = getDisplayCells(
                originalNumber,
                state.offset,
                columns.length,
                onesIndex,
                originalStart
            );

            const displayedNumber =
                getDisplayedNumber(
                    displayedCells,
                    onesIndex
                );

            const original = addThousandsSeparators(
                originalNumber
                    .replace(/^0+(?=\d)/, '')
                    || '0'
            );

            const places = Math.abs(state.offset);
            const factor = 10 ** places;
            const direction = state.offset > 0 ? 'right' : 'left';
            const movement = places === 1 ? 'place' : 'places';
            const scale = addThousandsSeparators(factor);
            const numberJourney = Array.from(
                { length: places + 1 },
                (_, step) => formatCalculationNumber(
                    shiftWholeNumber(
                        originalNumber,
                        state.offset > 0 ? step : -step
                    )
                )
            ).join(' → ');
            const calculationNumber = formatCalculationNumber(
                displayedNumber
            );

            let resultPanel = `
                <p class="place-value-scaling-result__prompt">
                    Move the digits to see how their values change.
                </p>
            `;

            if (places > 0 && direction === 'right') {
                const fractionalNames = {
                    1: 'one tenth',
                    2: 'one hundredth',
                    3: 'one thousandth',
                    4: 'one ten-thousandth'
                };
                const valueDescription = fractionalNames[places]
                    ? `${fractionalNames[places]} as much`
                    : `1/${scale} as much`;
                const changeDescription = places === 1
                    ? 'The number has been divided by 10.'
                    : `Each move divides its value by 10, so ${places} moves divide the number by ${scale}.`;

                resultPanel = `
                    <p class="place-value-scaling-result__explanation">
                        You moved every digit ${places} ${movement} to the right.
                        Each digit is worth ${valueDescription}. ${changeDescription}
                    </p>
                    <p class="place-value-scaling-result__journey">
                        ${escapeHtml(numberJourney)}
                    </p>
                    <p class="place-value-scaling-result__equation">
                        ${escapeHtml(original)} ÷ ${escapeHtml(scale)} =
                        ${escapeHtml(calculationNumber)}
                    </p>
                    ${displayedNumber !== calculationNumber
                        ? `<p class="place-value-scaling-result__note">
                            ${escapeHtml(displayedNumber)} has the same value as
                            ${escapeHtml(calculationNumber)}.
                        </p>`
                        : ''}
                `;
            }

            if (places > 0 && direction === 'left') {
                const valueDescription = places === 1
                    ? '10 times as much'
                    : '100 times as much';

                resultPanel = `
                    <p class="place-value-scaling-result__explanation">
                        Each digit has moved ${places} ${movement} to the left,
                        so each digit is worth ${valueDescription}. The number has
                        been multiplied by ${scale}.
                    </p>
                    <p class="place-value-scaling-result__journey">
                        ${escapeHtml(numberJourney)}
                    </p>
                    <p class="place-value-scaling-result__equation">
                        ${escapeHtml(original)} × ${escapeHtml(scale)} =
                        ${escapeHtml(calculationNumber)}
                    </p>
                `;
            }

            const rowTemplate = (
                `120px repeat(${columns.length}, `
                + 'minmax(90px, 1fr))'
            );

            const chartWidth =
                120 + (columns.length * 110);

            root.innerHTML = `
                <p class="interactive-explanation">
                    <strong>← One place left: ×10</strong>
                    &nbsp;&nbsp;
                    <strong>One place right: ÷10 →</strong>
                </p>

                <div class="place-value-chart-wrapper">
                    <div
                        class="place-value-chart"
                        style="min-width: ${chartWidth}px;"
                    >
                        <div
                            class="place-value-row"
                            style="grid-template-columns: ${rowTemplate};"
                        >
                            <div class="place-value-cell place-value-cell--heading"></div>

                            ${columns.map((column, index) => `
                                <div class="place-value-cell place-value-cell--heading ${
                                    isDecimalStart(index)
                                        ? 'place-value-cell--decimal-start'
                                        : ''
                                }">
                                    ${escapeHtml(column)}
                                </div>
                            `).join('')}
                        </div>

                        <div
                            class="place-value-row"
                            data-role="single-digit-row"
                            role="slider"
                            tabindex="0"
                            aria-label="Drag the digits right to divide by 10, or left to multiply by 10"
                            aria-valuemin="${bounds.minimumOffset}"
                            aria-valuemax="${bounds.maximumOffset}"
                            aria-valuenow="${state.offset}"
                            style="
                                grid-template-columns: ${rowTemplate};
                                cursor: grab;
                                touch-action: pan-y;
                                user-select: none;
                            "
                        >
                            <div class="place-value-cell place-value-cell--row-label">
                                Number
                            </div>

                            ${displayedCells.map((digit, index) => `
                                <div class="place-value-cell place-value-cell--digit ${
                                    isDecimalStart(index)
                                        ? 'place-value-cell--decimal-start'
                                        : ''
                                }">
                                    <span
                                        data-role="single-movable-digit"
                                        style="
                                            display: inline-block;
                                            will-change: transform;
                                        "
                                    >
                                        ${escapeHtml(digit)}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="place-value-scaling-result" aria-live="polite">
                    ${resultPanel}
                </div>
            `;

            createDragController({
                root,
                state,
                minimumOffset:
                    bounds.minimumOffset,
                maximumOffset:
                    bounds.maximumOffset,
                getRows: () => [
                    root.querySelector(
                        '[data-role="single-digit-row"]'
                    )
                ].filter(Boolean),
                getMovableDigits: () => (
                    root.querySelectorAll(
                        '[data-role="single-movable-digit"]'
                    )
                ),
                render
            });
        }

        render();
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

                return `Start with ${addThousandsSeparators(example.factors[0])} × ${addThousandsSeparators(example.factors[1])} = ${addThousandsSeparators(example.product)}.`;
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

                root.innerHTML = `
                    <p class="place-value-method__prompt">${escapeHtml(example.prompt || 'Drag the numbers into the correct columns.')}</p>
                    <p class="interactive-explanation"><strong>← One place left: ×10</strong>&nbsp;&nbsp; <strong>One place right: ÷10 →</strong></p>
                    <div class="place-value-chart-wrapper">
                        <div class="place-value-chart" style="min-width: ${chartWidth}px;">
                            <div class="place-value-row" style="grid-template-columns: ${rowTemplate};">
                                <div class="place-value-cell place-value-cell--heading"></div>
                                ${columns.map((column, index) => `<div class="place-value-cell place-value-cell--heading ${isDecimalStart(index) ? 'place-value-cell--decimal-start' : ''}">${escapeHtml(column)}</div>`).join('')}
                            </div>
                            ${displayedRows.map((cells, rowIndex) => `
                                <div class="place-value-row" data-role="product-digit-row" data-row-index="${rowIndex}" role="slider" tabindex="0" aria-label="Move number ${rowIndex + 1}" aria-valuemin="${minimumOffsets[rowIndex]}" aria-valuemax="${maximumOffsets[rowIndex]}" aria-valuenow="${state.offsets[rowIndex]}" style="grid-template-columns: ${rowTemplate}; cursor: grab; touch-action: pan-y; user-select: none;">
                                    <div class="place-value-cell place-value-cell--row-label">Number ${rowIndex + 1}</div>
                                    ${cells.map((digit, index) => `<div class="place-value-cell place-value-cell--digit ${isDecimalStart(index) ? 'place-value-cell--decimal-start' : ''}"><span data-role="product-movable-digit" style="display: inline-block; will-change: transform;">${escapeHtml(digit)}</span></div>`).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <p class="interactive-explanation" aria-live="polite">${escapeHtml(getMessage())}</p>
                    <div class="interactive-equation" aria-live="polite">${escapeHtml(`${displayedFactors[0]} × ${displayedFactors[1]} = ${displayedProduct}`)}</div>
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
