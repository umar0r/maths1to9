(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        for (const { id, kind } of api.getSections()) {
            if (kind !== 'question-bank' && kind !== 'comparison') continue;
            const host = document.getElementById(helpers.questionSetContainerId(slug, id));
            const heading = document.createElement('h2');
            heading.textContent = 'Coming soon.';
            host.append(heading);
            api.gateSection(id);
            api.setSectionBack(id, null);
            api.setSectionReset(id, null);
            api.setSectionAction(id, { label: 'Continue', disabled: true, onClick() {} });
        }
    };
})();
