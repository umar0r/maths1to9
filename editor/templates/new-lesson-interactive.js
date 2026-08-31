(() => {
    'use strict';

    const SLUG = '__LESSON_SLUG__';
    let lessonPromise = null;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

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

    function loadLesson() {
        if (!lessonPromise) {
            const source = document.body.dataset.lessonSrc || './lesson.json';
            lessonPromise = fetch(source, { cache: 'no-store' }).then((response) => {
                if (!response.ok) {
                    throw new Error(`lesson.json returned ${response.status}`);
                }
                return response.json();
            });
        }
        return lessonPromise;
    }

    function findSection(sectionId) {
        return document.getElementById(`lesson-section-${sectionId}`)
            || document.querySelector(`[data-lesson-section="${sectionId}"]`);
    }

    function valueBox(value, label = '') {
        return `
            <div style="min-width:78px;text-align:center;">
                <div style="border:3px solid #5664d2;background:#eef2ff;border-radius:16px;padding:13px 16px;font-size:1.3rem;font-weight:900;line-height:1;white-space:nowrap;">
                    ${escapeHtml(value)}
                </div>
                ${label ? `<div style="margin-top:7px;font-size:.82rem;font-weight:800;">${escapeHtml(label)}</div>` : ''}
            </div>
        `;
    }

    function operationArrow(operation, reverse = false) {
        return `
            <div style="min-width:82px;text-align:center;">
                <div style="display:inline-block;border:2px solid #737c91;background:#fff;border-radius:12px;padding:8px 12px;font-weight:900;white-space:nowrap;">
                    ${escapeHtml(operation)}
                </div>
                <div aria-hidden="true" style="margin-top:2px;color:#5664d2;font-size:1.7rem;font-weight:900;line-height:1;">
                    ${reverse ? '←' : '→'}
                </div>
            </div>
        `;
    }

    function machineGraphic(graphic, reverse = false) {
        const values = Array.isArray(graphic.values) ? graphic.values : [];
        const operations = Array.isArray(graphic.operations) ? graphic.operations : [];
        const labels = Array.isArray(graphic.labels) ? graphic.labels : [];
        const parts = [];

        values.forEach((value, index) => {
            parts.push(valueBox(value, labels[index] || ''));
            if (index < operations.length) {
                parts.push(operationArrow(operations[index] ?? '', reverse));
            }
        });

        return `
            <div style="display:flex;align-items:center;justify-content:${reverse ? 'flex-end' : 'center'};gap:10px;overflow-x:auto;padding:12px 0;">
                ${parts.join('')}
            </div>
            ${graphic.caption ? `<p style="margin:6px 0 0;text-align:center;color:#687083;">${escapeHtml(graphic.caption)}</p>` : ''}
        `;
    }

    function reverseTable(rows) {
        return `
            <div style="overflow-x:auto;margin-top:16px;">
                <table style="width:100%;border-collapse:collapse;min-width:520px;">
                    <thead>
                        <tr>
                            <th style="padding:10px;border:1px solid #d9deeb;background:#eef1fb;text-align:left;">Machine says</th>
                            <th style="padding:10px;border:1px solid #d9deeb;background:#eef1fb;text-align:left;">Work backwards</th>
                            <th style="padding:10px;border:1px solid #d9deeb;background:#eef1fb;text-align:left;">Working</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row) => `
                            <tr>
                                <td style="padding:11px;border:1px solid #d9deeb;font-weight:900;">${escapeHtml(row.machine)}</td>
                                <td style="padding:11px;border:1px solid #d9deeb;font-weight:900;">${escapeHtml(row.reverse)}</td>
                                <td style="padding:11px;border:1px solid #d9deeb;">${escapeHtml(row.working)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function pairedMachines(items) {
        return items.map((item) => `
            <div style="margin-top:16px;">
                <h4 style="margin:0 0 6px;">${escapeHtml(item.label || '')}</h4>
                ${machineGraphic(item, item.direction === 'backwards')}
            </div>
        `).join('');
    }

    function imageGraphic(image) {
        if (!isObject(image) || !image.src) {
            return '';
        }
        return `
            <figure style="margin:18px 0 0;text-align:center;">
                <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || '')}" style="display:block;max-width:100%;max-height:520px;margin:0 auto;border-radius:14px;">
                ${image.caption ? `<figcaption style="margin-top:8px;color:#687083;">${escapeHtml(image.caption)}</figcaption>` : ''}
            </figure>
        `;
    }

    function learnBlock(block) {
        const paragraphs = Array.isArray(block.paragraphs) ? block.paragraphs : [];
        return `
            <article class="worked-example" style="width:100%;max-width:none;">
                ${block.title ? `<h3 class="worked-example__title">${escapeHtml(block.title)}</h3>` : ''}
                ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                ${isObject(block.graphic) ? machineGraphic(block.graphic) : ''}
                ${Array.isArray(block.reverse_rows) ? reverseTable(block.reverse_rows) : ''}
                ${Array.isArray(block.paired_graphics) ? pairedMachines(block.paired_graphics) : ''}
                ${Array.isArray(block.big_idea) ? `
                    <div style="margin-top:18px;padding:16px;border:2px solid #f0c75e;border-radius:14px;background:#fffaf0;">
                        <strong>Big idea</strong>
                        <ol style="margin:9px 0 0;padding-left:22px;">
                            ${block.big_idea.map((item) => `<li style="margin-top:6px;">${escapeHtml(item)}</li>`).join('')}
                        </ol>
                    </div>
                ` : ''}
                ${imageGraphic(block.image)}
            </article>
        `;
    }

    function mountLearn(lesson) {
        const blocks = lesson?.explanation?.blocks;
        const section = findSection('explanation');
        if (!section || section.dataset.editorRuntimeLearn === 'true' || !Array.isArray(blocks) || !blocks.length) {
            return;
        }
        section.dataset.editorRuntimeLearn = 'true';
        section.innerHTML = `
            <div style="display:grid;gap:18px;width:100%;">
                ${blocks.map(learnBlock).join('')}
            </div>
        `;
    }

    function stepVisual(step) {
        if (step.machine_operation || step.reverse_operation || step.calculation) {
            return `
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:16px 0;">
                    ${step.machine_operation ? `<div style="padding:13px;border:2px solid #778096;border-radius:12px;background:#fff;text-align:center;"><small>Machine says</small><strong style="display:block;margin-top:4px;font-size:1.25rem;">${escapeHtml(step.machine_operation)}</strong></div>` : ''}
                    ${step.reverse_operation ? `<div style="padding:13px;border:2px solid #5664d2;border-radius:12px;background:#eef2ff;text-align:center;"><small>Work backwards</small><strong style="display:block;margin-top:4px;font-size:1.25rem;">${escapeHtml(step.reverse_operation)}</strong></div>` : ''}
                    ${step.calculation ? `<div style="padding:13px;border:2px solid #29a06a;border-radius:12px;background:#edf9f2;text-align:center;"><small>Working</small><strong style="display:block;margin-top:4px;font-size:1.15rem;">${escapeHtml(step.calculation)}</strong></div>` : ''}
                </div>
            `;
        }
        return step.start_value
            ? `<div style="margin:15px 0;padding:14px;border:2px solid #5664d2;border-radius:13px;background:#eef2ff;text-align:center;font-size:1.3rem;font-weight:900;">${escapeHtml(step.start_value)}</div>`
            : '';
    }

    function mountTryIt(lesson) {
        const root = document.getElementById(`${SLUG}-interactive`);
        const steps = lesson?.interactive?.steps;
        if (!root || root.dataset.editorRuntimeTry === 'true' || !Array.isArray(steps) || !steps.length) {
            return;
        }
        root.dataset.editorRuntimeTry = 'true';
        gateSection('interactive');

        let index = 0;
        let selected = '';
        let phase = 'answering';

        function render() {
            const step = steps[index];
            const options = Array.isArray(step.options) ? step.options.map(String) : [];
            const answered = phase !== 'answering';
            const correct = phase === 'correct';
            const last = index === steps.length - 1;
            const finished = correct && last;
            const actionLabel = phase === 'wrong' ? 'Try again' : correct ? 'Continue' : 'Check';

            root.innerHTML = `
                <article class="worked-example" style="width:100%;max-width:none;">
                    <p class="lesson-eyebrow">${escapeHtml(step.label || `Step ${index + 1}`)} · ${index + 1} of ${steps.length}</p>
                    <h3 class="worked-example__title">${escapeHtml(step.prompt || '')}</h3>
                    ${stepVisual(step)}
                    <div style="display:grid;gap:10px;margin-top:16px;" role="radiogroup" aria-label="Choose an answer">
                        ${options.map((option) => {
                            let className = 'answer-choice';
                            if (!answered && selected === option) className += ' is-selected';
                            if (answered && selected === option) className += correct ? ' is-correct' : ' is-incorrect';
                            return `<button class="${className}" type="button" data-editor-option="${escapeHtml(option)}" ${answered ? 'disabled' : ''}>${escapeHtml(option)}</button>`;
                        }).join('')}
                    </div>
                    <div data-editor-feedback role="status" style="margin-top:13px;"></div>
                </article>
                ${finished
                    ? '<p style="margin:14px 0 0;padding:12px;border-radius:12px;background:#e8f7ef;color:#176d46;font-weight:900;">Try It complete. Use the lesson button below to carry on.</p>'
                    : `<button class="button button--primary" type="button" data-editor-action style="display:block;margin:14px 0 0 auto;" ${phase === 'answering' && selected === '' ? 'disabled' : ''}>${actionLabel}</button>`}
            `;

            const feedback = root.querySelector('[data-editor-feedback]');
            if (phase === 'correct') {
                feedback.innerHTML = `<div style="padding:12px;border-radius:11px;background:#e8f7ef;color:#176d46;"><strong>Correct.</strong> ${escapeHtml(step.feedback || '')}</div>`;
            } else if (phase === 'wrong') {
                feedback.innerHTML = '<div style="padding:12px;border-radius:11px;background:#fff0ee;color:#9b3027;"><strong>Not yet.</strong> Look again, then try the question once more.</div>';
            }

            if (finished) {
                completeSection('interactive');
            }

            root.querySelectorAll('[data-editor-option]').forEach((button) => {
                button.addEventListener('click', () => {
                    selected = button.dataset.editorOption || '';
                    render();
                });
            });

            root.querySelector('[data-editor-action]')?.addEventListener('click', () => {
                if (phase === 'answering') {
                    phase = selected === String(step.answer ?? '') ? 'correct' : 'wrong';
                } else if (phase === 'wrong') {
                    selected = '';
                    phase = 'answering';
                } else {
                    index += 1;
                    selected = '';
                    phase = 'answering';
                }
                render();
            });
        }

        render();
    }

    async function mountAll() {
        try {
            const lesson = await loadLesson();
            mountLearn(lesson);
            mountTryIt(lesson);
        } catch (error) {
            console.error('The editor-generated lesson interaction could not mount.', error);
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', mountAll);
    document.addEventListener('lesson:rendered', mountAll);

    const observer = new MutationObserver(mountAll);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    mountAll();
})();
