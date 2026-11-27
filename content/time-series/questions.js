(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async () => {
        const api = window.Maths1to9Lesson;
        // Practice and Check are mounted in the following relay stages.
        for (const id of ['question-bank--draw', 'question-bank--read', 'question-bank--trend',
            'question-bank--seasons', 'question-bank', 'comparison']) {
            api.gateSection(id);
            api.setSectionAction(id, { label: 'Continue', disabled: id === 'comparison', onClick() {
                api.completeSection(id);
                api.continueSection();
            } });
        }
    };
})();
