(() => {
    'use strict';

    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail.slug !== document.body.dataset.lessonId) return;
        const api = window.Maths1to9Lesson;
        const { id, config } = api.getSection('comparison');
        const root = document.getElementById(`${event.detail.slug}-comparison`);
        const heading = document.createElement('h2');
        heading.textContent = config.questions[0].prompt;
        root.append(heading);
        api.registerHashRoute('check-1', () => api.goToSection(id, { moveFocus: false }));
        document.addEventListener('maths1to9:section-change', () => {
            if (api.getCurrentSection().id === id) {
                queueMicrotask(() => api.setSlideHash('check-1', { replace: true }));
            }
        });
    });
})();
