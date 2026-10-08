(() => {
    'use strict';
    const app = document.getElementById('lesson-app');
    const engine = window.Maths1to9LessonEngine;
    const store = window.Maths1to9Progress;
    const router = engine.createRouter();
    const slug = 'convert-a-fraction-to-a-percentage';
    const title = 'Convert a fraction to a percentage';
    const ids = ['learn', 'try-it', 'practice', 'check'];
    const labels = ['Learn', 'Try it', 'Practice', 'Check'];
    const fraction = (n, d) => `<span class="fraction" aria-label="${n} over ${d}"><span>${n}</span><span>${d}</span></span>`;
    const questions = [
        {prompt:'First divide: 3 ÷ 8 = ?', options:['0.375', '0.0375', '2.667', '3.8'], answer:0, explanation:'3 ÷ 8 = 0.375. This is the decimal, so there is no % sign yet.'},
        {prompt:'Now multiply: 0.375 × 100 = ?', options:['0.375%', '3.75%', '37.5%', '375%'], answer:2, explanation:'0.375 × 100 = 37.5, so 3/8 = 37.5%.'},
        {n:1, d:4, options:['0.25%', '4%', '40%', '25%'], answer:3, explanation:'1 ÷ 4 = 0.25. Then 0.25 × 100 = 25, so 1/4 = 25%.'},
        {n:7, d:20, options:['35%', '0.35%', '3.5%', '28.57%'], answer:0, explanation:'7 ÷ 20 = 0.35. Then 0.35 × 100 = 35, so 7/20 = 35%.'},
        {n:9, d:16, options:['5.625%', '56.25%', '0.5625%', '62.5%'], answer:1, explanation:'9 ÷ 16 = 0.5625. Then 0.5625 × 100 = 56.25, so 9/16 = 56.25%.'},
        {prompt:'A student writes 3/5 = 0.6%. Which explanation corrects the mistake?', options:['0.6 is the decimal. Multiply by 100 to get 60%.', '0.6 is the percentage. Just add the % sign.', 'Divide 0.6 by 100 to get 0.006%.', 'Multiply 0.6 by 10 to get 6%.'], answer:0, explanation:'3 ÷ 5 = 0.6 is the decimal. Multiply by 100: 0.6 × 100 = 60. The correct percentage is 60%.'}
    ];
    let state = {contentVersion:1, stage:0, learned:false, cursors:[0,0,2,5], answers:{}, finished:false};
    let queue = Promise.resolve();
    const response = i => state.answers[i] || (state.answers[i] = {selected:null, attempted:false, correct:false});
    const activities = () => [{id:'learn', kind:'learn', completed:state.learned}, ...questions.map((q,i) => ({id:`answer:q${i}`, kind:'answer', completed:response(i).attempted, correct:response(i).correct, firstCorrect:response(i).firstCorrect}))];
    const complete = stage => stage === 0 ? state.learned : (stage === 1 ? [0,1] : stage === 2 ? [2,3,4] : [5]).every(i => response(i).correct);
    function save() {
        const record = {title, pathname:location.pathname, totalSections:4, currentSectionId:ids[state.stage], currentSectionIndex:state.stage, highestUnlockedIndex:3, finished:state.finished, score:engine.calculateScore(activities()), fractionPercentageState:state, completionPercent:Math.round(ids.filter((_,i)=>complete(i)).length / 4 * 100)};
        const snapshot = JSON.parse(JSON.stringify(record));
        queue = queue.catch(()=>{}).then(()=>store.saveLessonProgress(slug,snapshot));
    }
    function learn() {
        return `<h2 class="lesson-section__title">Out of 100</h2><p>A percentage tells you how many parts there are <strong>out of 100</strong>. Fractions, decimals and percentages can represent the same amount.</p><ol><li>Divide the numerator (top number) by the denominator (bottom number).</li><li>Multiply the answer by 100.</li><li>Add the % sign.</li></ol><div class="fraction-equation">Fraction → decimal → percentage</div><h3>Worked example</h3><p>Write ${fraction(5,16)} as a percentage.</p><div class="fraction-equation">5 ÷ 16 = 0.3125<br>0.3125 × 100 = 31.25<br>${fraction(5,16)} = 31.25%</div><p>Keep all the decimal digits until you multiply by 100. A calculator can help with the division.</p>`;
    }
    function completedWork(stage) {
        const indices = stage === 1 ? [0, 1] : stage === 2 ? [2, 3, 4] : [5];
        const visual = stage === 1 ? '<div class="fraction-equation">3 ÷ 8 = 0.375<br>0.375 × 100 = 37.5<br>' + fraction(3, 8) + ' = 37.5%</div>' : '';
        return visual + '<ol class="retained-results">' + indices.map(i => {
            const q = questions[i];
            const a = response(i);
            const prompt = q.prompt || `${q.n}/${q.d} as a percentage`;
            return `<li><div class="retained-result"><span>${prompt}</span><strong>${q.options[a.selected]}</strong><span>${a.firstCorrect ? '✓' : '2nd try'}</span></div>${a.firstCorrect ? '' : `<p>${q.explanation}</p>`}</li>`;
        }).join('') + '</ol>';
    }
    function render() {
        const stage = state.stage, i = state.cursors[stage], a = stage ? response(i) : null, q = stage ? questions[i] : null;
        const score = engine.calculateScore(activities());
        let body = learn();
        if (stage) {
            const heading = stage === 1 ? `Write ${fraction(3,8)} as a percentage` : stage === 2 ? `Write ${fraction(q.n,q.d)} as a percentage` : 'Spot the mistake';
            body = `<h2 class="lesson-section__title">${heading}</h2>${stage === 2 ? `<p>Question ${i-1} of 3. Work out the division and multiplication on paper, then choose your answer.</p>` : ''}${stage === 1 && i === 1 ? '<div class="fraction-equation">3 ÷ 8 = 0.375<br>0.375 × 100 = ?%</div>' : ''}${stage === 3 ? '<div class="fraction-equation">3/5 = 0.6%<br><small>Is this correct?</small></div>' : ''}<p>${q.prompt || 'Which percentage is equivalent to this fraction?'}</p><div class="fraction-options" role="group" aria-label="Four answer options">${q.options.map((option,j)=>`<button class="button" type="button" data-option="${j}" aria-pressed="${a.selected===j}" ${a.correct?'disabled':''}>${option}</button>`).join('')}</div>`;
        }
        if (stage && complete(stage)) body = completedWork(stage);
        app.innerHTML = `<header class="lesson-header lesson-header--compact"><div class="lesson-header__inner"><h1 class="lesson-header__title">${title}</h1><div class="rounding-score" aria-label="${score.points} of ${score.maximumPoints} points earned"><div class="practice-progress-ring" style="--practice-progress:${score.points/score.maximumPoints*100}%" role="img" aria-label="${score.points} of ${score.maximumPoints} points earned"><span>${score.points}</span></div></div></div></header><nav class="lesson-navigation lesson-navigation--stages" aria-label="Lesson sections"><div class="lesson-navigation__buttons">${ids.map((id,j)=>`<a href="#${id}" class="lesson-navigation__button" data-stage-number="${j+1}" ${j===stage?'aria-current="step"':''}>${labels[j]}</a>`).join('')}</div></nav><section class="lesson-section" data-lesson-section="${ids[stage]}"><p class="lesson-eyebrow">${labels[stage]}</p>${body}<p id="feedback" role="status">${a && !complete(stage) ? (a.feedback || (a.correct ? q.explanation : '')) : ''}${state.feedback || ''}${state.finished && stage === 3?' Lesson complete.':''}</p></section><footer class="lesson-controls"><div class="button-group"><button id="continue" type="button" class="button button--primary" ${stage && !a.correct && a.selected===null?'disabled':''}>${state.finished && stage===3?'All lessons':stage && !a.correct?'Check':'Continue'}</button></div></footer>`;
        app.querySelectorAll('[data-option]').forEach(button => button.onclick = () => {a.selected = Number(button.dataset.option); a.feedback = ''; save(); render();});
        app.querySelectorAll('.lesson-navigation__button').forEach((button,j) => engine.updateStageProgress(button, complete(j)?1:0, 1));
        app.querySelector('#continue').onclick = next;
    }
    function show(stage) {state.stage=stage; router.sync(ids[stage]); save(); render();}
    function next() {
        const stage=state.stage;
        if (!stage) {state.learned=true; show(1); return;}
        const i=state.cursors[stage], a=response(i), q=questions[i];
        if (!a.correct) {
            if (a.selected===null) return;
            const correct=a.selected===q.answer;
            if (!a.attempted) a.firstCorrect=correct;
            a.attempted=true; a.correct=correct;
            a.history = a.history || [];
            a.history.push({selected:a.selected, correct});
            a.feedback = correct ? q.explanation : stage===1 && i===0 ? 'Divide the top number by the bottom number. Try again.' : 'The decimal must be multiplied by 100 to become a percentage. Check your working and try again.';
            store.recordSkillAttempt({skillId:'fraction-percentage-conversion', lessonSlug:slug, questionId:`${slug}:q${i}`, correct});
            save(); render();
            if (!correct) app.querySelector('#feedback').textContent = stage===1 && i===0 ? 'Divide the top number by the bottom number. Try again.' : 'The decimal must be multiplied by 100 to become a percentage. Check your working and try again.';
            return;
        }
        if (stage===1 && i===0 || stage===2 && i<4) {state.cursors[stage]++; save(); render();}
        else if (stage<3) show(stage+1);
        else if (!state.finished) {state.finished=ids.every((_,j)=>complete(j)); save(); render(); if(!state.finished) {state.feedback='Complete Learn, Try it and Practice to finish the lesson.'; save(); render();}}
        else location.href='../../';
    }
    (async()=>{
        try {const saved=await store.getLessonProgress(slug); if(saved?.fractionPercentageState && (!saved.fractionPercentageState.contentVersion || saved.fractionPercentageState.contentVersion === 1)) state={...state,...saved.fractionPercentageState,contentVersion:1};} catch(error) {console.warn('Unable to restore lesson progress',error);}
        ids.forEach((id,i)=>router.register(id,()=>show(i)));
        if(!router.start()) show(state.stage);
    })();
})();
