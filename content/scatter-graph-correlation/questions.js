(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'scatter-graph-correlation' : document.body.dataset.lessonId;
    const practiceLabels = { type: 'Type Practice', strength: 'Strength Practice', describe: 'Describe Practice', cause: 'Cause Practice' };

    /* Placeholder for a Practice or Check that a later stage builds. */
    function mountPlaceholder(api, host, id, label) {
        const box = host.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', label);
        api.gateSection(id);
        host.replaceChildren();
        const heading = document.createElement('h2');
        heading.textContent = 'This part comes next.';
        heading.id = `lesson-section-title-${id}`;
        heading.dataset.screenHeading = '';
        heading.tabIndex = -1;
        host.append(heading);
        api.setSectionBack(id, null);
        api.setSectionReset(id, null);
        if (id !== 'comparison') {
            api.setSectionAction(id, {
                label: 'Continue',
                onClick() {
                    api.completeSection(id);
                    api.continueSection();
                }
            });
            return;
        }
        api.setSectionAction(id, {
            label: 'All lessons',
            async onClick() {
                api.completeSection(id);
                api.completeLesson();
                window.location.assign(new URL('../../', window.location.href).href);
            }
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {};
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        for (const { id } of api.getSections()) {
            const { kind, part } = api.getSection(id);
            if (kind !== 'question-bank' && kind !== 'comparison') continue;
            const host = document.getElementById(window.Maths1to9LessonEngine.questionSetContainerId(slug, id));
            if (!host) continue;
            mountPlaceholder(api, host, id, kind === 'comparison' ? 'Check' : part ? practiceLabels[part] : 'Mixed Practice');
        }
    };
})();
