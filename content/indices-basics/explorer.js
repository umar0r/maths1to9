(() => {
    'use strict';

    document.addEventListener('maths1to9:lesson-rendered', async event => {
        if (event.detail?.slug !== 'indices-basics') return;
        const api = window.Maths1to9Lesson;
        const checkQuestions = document.getElementById('indices-basics-comparison');
        checkQuestions.dataset.explorerPending = 'true';
        checkQuestions.hidden = true;
        const checkExplorer = document.createElement('div');
        checkExplorer.className = 'power-explorer';
        checkQuestions.before(checkExplorer);
        api.gateSection('comparison');

        function power(base, index) { return `${base}<sup>${index}</sup>`; }
        const store = window.Maths1to9Progress;
        let exploration = await store.getLessonActivityState('indices-basics', 'explorer');
        if (exploration?.contentVersion !== 1) exploration = { contentVersion: 1, base: 2, index: 3, continued: false };
        function save() { store.saveLessonActivityState('indices-basics', 'explorer', exploration); }
        function continueToQuestions() {
            exploration.continued = true;
            save();
            checkExplorer.remove();
            checkQuestions.hidden = false;
            delete checkQuestions.dataset.explorerPending;
            document.dispatchEvent(new CustomEvent('indices:check-ready'));
        }
        function updateExploration() {
            save();
            const base = exploration.base;
            const factors = Array(exploration.index).fill(base).join(' × ');
            checkExplorer.querySelector('[data-index-output]').textContent = exploration.index;
            checkExplorer.querySelector('[data-equation]').innerHTML = exploration.index === 1
                ? `${power(base, 1)} = ${base}`
                : `${power(base, exploration.index)} = ${factors} = ${base ** exploration.index}`;
            checkExplorer.querySelector('[data-description]').textContent = exploration.index === 1
                ? `The index is 1, so there is just one ${base}.`
                : `The index is ${exploration.index}, so multiply ${exploration.index} copies of ${base} together.`;
        }
        function renderExplorer() {
            checkExplorer.innerHTML = `
                <h3 class="question-prompt">Explore the meaning of indices</h3><p>Change the base or move the index slider. Watch the multiplication change. When you are ready, continue to the questions.</p>
                <div class="power-explorer__controls">
                    <label>Base<select data-base>${[2, 3, 4, 5].map(n => `<option value="${n}" ${n === exploration.base ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
                    <label class="power-explorer__slider">Index <output data-index-output for="power-index">3</output><input id="power-index" type="range" min="1" max="4" step="1" value="${exploration.index}"><span class="power-explorer__range"><span>1</span><span>4</span></span></label>
                </div>
                <div class="power-explorer__result" aria-live="polite" aria-atomic="true"><p class="power-explorer__equation" data-equation></p><p data-description></p></div>
`;
            checkExplorer.querySelector('[data-base]').addEventListener('change', event => {
                exploration.base = Number(event.target.value);
                updateExploration();
            });
            checkExplorer.querySelector('#power-index').addEventListener('input', event => {
                exploration.index = Number(event.target.value);
                updateExploration();
            });
            updateExploration();
            api.setSectionAction('comparison', {
                label: 'Continue', onClick() {
                    continueToQuestions();
                }
            });
        }
        if (exploration.continued) continueToQuestions();
        else renderExplorer();
    });
})();
