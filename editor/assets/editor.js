(() => {
    'use strict';

    const SECTION_ORDER = [
        ['explanation', 'Learn'],
        ['method', 'Method'],
        ['interactive', 'Try it'],
        ['worked-examples', 'Worked examples'],
        ['question-bank', 'Practice']
    ];

    const state = {
        editor: null,
        lessons: [],
        folder: '',
        lesson: null,
        previewUrl: '',
        dirty: false,
        suppressDirty: false,
        slugTouched: false
    };

    const elements = {
        lessonSelect: document.getElementById('lesson-select'),
        reloadButton: document.getElementById('reload-button'),
        newButton: document.getElementById('new-button'),
        undoButton: document.getElementById('undo-button'),
        redoButton: document.getElementById('redo-button'),
        desktopButton: document.getElementById('desktop-button'),
        mobileButton: document.getElementById('mobile-button'),
        uploadButton: document.getElementById('upload-button'),
        jsonButton: document.getElementById('json-button'),
        previewButton: document.getElementById('preview-button'),
        saveButton: document.getElementById('save-button'),
        lessonId: document.getElementById('lesson-id'),
        lessonSlug: document.getElementById('lesson-slug'),
        lessonTitle: document.getElementById('lesson-title'),
        lessonSubtitle: document.getElementById('lesson-subtitle'),
        saveStatus: document.getElementById('save-status'),
        editorEmpty: document.getElementById('editor-empty'),
        assetInput: document.getElementById('asset-input'),
        newDialog: document.getElementById('new-dialog'),
        newForm: document.getElementById('new-form'),
        newTitle: document.getElementById('new-title'),
        newSlug: document.getElementById('new-slug'),
        createButton: document.getElementById('create-button'),
        jsonDialog: document.getElementById('json-dialog'),
        jsonEditor: document.getElementById('json-editor'),
        jsonError: document.getElementById('json-error'),
        applyJsonButton: document.getElementById('apply-json-button')
    };

    function deepClone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function lines(value) {
        if (Array.isArray(value)) {
            return value.map((item) => String(item));
        }
        return String(value ?? '')
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function linesText(value) {
        return Array.isArray(value) ? value.join('\n') : String(value ?? '');
    }

    function pipeRows(value) {
        return lines(value).map((row) => row.split('|').map((cell) => cell.trim()));
    }

    function rowsText(rows) {
        return Array.isArray(rows)
            ? rows.map((row) => [row.machine, row.reverse, row.working].map((item) => item ?? '').join(' | ')).join('\n')
            : '';
    }

    function setStatus(message, kind = '') {
        elements.saveStatus.textContent = message;
        elements.saveStatus.className = `save-status${kind ? ` is-${kind}` : ''}`;
    }

    function markDirty() {
        if (state.suppressDirty || !state.lesson) {
            return;
        }
        state.dirty = true;
        setStatus('Unsaved changes');
    }

    function clearDirty(message = 'Saved') {
        state.dirty = false;
        setStatus(message, 'saved');
    }

    async function api(action, options = {}) {
        const response = await fetch(`./api.php?action=${encodeURIComponent(action)}${options.query || ''}`, {
            cache: 'no-store',
            ...options
        });
        let payload;
        try {
            payload = await response.json();
        } catch (error) {
            throw new Error(`The editor API returned an unreadable response (${response.status}).`);
        }
        if (!response.ok || !payload.ok) {
            throw new Error(payload.error || `Editor API error ${response.status}.`);
        }
        return payload;
    }

    function trait(type, name, label, extra = {}) {
        return { type, name, label, changeProp: 1, ...extra };
    }

    function textTrait(name, label, extra = {}) {
        return trait('text', name, label, extra);
    }

    function textareaTrait(name, label, extra = {}) {
        return trait('textarea', name, label, extra);
    }

    function checkboxTrait(name, label) {
        return trait('checkbox', name, label, { valueTrue: true, valueFalse: false });
    }

    function selectTrait(name, label, options) {
        return trait('select', name, label, { options });
    }

    function registerAtomic(editor, type, config) {
        const watched = config.watched || [];
        editor.Components.addType(type, {
            model: {
                defaults: {
                    tagName: config.tagName || 'article',
                    draggable: config.draggable ?? true,
                    droppable: false,
                    stylable: false,
                    attributes: {
                        class: config.className || `m19-${type}`,
                        'data-m19-block': type
                    },
                    traits: config.traits || [],
                    ...deepClone(config.defaults || {})
                },
                init() {
                    const refresh = () => {
                        this.components(config.render(this));
                    };
                    watched.forEach((property) => this.on(`change:${property}`, refresh));
                    refresh();
                }
            }
        });
    }

    function machineHtml(values, operations, labels, caption = '', direction = 'forwards') {
        const valueList = lines(values);
        const operationList = lines(operations);
        const labelList = lines(labels);
        const reverse = direction === 'backwards';
        const items = [];

        valueList.forEach((value, index) => {
            items.push(`
                <div class="m19-machine-value">
                    <strong>${escapeHtml(value || '?')}</strong>
                    ${labelList[index] ? `<span>${escapeHtml(labelList[index])}</span>` : ''}
                </div>
            `);
            if (index < operationList.length) {
                const operation = operationList[index] ?? '';
                items.push(`
                    <div class="m19-machine-arrow ${reverse ? 'is-reverse' : ''}">
                        <span>${escapeHtml(operation)}</span>
                        <b aria-hidden="true">${reverse ? '←' : '→'}</b>
                    </div>
                `);
            }
        });

        return `
            <div class="m19-machine-row">${items.join('')}</div>
            ${caption ? `<p class="m19-visual-caption">${escapeHtml(caption)}</p>` : ''}
        `;
    }

    function registerComponents(editor) {
        registerAtomic(editor, 'm19-header', {
            tagName: 'header',
            className: 'm19-preview-header',
            draggable: false,
            defaults: { title: 'Lesson title', subtitle: '' },
            watched: ['title', 'subtitle'],
            render(model) {
                return `
                    <p class="m19-preview-kicker">Maths1to9 lesson</p>
                    <h1>${escapeHtml(model.get('title'))}</h1>
                    <p>${escapeHtml(model.get('subtitle'))}</p>
                `;
            }
        });

        registerAtomic(editor, 'm19-section-heading', {
            tagName: 'header',
            className: 'm19-section-heading',
            draggable: false,
            defaults: {
                enabled: true,
                sectionKey: '',
                sectionLabel: 'Section',
                eyebrow: '',
                title: '',
                intro: '',
                schemaMode: 'plain'
            },
            traits: [
                checkboxTrait('enabled', 'Include this section'),
                textTrait('eyebrow', 'Eyebrow'),
                textTrait('title', 'Section title'),
                textareaTrait('intro', 'Intro'),
                selectTrait('schemaMode', 'Learn format', [
                    { id: 'plain', name: 'Plain paragraphs' },
                    { id: 'cards', name: 'Stacked Learn cards' }
                ])
            ],
            watched: ['enabled', 'sectionLabel', 'eyebrow', 'title', 'intro', 'schemaMode'],
            render(model) {
                const enabled = model.get('enabled') !== false;
                return `
                    <div class="m19-section-state ${enabled ? 'is-enabled' : 'is-disabled'}">
                        <span>${enabled ? 'Included' : 'Not included'}</span>
                        <b>${escapeHtml(model.get('sectionLabel'))}</b>
                    </div>
                    <p class="m19-eyebrow">${escapeHtml(model.get('eyebrow') || model.get('sectionLabel'))}</p>
                    <h2>${escapeHtml(model.get('title') || `${model.get('sectionLabel')} title`)}</h2>
                    ${model.get('intro') ? `<p>${escapeHtml(model.get('intro'))}</p>` : ''}
                    ${model.get('sectionKey') === 'explanation'
                        ? `<small>Storage: ${model.get('schemaMode') === 'cards' ? 'stacked blocks' : 'plain paragraphs'}</small>`
                        : ''}
                `;
            }
        });

        registerAtomic(editor, 'm19-learn-copy', {
            className: 'm19-editor-card m19-editor-card--learn',
            draggable: '[data-section="explanation"]',
            defaults: { paragraphsText: 'Explain the idea here.', preserved: {} },
            traits: [textareaTrait('paragraphsText', 'Paragraphs (one per line)')],
            watched: ['paragraphsText'],
            render(model) {
                return `
                    <span class="m19-card-label">Learn text</span>
                    ${lines(model.get('paragraphsText')).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                `;
            }
        });

        registerAtomic(editor, 'm19-learn-card', {
            className: 'm19-editor-card m19-editor-card--learn',
            draggable: '[data-section="explanation"]',
            defaults: { title: 'One clear idea', paragraphsText: 'Explain it simply.', preserved: {} },
            traits: [
                textTrait('title', 'Card title'),
                textareaTrait('paragraphsText', 'Paragraphs (one per line)')
            ],
            watched: ['title', 'paragraphsText'],
            render(model) {
                return `
                    <span class="m19-card-label">Learn card</span>
                    <h3>${escapeHtml(model.get('title'))}</h3>
                    ${lines(model.get('paragraphsText')).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                `;
            }
        });

        registerAtomic(editor, 'm19-key-points', {
            className: 'm19-editor-card m19-editor-card--idea',
            draggable: '[data-section="explanation"]',
            defaults: { itemsText: 'First key point\nSecond key point', preserved: {} },
            traits: [textareaTrait('itemsText', 'Key points (one per line)')],
            watched: ['itemsText'],
            render(model) {
                return `
                    <span class="m19-card-label">Key points</span>
                    <ul>${lines(model.get('itemsText')).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                `;
            }
        });

        registerAtomic(editor, 'm19-function-machine', {
            className: 'm19-editor-card m19-editor-card--visual',
            draggable: '[data-section="explanation"]',
            defaults: {
                valuesText: '4\n7',
                operationsText: '+ 3',
                labelsText: 'Input\nOutput',
                caption: '4 goes in. Add 3. 7 comes out.',
                preserved: {}
            },
            traits: [
                textareaTrait('valuesText', 'Values (one per box)'),
                textareaTrait('operationsText', 'Operations (one per arrow)'),
                textareaTrait('labelsText', 'Labels (one per value)'),
                textTrait('caption', 'Caption')
            ],
            watched: ['valuesText', 'operationsText', 'labelsText', 'caption'],
            render(model) {
                return `
                    <span class="m19-card-label">Function machine</span>
                    ${machineHtml(model.get('valuesText'), model.get('operationsText'), model.get('labelsText'), model.get('caption'))}
                `;
            }
        });

        registerAtomic(editor, 'm19-reverse-table', {
            className: 'm19-editor-card m19-editor-card--visual',
            draggable: '[data-section="explanation"]',
            defaults: {
                rowsText: '× 3 | ÷ 3 | 21 ÷ 3 = 7\n+ 4 | − 4 | 7 − 4 = 3',
                preserved: {}
            },
            traits: [textareaTrait('rowsText', 'Rows: machine | reverse | working')],
            watched: ['rowsText'],
            render(model) {
                const rows = pipeRows(model.get('rowsText'));
                return `
                    <span class="m19-card-label">Reverse steps table</span>
                    <table class="m19-reverse-table">
                        <thead><tr><th>Machine says</th><th>Work backwards</th><th>Working</th></tr></thead>
                        <tbody>${rows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`).join('')}</tbody>
                    </table>
                `;
            }
        });

        registerAtomic(editor, 'm19-paired-machines', {
            className: 'm19-editor-card m19-editor-card--visual',
            draggable: '[data-section="explanation"]',
            defaults: {
                forwardLabel: 'Forwards',
                forwardValuesText: '3\n7\n21',
                forwardOperationsText: '+ 4\n× 3',
                backwardLabel: 'Backwards',
                backwardValuesText: '3\n7\n21',
                backwardOperationsText: '− 4\n÷ 3',
                preserved: {}
            },
            traits: [
                textTrait('forwardLabel', 'Forward label'),
                textareaTrait('forwardValuesText', 'Forward values'),
                textareaTrait('forwardOperationsText', 'Forward operations'),
                textTrait('backwardLabel', 'Backward label'),
                textareaTrait('backwardValuesText', 'Backward values'),
                textareaTrait('backwardOperationsText', 'Backward operations')
            ],
            watched: [
                'forwardLabel', 'forwardValuesText', 'forwardOperationsText',
                'backwardLabel', 'backwardValuesText', 'backwardOperationsText'
            ],
            render(model) {
                return `
                    <span class="m19-card-label">Forward and reverse machines</span>
                    <h4>${escapeHtml(model.get('forwardLabel'))}</h4>
                    ${machineHtml(model.get('forwardValuesText'), model.get('forwardOperationsText'), 'Input\n\nOutput')}
                    <h4>${escapeHtml(model.get('backwardLabel'))}</h4>
                    ${machineHtml(model.get('backwardValuesText'), model.get('backwardOperationsText'), 'Input\n\nOutput', '', 'backwards')}
                `;
            }
        });

        registerAtomic(editor, 'm19-big-idea', {
            className: 'm19-editor-card m19-editor-card--idea',
            draggable: '[data-section="explanation"]',
            defaults: { itemsText: 'Start at the output.\nUndo the last step first.\nKeep working backwards.', preserved: {} },
            traits: [textareaTrait('itemsText', 'Big ideas (one per line)')],
            watched: ['itemsText'],
            render(model) {
                return `
                    <span class="m19-card-label">Big idea</span>
                    <ol>${lines(model.get('itemsText')).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
                `;
            }
        });

        registerAtomic(editor, 'm19-image', {
            className: 'm19-editor-card m19-editor-card--visual',
            draggable: '[data-section="explanation"]',
            defaults: { src: '', previewSrc: '', alt: '', caption: '', preserved: {} },
            traits: [
                textTrait('src', 'Saved image path'),
                textTrait('alt', 'Alternative text'),
                textTrait('caption', 'Caption')
            ],
            watched: ['src', 'previewSrc', 'alt', 'caption'],
            render(model) {
                const source = model.get('previewSrc') || model.get('src');
                return `
                    <span class="m19-card-label">Image / SVG</span>
                    ${source
                        ? `<img class="m19-editor-image" src="${escapeHtml(source)}" alt="${escapeHtml(model.get('alt'))}">`
                        : '<div class="m19-image-placeholder">Set an image path or use “Add image / SVG”.</div>'}
                    ${model.get('caption') ? `<p class="m19-visual-caption">${escapeHtml(model.get('caption'))}</p>` : ''}
                `;
            }
        });

        registerAtomic(editor, 'm19-method-step', {
            className: 'm19-editor-card m19-editor-card--method',
            draggable: '[data-section="method"]',
            defaults: { title: 'Step name', text: 'Say exactly what the pupil does.', preserved: {} },
            traits: [textTrait('title', 'Step title'), textareaTrait('text', 'Step explanation')],
            watched: ['title', 'text'],
            render(model) {
                return `
                    <span class="m19-card-label">Method step</span>
                    <h3>${escapeHtml(model.get('title'))}</h3>
                    <p>${escapeHtml(model.get('text'))}</p>
                `;
            }
        });

        registerAtomic(editor, 'm19-try-step', {
            className: 'm19-editor-card m19-editor-card--try',
            draggable: '[data-section="interactive"]',
            defaults: {
                label: 'Guided question',
                prompt: 'Ask one clear question.',
                optionsText: 'Option A\nOption B\nOption C',
                answer: 'Option B',
                feedback: 'Explain why the answer is correct.',
                machineOperation: '',
                reverseOperation: '',
                calculation: '',
                startValue: '',
                preserved: {}
            },
            traits: [
                textTrait('label', 'Step label'),
                textareaTrait('prompt', 'Prompt'),
                textareaTrait('optionsText', 'Answer choices (one per line)'),
                textTrait('answer', 'Correct answer'),
                textareaTrait('feedback', 'Correct feedback'),
                textTrait('startValue', 'Start value (optional)'),
                textTrait('machineOperation', 'Machine operation (optional)'),
                textTrait('reverseOperation', 'Reverse operation (optional)'),
                textTrait('calculation', 'Calculation (optional)')
            ],
            watched: [
                'label', 'prompt', 'optionsText', 'answer', 'feedback',
                'machineOperation', 'reverseOperation', 'calculation', 'startValue'
            ],
            render(model) {
                const options = lines(model.get('optionsText'));
                return `
                    <span class="m19-card-label">Try it step</span>
                    <p class="m19-eyebrow">${escapeHtml(model.get('label'))}</p>
                    <h3>${escapeHtml(model.get('prompt'))}</h3>
                    <div class="m19-choice-preview">
                        ${options.map((option) => `<span class="${option === model.get('answer') ? 'is-answer' : ''}">${escapeHtml(option)}</span>`).join('')}
                    </div>
                    ${model.get('calculation') ? `<p class="m19-calculation">${escapeHtml(model.get('calculation'))}</p>` : ''}
                    <p class="m19-feedback-preview">${escapeHtml(model.get('feedback'))}</p>
                `;
            }
        });

        registerAtomic(editor, 'm19-worked-example', {
            className: 'm19-editor-card m19-editor-card--worked',
            draggable: '[data-section="worked-examples"]',
            defaults: {
                eyebrow: '',
                title: 'Worked example',
                stepsText: 'First step.\nSecond step.\nResult.',
                answer: 'Answer',
                mistakesText: '',
                stepField: 'steps',
                preserved: {}
            },
            traits: [
                textTrait('eyebrow', 'Eyebrow (optional)'),
                textareaTrait('title', 'Question / title'),
                textareaTrait('stepsText', 'Working (one step per line)'),
                textTrait('answer', 'Answer'),
                textareaTrait('mistakesText', 'Mistakes to watch (one per line)')
            ],
            watched: ['eyebrow', 'title', 'stepsText', 'answer', 'mistakesText'],
            render(model) {
                return `
                    <span class="m19-card-label">Worked example</span>
                    ${model.get('eyebrow') ? `<p class="m19-eyebrow">${escapeHtml(model.get('eyebrow'))}</p>` : ''}
                    <h3>${escapeHtml(model.get('title'))}</h3>
                    <ol>${lines(model.get('stepsText')).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
                    ${model.get('mistakesText') ? `<p class="m19-mistakes"><strong>Watch for:</strong> ${escapeHtml(lines(model.get('mistakesText')).join(' · '))}</p>` : ''}
                    <p class="m19-answer-preview">${escapeHtml(model.get('answer'))}</p>
                `;
            }
        });
    }

    function registerBlocks(editor) {
        const blocks = editor.Blocks;
        const add = (id, label, category, media, content) => blocks.add(id, {
            label,
            category,
            media,
            content,
            activate: false,
            select: true
        });

        add('learn-card', 'Learn card', 'Learn', '▤', {
            type: 'm19-learn-card',
            title: 'One clear idea',
            paragraphsText: 'Explain one thing.\nShow what changes or stays the same.'
        });
        add('learn-text', 'Plain text', 'Learn', '¶', {
            type: 'm19-learn-copy',
            paragraphsText: 'Explain the idea here.'
        });
        add('key-points', 'Key points', 'Learn', '✓', { type: 'm19-key-points' });
        add('function-machine', 'Function machine', 'Visuals', '→', { type: 'm19-function-machine' });
        add('reverse-table', 'Reverse table', 'Visuals', '⇄', { type: 'm19-reverse-table' });
        add('paired-machines', 'Forward + reverse', 'Visuals', '↔', { type: 'm19-paired-machines' });
        add('big-idea', 'Big idea', 'Visuals', '★', { type: 'm19-big-idea' });
        add('image', 'Image / SVG', 'Visuals', '▧', { type: 'm19-image' });
        add('method-step', 'Method step', 'Method', '1.', { type: 'm19-method-step' });
        add('try-step', 'Multiple choice step', 'Try it', '?', { type: 'm19-try-step' });
        add('worked-example', 'Worked example', 'Worked examples', '∴', { type: 'm19-worked-example' });
    }

    const canvasCss = `
        * { box-sizing: border-box; }
        html { background: #eef1f6; }
        body { margin: 0; padding: 34px; color: #24283a; background: #eef1f6; font-family: Nunito, Inter, Arial, sans-serif; }
        .m19-document { width: min(920px, 100%); margin: 0 auto; }
        .m19-preview-header { margin-bottom: 22px; padding: 30px; border-radius: 22px; background: #5664d2; color: #fff; box-shadow: 0 12px 30px rgba(47,55,104,.18); }
        .m19-preview-kicker { margin: 0 0 8px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; opacity: .78; }
        .m19-preview-header h1 { margin: 0; font-size: 2.25rem; line-height: 1.05; }
        .m19-preview-header p:last-child { margin: 10px 0 0; font-size: 1.05rem; opacity: .92; }
        .m19-editor-section { margin: 0 0 22px; padding: 24px; border: 1px solid #dfe3ec; border-radius: 20px; background: #fff; box-shadow: 0 8px 20px rgba(39,45,75,.06); }
        .m19-section-heading { position: relative; margin-bottom: 16px; padding: 0 0 16px; border-bottom: 1px solid #e4e7ee; }
        .m19-section-heading h2 { margin: 2px 0 0; font-size: 1.55rem; }
        .m19-section-heading > p:not(.m19-eyebrow) { margin: 8px 0 0; color: #646a7b; }
        .m19-section-heading small { display: inline-block; margin-top: 8px; color: #747b8e; }
        .m19-section-state { position: absolute; top: 0; right: 0; display: flex; gap: 5px; align-items: center; padding: 5px 8px; border-radius: 999px; font-size: .7rem; background: #e7f7ef; color: #16794a; }
        .m19-section-state.is-disabled { background: #f0f1f5; color: #7b8190; }
        .m19-section-state b { font-weight: 900; }
        .m19-eyebrow { margin: 0; color: #5664d2; font-size: .78rem; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
        .m19-editor-card { position: relative; margin-top: 14px; padding: 20px; border: 2px solid #e0e4ed; border-radius: 17px; background: #fff; }
        .m19-editor-card h3 { margin: 5px 0 8px; font-size: 1.2rem; }
        .m19-editor-card h4 { margin: 15px 0 8px; }
        .m19-editor-card p { margin: 8px 0 0; line-height: 1.55; }
        .m19-editor-card ul, .m19-editor-card ol { margin: 10px 0 0; padding-left: 22px; }
        .m19-editor-card li + li { margin-top: 7px; }
        .m19-editor-card--learn { border-left: 7px solid #5664d2; }
        .m19-editor-card--visual { border-color: #cfd5f6; background: #f8f9ff; }
        .m19-editor-card--idea { border-color: #f0c75e; background: #fffaf0; }
        .m19-editor-card--method { border-left: 7px solid #0d8a6a; }
        .m19-editor-card--try { border-left: 7px solid #d66737; }
        .m19-editor-card--worked { border-left: 7px solid #8a56c9; }
        .m19-card-label { display: inline-block; padding: 4px 7px; border-radius: 7px; color: #5f6576; background: #edf0f5; font-size: .68rem; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }
        .m19-machine-row { display: flex; align-items: center; justify-content: center; gap: 11px; margin-top: 15px; overflow-x: auto; padding: 8px 0; }
        .m19-machine-value { min-width: 78px; text-align: center; }
        .m19-machine-value strong { display: block; padding: 13px 16px; border: 3px solid #5664d2; border-radius: 15px; background: #eef2ff; font-size: 1.25rem; }
        .m19-machine-value span { display: block; margin-top: 6px; font-size: .76rem; font-weight: 800; }
        .m19-machine-arrow { min-width: 78px; text-align: center; }
        .m19-machine-arrow span { display: inline-block; padding: 8px 11px; border: 2px solid #757d92; border-radius: 11px; background: #fff; font-weight: 900; }
        .m19-machine-arrow b { display: block; margin-top: 2px; color: #5664d2; font-size: 1.5rem; }
        .m19-visual-caption { text-align: center; color: #676e80; font-size: .86rem; }
        .m19-reverse-table { width: 100%; margin-top: 14px; border-collapse: collapse; }
        .m19-reverse-table th, .m19-reverse-table td { padding: 10px; border: 1px solid #d9deeb; text-align: left; }
        .m19-reverse-table th { background: #eef1fb; font-size: .78rem; }
        .m19-choice-preview { display: grid; gap: 8px; margin-top: 13px; }
        .m19-choice-preview span { padding: 11px 13px; border: 2px solid #dfe3ec; border-radius: 11px; font-weight: 800; }
        .m19-choice-preview span.is-answer { border-color: #2d9a68; background: #e9f8f0; }
        .m19-feedback-preview { padding: 10px 12px; border-radius: 10px; color: #416455; background: #edf8f2; }
        .m19-calculation { font-size: 1.08rem; font-weight: 900; }
        .m19-answer-preview { padding: 10px 12px; border-radius: 10px; background: #f0ecfa; font-size: 1.05rem; font-weight: 900; }
        .m19-mistakes { color: #8c3e2d; }
        .m19-editor-image { display: block; max-width: 100%; max-height: 440px; margin: 14px auto 0; border-radius: 12px; }
        .m19-image-placeholder { display: grid; place-items: center; min-height: 150px; margin-top: 13px; border: 2px dashed #c8cede; border-radius: 13px; color: #747b8d; background: #fff; }
        [data-gjs-highlightable] { min-height: 10px; }
        @media (max-width: 620px) {
            body { padding: 14px; }
            .m19-preview-header, .m19-editor-section { padding: 18px; border-radius: 16px; }
            .m19-preview-header h1 { font-size: 1.7rem; }
            .m19-machine-row { justify-content: flex-start; }
        }
    `;

    function initialiseEditor() {
        if (!window.grapesjs) {
            elements.editorEmpty.textContent = 'GrapesJS could not load. Check your internet connection, then reload.';
            setStatus('GrapesJS failed to load', 'error');
            return null;
        }

        const editor = window.grapesjs.init({
            container: '#gjs',
            height: '100%',
            width: 'auto',
            fromElement: false,
            storageManager: false,
            panels: { defaults: [] },
            blockManager: { appendTo: '#blocks-panel' },
            traitManager: { appendTo: '#traits-panel' },
            selectorManager: { componentFirst: true },
            deviceManager: {
                devices: [
                    { id: 'desktop', name: 'Desktop', width: '' },
                    { id: 'mobile', name: 'Mobile', width: '390px', widthMedia: '480px' }
                ]
            },
            canvas: {
                styles: ['../assets/css/app.css']
            },
            canvasCss,
            noticeOnUnload: false
        });

        registerComponents(editor);
        registerBlocks(editor);

        editor.on('update', markDirty);
        editor.on('component:add', (component) => {
            if (state.suppressDirty || component.get('type') === 'm19-section-heading') {
                return;
            }
            const parent = component.parent();
            const sectionKey = parent?.getAttributes?.()['data-section'];
            if (!sectionKey) {
                return;
            }
            const heading = parent.components().models.find((item) => item.get('type') === 'm19-section-heading');
            heading?.set('enabled', true);
            if (sectionKey === 'explanation' && [
                'm19-learn-card', 'm19-function-machine', 'm19-reverse-table',
                'm19-paired-machines', 'm19-big-idea', 'm19-image'
            ].includes(component.get('type'))) {
                heading?.set('schemaMode', 'cards');
            }
        });
        editor.on('component:selected', () => {
            const selected = editor.getSelected();
            if (selected?.get('type') === 'm19-header') {
                editor.select(null);
            }
        });

        elements.editorEmpty.hidden = true;
        state.editor = editor;
        return editor;
    }

    function sectionDefinition(key, label, lessonSection, content) {
        const section = isObject(lessonSection) ? lessonSection : {};
        const headingTraits = [
            checkboxTrait('enabled', 'Include this section'),
            textTrait('eyebrow', 'Eyebrow'),
            textTrait('title', 'Section title'),
            textareaTrait('intro', 'Intro')
        ];
        if (key === 'explanation') {
            headingTraits.push(selectTrait('schemaMode', 'Learn format', [
                { id: 'plain', name: 'Plain paragraphs' },
                { id: 'cards', name: 'Stacked Learn cards' }
            ]));
        }

        return {
            tagName: 'section',
            attributes: { class: 'm19-editor-section', 'data-section': key },
            draggable: false,
            removable: false,
            copyable: false,
            stylable: false,
            components: [
                {
                    type: 'm19-section-heading',
                    enabled: isObject(lessonSection),
                    sectionKey: key,
                    sectionLabel: label,
                    eyebrow: section.eyebrow || label,
                    title: section.title || '',
                    intro: section.intro || '',
                    schemaMode: key === 'explanation' && Array.isArray(section.blocks) ? 'cards' : 'plain',
                    traits: headingTraits
                },
                ...content
            ]
        };
    }

    function explanationComponents(explanation) {
        if (!isObject(explanation)) {
            return [];
        }

        const output = [];
        if (Array.isArray(explanation.blocks)) {
            explanation.blocks.forEach((block) => {
                if (!isObject(block)) {
                    return;
                }
                output.push({
                    type: 'm19-learn-card',
                    title: block.title || 'Learn card',
                    paragraphsText: linesText(block.paragraphs),
                    preserved: deepClone(block)
                });

                if (isObject(block.graphic)) {
                    output.push({
                        type: 'm19-function-machine',
                        valuesText: linesText(block.graphic.values),
                        operationsText: linesText(block.graphic.operations),
                        labelsText: linesText(block.graphic.labels),
                        caption: block.graphic.caption || '',
                        preserved: deepClone(block.graphic)
                    });
                }

                if (Array.isArray(block.reverse_rows)) {
                    output.push({
                        type: 'm19-reverse-table',
                        rowsText: rowsText(block.reverse_rows),
                        preserved: { reverse_rows: deepClone(block.reverse_rows) }
                    });
                }

                if (Array.isArray(block.paired_graphics) && block.paired_graphics.length >= 2) {
                    const forward = block.paired_graphics[0] || {};
                    const backward = block.paired_graphics[1] || {};
                    output.push({
                        type: 'm19-paired-machines',
                        forwardLabel: forward.label || 'Forwards',
                        forwardValuesText: linesText(forward.values),
                        forwardOperationsText: linesText(forward.operations),
                        backwardLabel: backward.label || 'Backwards',
                        backwardValuesText: linesText(backward.values),
                        backwardOperationsText: linesText(backward.operations),
                        preserved: { paired_graphics: deepClone(block.paired_graphics) }
                    });
                }

                if (Array.isArray(block.big_idea)) {
                    output.push({
                        type: 'm19-big-idea',
                        itemsText: linesText(block.big_idea),
                        preserved: { big_idea: deepClone(block.big_idea) }
                    });
                }

                if (isObject(block.image)) {
                    output.push({
                        type: 'm19-image',
                        src: block.image.src || '',
                        previewSrc: previewSource(block.image.src || ''),
                        alt: block.image.alt || '',
                        caption: block.image.caption || '',
                        preserved: deepClone(block.image)
                    });
                }
            });
        } else if (Array.isArray(explanation.paragraphs)) {
            output.push({
                type: 'm19-learn-copy',
                paragraphsText: linesText(explanation.paragraphs),
                preserved: { paragraphs: deepClone(explanation.paragraphs) }
            });
        }

        if (Array.isArray(explanation.key_points)) {
            output.push({
                type: 'm19-key-points',
                itemsText: linesText(explanation.key_points),
                preserved: { key_points: deepClone(explanation.key_points) }
            });
        }

        return output;
    }

    function methodComponents(method) {
        if (!isObject(method) || !Array.isArray(method.steps)) {
            return [];
        }
        return method.steps.filter(isObject).map((step) => ({
            type: 'm19-method-step',
            title: step.title || '',
            text: step.text || '',
            preserved: deepClone(step)
        }));
    }

    function interactiveComponents(interactive) {
        if (!isObject(interactive) || !Array.isArray(interactive.steps)) {
            return [];
        }
        return interactive.steps.filter(isObject).map((step) => ({
            type: 'm19-try-step',
            label: step.label || step.title || 'Question',
            prompt: step.prompt || '',
            optionsText: linesText(step.options),
            answer: String(step.answer ?? ''),
            feedback: step.feedback || step.explanation || '',
            machineOperation: step.machine_operation || '',
            reverseOperation: step.reverse_operation || '',
            calculation: step.calculation || '',
            startValue: step.start_value || '',
            preserved: deepClone(step)
        }));
    }

    function workedComponents(workedExamples) {
        if (!Array.isArray(workedExamples)) {
            return [];
        }
        return workedExamples.filter(isObject).map((example) => {
            const stepField = Array.isArray(example.method_steps) ? 'method_steps' : 'steps';
            return {
                type: 'm19-worked-example',
                eyebrow: example.eyebrow || '',
                title: example.title || '',
                stepsText: linesText(example[stepField]),
                answer: String(example.answer ?? ''),
                mistakesText: linesText(example.mistakes_to_watch),
                stepField,
                preserved: deepClone(example)
            };
        });
    }

    function previewSource(source) {
        if (!source) {
            return '';
        }
        if (/^(?:https?:|data:|blob:)/i.test(source)) {
            return source;
        }
        const clean = String(source).replace(/^\.\//, '');
        return `../content/${encodeURIComponent(state.folder)}/${clean.split('/').map(encodeURIComponent).join('/')}`;
    }

    function lessonToComponents(lesson) {
        return [{
            tagName: 'main',
            attributes: { class: 'm19-document' },
            draggable: false,
            removable: false,
            copyable: false,
            components: [
                {
                    type: 'm19-header',
                    title: lesson.title || 'Lesson title',
                    subtitle: lesson.subtitle || ''
                },
                sectionDefinition('explanation', 'Learn', lesson.explanation, explanationComponents(lesson.explanation)),
                sectionDefinition('method', 'Method', lesson.method, methodComponents(lesson.method)),
                sectionDefinition('interactive', 'Try it', lesson.interactive, interactiveComponents(lesson.interactive)),
                sectionDefinition('worked-examples', 'Worked examples', Array.isArray(lesson.worked_examples) ? {
                    eyebrow: 'Worked examples', title: 'Worked examples'
                } : null, workedComponents(lesson.worked_examples)),
                sectionDefinition('question-bank', 'Practice', lesson.question_bank, [])
            ]
        }];
    }

    function documentComponent() {
        return state.editor?.getWrapper()?.components()?.at(0) || null;
    }

    function findSection(key) {
        const doc = documentComponent();
        if (!doc) {
            return null;
        }
        return doc.components().models.find((component) => component.getAttributes()['data-section'] === key) || null;
    }

    function sectionChildren(key) {
        const section = findSection(key);
        return section ? section.components().models : [];
    }

    function sectionHeading(key) {
        return sectionChildren(key).find((component) => component.get('type') === 'm19-section-heading') || null;
    }

    function setOptional(object, key, value) {
        const clean = typeof value === 'string' ? value.trim() : value;
        if (clean === '' || clean === undefined || clean === null) {
            delete object[key];
        } else {
            object[key] = clean;
        }
    }

    function serializeExplanation(base, heading, children) {
        const explanation = isObject(base) ? deepClone(base) : {};
        setOptional(explanation, 'eyebrow', heading.get('eyebrow'));
        setOptional(explanation, 'title', heading.get('title'));
        delete explanation.intro;

        const mode = heading.get('schemaMode') === 'cards' ? 'cards' : 'plain';
        const keyPoints = children.find((component) => component.get('type') === 'm19-key-points');
        if (keyPoints) {
            explanation.key_points = lines(keyPoints.get('itemsText'));
        } else {
            delete explanation.key_points;
        }

        if (mode === 'plain') {
            const copy = children.find((component) => component.get('type') === 'm19-learn-copy');
            explanation.paragraphs = copy ? lines(copy.get('paragraphsText')) : [];
            delete explanation.blocks;
            return explanation;
        }

        const blocks = [];
        let current = null;
        const ensureCurrent = () => {
            if (!current) {
                current = { title: 'Visual explanation', paragraphs: [] };
                blocks.push(current);
            }
            return current;
        };

        children.forEach((component) => {
            const type = component.get('type');
            if (type === 'm19-section-heading' || type === 'm19-key-points' || type === 'm19-learn-copy') {
                return;
            }

            if (type === 'm19-learn-card') {
                current = isObject(component.get('preserved')) ? deepClone(component.get('preserved')) : {};
                current.title = component.get('title') || '';
                current.paragraphs = lines(component.get('paragraphsText'));
                delete current.graphic;
                delete current.reverse_rows;
                delete current.paired_graphics;
                delete current.big_idea;
                delete current.image;
                blocks.push(current);
                return;
            }

            const block = ensureCurrent();
            if (type === 'm19-function-machine') {
                const graphic = isObject(component.get('preserved')) ? deepClone(component.get('preserved')) : {};
                graphic.values = lines(component.get('valuesText'));
                graphic.operations = lines(component.get('operationsText'));
                graphic.labels = lines(component.get('labelsText'));
                setOptional(graphic, 'caption', component.get('caption'));
                block.graphic = graphic;
            } else if (type === 'm19-reverse-table') {
                block.reverse_rows = pipeRows(component.get('rowsText')).map((row) => ({
                    machine: row[0] || '',
                    reverse: row[1] || '',
                    working: row[2] || ''
                }));
            } else if (type === 'm19-paired-machines') {
                const preserved = component.get('preserved');
                const original = isObject(preserved) && Array.isArray(preserved.paired_graphics)
                    ? deepClone(preserved.paired_graphics)
                    : [{}, {}];
                const forward = isObject(original[0]) ? original[0] : {};
                const backward = isObject(original[1]) ? original[1] : {};
                forward.label = component.get('forwardLabel') || 'Forwards';
                forward.values = lines(component.get('forwardValuesText'));
                forward.operations = lines(component.get('forwardOperationsText'));
                forward.direction = 'forwards';
                backward.label = component.get('backwardLabel') || 'Backwards';
                backward.values = lines(component.get('backwardValuesText'));
                backward.operations = lines(component.get('backwardOperationsText'));
                backward.direction = 'backwards';
                block.paired_graphics = [forward, backward];
            } else if (type === 'm19-big-idea') {
                block.big_idea = lines(component.get('itemsText'));
            } else if (type === 'm19-image') {
                const image = isObject(component.get('preserved')) ? deepClone(component.get('preserved')) : {};
                image.src = component.get('src') || '';
                setOptional(image, 'alt', component.get('alt'));
                setOptional(image, 'caption', component.get('caption'));
                block.image = image;
            }
        });

        explanation.blocks = blocks;
        delete explanation.paragraphs;
        return explanation;
    }

    function serializeMethod(base, heading, children) {
        const method = isObject(base) ? deepClone(base) : {};
        setOptional(method, 'eyebrow', heading.get('eyebrow'));
        setOptional(method, 'title', heading.get('title'));
        setOptional(method, 'intro', heading.get('intro'));
        method.steps = children
            .filter((component) => component.get('type') === 'm19-method-step')
            .map((component) => {
                const step = isObject(component.get('preserved')) ? deepClone(component.get('preserved')) : {};
                step.title = component.get('title') || '';
                step.text = component.get('text') || '';
                return step;
            });
        return method;
    }

    function serializeInteractive(base, heading, children) {
        const interactive = isObject(base) ? deepClone(base) : {};
        setOptional(interactive, 'eyebrow', heading.get('eyebrow'));
        setOptional(interactive, 'title', heading.get('title'));
        setOptional(interactive, 'intro', heading.get('intro'));

        const stepComponents = children.filter((component) => component.get('type') === 'm19-try-step');
        if (stepComponents.length || Array.isArray(interactive.steps)) {
            interactive.steps = stepComponents.map((component) => {
                const step = isObject(component.get('preserved')) ? deepClone(component.get('preserved')) : {};
                step.label = component.get('label') || '';
                step.prompt = component.get('prompt') || '';
                step.options = lines(component.get('optionsText'));
                step.answer = component.get('answer') || '';
                step.feedback = component.get('feedback') || '';
                setOptional(step, 'start_value', component.get('startValue'));
                setOptional(step, 'machine_operation', component.get('machineOperation'));
                setOptional(step, 'reverse_operation', component.get('reverseOperation'));
                setOptional(step, 'calculation', component.get('calculation'));
                return step;
            });
        }
        return interactive;
    }

    function serializeWorked(children) {
        return children
            .filter((component) => component.get('type') === 'm19-worked-example')
            .map((component) => {
                const example = isObject(component.get('preserved')) ? deepClone(component.get('preserved')) : {};
                setOptional(example, 'eyebrow', component.get('eyebrow'));
                example.title = component.get('title') || '';
                const field = component.get('stepField') === 'method_steps' ? 'method_steps' : 'steps';
                example[field] = lines(component.get('stepsText'));
                if (field === 'method_steps') {
                    delete example.steps;
                } else {
                    delete example.method_steps;
                }
                example.answer = component.get('answer') || '';
                const mistakes = lines(component.get('mistakesText'));
                if (mistakes.length) {
                    example.mistakes_to_watch = mistakes;
                } else {
                    delete example.mistakes_to_watch;
                }
                return example;
            });
    }

    function serializeMetadataSection(base, heading) {
        const section = isObject(base) ? deepClone(base) : {};
        setOptional(section, 'eyebrow', heading.get('eyebrow'));
        setOptional(section, 'title', heading.get('title'));
        setOptional(section, 'intro', heading.get('intro'));
        return section;
    }

    function serializeLesson() {
        if (!state.lesson || !state.editor) {
            throw new Error('No lesson is loaded.');
        }

        const lesson = deepClone(state.lesson);
        lesson.id = elements.lessonId.value.trim() || lesson.id || `${state.folder}-01`;
        lesson.slug = state.folder;
        lesson.title = elements.lessonTitle.value.trim() || 'Untitled lesson';
        lesson.subtitle = elements.lessonSubtitle.value.trim();

        SECTION_ORDER.forEach(([key]) => {
            const heading = sectionHeading(key);
            const children = sectionChildren(key);
            if (!heading || heading.get('enabled') === false) {
                if (key === 'worked-examples') {
                    delete lesson.worked_examples;
                } else {
                    delete lesson[key.replace('-', '_')];
                }
                return;
            }

            if (key === 'explanation') {
                lesson.explanation = serializeExplanation(lesson.explanation, heading, children);
            } else if (key === 'method') {
                lesson.method = serializeMethod(lesson.method, heading, children);
            } else if (key === 'interactive') {
                lesson.interactive = serializeInteractive(lesson.interactive, heading, children);
            } else if (key === 'worked-examples') {
                lesson.worked_examples = serializeWorked(children);
            } else if (key === 'question-bank') {
                lesson.question_bank = serializeMetadataSection(lesson.question_bank, heading);
            }
        });

        return lesson;
    }

    function populateMeta(lesson) {
        elements.lessonId.value = lesson.id || `${state.folder}-01`;
        elements.lessonSlug.value = state.folder;
        elements.lessonTitle.value = lesson.title || '';
        elements.lessonSubtitle.value = lesson.subtitle || '';
    }

    function updateHeaderPreview() {
        const doc = documentComponent();
        const header = doc?.components()?.models.find((component) => component.get('type') === 'm19-header');
        if (header) {
            header.set({
                title: elements.lessonTitle.value,
                subtitle: elements.lessonSubtitle.value
            });
        }
    }

    async function listLessons(preferredFolder = '') {
        setStatus('Loading lessons…');
        const payload = await api('list');
        state.lessons = payload.lessons;
        elements.lessonSelect.replaceChildren();

        if (!state.lessons.length) {
            const option = document.createElement('option');
            option.textContent = 'No lesson.json files found';
            option.value = '';
            elements.lessonSelect.append(option);
            setStatus('No lessons found', 'error');
            return;
        }

        state.lessons.forEach((lesson) => {
            const option = document.createElement('option');
            option.value = lesson.folder;
            option.textContent = lesson.title;
            elements.lessonSelect.append(option);
        });

        const folder = preferredFolder && state.lessons.some((lesson) => lesson.folder === preferredFolder)
            ? preferredFolder
            : state.lessons[0].folder;
        elements.lessonSelect.value = folder;
        await loadLesson(folder);
    }

    async function loadLesson(folder) {
        if (!folder) {
            return;
        }
        setStatus('Loading lesson…');
        elements.saveButton.disabled = true;
        state.suppressDirty = true;
        try {
            const payload = await api('load', { query: `&folder=${encodeURIComponent(folder)}` });
            state.folder = payload.folder;
            state.lesson = payload.lesson;
            state.previewUrl = payload.preview_url;
            populateMeta(state.lesson);
            state.editor.setComponents(lessonToComponents(state.lesson));
            state.editor.UndoManager.clear();
            state.editor.select(null);
            state.dirty = false;
            setStatus('Loaded. Select a block to edit.', 'saved');
        } catch (error) {
            setStatus(error.message, 'error');
            throw error;
        } finally {
            state.suppressDirty = false;
            elements.saveButton.disabled = false;
        }
    }

    async function saveLesson() {
        try {
            setStatus('Saving…', 'saving');
            elements.saveButton.disabled = true;
            const lesson = serializeLesson();
            const payload = await api('save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: state.folder, lesson })
            });
            state.lesson = deepClone(lesson);
            clearDirty(payload.message || 'Saved');
            const option = [...elements.lessonSelect.options].find((item) => item.value === state.folder);
            if (option) {
                option.textContent = lesson.title;
            }
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            elements.saveButton.disabled = false;
        }
    }

    function openJsonEditor() {
        try {
            const lesson = serializeLesson();
            elements.jsonEditor.value = JSON.stringify(lesson, null, 2);
            elements.jsonError.textContent = '';
            elements.jsonDialog.showModal();
        } catch (error) {
            setStatus(error.message, 'error');
        }
    }

    function applyJson() {
        try {
            const lesson = JSON.parse(elements.jsonEditor.value);
            if (!isObject(lesson)) {
                throw new Error('The root value must be a JSON object.');
            }
            state.suppressDirty = true;
            state.lesson = deepClone(lesson);
            populateMeta(lesson);
            state.editor.setComponents(lessonToComponents(lesson));
            state.editor.UndoManager.clear();
            state.suppressDirty = false;
            state.dirty = true;
            setStatus('Advanced JSON applied. Save to write it.', 'saving');
            elements.jsonDialog.close();
        } catch (error) {
            state.suppressDirty = false;
            elements.jsonError.textContent = error.message;
        }
    }

    function slugify(value) {
        return String(value)
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async function createLesson() {
        const title = elements.newTitle.value.trim();
        const slug = elements.newSlug.value.trim();
        if (!title || !slug) {
            return;
        }

        elements.createButton.disabled = true;
        try {
            const payload = await api('create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, slug })
            });
            elements.newDialog.close();
            elements.newForm.reset();
            state.slugTouched = false;
            await listLessons(payload.folder);
            setStatus(payload.message, 'saved');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            elements.createButton.disabled = false;
        }
    }

    function setDevice(device) {
        state.editor.setDevice(device === 'mobile' ? 'mobile' : 'desktop');
        elements.desktopButton.classList.toggle('is-active', device === 'desktop');
        elements.mobileButton.classList.toggle('is-active', device === 'mobile');
    }

    function ensureLearnCard() {
        const section = findSection('explanation');
        if (!section) {
            return null;
        }
        const heading = sectionHeading('explanation');
        heading?.set({ enabled: true, schemaMode: 'cards' });
        let card = section.components().models.filter((component) => component.get('type') === 'm19-learn-card').at(-1);
        if (!card) {
            card = section.append({
                type: 'm19-learn-card',
                title: 'Visual explanation',
                paragraphsText: 'Explain what the pupil should notice.'
            })[0];
        }
        return card;
    }

    async function uploadAssets(files) {
        if (!state.folder || !files.length) {
            return;
        }
        setStatus('Uploading image…', 'saving');
        const form = new FormData();
        [...files].forEach((file) => form.append('files[]', file));

        try {
            const payload = await api('upload', {
                query: `&folder=${encodeURIComponent(state.folder)}`,
                method: 'POST',
                body: form
            });
            const section = findSection('explanation');
            ensureLearnCard();
            payload.data.forEach((asset) => {
                section.append({
                    type: 'm19-image',
                    src: asset.stored_src,
                    previewSrc: asset.src,
                    alt: '',
                    caption: ''
                });
            });
            markDirty();
            setStatus(`${payload.data.length} asset${payload.data.length === 1 ? '' : 's'} added. Save the lesson.`, 'saving');
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            elements.assetInput.value = '';
        }
    }

    function confirmDiscard() {
        return !state.dirty || window.confirm('Discard the unsaved changes to this lesson?');
    }

    function bindUi() {
        elements.lessonSelect.addEventListener('change', async () => {
            const next = elements.lessonSelect.value;
            if (!confirmDiscard()) {
                elements.lessonSelect.value = state.folder;
                return;
            }
            try {
                await loadLesson(next);
            } catch (error) {
                elements.lessonSelect.value = state.folder;
            }
        });

        elements.reloadButton.addEventListener('click', async () => {
            if (!confirmDiscard()) {
                return;
            }
            await loadLesson(state.folder);
        });
        elements.newButton.addEventListener('click', () => elements.newDialog.showModal());
        elements.saveButton.addEventListener('click', saveLesson);
        elements.previewButton.addEventListener('click', () => {
            if (state.previewUrl) {
                window.open(`${state.previewUrl}?editor-preview=${Date.now()}`, '_blank', 'noopener');
            }
        });
        elements.jsonButton.addEventListener('click', openJsonEditor);
        elements.applyJsonButton.addEventListener('click', (event) => {
            event.preventDefault();
            applyJson();
        });
        elements.undoButton.addEventListener('click', () => state.editor.UndoManager.undo());
        elements.redoButton.addEventListener('click', () => state.editor.UndoManager.redo());
        elements.desktopButton.addEventListener('click', () => setDevice('desktop'));
        elements.mobileButton.addEventListener('click', () => setDevice('mobile'));
        elements.uploadButton.addEventListener('click', () => elements.assetInput.click());
        elements.assetInput.addEventListener('change', () => uploadAssets(elements.assetInput.files));

        [elements.lessonId, elements.lessonTitle, elements.lessonSubtitle].forEach((input) => {
            input.addEventListener('input', () => {
                updateHeaderPreview();
                markDirty();
            });
        });

        elements.newTitle.addEventListener('input', () => {
            if (!state.slugTouched) {
                elements.newSlug.value = slugify(elements.newTitle.value);
            }
        });
        elements.newSlug.addEventListener('input', () => {
            state.slugTouched = true;
            elements.newSlug.value = slugify(elements.newSlug.value);
        });
        elements.newForm.addEventListener('submit', (event) => {
            event.preventDefault();
            createLesson();
        });

        window.addEventListener('keydown', (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                saveLesson();
            }
        });

        window.addEventListener('beforeunload', (event) => {
            if (!state.dirty) {
                return;
            }
            event.preventDefault();
            event.returnValue = '';
        });
    }

    async function start() {
        const editor = initialiseEditor();
        if (!editor) {
            return;
        }
        bindUi();
        try {
            await listLessons();
        } catch (error) {
            setStatus(error.message, 'error');
            elements.editorEmpty.hidden = false;
            elements.editorEmpty.textContent = error.message;
        }
    }

    start();
})();
