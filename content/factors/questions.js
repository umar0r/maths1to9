(() => {
    'use strict';
    const slug = 'factors';
    const contentVersion = 8;
    const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const factors = n => Array.from({length:n}, (_,i)=>i+1).filter(d=>n%d===0);
    const random = values => values[Math.floor(Math.random()*values.length)];
    function shuffleQuestion(q) {
        const correct = q.options[q.answer];
        const options = [...q.options];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        return {...q, options, answer: options.indexOf(correct)};
    }
    // number is the main number the question is about, so a session can avoid reusing it.
    function question(type, number, prompt, answer, wrong, explanation) {
        return {type,number,prompt,options:[answer,...wrong],answer:0,explanation};
    }
    function generate(index) {
        if (index % 3 === 1) {
            const n=random([18,20,24,28,30,32,40,42,45,48]), d=random([4,5,6,7]);
            const yes=n%d===0;
            return question('is-factor',n,`Is ${d} a factor of ${n}?`,yes?`Yes: ${n} ÷ ${d} = ${n/d}, with no remainder.`:`No: ${n} ÷ ${d} = ${Math.floor(n/d)} remainder ${n%d}.`,['Yes, because it is smaller than the number.','No, because factors must be prime.',yes?'No, because it is not the number itself.':'Yes, because a decimal quotient is allowed.'],yes?`${d} × ${n/d} = ${n}. The division is exact.`:`The remainder is ${n%d}, so ${d} is not a factor.`);
        }
        if (index % 3 === 2) {
            const d=random([4,5,6,7]), n=d*d;
            return question('square-factor',n,`You reach ${d} × ${d} = ${n}. What should you do?`,'Stop and list this factor once.',['Stop and list this factor twice.','Ignore the equal pair.','Stop without listing this factor.'],`The number tested equals its partner and divides exactly. Record ${d} once and stop; the next number would be bigger than its partner.`);
        }
        const n=random([12,13,17,18,20,24,25,30,36,40,48]), list=factors(n), answer=list.join(', ');
        const square = Number.isInteger(Math.sqrt(n));
        const middle = list.length > 2
            ? list.filter((_,i)=>i!==Math.floor(list.length/2))
            : [1,3,n];
        const stoppedEarly = square
            ? [...list,Math.sqrt(n)].sort((a,b)=>a-b)
            : list.filter(d=>d*d<n);

        const nonFactor = Array.from({length:n-1},(_,i)=>i+2).find(x=>n%x!==0);
        const included = [...list,nonFactor].sort((a,b)=>a-b);
        const stop = Math.floor(Math.sqrt(n))+1;
        const remainder = n % stop;
        const explanation = square
            ? `The factors are ${answer}. At ${Math.sqrt(n)} × ${Math.sqrt(n)} = ${n}, the factors are equal. Record that factor once and stop.`
            : remainder === 0
                ? `The factors are ${answer}. At ${stop}, ${n} ÷ ${stop} = ${n/stop}. That is the pair ${n/stop} × ${stop} again, so stop. ${stop} is bigger than ${n/stop}.`
                : `The factors are ${answer}. Test in order. At ${stop}, ${n} ÷ ${stop} = ${Math.floor(n/stop)} remainder ${remainder}. Since ${stop} is bigger than ${Math.floor(n/stop)}, stop: there are no new pairs.`;
        return question('all-factors',n,`Find all the factors of ${n}.`,answer,[middle.join(', '),stoppedEarly.join(', '),included.join(', ')],explanation);
    }
    // One Practice session: redraw any question about a number already used,
    // so pupils never see "factors of 25" followed by "5 × 5 = 25".
    function session(length) {
        const used = new Set();
        return Array.from({length}, (_,i) => {
            let q = generate(i);
            for (let attempt = 0; attempt < 100 && used.has(q.number); attempt++) q = generate(i);
            used.add(q.number);
            return q;
        });
    }
    async function renderRecommendations(container) {
        try {
            const lessons = await window.Maths1to9Recommendations.getForLesson(slug);
            if (!lessons.length) {
                container.innerHTML = '<p>Choose another topic from all lessons.</p>';
                return;
            }
            container.innerHTML = '<h3 class="lesson-completion__next-title">Next lessons</h3>'
                + '<div class="lesson-completion__more">' + lessons.slice(0,3).map(lesson =>
                    `<a class="lesson-recommendation-card" href="${escape(lesson.url)}"><span class="lesson-recommendation-card__title">${escape(lesson.title)}</span><span class="lesson-recommendation-card__subtitle">${escape(lesson.subtitle || '')}</span><span class="lesson-recommendation-card__action">${lesson.state?.label === 'In progress' ? 'Continue lesson' : 'Start lesson'}</span></a>`
                ).join('') + '</div>';
        } catch {
            container.innerHTML = '<p>Choose another topic from all lessons.</p>';
        }
    }

    // The end screen replaces Check's heading; the questions bring it back.
    function showCheckHeading(root, visible) {
        const section = root.closest('.lesson-section');
        for (const child of section.children) {
            if (child.matches('.lesson-eyebrow, .lesson-section__title, .lesson-section__intro')) child.hidden = !visible;
        }
        if (!visible && section.hasAttribute('aria-labelledby')) {
            section.dataset.labelledby = section.getAttribute('aria-labelledby');
            section.removeAttribute('aria-labelledby');
        }
        if (visible) {
            section.removeAttribute('aria-label');
            if (section.dataset.labelledby) section.setAttribute('aria-labelledby', section.dataset.labelledby);
        } else section.setAttribute('aria-label', 'Factors result');
    }

    function retainedRows(state) {
        const rows = state.questions.filter(question => question.firstCorrect !== undefined || state.finished).map(question => {
            const selected = question.finalSelected ?? question.answer;
            const answer = question.options[selected];
            const status = question.firstCorrect === true ? '✓' : question.firstCorrect === false ? '2nd try' : 'Correct';
            const explanation = question.explanation || question.feedback?.[question.answer] || '';
            return `<li><div class="retained-result"><span>${escape(question.prompt)}</span><span class="retained-result__answer"><strong>${escape(answer)}</strong><span>${status}</span></span></div>${question.firstCorrect === false ? `<p class="retained-result__explanation">${escape(explanation)}</p>` : ''}</li>`;
        }).join('');
        return `<ol class="retained-results">${rows}</ol>`;
    }

    function renderCheckEnding(root, state, api) {
        const score = state.questions.filter(q => q.firstCorrect === true).length;
        const ready = score === state.questions.length;
        const summary = api.getLesson().comparison.summary;
        showCheckHeading(root, false);
        root.innerHTML = `<section class="lesson-completion" aria-label="Factors result">
            <div class="lesson-completion__result ${ready ? 'lesson-completion__result--success' : ''}">
                ${ready ? '<span class="lesson-completion__celebration" aria-hidden="true">★</span>' : ''}
                <div><h2>${ready ? 'Congratulations!' : 'A little more practice will help'}</h2><p>${ready ? 'You’ve completed Factors and you’re ready to move on.' : 'You can choose another lesson below if you want to move on.'}</p><p>${score} of ${state.questions.length} Check questions correct first time.</p></div>
                <p class="lesson-completion__score">${score}<small>/${state.questions.length}</small></p>
            </div>
            ${state.finished ? retainedRows(state) : ''}
            ${ready ? `<section class="final-check-summary" aria-label="What you’ve learnt"><h2 class="lesson-section__title">${escape(summary.title)}</h2><ol class="lesson-steps">${summary.points.map(point => `<li class="lesson-step"><h3 class="lesson-step__title">${escape(point.title)}</h3><p class="lesson-step__text">${escape(point.text)}</p></li>`).join('')}</ol></section>` : ''}
            <div class="lesson-completion__recommendations" aria-live="polite"><p>Finding your next lesson…</p></div>
        </section>`;
        renderRecommendations(root.querySelector('.lesson-completion__recommendations'));
    }

    // The engine owns the header, navigation, scoring, assessment and footer.
    // This mount supplies only question content and the current footer action.
    async function mountSequence(root, sectionId, makeQuestions) {
        if (!root || root.dataset.mounted) return;
        root.dataset.mounted='true';
        const api=window.Maths1to9Lesson;
        let state=await window.Maths1to9Progress.getLessonActivityState(slug,sectionId);
        if (!state || state.contentVersion !== contentVersion || !Array.isArray(state.questions)) state={contentVersion,index:0,selected:null,phase:'answer',questions:makeQuestions().map(shuffleQuestion),finished:false};
        const save=()=>window.Maths1to9Progress.saveLessonActivityState(slug,sectionId,state);
        const dispatch = name => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`,{detail:{sectionId}}));
        dispatch('gate');
        function render() {
            save();
            if (sectionId === 'comparison' && (state.finished || root.dataset.view === 'summary')) {
                renderCheckEnding(root, state, api);
                // #summary only previews the end screen; finishing the questions completes Check.
                if (state.finished) dispatch('complete');
                api.setSectionAction(sectionId, {
                    label: 'All lessons',
                    disabled: false,
                    onClick: async () => {
                        if (state.finished) api.completeLesson();
                        await window.Maths1to9Progress.saveCurrentLesson();
                        window.location.assign(new URL('../../', window.location.href).href);
                    }
                });
                return;
            }
            if (state.finished && sectionId === 'question-bank') {
                root.innerHTML = '<h3>Your practice results</h3>' + retainedRows(state);
                dispatch('complete');
                api.clearSectionAction(sectionId);
                return;
            }
            if (sectionId === 'comparison') showCheckHeading(root, true);
            const q=state.questions[state.index], answered=state.phase!=='answer';
            // Shared answer-button states: selected, then marked right or wrong after Check.
            const optionClass=i=>i!==state.selected?'':state.phase==='correct'?'is-correct':state.phase==='wrong'?'is-incorrect':'is-selected';
            root.innerHTML=`<article class="question-card question-card--bare"><p class="question-number">Question ${state.index+1} of ${state.questions.length}</p><h3 class="question-prompt">${escape(q.prompt)}</h3>${q.context||''}<div class="factors-options" role="group" aria-label="Choose an answer">${q.options.map((option,i)=>`<button type="button" class="button ${optionClass(i)}" data-factor-option="${i}" aria-pressed="${state.selected===i}" ${answered?'disabled':''}>${escape(option)}</button>`).join('')}</div><p class="question-feedback ${answered?'is-visible '+(state.phase==='correct'?'is-correct':'is-incorrect'):''}" role="status">${state.phase==='correct'?escape(q.explanation):state.phase==='wrong'?'Not yet. '+escape(q.hint||'Check exact division and include each factor only once.'):''}</p></article>`;
            root.querySelectorAll('[data-factor-option]').forEach(button=>button.onclick=()=>{state.selected=Number(button.dataset.factorOption);render();});
            // A finished section keeps its last answered question on screen and
            // hands the footer back to the engine's Continue.
            if (state.finished) {dispatch('complete');api.clearSectionAction(sectionId);return;}
            api.setSectionAction(sectionId,{label:state.phase==='wrong'?'Try again':state.phase==='correct'?'Continue':'Check',disabled:state.phase==='answer'&&state.selected===null,onClick:()=>{
                if(state.phase==='wrong'){state.phase='answer';state.selected=null;}
                else if(state.phase==='correct'&&state.index===state.questions.length-1){
                    // Last question: go straight on, with no summary screen in between.
                    state.finished=true;render();
                    if(sectionId==='question-bank')api.goToSection('comparison',{unlock:true});
                    else api.setSlideHash('summary');
                    return;
                }
                else if(state.phase==='correct'){state.index++;state.selected=null;state.phase='answer';}
                else {
                    const correct=state.selected===q.answer;
                    q.finalSelected = state.selected;
                    q.attempts ??= [];
                    q.attempts.push({ selected: state.selected, correct });
                    if (q.firstCorrect === undefined) q.firstCorrect = correct;
                    state.phase=correct?'correct':'wrong';
                    api.recordAssessment({questionType:q.type,questionId:sectionId==='comparison'?`comparison:${state.index+1}`:`question-bank:${state.index+1}`,correct});
                    api.setSectionProgress(sectionId,state.index+(correct?1:0),state.questions.length);
                }
                render();
            }});
        }
        if (sectionId === 'comparison') document.addEventListener('maths1to9:comparison-view', render);
        render();
    }
    function mountAll() {
        const lesson=window.Maths1to9Lesson?.getLesson();if(!lesson)return;
        mountSequence(document.getElementById(`${slug}-questions`),'question-bank',()=>session(lesson.question_bank.session_length));
        mountSequence(document.getElementById(`${slug}-comparison`),'comparison',()=>lesson.comparison.questions);
    }
    document.addEventListener('maths1to9:lesson-rendered',mountAll);
})();
