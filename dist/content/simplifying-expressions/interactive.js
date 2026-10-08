(() => {
    'use strict';

    const SLUG = 'simplifying-expressions';
    const EVENT_NAMES = [
        'maths1to9:lesson-rendered',
        'lesson:rendered'
    ];

    let lessonData = null;
    let replayingWork = false;
    let interactiveRoot = null;

    window.Maths1to9Interactives ??= {};

    window.Maths1to9Interactives[SLUG] = function registerInteractive(root) {
        interactiveRoot = root;

        if (lessonData) {
            mountQuickCheck(root, lessonData.interactive || {});
        }
    };

    EVENT_NAMES.forEach((eventName) => {
        document.addEventListener(eventName, handleLessonRendered);
    });

    function handleLessonRendered(event) {
        const detail = event.detail || {};
        const lesson = detail.lesson || detail.data || {};

        if (
            detail.slug &&
            detail.slug !== SLUG
        ) {
            return;
        }

        if (
            lesson.slug &&
            lesson.slug !== SLUG
        ) {
            return;
        }

        lessonData = lesson;
        interactiveRoot =
            detail.interactiveRoot ||
            interactiveRoot ||
            document.getElementById(`${SLUG}-interactive`);

        enhanceLearn(lessonData);
        enhanceWorkedExamples(lessonData);
        addGotchas(lessonData);

        if (interactiveRoot) {
            mountQuickCheck(
                interactiveRoot,
                lessonData.interactive || {}
            );
        }
    }

    async function enhanceLearn(lesson) {
        const section = document.querySelector(
            '[data-lesson-section="explanation"]'
        );

        if (!section || section.dataset.interactivesMounted === 'true') {
            return;
        }

        let interactives = lesson.explanation?.interactives;

        if (!Array.isArray(interactives) || interactives.length === 0) {
            return;
        }

        section.dataset.interactivesMounted = 'true';
        const store = window.Maths1to9Progress;
        let state = await store.getLessonActivityState(SLUG, 'explanation');
        if (state?.contentVersion !== 1) state = {
            contentVersion: 1, interactives, currentIndex: 0, finished: false,
            widgets: interactives.map(() => ({ actions: [], firstCorrect: true, phase: 'answer', feedback: '', feedbackClass: '' }))
        };
        interactives = state.interactives;
        let restoringWork = true;
        function save() {
            if (restoringWork) return;
            store.saveLessonActivityState(SLUG, 'explanation', state);
        }
        const replayTasks = [];


        const host = document.createElement('div');
        host.className = 'worked-example-list';

        const cards = [];
        const completed = new Set();
        let currentIndex = state.currentIndex;

        document.dispatchEvent(
            new CustomEvent('maths1to9:section-gate', {
                detail: {sectionId: 'explanation'}
            })
        );

        interactives.forEach((interactive, index) => {
            const card = document.createElement('article');
            card.className = 'worked-example';
            card.hidden = index !== 0;

            card.innerHTML = `
                <p class="worked-example__number">
                    Learn example ${index + 1} of ${interactives.length}
                </p>

                <h3 class="worked-example__title">
                    ${escapeHtml(interactive.title || '')}
                </h3>

                <p>${escapeHtml(interactive.prompt || '')}</p>

                <div data-learn-widget></div>

                <div
                    class="question-feedback"
                    role="status"
                    aria-live="polite"
                    data-learn-feedback
                ></div>

            `;

            const widgetRoot = card.querySelector('[data-learn-widget]');
            const feedbackRoot = card.querySelector('[data-learn-feedback]');

            const markComplete = (message) => {
                if (completed.has(index)) {
                    return;
                }

                completed.add(index);
                state.widgets[index].phase = 'correct';

                feedbackRoot.className =
                    'question-feedback is-visible is-correct';
                feedbackRoot.textContent = message;

                save();
                updateFooterAction();
            };

            if (interactive.type === 'paint-merge') {
                mountPaintAndMerge(
                    widgetRoot,
                    feedbackRoot,
                    interactive,
                    markComplete
                );
            } else if (interactive.type === 'sorting-trays') {
                mountSortingTrays(
                    widgetRoot,
                    feedbackRoot,
                    interactive,
                    markComplete
                );
            } else if (interactive.type === 'algebra-tiles') {
                mountAlgebraTiles(
                    widgetRoot,
                    feedbackRoot,
                    interactive,
                    markComplete
                );
            }

            // Record semantic widget actions, not generated HTML. Replaying them
            // against the frozen activity restores its own visual and handlers.
            const widget = state.widgets[index];
            const selectorFor = element => {
                if (!element) return '';
                for (const attribute of ['data-paint-index', 'data-sort-term', 'data-place-family', 'data-collect-family', 'data-algebra-tile', 'data-sort-tray']) {
                    if (element.hasAttribute(attribute)) return `[${attribute}="${cssEscape(element.getAttribute(attribute))}"]`;
                }
                return '';
            };
            function record(action) {
                if (restoringWork || state.finished) return;
                widget.actions.push(action);
                save();
                window.setTimeout(() => {
                    widget.feedback = feedbackRoot.textContent;
                    widget.feedbackClass = feedbackRoot.className;
                    if (feedbackRoot.classList.contains('is-incorrect')) {
                        widget.firstCorrect = false;
                        widget.phase = 'wrong';
                    }
                    save();
                }, 0);
            }
            widgetRoot.addEventListener('click', event => {
                const target = event.target.closest('button');
                if (target?.disabled) return;
                const selector = selectorFor(target);
                if (selector) record({ type: 'click', selector });
            }, true);
            widgetRoot.addEventListener('drop', event => {
                const target = event.target.closest('[data-sort-tray], [data-algebra-tile]');
                const selector = selectorFor(target);
                const source = event.dataTransfer?.getData('text/plain');
                if (selector && source) record({ type: 'drop', selector, source });
            }, true);
            replayTasks.push(async () => {
                for (const action of widget.actions) {
                    const target = widgetRoot.querySelector(action.selector);
                    if (!target) continue;
                    if (action.type === 'click') target.click();
                    else {
                        const source = widgetRoot.querySelector(`[data-sort-term="${cssEscape(action.source)}"], [data-algebra-tile="${cssEscape(action.source)}"]`);
                        const transfer = new DataTransfer();
                        transfer.setData('text/plain', action.source);
                        source?.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
                        target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
                    }
                    // Settle the activity's completion promises without replaying animation.
                    await new Promise(resolve => window.setTimeout(resolve, 0));
                }
                widget.feedback = feedbackRoot.textContent;
                widget.feedbackClass = feedbackRoot.className;
                if (feedbackRoot.classList.contains('is-incorrect')) {
                    widget.firstCorrect = false;
                    widget.phase = 'wrong';
                }

            });

            cards.push(card);
            host.append(card);
        });

        function showCard(index) {
            currentIndex = index;
            state.currentIndex = index;
            save();

            cards.forEach((card, cardIndex) => {
                card.hidden = cardIndex !== currentIndex;
            });

            updateFooterAction();
        }

        function advanceExample() {
            if (!completed.has(currentIndex)) {
                return;
            }

            if (currentIndex < cards.length - 1) {
                showCard(currentIndex + 1);
                return;
            }

            const feedback = cards[currentIndex].querySelector(
                '[data-learn-feedback]'
            );

            feedback.className =
                'question-feedback is-visible is-correct';
            feedback.textContent =
                'Learn complete. Like terms have matching letter parts and powers.';

            state.finished = true;
            save();
            cards.forEach(card => { card.hidden = false; card.querySelectorAll('button').forEach(button => { button.disabled = true; }); });
            window.Maths1to9Lesson
                ?.clearSectionAction?.('explanation');

            document.dispatchEvent(
                new CustomEvent('maths1to9:section-complete', {
                    detail: {sectionId: 'explanation'}
                })
            );
        }

        function updateFooterAction() {
            if (restoringWork) return;
            const api = window.Maths1to9Lesson;

            if (!completed.has(currentIndex)) {
                api?.clearSectionAction?.('explanation');
                return;
            }

            api?.setSectionAction?.('explanation', {
                label: currentIndex === cards.length - 1
                    ? 'Finish Learn'
                    : 'Next example',
                disabled: false,
                onClick: advanceExample
            });
        }

        section.append(host);
        replayingWork = true;
        for (const replay of replayTasks) await replay();
        replayingWork = false;
        restoringWork = false;
        showCard(state.currentIndex);
        if (state.finished) advanceExample();

    }

    function mountPaintAndMerge(
        root,
        feedback,
        interactive,
        onComplete
    ) {
        const terms = Array.isArray(interactive.terms)
            ? interactive.terms
            : [];

        const targetFamily = interactive.targetFamily || '';
        const selected = new Set();
        let merging = false;

        root.innerHTML = `
            <div
                class="question-options"
                role="group"
                aria-label="Terms in the expression"
                data-paint-row
            >
                ${terms.map((term, index) => `
                    <button
                        class="button"
                        type="button"
                        data-paint-index="${index}"
                    >
                        ${escapeHtml(term.text)}
                    </button>
                `).join('')}
            </div>

            <div data-paint-result></div>
        `;

        const row = root.querySelector('[data-paint-row]');
        const result = root.querySelector('[data-paint-result]');

        row.addEventListener('click', (event) => {
            const button = event.target.closest('[data-paint-index]');

            if (!button || merging) {
                return;
            }

            const index = Number(button.dataset.paintIndex);
            const term = terms[index];

            if (!term) {
                return;
            }

            if (term.family !== targetFamily) {
                feedback.className =
                    'question-feedback is-visible is-incorrect';
                feedback.textContent =
                    `${term.text} is not an ${targetFamily} term.`;

                animateElement(
                    button,
                    [
                        {transform: 'translateX(0)'},
                        {transform: 'translateX(-8px)'},
                        {transform: 'translateX(8px)'},
                        {transform: 'translateX(0)'}
                    ],
                    260
                );

                return;
            }

            if (selected.has(index)) {
                selected.delete(index);
                button.classList.remove('button--primary');
            } else {
                selected.add(index);
                button.classList.add('button--primary');
            }

            feedback.className = 'question-feedback';
            feedback.textContent = '';

            const targetIndexes = terms
                .map((item, itemIndex) => ({
                    family: item.family,
                    index: itemIndex
                }))
                .filter((item) => item.family === targetFamily)
                .map((item) => item.index);

            const allSelected = targetIndexes.every(
                (itemIndex) => selected.has(itemIndex)
            );

            if (!allSelected) {
                return;
            }

            merging = true;

            const selectedButtons = targetIndexes
                .map((itemIndex) =>
                    row.querySelector(
                        `[data-paint-index="${itemIndex}"]`
                    )
                )
                .filter(Boolean);

            const rowBox = row.getBoundingClientRect();
            const mergeX = rowBox.left + rowBox.width / 2;

            const animations = selectedButtons.map(
                (selectedButton) => {
                    const box = selectedButton.getBoundingClientRect();
                    const buttonX = box.left + box.width / 2;
                    const distance = mergeX - buttonX;

                    return animateElement(
                        selectedButton,
                        [
                            {
                                transform: 'translateX(0) scale(1)',
                                opacity: 1
                            },
                            {
                                transform:
                                    `translateX(${distance}px) scale(0.85)`,
                                opacity: 0.2
                            }
                        ],
                        520
                    );
                }
            );

            Promise.all(animations).then(() => {
                row.innerHTML = `
                    <button
                        class="button button--primary"
                        type="button"
                        disabled
                    >
                        ${escapeHtml(interactive.mergedTerm || '')}
                    </button>

                    <button
                        class="button"
                        type="button"
                        disabled
                    >
                        ${escapeHtml(interactive.remainingTerm || '')}
                    </button>
                `;

                result.innerHTML = `
                    <article class="question-card">
                        <p>
                            ${escapeHtml(
                                interactive.mergeCalculation || ''
                            )}
                        </p>

                        <p>
                            <strong>
                                ${escapeHtml(
                                    interactive.finalExpression || ''
                                )}
                            </strong>
                        </p>
                    </article>
                `;

                onComplete(
                    'The a terms have merged. The number stays separate.'
                );
            });
        });
    }

    function mountSortingTrays(
        root,
        feedback,
        interactive,
        onComplete
    ) {
        const terms = Array.isArray(interactive.terms)
            ? interactive.terms
            : [];

        const trays = Array.isArray(interactive.trays)
            ? interactive.trays
            : [];

        const collectedFamilies = new Set();
        let draggedId = '';
        let selectedTile = null;

        root.innerHTML = `
            <article class="question-card">
                <p><strong>Terms</strong></p>
                <p>Select a term, then choose its tray below. You can also drag terms into trays.</p>

                <div
                    class="question-options"
                    data-sorting-pile
                >
                    ${terms.map((term) => `
                        <button
                            class="button"
                            type="button"
                            draggable="true"
                            aria-pressed="false"
                            data-sort-term="${escapeAttribute(term.id)}"
                            data-family="${escapeAttribute(term.family)}"
                        >
                            ${escapeHtml(term.text)}
                        </button>
                    `).join('')}
                </div>
            </article>

            <div class="worked-example-list" data-sorting-trays>
                ${trays.map((tray) => `
                    <article
                        class="question-card"
                        data-sort-tray="${escapeAttribute(tray.family)}"
                    >
                        <p>
                            <strong>${escapeHtml(tray.label)}</strong>
                        </p>

                        <button
                            class="button"
                            type="button"
                            data-place-family="${escapeAttribute(tray.family)}"
                        >Place selected term in ${escapeHtml(tray.label)}</button>

                        <div
                            class="question-options"
                            data-tray-body
                            aria-label="${escapeAttribute(tray.label)}"
                        ></div>

                        <button
                            class="button button--primary"
                            type="button"
                            data-collect-family="${escapeAttribute(tray.family)}"
                            hidden
                        >
                            Collect
                        </button>

                        <div data-tray-result></div>
                    </article>
                `).join('')}
            </div>

            <div data-sorting-result></div>
        `;

        const pile = root.querySelector('[data-sorting-pile]');
        const result = root.querySelector('[data-sorting-result]');

        root.addEventListener('dragstart', (event) => {
            const tile = event.target.closest('[data-sort-term]');

            if (!tile || tile.draggable === false) {
                return;
            }

            selectTile(null);
            draggedId = tile.dataset.sortTerm || '';

            event.dataTransfer?.setData(
                'text/plain',
                draggedId
            );

            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
        });

        root.addEventListener('dragend', () => {
            draggedId = '';
        });

        root.querySelectorAll('[data-sort-tray]').forEach((tray) => {
            tray.addEventListener('dragover', (event) => {
                event.preventDefault();

                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'move';
                }
            });

            tray.addEventListener('drop', (event) => {
                event.preventDefault();

                const id =
                    event.dataTransfer?.getData('text/plain') ||
                    draggedId;

                const tile = root.querySelector(
                    `[data-sort-term="${cssEscape(id)}"]`
                );

                placeTile(tile, tray);
            });
        });

        function selectTile(tile) {
            selectedTile = tile;
            root.querySelectorAll('[data-sort-term]').forEach((item) => {
                item.setAttribute('aria-pressed', String(item === tile));
                item.classList.toggle('button--primary', item === tile);
            });
        }

        function placeTile(tile, tray) {
            if (!tile || tile.disabled || collectedFamilies.has(tray.dataset.sortTray)) {
                return;
            }

            const family = tile.dataset.family || '';
            const trayFamily = tray.dataset.sortTray || '';

            if (family !== trayFamily) {
                feedback.className =
                    'question-feedback is-visible is-incorrect';
                feedback.textContent =
                    `${tile.textContent.trim()} does not belong in ${trayFamily === 'number' ? 'the numbers tray' : `the ${trayFamily} tray`}.`;

                animateElement(
                    tray,
                    [
                        {transform: 'translateX(0)'},
                        {transform: 'translateX(-7px)'},
                        {transform: 'translateX(7px)'},
                        {transform: 'translateX(0)'}
                    ],
                    260
                );

                return;
            }

            selectTile(null);
            const trayBody = tray.querySelector('[data-tray-body]');
            trayBody.append(tile);

            feedback.className = 'question-feedback';
            feedback.textContent = '';

            updateCollectButton(trayFamily);
        }

        root.addEventListener('click', (event) => {
            const tile = event.target.closest('[data-sort-term]');
            if (tile && !tile.disabled) {
                selectTile(selectedTile === tile ? null : tile);
                return;
            }
            const placeButton = event.target.closest('[data-place-family]');
            if (placeButton) {
                if (selectedTile) {
                    placeTile(selectedTile, placeButton.closest('[data-sort-tray]'));
                } else {
                    feedback.className = 'question-feedback is-visible';
                    feedback.textContent = 'Select a term first, then choose its tray.';
                }
                return;
            }

            const collectButton = event.target.closest(
                '[data-collect-family]'
            );

            if (!collectButton) {
                return;
            }

            if (collectButton.disabled || collectButton.hidden) return;
            collectButton.disabled = true;
            selectTile(null);

            const family = collectButton.dataset.collectFamily || '';
            const tray = root.querySelector(
                `[data-sort-tray="${cssEscape(family)}"]`
            );

            const trayData = trays.find(
                (item) => item.family === family
            );

            if (!tray || !trayData) {
                return;
            }

            const body = tray.querySelector('[data-tray-body]');
            const tiles = Array.from(
                body.querySelectorAll('[data-sort-term]')
            );

            tiles.forEach((tile) => {
                tile.draggable = false;
                tile.disabled = true;
            });

            Promise.all(
                tiles.map((tile) =>
                    animateElement(
                        tile,
                        [
                            {
                                transform: 'scale(1)',
                                opacity: 1
                            },
                            {
                                transform: 'scale(0.75)',
                                opacity: 0
                            }
                        ],
                        340
                    )
                )
            ).then(() => {
                body.innerHTML = `
                    <button
                        class="button button--primary"
                        type="button"
                        disabled
                    >
                        ${escapeHtml(trayData.result)}
                    </button>
                `;

                tray.querySelector('[data-tray-result]').innerHTML = `
                    <p>${escapeHtml(trayData.calculation)}</p>
                `;

                collectButton.hidden = true;
                tray.querySelector('[data-place-family]').disabled = true;
                collectedFamilies.add(family);

                if (collectedFamilies.size !== trays.length) {
                    return;
                }

                result.innerHTML = `
                    <article class="question-card">
                        <p>
                            <strong>
                                ${escapeHtml(
                                    interactive.finalExpression || ''
                                )}
                            </strong>
                        </p>
                    </article>
                `;

                onComplete(
                    'Every term has been sorted and collected with its matching group.'
                );
            });
        });

        function updateCollectButton(family) {
            const tray = root.querySelector(
                `[data-sort-tray="${cssEscape(family)}"]`
            );

            if (!tray) {
                return;
            }

            const neededCount = terms.filter(
                (term) => term.family === family
            ).length;

            const placedCount = tray.querySelectorAll(
                '[data-sort-term]'
            ).length;

            const button = tray.querySelector(
                '[data-collect-family]'
            );

            button.hidden =
                placedCount !== neededCount ||
                collectedFamilies.has(family);
        }
    }

    function mountAlgebraTiles(
        root,
        feedback,
        interactive,
        onComplete
    ) {
        const positiveCount = Number(interactive.positiveCount) || 0;
        const negativeCount = Number(interactive.negativeCount) || 0;
        const letter = interactive.letter || 'x';

        const tiles = [];

        for (let index = 0; index < positiveCount; index += 1) {
            tiles.push({
                id: `positive-${index}`,
                sign: 1,
                text: letter
            });
        }

        for (let index = 0; index < negativeCount; index += 1) {
            tiles.push({
                id: `negative-${index}`,
                sign: -1,
                text: `−${letter}`
            });
        }

        let draggedId = '';
        let selectedTile = null;
        let pairsMade = 0;
        let finished = false;

        root.innerHTML = `
            <article class="question-card">
                <p>
                    <strong>
                        ${positiveCount}${escapeHtml(letter)}
                        −
                        ${negativeCount}${escapeHtml(letter)}
                    </strong>
                </p>

                <p>
                    Green tiles are +${escapeHtml(letter)}.
                    Red tiles are −${escapeHtml(letter)}.
                </p>

                <p>Select a tile, then select a tile with the opposite sign to make a zero pair. You can also drag one onto the other.</p>

                <div
                    class="question-options"
                    data-algebra-tiles
                >
                    ${tiles.map((tile) =>
                        renderAlgebraTile(tile, letter)
                    ).join('')}
                </div>

                <p data-zero-pairs>
                    Zero pairs made: 0
                </p>
            </article>

            <div data-algebra-result></div>
        `;

        const tileArea = root.querySelector('[data-algebra-tiles]');
        const pairCounter = root.querySelector('[data-zero-pairs]');
        const result = root.querySelector('[data-algebra-result]');

        tileArea.addEventListener('dragstart', (event) => {
            const tile = event.target.closest('[data-algebra-tile]');

            if (!tile || tile.disabled || tile.dataset.pairing || finished) {
                return;
            }

            selectTile(null);
            draggedId = tile.dataset.algebraTile || '';

            event.dataTransfer?.setData(
                'text/plain',
                draggedId
            );

            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
        });

        tileArea.addEventListener('dragover', (event) => {
            const target = event.target.closest('[data-algebra-tile]');

            if (!target || finished) {
                return;
            }

            const source = tileArea.querySelector(
                `[data-algebra-tile="${cssEscape(draggedId)}"]`
            );

            if (
                source &&
                source !== target &&
                source.dataset.sign !== target.dataset.sign
            ) {
                event.preventDefault();

                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'move';
                }
            }
        });

        tileArea.addEventListener('drop', (event) => {
            event.preventDefault();

            if (finished) {
                return;
            }

            const target = event.target.closest('[data-algebra-tile]');
            const id =
                event.dataTransfer?.getData('text/plain') ||
                draggedId;

            const source = tileArea.querySelector(
                `[data-algebra-tile="${cssEscape(id)}"]`
            );

            pairTiles(source, target);
        });

        function selectTile(tile) {
            selectedTile = tile;
            tileArea.querySelectorAll('[data-algebra-tile]').forEach((item) => {
                item.setAttribute('aria-pressed', String(item === tile));
                item.classList.toggle('button--primary', item === tile);
            });
        }

        tileArea.addEventListener('click', (event) => {
            const tile = event.target.closest('[data-algebra-tile]');
            if (!tile || tile.disabled || tile.dataset.pairing || finished) return;
            if (!selectedTile || selectedTile === tile) {
                selectTile(selectedTile === tile ? null : tile);
            } else {
                pairTiles(selectedTile, tile);
            }
        });

        function pairTiles(source, target) {
            if (finished || !source || !target || source === target || source.disabled || target.disabled || source.dataset.pairing || target.dataset.pairing) {
                return;
            }

            if (source.dataset.sign === target.dataset.sign) {
                feedback.className =
                    'question-feedback is-visible is-incorrect';
                feedback.textContent =
                    'A zero pair needs one positive tile and one negative tile.';
                return;
            }

            selectTile(null);
            source.dataset.pairing = 'true';
            target.dataset.pairing = 'true';
            source.setAttribute('aria-disabled', 'true');
            target.setAttribute('aria-disabled', 'true');
            source.draggable = false;
            target.draggable = false;

            const sourceAnimation = animateElement(
                source,
                [
                    {
                        transform: 'scale(1) rotate(0deg)',
                        opacity: 1
                    },
                    {
                        transform: 'scale(0) rotate(90deg)',
                        opacity: 0
                    }
                ],
                360
            );

            const targetAnimation = animateElement(
                target,
                [
                    {
                        transform: 'scale(1) rotate(0deg)',
                        opacity: 1
                    },
                    {
                        transform: 'scale(0) rotate(-90deg)',
                        opacity: 0
                    }
                ],
                360
            );

            Promise.all([
                sourceAnimation,
                targetAnimation
            ]).then(() => {
                source.remove();
                target.remove();

                pairsMade += 1;
                pairCounter.textContent =
                    `Zero pairs made: ${pairsMade}`;

                feedback.className =
                    'question-feedback is-visible is-correct';
                feedback.textContent =
                    `+${letter} and −${letter} make 0, so both tiles disappear.`;

                const negativeTiles = tileArea.querySelectorAll(
                    '[data-sign="-1"]'
                );

                if (negativeTiles.length > 0) {
                    return;
                }

                finished = true;
                tileArea.querySelectorAll('[data-algebra-tile]').forEach((tile) => {
                    tile.disabled = true;
                    tile.draggable = false;
                });

                const remainingPositive = tileArea.querySelectorAll(
                    '[data-sign="1"]'
                ).length;

                result.innerHTML = `
                    <article class="question-card">
                        <p>
                            ${pairsMade} zero pairs disappear.
                        </p>

                        <p>
                            ${remainingPositive} positive
                            ${escapeHtml(letter)} tiles remain.
                        </p>

                        <p>
                            <strong>
                                ${escapeHtml(
                                    interactive.finalExpression || ''
                                )}
                            </strong>
                        </p>
                    </article>
                `;

                onComplete(
                    'The positive and negative tiles formed zero pairs, leaving five positive m tiles.'
                );
            });

        }
    }

    function renderAlgebraTile(tile, letter) {
        const positive = tile.sign > 0;
        const fill = positive ? '#22C55E' : '#EF4444';
        const stroke = positive ? '#15803D' : '#B91C1C';
        const label = positive ? letter : `−${letter}`;

        return `
            <button
                class="button"
                type="button"
                draggable="true"
                aria-pressed="false"
                data-algebra-tile="${escapeAttribute(tile.id)}"
                data-sign="${tile.sign}"
                aria-label="${positive ? 'positive' : 'negative'} ${escapeAttribute(letter)} tile"
            >
                <svg
                    viewBox="0 0 60 116"
                    width="48"
                    height="94"
                    aria-hidden="true"
                >
                    <rect
                        x="5"
                        y="5"
                        width="50"
                        height="106"
                        rx="9"
                        fill="${fill}"
                        stroke="${stroke}"
                        stroke-width="4"
                    />

                    <text
                        x="30"
                        y="66"
                        text-anchor="middle"
                        fill="#FFFFFF"
                        font-size="22"
                        font-family="Nunito, Arial, sans-serif"
                        font-weight="800"
                    >
                        ${escapeHtml(label)}
                    </text>
                </svg>
            </button>
        `;
    }

    function animateElement(element, keyframes, duration) {
        if (replayingWork) return Promise.resolve();
        if (
            element &&
            typeof element.animate === 'function'
        ) {
            const animation = element.animate(
                keyframes,
                {
                    duration,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                }
            );

            return animation.finished.catch(() => undefined);
        }

        return Promise.resolve();
    }

    function cssEscape(value) {
        if (
            window.CSS &&
            typeof window.CSS.escape === 'function'
        ) {
            return window.CSS.escape(String(value));
        }

        return String(value).replace(
            /["\\]/g,
            '\\$&'
        );
    }

    function enhanceWorkedExamples(lesson) {
        const section = document.querySelector(
            '[data-lesson-section="worked-examples"]'
        );

        if (!section || section.dataset.visualsMounted === 'true') {
            return;
        }

        const examples = Array.isArray(lesson.worked_examples)
            ? lesson.worked_examples
            : [];

        const cards = Array.from(
            section.querySelectorAll('.worked-example')
        );

        if (cards.length === 0 || examples.length === 0) {
            return;
        }

        section.dataset.visualsMounted = 'true';

        cards.slice(0, examples.length).forEach((card, index) => {
            const visual = examples[index]?.visual;

            if (!visual) {
                return;
            }

            const host = document.createElement('div');
            host.dataset.exampleVisual = 'true';

            let stage = 0;

            const controls = document.createElement('div');
            controls.className = 'lesson-actions';

            const next = document.createElement('button');
            next.className = 'button button--primary';
            next.type = 'button';
            next.textContent = '>';
            next.setAttribute('aria-label', 'Next example step');

            function render() {
                host.innerHTML = renderExampleSvg(
                    visual,
                    stage,
                    examples[index].answer || ''
                );

                next.disabled = stage === 2;
            }

            next.addEventListener('click', () => {
                if (stage < 2) {
                    stage += 1;
                    render();
                }
            });

            controls.append(next);
            render();

            const title = card.querySelector(
                '.worked-example__title'
            );

            if (title) {
                title.after(host, controls);
            } else {
                card.prepend(host, controls);
            }
        });
    }

    function renderExampleSvg(visual, stage, answer) {
        const terms = Array.isArray(visual.terms)
            ? visual.terms
            : [];

        const groups = Array.isArray(visual.groups)
            ? visual.groups
            : [];

        const width = 900;
        const cardWidth = Math.min(150, Math.floor(700 / Math.max(terms.length, 1)));
        const gap = 18;
        const rowWidth = terms.length * cardWidth + Math.max(0, terms.length - 1) * gap;
        const startX = (width - rowWidth) / 2;
        const familyColours = familyColourMap(terms);

        const termCards = terms.map((term, index) => {
            const x = startX + index * (cardWidth + gap);
            const colour = stage === 0
                ? {fill: '#FFFFFF', stroke: '#D1D5DB', text: '#111827'}
                : familyColours[term.family];

            return `
                <rect
                    x="${x}"
                    y="45"
                    width="${cardWidth}"
                    height="78"
                    rx="16"
                    fill="${colour.fill}"
                    stroke="${colour.stroke}"
                    stroke-width="4"
                />
                ${svgText(
                    x + cardWidth / 2,
                    94,
                    term.text || '',
                    29,
                    'middle',
                    colour.text
                )}
            `;
        }).join('');

        let groupMarkup = '';

        if (stage >= 1) {
            const groupWidth = groups.length === 1 ? 360 : 330;
            const groupGap = 36;
            const totalWidth =
                groups.length * groupWidth +
                Math.max(0, groups.length - 1) * groupGap;
            const groupStart = (width - totalWidth) / 2;

            groupMarkup = groups.map((group, index) => {
                const x = groupStart + index * (groupWidth + groupGap);
                const groupFamily = findFamilyForGroup(group, terms);
                const colour =
                    familyColours[groupFamily] ||
                    {fill: '#F3F4F6', stroke: '#6B7280', text: '#111827'};

                return `
                    <line
                        x1="${width / 2}"
                        y1="135"
                        x2="${x + groupWidth / 2}"
                        y2="190"
                        stroke="${colour.stroke}"
                        stroke-width="4"
                    />
                    <rect
                        x="${x}"
                        y="190"
                        width="${groupWidth}"
                        height="${stage === 1 ? 92 : 145}"
                        rx="18"
                        fill="${colour.fill}"
                        stroke="${colour.stroke}"
                        stroke-width="4"
                    />
                    ${svgText(
                        x + groupWidth / 2,
                        225,
                        group.label || '',
                        20,
                        'middle',
                        colour.text
                    )}
                    ${
                        stage >= 2
                            ? svgText(
                                x + groupWidth / 2,
                                270,
                                group.calculation || '',
                                25,
                                'middle',
                                '#111827'
                            )
                            : ''
                    }
                    ${
                        stage >= 2
                            ? svgText(
                                x + groupWidth / 2,
                                315,
                                group.result || '',
                                32,
                                'middle',
                                colour.text
                            )
                            : ''
                    }
                `;
            }).join('');
        }

        const answerMarkup = stage >= 2
            ? `
                <rect
                    x="300"
                    y="365"
                    width="300"
                    height="72"
                    rx="18"
                    fill="#ECFDF5"
                    stroke="#16A34A"
                    stroke-width="4"
                />
                ${svgText(450, 411, answer, 34, 'middle', '#166534')}
            `
            : '';

        return `
            <svg
                viewBox="0 0 900 460"
                width="100%"
                height="460"
                role="img"
                aria-label="A graphical explanation of the worked example"
            >
                ${termCards}
                ${groupMarkup}
                ${answerMarkup}
            </svg>
        `;
    }

    function familyColourMap(terms) {
        const palette = [
            {fill: '#DBEAFE', stroke: '#2563EB', text: '#1D4ED8'},
            {fill: '#FCE7F3', stroke: '#DB2777', text: '#BE185D'},
            {fill: '#FEF3C7', stroke: '#D97706', text: '#B45309'},
            {fill: '#EDE9FE', stroke: '#7C3AED', text: '#6D28D9'}
        ];

        const map = {};
        let colourIndex = 0;

        terms.forEach((term) => {
            const family = term.family || 'term';

            if (!map[family]) {
                map[family] = palette[colourIndex % palette.length];
                colourIndex += 1;
            }
        });

        return map;
    }

    function findFamilyForGroup(group, terms) {
        const label = String(group.label || '').toLowerCase();

        for (const term of terms) {
            const family = String(term.family || '');

            if (
                label.includes(family.toLowerCase()) ||
                (family === 'number' && label.includes('number'))
            ) {
                return family;
            }
        }

        return terms[0]?.family || 'term';
    }

    function addGotchas(lesson) {
        const section = document.querySelector(
            '[data-lesson-section="worked-examples"]'
        );

        if (!section || section.dataset.gotchasMounted === 'true') {
            return;
        }

        const gotchas = Array.isArray(lesson.commonGotchas)
            ? lesson.commonGotchas
            : [];

        if (gotchas.length === 0) {
            return;
        }

        section.dataset.gotchasMounted = 'true';

        const heading = document.createElement('h3');
        heading.className = 'lesson-section__title';
        heading.textContent = 'Common gotchas';

        const list = document.createElement('div');
        list.className = 'worked-example-list';

        gotchas.forEach((gotcha, index) => {
            const card = document.createElement('article');
            card.className = 'worked-example';

            card.innerHTML = `
                <p class="worked-example__number">
                    Gotcha ${index + 1}
                </p>
                <h4 class="worked-example__title">
                    ${escapeHtml(gotcha.title || '')}
                </h4>
                <p>
                    <strong>${escapeHtml(gotcha.example || '')}</strong>
                </p>
                <p>${escapeHtml(gotcha.text || '')}</p>
            `;

            list.append(card);
        });

        section.append(heading, list);
    }

    async function mountQuickCheck(root, interactive) {
        if (!root || root.dataset.mounted === 'true') {
            return;
        }

        let terms = Array.isArray(interactive.terms)
            ? interactive.terms
            : [];

        if (terms.length === 0) {
            return;
        }

        root.dataset.mounted = 'true';

        const store = window.Maths1to9Progress;
        let state = await store.getLessonActivityState(SLUG, 'interactive');
        if (state?.contentVersion !== 1) state = { contentVersion: 1, interactive, selected: [], phase: 'a', answers: [], feedback: '', firstCorrect: true };
        interactive = state.interactive;
        terms = interactive.terms;
        const selected = new Set(state.selected);
        let phase = state.phase;
        function save() {
            state.phase = phase;
            state.selected = [...selected];
            store.saveLessonActivityState(SLUG, 'interactive', state);
        }

        document.dispatchEvent(
            new CustomEvent('maths1to9:section-gate', {
                detail: {sectionId: 'interactive'}
            })
        );

        function expectedFamily() {
            return phase === 'a' ? 'a' : 'number';
        }

        function render() {
            save();
            const finished = phase === 'finished';
            const prompt =
                phase === 'a'
                    ? 'Select the a terms.'
                    : phase === 'number'
                        ? 'Now select the numbers.'
                        : 'The like terms have been collected.';

            root.innerHTML = `
                <article class="question-card">
                    <p class="question-prompt">
                        ${escapeHtml(prompt)}
                    </p>

                    <div
                        class="question-options"
                        role="group"
                        aria-label="Terms in the expression"
                    >
                        ${terms.map((term, index) => `
                            <button
                                class="button ${
                                    selected.has(index)
                                        ? 'button--primary'
                                        : ''
                                }"
                                type="button"
                                data-term-index="${index}"
                                ${finished ? 'disabled' : ''}
                            >
                                ${escapeHtml(term.text)}
                            </button>
                        `).join('')}
                    </div>

                    ${
                        finished
                            ? `
                                <svg
                                    viewBox="0 0 800 290"
                                    width="100%"
                                    height="290"
                                    role="img"
                                    aria-label="2a plus 5a is 7a, and 6 minus 1 is 5"
                                >
                                    <rect x="70" y="40" width="280" height="110" rx="18"
                                        fill="#DBEAFE" stroke="#2563EB" stroke-width="4" />
                                    ${svgText(210, 82, '2a + 5a', 28, 'middle', '#1D4ED8')}
                                    ${svgText(210, 125, '2 + 5 = 7', 24, 'middle', '#111827')}

                                    <rect x="450" y="40" width="280" height="110" rx="18"
                                        fill="#FEF3C7" stroke="#D97706" stroke-width="4" />
                                    ${svgText(590, 82, '6 − 1', 28, 'middle', '#B45309')}
                                    ${svgText(590, 125, '6 − 1 = 5', 24, 'middle', '#111827')}

                                    <rect x="250" y="190" width="300" height="72" rx="18"
                                        fill="#ECFDF5" stroke="#16A34A" stroke-width="4" />
                                    ${svgText(400, 237, interactive.answer || '', 34, 'middle', '#166534')}
                                </svg>
                            `
                            : ''
                    }

                    <div
                        class="question-feedback"
                        role="status"
                        aria-live="polite"
                        data-feedback
                    ></div>
                </article>
            `;

            if (state.feedback) {
                const feedback = root.querySelector('[data-feedback]');
                feedback.textContent = state.feedback;
                feedback.className = 'question-feedback is-visible is-incorrect';
            }
            if (finished) {
                document.dispatchEvent(
                    new CustomEvent(
                        'maths1to9:section-complete',
                        {
                            detail: {sectionId: 'interactive'}
                        }
                    )
                );
                return;
            }

            root.querySelectorAll('[data-term-index]').forEach((button) => {
                button.addEventListener('click', () => {
                    const index = Number(button.dataset.termIndex);
                    const term = terms[index];
                    const feedback = root.querySelector('[data-feedback]');

                    const correct = Boolean(term && term.family === expectedFamily());
                    state.answers.push({ phase, selected: index, text: term?.text || '', correct });
                    if (!correct) {
                        state.firstCorrect = false;
                        state.feedback = 'Those terms do not have the same letter part.';
                        save();
                        feedback.className =
                            'question-feedback is-visible is-incorrect';
                        feedback.textContent =
                            'Those terms do not have the same letter part.';
                        return;
                    }

                    state.feedback = '';
                    if (selected.has(index)) {
                        selected.delete(index);
                    } else {
                        selected.add(index);
                    }

                    const needed = terms
                        .map((item, itemIndex) => ({
                            family: item.family,
                            index: itemIndex
                        }))
                        .filter((item) => item.family === expectedFamily())
                        .map((item) => item.index);

                    const complete = needed.every((itemIndex) =>
                        selected.has(itemIndex)
                    );

                    if (complete) {
                        if (phase === 'a') {
                            phase = 'number';
                        } else {
                            phase = 'finished';
                        }
                    }

                    render();
                });
            });
        }

        document.addEventListener('maths1to9:lesson-complete', () => {
            if (phase !== 'finished') return;
            state.lessonFinished = true;
            save();
        });
        if (state.lessonFinished) window.Maths1to9Lesson.completeLesson();
        render();
    }

    function drawTileRow(startX, startY, count, label, fill, stroke) {
        const tileSize = 82;
        const gap = 18;
        let output = '';

        for (let index = 0; index < count; index += 1) {
            const x = startX + index * (tileSize + gap);

            output += `
                <rect
                    x="${x}"
                    y="${startY}"
                    width="${tileSize}"
                    height="${tileSize}"
                    rx="16"
                    fill="${fill}"
                    stroke="${stroke}"
                    stroke-width="4"
                />
                ${svgText(
                    x + tileSize / 2,
                    startY + 54,
                    label,
                    34,
                    'middle',
                    stroke
                )}
            `;
        }

        return output;
    }

    function svgText(x, y, value, size, anchor, fill) {
        return `
            <text
                x="${x}"
                y="${y}"
                font-size="${size}"
                text-anchor="${anchor}"
                fill="${fill}"
                font-family="Nunito, Arial, sans-serif"
                font-weight="700"
            >
                ${escapeHtml(value)}
            </text>
        `;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }
})();
