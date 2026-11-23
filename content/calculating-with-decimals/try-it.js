(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const { element, button, drawArrows } = window.DecimalCalculations;
    const { pointText, pointWidget } = window.PointGap;

    function drawReceipt(host, correct) {
        const receipt = element('div', '', 'decimal-receipt');
        const edge = 'M15 9H270L291 30V220Q284.25 228 277.5 220T264 220T250.5 220T237 220T223.5 220T210 220T196.5 220T183 220T169.5 220T156 220T142.5 220T129 220T115.5 220T102 220T88.5 220T75 220T61.5 220T48 220T34.5 220T21 220Q15 212 9 220V15Q9 9 15 9Z';
        receipt.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 235" fill="var(--text)" font-family="inherit" role="img" aria-label="Receipt: 3 × Notebook £1.45. Total ${correct ? '£4.35' : 'blank'}.">
            <defs><clipPath id="multiply-task-receipt-clip"><path d="${edge}"/></clipPath></defs><path d="${edge}" fill="#f8fafc"/>
            <g clip-path="url(#multiply-task-receipt-clip)"><rect x="9" y="9" width="282" height="38" fill="color-mix(in srgb, var(--primary) 25%, #fff)"/><text x="24" y="36" font-size="21" font-weight="800">Receipt</text></g><path d="M270 9V30H291Z" fill="var(--primary-dark)"/>
            <text x="24" y="92" font-size="18">3 × Notebook</text><text x="276" y="92" text-anchor="end" font-size="18">£1.45</text><path d="M24 139H276" stroke="#94a3b8"/>
            <text x="24" y="170" font-size="20" font-weight="800">Total</text><text data-total x="276" y="170" text-anchor="end" font-size="20" font-weight="800"></text><path data-blank d="M210 173H276" stroke="#94a3b8"/>
            <path d="${edge}" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>`;
        host.append(receipt);
        function update(correct) {
            receipt.querySelector('[data-total]').textContent = correct ? '£4.35' : '';
            receipt.querySelector('[data-blank]').style.display = correct ? 'none' : '';
            receipt.querySelector('svg').setAttribute('aria-label', `Receipt: 3 × Notebook £1.45. Total ${correct ? '£4.35' : 'blank'}.`);
        }
        update(correct);
        return { update };
    }

    // Four sums, one tap each. `gap` is where the point belongs; `count` is
    // the number of digits after it in the answer.
    const tasks = [
        {
            id: 'multiply-point', hash: 'try-it-1', title: 'Work out 6.2 \u00d7 0.48.',
            sum: '62 \u00d7 48 = 2976', digits: '2976', gap: 1, count: 3,
            right: '1 + 2 = 3 digits after the points, so 2.976.',
            wrong: gap => gap === 0
                ? 'That\u2019s 4 digits after the point. You need 1 + 2 = 3.'
                : 'Count the digits after both points and add them: 1 + 2 = 3.'
        },
        {
            id: 'divide-whole', hash: 'try-it-2', title: 'Work out 9.36 \u00f7 4.',
            sum: '936 \u00f7 4 = 234', digits: '234', gap: 1, count: 2,
            right: '9.36 has 2 digits after the point, so 2.34.',
            wrong: () => '9.36 has 2 digits after the point. Move the point back 2 digits.'
        },
        {
            id: 'divide-decimal', hash: 'try-it-3', title: 'Work out 11.07 \u00f7 0.9.',
            sum: '1107 \u00f7 9 = 123', digits: '123', gap: 2, count: 1,
            right: '2 \u2212 1 = 1 digit after the point, so 12.3.',
            wrong: gap => gap === 0 ? 'When you divide, take them away: 2 \u2212 1 = 1.'
                : gap === 1 ? 'That\u2019s 2 digits after the point. You need 2 \u2212 1 = 1.'
                    : 'That\u2019s 0 digits after the point. You need 2 \u2212 1 = 1.'
        },
        {
            id: 'receipt', hash: 'try-it-4', title: 'Work out the total on this receipt.',
            sum: '3 \u00d7 145 = 435', digits: '435', gap: 1, count: 2,
            right: '\u00a31.45 has 2 digits after the point, so \u00a34.35.',
            wrong: () => '\u00a31.45 has 2 digits after the point. Move the point back 2 digits.',
            receipt: true
        }
    ];

    const problems = tasks.map(task => ({
        id: task.id, hash: task.hash, title: task.title, receipt: task.receipt === true,
        widget: () => pointWidget(task)
    }));

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', { detail: { sectionId: 'interactive' } }));
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 3,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {} }),
            upgrade: () => null
        });
        const state = section.state;
        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') api.setSlideHash(problems[state.screen].hash, { replace: true });
        }
        function show(screen) {
            section.update(state => { state.screen = screen; });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            heading.tabIndex = -1;
            heading.focus();
        }
        function reportProgress() {
            const completed = state.finished ? problems.length : state.index + Number(state.cards[problems[state.index]?.id]?.correct === true);
            api.setSectionProgress('interactive', completed, problems.length);
        }
        function leaveTryIt() {
            api.completeSection('interactive');
            api.continueSection();
        }
        function continueExample() {
            section.update(state => {
                state.index = state.screen + 1;
                state.finished = state.index === problems.length;
                if (!state.finished) {
                    state.screen = state.index;
                    state.furthestScreen = Math.max(state.furthestScreen, state.screen);
                }
            });
            render();
            if (state.finished) leaveTryIt();
        }
        function render() {
            root.replaceChildren();
            const problem = problems[state.screen], widget = problem.widget();
            let receipt;
            const cardRoot = element('div');
            root.append(cardRoot);
            api.setSectionBack('interactive', state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            const readOnly = state.screen < state.index;
            function reset() { widget.reset?.(); receipt?.update(false); }
            function replay(result) { widget.replayFeedback?.(result); receipt?.update(result.correct); }
            api.createQuestion(cardRoot, {
                sectionId: 'interactive', questionId: problem.id, prompt: problem.title,
                input: 'custom', widget, scored: false, readOnly, lockedReview: true, autoContinue: false,
                figure: problem.receipt ? (host, { replay }) => {
                    receipt = drawReceipt(host, !replay && state.cards[problem.id]?.correct === true);
                } : undefined,
                onReset: reset, onReplayReset: reset, onReplayFeedback: replay,
                onFeedback(result) { reportProgress(); receipt?.update(result.correct); },
                onContinue: continueExample
            });
            if (state.finished) api.completeSection('interactive');
            if (readOnly) api.setSectionAction('interactive', state.screen === problems.length - 1
                ? { label: 'Continue', onClick: leaveTryIt }
                : { label: 'Next', onClick: () => show(state.screen + 1) });
            syncHash();
        }
        problems.forEach((problem, index) => api.registerHashRoute(problem.hash, () => {
            if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = problems.findIndex(problem => initialHash === `#${problem.hash}`);
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false })) show(Math.min(requested, state.furthestScreen));
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
})();
