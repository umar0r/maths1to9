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

            let equation = original;

            if (state.offset < 0) {
                const multiplier =
                    10 ** Math.abs(state.offset);

                equation = (
                    `${original} × `
                    + `${addThousandsSeparators(multiplier)} = `
                    + displayedNumber
                );
            }

            if (state.offset > 0) {
                const divisor =
                    10 ** state.offset;

                equation = (
                    `${original} ÷ `
                    + `${addThousandsSeparators(divisor)} = `
                    + displayedNumber
                );
            }

            const rowTemplate = (
                `120px repeat(${columns.length}, `
                + 'minmax(90px, 1fr))'
            );

            const chartWidth =
                120 + (columns.length * 110);

            root.innerHTML = `
                <p class="interactive-explanation">
                    <strong>← ×10</strong>
                    &nbsp;&nbsp; Drag the digits &nbsp;&nbsp;
                    <strong>÷10 →</strong>
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
                            aria-label="Move the digits left to multiply by 10 or right to divide by 10"
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

                <div
                    class="interactive-equation"
                    aria-live="polite"
                >
                    ${escapeHtml(equation)}
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
        const factors = parseJsonData(
            root.dataset.factors
        )
            .map((factor) => (
                String(factor)
                    .replace(/[^0-9]/g, '')
            ))
            .filter(Boolean);

        const product = String(
            root.dataset.product || '4005'
        ).replace(/[^0-9]/g, '');

        const columns = parseJsonData(
            root.dataset.columns
        );

        const onesIndex = findOnesIndex(columns);

        if (
            factors.length !== 2
            || product === ''
            || !Array.isArray(columns)
            || columns.length === 0
            || onesIndex === -1
        ) {
            root.textContent =
                'The multiplication interactive could not be loaded.';
            return;
        }

        const bounds = getMovementBounds(
            factors,
            columns,
            onesIndex
        );

        gateSection('product-interactive');

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

        function getScaleMessage() {
            if (state.offset === 0) {
                return (
                    'Start with 45 × 89 = 4,005.'
                );
            }

            const factorScale =
                10 ** Math.abs(state.offset);

            const productScale =
                10 ** (Math.abs(state.offset) * 2);

            if (state.offset > 0) {
                return (
                    `Both numbers ÷ `
                    + `${addThousandsSeparators(factorScale)}, `
                    + `so the product ÷ `
                    + `${addThousandsSeparators(productScale)}.`
                );
            }

            return (
                `Both numbers × `
                + `${addThousandsSeparators(factorScale)}, `
                + `so the product × `
                + `${addThousandsSeparators(productScale)}.`
            );
        }

        function render() {
            if (!state.completed && state.offset !== 0) {
                state.completed = true;
                completeSection('product-interactive');
            }

            const displayedRows = factors.map(
                (factor, index) => (
                    getDisplayCells(
                        factor,
                        state.offset,
                        columns.length,
                        onesIndex,
                        bounds.starts[index]
                    )
                )
            );

            const displayedFactors =
                displayedRows.map(
                    (cells) => (
                        getDisplayedNumber(
                            cells,
                            onesIndex
                        )
                    )
                );

            const displayedProduct =
                shiftWholeNumber(
                    product,
                    state.offset * 2
                );

            const rowTemplate = (
                `120px repeat(${columns.length}, `
                + 'minmax(90px, 1fr))'
            );

            const chartWidth =
                120 + (columns.length * 110);

            root.innerHTML = `
                <p class="interactive-explanation">
                    <strong>← ×10 each</strong>
                    &nbsp;&nbsp; Drag either row &nbsp;&nbsp;
                    <strong>÷10 each →</strong>
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

                        ${displayedRows.map((cells, rowIndex) => `
                            <div
                                class="place-value-row"
                                data-role="product-digit-row"
                                role="slider"
                                tabindex="0"
                                aria-label="Move both numbers left to multiply each by 10 or right to divide each by 10"
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
                                    Number ${rowIndex + 1}
                                </div>

                                ${cells.map((digit, index) => `
                                    <div class="place-value-cell place-value-cell--digit ${
                                        isDecimalStart(index)
                                            ? 'place-value-cell--decimal-start'
                                            : ''
                                    }">
                                        <span
                                            data-role="product-movable-digit"
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
                        `).join('')}
                    </div>
                </div>

                <p
                    class="interactive-explanation"
                    aria-live="polite"
                >
                    ${escapeHtml(getScaleMessage())}
                </p>

                <div
                    class="interactive-equation"
                    aria-live="polite"
                >
                    ${escapeHtml(
                        `${displayedFactors[0]} × `
                        + `${displayedFactors[1]} = `
                        + displayedProduct
                    )}
                </div>
            `;

            createDragController({
                root,
                state,
                minimumOffset:
                    bounds.minimumOffset,
                maximumOffset:
                    bounds.maximumOffset,
                getRows: () => (
                    Array.from(
                        root.querySelectorAll(
                            '[data-role="product-digit-row"]'
                        )
                    )
                ),
                getMovableDigits: () => (
                    root.querySelectorAll(
                        '[data-role="product-movable-digit"]'
                    )
                ),
                render
            });
        }

        render();
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
