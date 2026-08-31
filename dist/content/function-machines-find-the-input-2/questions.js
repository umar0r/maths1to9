(() => {
    'use strict';

    const ROOT_ID = 'function-machine-practice';
    const SECTION_ID = 'question-bank';
    const DEFAULT_TARGET = 8;

    function gateSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId }
        }));
    }

    function completeSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
            detail: { sectionId }
        }));
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function parseConfig(root) {
        try {
            return JSON.parse(root.dataset.config || '{}');
        } catch (error) {
            console.error('The practice data is not valid JSON.', error);
            return {};
        }
    }

    function randomInt(minimum, maximum) {
        return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    }

    function shuffle(items) {
        const copy = [...items];
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swapIndex = randomInt(0, index);
            [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
        }
        return copy;
    }

    function formatNumber(value) {
        return String(value).replace('-', '−');
    }

    function operationLabel(operation) {
        const symbols = {
            add: '+',
            subtract: '−',
            multiply: '×',
            divide: '÷'
        };
        return `${symbols[operation.type]} ${operation.value}`;
    }

    function applyOperation(value, operation) {
        if (operation.type === 'add') return value + operation.value;
        if (operation.type === 'subtract') return value - operation.value;
        if (operation.type === 'multiply') return value * operation.value;
        if (operation.type === 'divide') return value / operation.value;
        return value;
    }

    function inverseOperation(operation) {
        const types = {
            add: 'subtract',
            subtract: 'add',
            multiply: 'divide',
            divide: 'multiply'
        };
        return { type: types[operation.type], value: operation.value };
    }

    function calculation(value, operation) {
        const result = applyOperation(value, operation);
        return `${formatNumber(value)} ${operationLabel(operation)} = ${formatNumber(result)}`;
    }

    function uniqueOptions(correct, alternatives) {
        const all = [correct, ...alternatives]
            .map(String)
            .filter((item, index, items) => items.indexOf(item) === index);

        while (all.length < 3) {
            all.push(`${correct} `);
        }

        return shuffle(all.slice(0, 3));
    }

    function buildProblem(questionNumber) {
        const level = Math.min(questionNumber, 8);
        let input;
        let operations;

        if (level === 1) {
            input = randomInt(2, 7);
            operations = [
                { type: 'multiply', value: 2 },
                { type: 'add', value: randomInt(3, 7) }
            ];
        } else if (level === 2) {
            input = randomInt(2, 8);
            operations = [
                { type: 'add', value: randomInt(2, 6) },
                { type: 'multiply', value: 3 }
            ];
        } else if (level === 3) {
            input = randomInt(8, 15);
            operations = [
                { type: 'subtract', value: randomInt(2, 6) },
                { type: 'multiply', value: 2 }
            ];
        } else if (level === 4) {
            const divisor = randomInt(2, 4);
            input = divisor * randomInt(3, 8);
            operations = [
                { type: 'divide', value: divisor },
                { type: 'add', value: randomInt(4, 8) }
            ];
        } else if (level === 5) {
            input = randomInt(3, 9);
            operations = [
                { type: 'multiply', value: randomInt(3, 5) },
                { type: 'subtract', value: randomInt(4, 9) }
            ];
        } else if (level === 6) {
            const divisor = randomInt(2, 4);
            input = divisor * randomInt(4, 9);
            operations = [
                { type: 'add', value: divisor * randomInt(1, 3) },
                { type: 'divide', value: divisor }
            ];
        } else if (level === 7) {
            input = randomInt(2, 7);
            operations = [
                { type: 'add', value: randomInt(2, 5) },
                { type: 'multiply', value: 3 },
                { type: 'subtract', value: randomInt(4, 9) }
            ];
        } else {
            input = randomInt(7, 14);
            operations = [
                { type: 'subtract', value: randomInt(2, 5) },
                { type: 'multiply', value: 4 },
                { type: 'add', value: randomInt(5, 11) }
            ];
        }

        const values = [input];
        operations.forEach((operation) => {
            values.push(applyOperation(values[values.length - 1], operation));
        });

        return {
            input,
            operations,
            values,
            output: values[values.length - 1]
        };
    }

    function buildSteps(problem) {
        const steps = [{
            assessmentType: 'identify-output',
            label: 'Start at the output',
            prompt: 'Which number do you start with?',
            options: uniqueOptions(
                formatNumber(problem.output),
                [formatNumber(problem.input), formatNumber(problem.operations[0].value)]
            ),
            answer: formatNumber(problem.output),
            feedback: `Start with ${formatNumber(problem.output)} because it is the output.`,
            startValue: formatNumber(problem.output)
        }];

        let current = problem.output;
        [...problem.operations].reverse().forEach((operation, index) => {
            const reverse = inverseOperation(operation);
            const result = applyOperation(current, reverse);
            const correct = operationLabel(reverse);
            const sameOperation = operationLabel(operation);
            const wrongReverseType = operation.type === 'add' || operation.type === 'subtract'
                ? { type: 'divide', value: operation.value }
                : { type: 'subtract', value: operation.value };
            const other = operationLabel(wrongReverseType);

            steps.push({
                assessmentType: 'reverse-operation',
                label: index === 0 ? 'Undo the last step' : 'Keep working backwards',
                prompt: `The next box says ${operationLabel(operation)}. What do you do to reverse it?`,
                options: uniqueOptions(correct, [sameOperation, other]),
                answer: correct,
                feedback: `${operationLabel(reverse)} reverses ${operationLabel(operation)}.`,
                row: {
                    machine: operationLabel(operation),
                    reverse: operationLabel(reverse),
                    working: calculation(current, reverse)
                }
            });

            current = result;
        });

        const check = problem.operations
            .map((operation, index) => calculation(problem.values[index], operation))
            .join(', then ');

        const wrongInput = problem.input + 1;
        let wrongCurrent = wrongInput;
        const wrongParts = problem.operations.map((operation) => {
            const text = calculation(wrongCurrent, operation);
            wrongCurrent = applyOperation(wrongCurrent, operation);
            return text;
        });

        steps.push({
            assessmentType: 'check-forward',
            label: 'Check forwards',
            prompt: `Which calculation checks that the input is ${formatNumber(problem.input)}?`,
            options: uniqueOptions(check, [wrongParts.join(', then '), `The input is ${formatNumber(problem.output)}.`]),
            answer: check,
            feedback: `The original machine gives an output of ${formatNumber(problem.output)}.`
        });

        return steps;
    }

    function boxHtml(text, kind = 'value', label = '') {
        const isOperation = kind === 'operation';
        const isReverse = kind === 'reverse';
        const border = isOperation ? '#677087' : '#5664D2';
        const background = isOperation ? '#FFFFFF' : isReverse ? '#F1F4FF' : '#EEF2FF';
        return `
            <div style="min-width:78px;text-align:center;">
                <div style="border:3px solid ${border};background:${background};border-radius:16px;padding:13px 16px;font-size:1.35rem;font-weight:800;line-height:1;white-space:nowrap;">
                    ${escapeHtml(text)}
                </div>
                ${label ? `<div style="margin-top:7px;font-size:.82rem;font-weight:700;">${escapeHtml(label)}</div>` : ''}
            </div>
        `;
    }

    function machineGraphic(problem, solvedRows) {
        const solvedCount = Math.min(solvedRows.length, problem.operations.length);
        const lastValueIndex = problem.values.length - 1;
        const revealFrom = Math.max(0, lastValueIndex - solvedCount);
        const newestReversedOperation = problem.operations.length - solvedCount;
        const parts = [];

        problem.values.forEach((value, index) => {
            const shownValue = index >= revealFrom ? formatNumber(value) : '?';
            const label = index === 0 ? 'Input' : index === lastValueIndex ? 'Output' : '';
            parts.push(boxHtml(shownValue, 'value', label));

            if (index >= problem.operations.length) {
                return;
            }

            const isReversed = index >= problem.operations.length - solvedCount;
            const solvedRowIndex = problem.operations.length - 1 - index;
            const operationText = isReversed
                ? solvedRows[solvedRowIndex].reverse
                : operationLabel(problem.operations[index]);
            const arrow = isReversed ? '←' : '→';
            const isNewest = isReversed && index === newestReversedOperation;

            parts.push(`
                <div
                    ${isNewest ? 'data-new-reverse="true"' : ''}
                    style="display:flex;align-items:center;gap:10px;"
                >
                    <div aria-hidden="true" style="font-size:1.7rem;font-weight:900;">${arrow}</div>
                    ${boxHtml(operationText, isReversed ? 'reverse' : 'operation')}
                    <div aria-hidden="true" style="font-size:1.7rem;font-weight:900;">${arrow}</div>
                </div>
            `);
        });

        return `
            <div class="interactive-equation" style="overflow-x:auto;">
                <div role="img" aria-label="Function machine changing from forwards to backwards" style="display:flex;align-items:center;gap:10px;width:max-content;min-width:100%;justify-content:center;padding:12px 6px;">
                    ${parts.join('')}
                </div>
            </div>
        `;
    }

    function reverseTable(rows, currentRow = null, revealCurrent = false) {
        const body = rows.map((row) => `
            <tr>
                <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;"><strong>${escapeHtml(row.machine)}</strong></td>
                <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;"><strong>${escapeHtml(row.reverse)}</strong></td>
                <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;">${escapeHtml(row.working)}</td>
            </tr>
        `);

        if (currentRow) {
            body.push(`
                <tr data-current-row>
                    <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;"><strong>${escapeHtml(currentRow.machine)}</strong></td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;">${revealCurrent ? `<strong>${escapeHtml(currentRow.reverse)}</strong>` : '?'}</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;">${revealCurrent ? escapeHtml(currentRow.working) : '?'}</td>
                </tr>
            `);
        }

        if (body.length === 0) return '';

        return `
            <aside class="lesson-key-points">
                <h4>Working backwards</h4>
                <div style="overflow-x:auto;">
                    <table style="width:100%;min-width:520px;border-collapse:separate;border-spacing:0;border:2px solid #dfe5f2;border-radius:14px;overflow:hidden;">
                        <thead>
                            <tr>
                                <th scope="col" style="padding:12px 14px;text-align:left;background:#f5f7ff;border-bottom:2px solid #dfe5f2;">Machine says</th>
                                <th scope="col" style="padding:12px 14px;text-align:left;background:#f5f7ff;border-bottom:2px solid #dfe5f2;">You do</th>
                                <th scope="col" style="padding:12px 14px;text-align:left;background:#f5f7ff;border-bottom:2px solid #dfe5f2;">Working</th>
                            </tr>
                        </thead>
                        <tbody>${body.join('')}</tbody>
                    </table>
                </div>
            </aside>
        `;
    }

    function animateIn(element) {
        if (!element || typeof window.gsap === 'undefined') return;
        window.gsap.fromTo(element, { opacity: 0, y: 12 }, {
            opacity: 1,
            y: 0,
            duration: 0.3,
            ease: 'power2.out'
        });
    }

    function mountPractice(root) {
        if (!root || root.dataset.mounted === 'true') return;

        root.dataset.mounted = 'true';
        gateSection(SECTION_ID);

        const config = parseConfig(root);
        const target = Number(config.completion_target) || DEFAULT_TARGET;
        const state = {
            questionNumber: 1,
            completed: 0,
            problem: null,
            steps: [],
            stepIndex: 0,
            selected: '',
            correct: false,
            wrong: false,
            startValue: '',
            solvedRows: [],
            summaries: []
        };

        function newQuestion() {
            state.problem = buildProblem(state.questionNumber);
            state.steps = buildSteps(state.problem);
            state.stepIndex = 0;
            state.selected = '';
            state.correct = false;
            state.wrong = false;
            state.startValue = '';
            state.solvedRows = [];
            render();
        }

        function summariesHtml() {
            if (state.summaries.length === 0) return '';
            return `
                <details class="question-history">
                    <summary>Completed questions (${state.summaries.length})</summary>
                    <div class="worked-example-list">
                        ${state.summaries.slice().reverse().map((summary) => `
                            <article class="worked-example">
                                <p class="worked-example__number">${escapeHtml(summary.label)}</p>
                                <h3 class="worked-example__title">Input = ${escapeHtml(summary.input)}</h3>
                                <p>${escapeHtml(summary.check)}</p>
                            </article>
                        `).join('')}
                    </div>
                </details>
            `;
        }

        function finishPractice() {
            root.innerHTML = `
                <article class="worked-example">
                    <p class="worked-example__number">Practice complete</p>
                    <h3 class="worked-example__title">You found ${target} missing inputs</h3>
                    <p>You started at each output and undid the operations in reverse order.</p>
                </article>
                ${summariesHtml()}
            `;
            completeSection(SECTION_ID);
            animateIn(root.firstElementChild);
        }

        function completeCurrentQuestion() {
            const check = state.problem.operations
                .map((operation, index) => calculation(state.problem.values[index], operation))
                .join(', then ');

            state.summaries.push({
                label: `Question ${state.questionNumber}`,
                input: formatNumber(state.problem.input),
                check: `Check: ${check}.`
            });
            state.completed += 1;
            state.questionNumber += 1;

            if (state.completed >= target) {
                finishPractice();
            } else {
                newQuestion();
            }
        }

        function render() {
            if (state.completed >= target) {
                finishPractice();
                return;
            }

            const step = state.steps[state.stepIndex];
            const currentRow = step.row || null;
            const options = (step.options || []).map((option) => `
                <button
                    class="button${state.selected === option && state.correct ? ' button--primary' : ''}"
                    type="button"
                    data-answer="${escapeHtml(option)}"
                    ${state.correct ? 'disabled' : ''}
                >
                    ${escapeHtml(option)}
                </button>
            `).join('');

            const feedback = state.wrong
                ? '<div class="question-feedback is-visible is-incorrect">Not quite. Start at the output and reverse the next box.</div>'
                : state.correct
                    ? `<div class="question-feedback is-visible is-correct"><strong>Correct.</strong> ${escapeHtml(step.feedback)}</div>`
                    : '';

            root.innerHTML = `
                <article class="question-card">
                    <p class="question-number">Question ${state.questionNumber} of ${target}</p>
                    <p class="lesson-eyebrow">${escapeHtml(step.label)}</p>
                    ${machineGraphic(state.problem, state.solvedRows)}
                    ${reverseTable(state.solvedRows, currentRow, state.correct)}
                    <p class="question-prompt">${escapeHtml(step.prompt)}</p>
                    <div class="question-options" role="group" aria-label="Choose an answer">
                        ${options}
                    </div>
                    ${feedback}
                </article>
                ${summariesHtml()}
            `;

            animateIn(root.querySelector('.question-card'));
            const newlyReversed = root.querySelector('[data-new-reverse="true"]');
            if (newlyReversed && typeof window.gsap !== 'undefined') {
                window.gsap.fromTo(newlyReversed, { opacity: 0, x: 18 }, {
                    opacity: 1,
                    x: 0,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }

            root.querySelectorAll('[data-answer]').forEach((button) => {
                button.addEventListener('click', () => {
                    if (state.correct) return;
                    const selected = button.dataset.answer || '';
                    state.selected = selected;
                    state.correct = selected === step.answer;
                    state.wrong = !state.correct;

                    window.Maths1to9Lesson?.recordAssessment?.({
                        questionType: step.assessmentType,
                        questionId:
                            `question-bank:${state.questionNumber}:` +
                            `${state.stepIndex}`,
                        correct: state.correct
                    });

                    render();

                    if (!state.correct) {
                        return;
                    }

                    window.setTimeout(() => {
                        if (step.startValue) state.startValue = step.startValue;
                        if (step.row) state.solvedRows.push(step.row);

                        const lastStep = state.stepIndex === state.steps.length - 1;
                        if (lastStep) {
                            completeCurrentQuestion();
                            return;
                        }

                        state.stepIndex += 1;
                        state.selected = '';
                        state.correct = false;
                        state.wrong = false;
                        render();
                    }, 700);
                });
            });

        }

        newQuestion();
    }

    function mountAll() {
        mountPractice(document.getElementById(ROOT_ID));
    }

    document.addEventListener('function-machines:roots-ready', mountAll);
    document.addEventListener('maths1to9:lesson-rendered', mountAll);
    document.addEventListener('lesson:rendered', mountAll);

    const observer = new MutationObserver(mountAll);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    mountAll();
})();
