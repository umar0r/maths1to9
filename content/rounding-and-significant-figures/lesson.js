(() => {
    'use strict';
    const app = document.getElementById('lesson-app');
    const store = window.Maths1to9Progress;
    const slug = 'rounding-and-significant-figures';
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const normalise = value => {
        const text = String(value).trim();
        if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(text)) return null;
        const [whole, fraction = ''] = text.replace(/,/g, '').split('.');
        const integer = whole.replace(/^0+/, '') || '0';
        const decimal = fraction.replace(/0+$/, '');
        return integer + (decimal ? '.' + decimal : '');
    };
    const engine = window.Maths1to9LessonEngine;
    const router = engine.createRouter();
    let data, slides, state;
    let writeQueue = Promise.resolve();
    const entry = () => state.answers[state.slide] || (state.answers[state.slide] = {value:'', attempts:0, done:false});
    const scores = () => {
        const assessed = slides.map((slide, i) => ({slide, answer:state.answers[i]}))
            .filter(({slide, answer}) => ['practice','check'].includes(slide.type) && answer?.done);
        return {
            points: assessed.reduce((sum, {answer}) => sum + (answer.firstCorrect ? 10 : answer.correct ? 5 : 0), 0),
            maximumPoints: (data.practice.length + data.check.length) * 10,
            correctFirstTry: assessed.filter(({answer}) => answer.firstCorrect).length,
            answered: assessed.length
        };
    };
    function save() {
        const slide = slides[state.slide];
        const snapshot = JSON.parse(JSON.stringify({
            title: data.title, pathname:location.pathname, lessonId:data.id,
            currentSectionId: String(slide.stage), currentSectionIndex: slide.stage,
            highestUnlockedIndex: slides[state.highest].stage, totalSections:4,
            finished:state.finished, score:scores(), roundingState:state,
            completionPercent: Math.round(slides.reduce((sum, slide, i) => sum + slideCompletion(i), 0) / slides.length * 100)
        }));
        writeQueue = writeQueue.catch(() => {}).then(() => store.saveLessonProgress(slug, snapshot));
        return writeQueue;
    }
    function matches(question, value) {
        if (question.options && normalise(question.answer) === null) return value === question.answer;
        if (normalise(value) === null || normalise(value) !== normalise(question.answer)) return false;
        return question.places === undefined || (String(value).trim().split('.')[1] || '').length === question.places;
    }
    function advance() {
        if (state.slide === slides.length - 1) {
            save().then(() => location.assign('../../index.php'));
            return;
        }
        state.completed[state.slide] = true;
        state.slide++;
        state.highest = Math.max(state.highest, state.slide);
        if (state.slide === slides.length - 1) state.finished = slides.slice(0, -1).every((slide, i) => state.completed[i] || state.answers[i]?.done);
        save(); render(true);
    }
    const note = text => `<div class="rounding-note"><strong>Remember</strong><p>${escape(text)}</p></div>`;
    function learnHtml(item) {
        let html = `<h2 class="lesson-section__title">${escape(item.title)}</h2><div class="lesson-copy">${item.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</div>`;
        if (item.digits) html += `<div class="rounding-digits" aria-label="Place-value chart">${item.digits.map(([label,digit],i) => `<div class="rounding-digit ${i===item.target?'target':''} ${i===item.decider?'decider':''}"><small>${escape(label)}</small>${escape(digit)}</div>`).join('')}</div><p class="rounding-counter">Blue: place to keep · Gold: deciding digit</p>`;
        if (item.explore) html += `<div class="rounding-line"><div class="rounding-tick" style="left:0"><span>60</span></div><div class="rounding-tick" style="left:50%"><span>65</span></div><div class="rounding-tick" style="left:100%"><span>70</span></div><div class="rounding-marker" id="line-marker"></div></div><label class="rounding-label" for="number-slider">Choose a number between 60 and 70</label><input id="number-slider" class="rounding-slider" type="range" min="60" max="70" value="${state.explore}" step="1"><div id="line-result" class="interactive-equation" aria-live="polite"></div>`;
        if (item.equation) html += `<div class="interactive-equation">${escape(item.equation)}</div>`;
        if (item.note) html += note(item.note);
        return html;
    }
    function questionHtml(slide) {
        const answer = entry(), question = slide.item;
        let html = `<p class="rounding-counter">${slide.type==='guided'?'Step':'Question'} ${slide.number} of ${data[slide.type === 'guided' ? 'guided' : slide.type].length}${slide.type==='check'?' · Without hints':''}</p><h2 class="lesson-section__title">${escape(question.prompt)}</h2>`;
        if (question.display) html += `<div class="interactive-equation">${escape(question.display)}</div>`;
        if (question.options) html += `<div class="question-options" role="group" aria-label="Choose an answer">${question.options.map(option => `<button type="button" class="answer-choice ${answer.value===option?'is-selected':''} ${answer.done && slide.type!=='check' && answer.value===option?'is-correct':''}" aria-pressed="${answer.value===option}" data-choice="${escape(option)}" ${answer.done?'disabled':''}>${escape(option)}</button>`).join('')}</div>`;
        else html += `<label class="rounding-label" for="rounding-answer">Your answer${question.places?` (show ${question.places} decimal ${question.places===1?'place':'places'})`:''}</label><input id="rounding-answer" class="final-check-input" inputmode="decimal" autocomplete="off" value="${escape(answer.value)}" ${answer.done?'disabled':''}>`;
        if (slide.type !== 'check' && (answer.done || answer.feedback)) html += `<div class="question-feedback is-visible ${answer.done?'is-correct':'is-incorrect'}" role="status"><strong>${answer.done?'Correct.':'Not quite. Try again.'}</strong> ${escape(question.explanation)}${slide.type==='practice'&&answer.done?` <strong>+${answer.firstCorrect?10:5} points</strong>`:''}</div>`;
        return html;
    }
    function guidedHtml(slide) {
        const answer = entry(), question = slide.item;
        const step = answer.guidedStep;
        const labels = ['Find the rounding digit', 'Find the deciding digit', 'Round the number'];
        const decimalAt = question.number.includes('.') ? question.number.indexOf('.') : question.number.length;
        const places = {'3':'thousands','2':'hundreds','1':'tens','0':'ones','-1':'tenths','-2':'hundredths','-3':'thousandths','-4':'ten-thousandths','-5':'hundred-thousandths','-6':'millionths'};
        const digits = [...question.number].map((digit, i) => {
            if (digit === '.') return '<span class="guided-decimal" aria-label="decimal point">.</span>';
            const power = i < decimalAt ? decimalAt - i - 1 : decimalAt - i;
            const place = places[power];
            const targetKnown = step > 0 || (step === 0 && answer.guidedChecked);
            const deciderKnown = step > 1 || (step === 1 && answer.guidedChecked);
            const marked = targetKnown && i === question.target ? 'target' : deciderKnown && i === question.decider ? 'decider' : '';
            const selected = step < 2 && answer.value === String(i);
            const content = `<small>${escape(place)}</small><span>${digit}</span>${marked ? `<small>${marked === 'target' ? 'Keep' : 'Look here'}</small>` : ''}`;
            if (step === 2) return `<div class="guided-digit ${marked}">${content}</div>`;
            return `<button class="answer-choice guided-digit ${marked} ${selected ? 'is-selected' : ''}" type="button" data-choice="${i}" aria-label="${digit}, ${escape(place)}" aria-pressed="${selected}" ${answer.guidedChecked ? 'disabled' : ''}>${content}</button>`;
        }).join('');
        const prompt = step === 0 ? 'Tap the digit in the place you need to keep.' : step === 1 ? 'Tap the digit immediately to its right.' : 'Use the deciding digit. Which rounded answer is correct?';
        const explanation = step === 0 ? question.target_help : step === 1 ? question.decider_help : question.explanation;
        return `<p class="rounding-counter">Example ${slide.number} of ${data.guided.length} · Step ${step + 1} of 3</p>
            <h2 class="lesson-section__title">${escape(question.prompt)}</h2>
            <ol class="guided-steps" aria-label="Rounding method">${labels.map((label,i) => `<li ${i === step ? 'aria-current="step"' : ''} class="${i < step || (i === step && answer.guidedChecked) ? 'is-done' : ''}">${i < step ? '✓' : `${i + 1}.`} ${label}</li>`).join('')}</ol>
            <p class="lesson-section__intro">${prompt}</p>
            <div class="guided-number" role="group" aria-label="Digits of ${escape(question.number)}">${digits}</div>
            ${step === 2 ? `<p class="rounding-counter">Blue: digit to keep · Gold: deciding digit</p><div class="question-options" role="group" aria-label="Choose the rounded answer">${question.options.map(option => `<button class="answer-choice ${answer.value === option ? 'is-selected' : ''} ${answer.done && answer.value === option ? 'is-correct' : ''}" type="button" data-choice="${escape(option)}" aria-pressed="${answer.value === option}" ${answer.done ? 'disabled' : ''}>${escape(option)}</button>`).join('')}</div>` : ''}
            ${answer.guidedChecked || answer.feedback ? `<div class="question-feedback is-visible ${answer.guidedChecked ? 'is-correct' : 'is-incorrect'}" role="status"><strong>${answer.guidedChecked ? 'Correct.' : 'Not quite. Try again.'}</strong> ${escape(explanation)}</div>` : ''}
            ${answer.done ? `<div class="interactive-equation">${escape(question.number)} ≈ ${escape(question.answer)}</div>` : ''}`;
    }
    function actGuided() {
        const answer = entry(), question = slides[state.slide].item;
        if (answer.done) { advance(); return; }
        if (answer.guidedChecked) {
            answer.guidedStep++;
            answer.guidedChecked = false;
            answer.value = '';
            answer.feedback = false;
        } else {
            if (!answer.value) return;
            const expected = answer.guidedStep === 0 ? question.target : question.decider;
            const correct = answer.guidedStep < 2 ? answer.value === String(expected) : matches(question, answer.value);
            answer.guidedChecked = correct;
            answer.feedback = !correct;
            answer.done = correct && answer.guidedStep === 2;
        }
        save(); render();
        // Keep keyboard focus at the current task after replacing its controls.
        (answer.guidedChecked ? app.querySelector('#rounding-action') : app.querySelector('#rounding-card')).focus({preventScroll:true});
    }
    function slideCompletion(index) {
        const slide = slides[index], answer = state.answers[index];
        if (slide.type === 'guided') return answer?.done ? 1 : ((answer?.guidedStep || 0) + (answer?.guidedChecked ? 1 : 0)) / 3;
        return state.completed[index] || answer?.done || (slide.type === 'finish' && state.finished) ? 1 : 0;
    }
    function reviewHtml(type) {
        const records = slides.map((slide,i) => ({slide,answer:state.answers[i]})).filter(r => r.slide.type===type && r.answer?.done);
        if (!records.length) return '<p class="lesson-copy">Complete the questions to see your answers and score here.</p>';
        const score = records.filter(r => r.answer?.firstCorrect).length;
        return `<div class="practice-review__score is-ready"><div class="practice-progress-ring" style="--practice-progress:${score/records.length*100}%"><span>${score}<small>/${records.length}</small></span></div><div><h2 class="lesson-section__title">${score>=records.length*.8?"You're ready":'Keep building your confidence'}</h2><p>You got ${score} out of ${records.length} correct first try.</p></div></div><h3>Review your answers</h3>${records.map(({slide,answer},i) => `<div class="rounding-review ${answer?.firstCorrect?'':'retry'}"><small>${answer?.firstCorrect?'CORRECT FIRST TRY':answer?.correct?'CORRECT AFTER PRACTICE':'REVIEW THIS ONE'} · QUESTION ${i+1}</small><p><strong>${escape(slide.item.prompt)}</strong></p><p>Your ${answer?.firstCorrect?'answer':'first answer'}: <strong>${escape(answer?.firstAnswer)}</strong></p>${!answer?.firstCorrect?`<p>Correct answer: <strong>${escape(slide.item.answer)}</strong></p>`:''}<p class="lesson-copy">${escape(slide.item.explanation)}</p></div>`).join('')}`;
    }
    function summaryHtml() {
        return `<h2 class="lesson-section__title">Rounding — key reminders</h2><ol class="lesson-steps">${[
            ['Choose the place to keep.','Nearest 100 keeps hundreds. Two decimal places keeps hundredths.'],
            ['Look one digit to the right.','0–4: keep the rounding digit. 5–9: increase it by 1.'],
            ['Finish at the requested accuracy.','Use zeros for remaining whole-number places. Leave out extra decimal digits.'],
            ['Count significant figures from the first non-zero digit.','0.004782 to 2 significant figures is 0.0048.'],
            ['Carry when you need to.','9.96 to 1 decimal place is 10.0. Always round from the original number.']
        ].map(([title,text]) => `<li class="lesson-step"><h3 class="lesson-step__title">${title}</h3><p class="lesson-step__text">${text}</p></li>`).join('')}</ol>${reviewHtml('check')}`;
    }
    function render(focus=false) {
        const slide = slides[state.slide], score = scores();
        const stageProgress = data.navigation_stages.map((stage, index) => {
            const entries = slides.map((item, i) => ({item, i})).filter(({item}) => item.stage === index);
            return { total: entries.length, completed: entries.reduce((sum, {i}) => sum + slideCompletion(i), 0) };
        });
        let body = '';
        if(slide.type==='learn') body=learnHtml(slide.item);
        else if(slide.type==='guided') body=guidedHtml(slide);
        else if(['practice','check'].includes(slide.type)) body=questionHtml(slide);
        else if(slide.type==='review') body=reviewHtml('practice');
        else if(slide.type==='summary') body=summaryHtml();
        else body=`<div class="rounding-finish"><p class="lesson-eyebrow">${state.finished ? 'Lesson complete' : 'Keep learning'}</p><h2 class="lesson-section__title">${state.finished ? 'Rounding complete ★' : 'Your rounding journey'}</h2><p>You earned <strong>${score.points} / ${score.maximumPoints} points</strong>.</p></div><h3>What you've learnt</h3><p class="lesson-copy">You can find the deciding digit, round whole numbers and decimals, count significant figures and handle a carry.</p>${note('10 points for a correct first answer; 5 for a practice answer corrected after feedback. Your points and lesson progress are saved in this browser.')}<h3 style="margin-top:28px">More to learn</h3><div class="rounding-links"><a href="../place-value/">Place value<small>Strengthen your understanding of each digit.</small></a><a href="../order-of-operations/">Order of operations<small>Build confidence with multi-step calculations.</small></a></div>`;
        app.innerHTML=`<header class="lesson-header lesson-header--compact rounding-header"><div class="lesson-header__inner"><h1 class="lesson-header__title">Rounding</h1><div class="rounding-score" aria-label="${score.points} points earned"><div class="practice-progress-ring" style="--practice-progress:${score.points/score.maximumPoints*100}%"><span>${score.points}</span></div></div></div></header><nav class="lesson-navigation lesson-navigation--stages" aria-label="Lesson sections"><div class="lesson-navigation__buttons">${data.navigation_stages.map((stage,i) => `<button class="lesson-navigation__button ${stageProgress[i].completed===stageProgress[i].total?'lesson-navigation__button--complete':''}" type="button" data-stage="${i}" data-stage-number="${i+1}" aria-pressed="${i===slide.stage}" ${i>slides[state.highest].stage?'disabled':''}>${escape(stage.label)}</button>`).join('')}</div></nav><section id="rounding-card" class="lesson-section" tabindex="-1"><p class="lesson-eyebrow">${slide.type==='summary'?'Summary':escape(data.navigation_stages[slide.stage].label)}</p>${body}</section><footer class="lesson-controls"><div class="button-group"><button id="rounding-action" class="button button--primary" type="button">Continue</button></div></footer>`;
        app.querySelectorAll('[data-stage]').forEach((button, i) => {
            engine.updateStageProgress(button, stageProgress[i].completed, stageProgress[i].total);
        });
        router.sync(slide.id);
        updateAction();
        app.querySelector('#rounding-action').addEventListener('click', act);
        app.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
            const answer=entry(); answer.value=button.dataset.choice; answer.feedback=false; save();
            app.querySelectorAll('[data-choice]').forEach(b => { b.classList.toggle('is-selected',b===button); b.setAttribute('aria-pressed',String(b===button)); });
            app.querySelector('.question-feedback')?.remove(); updateAction();
        }));
        app.querySelector('#rounding-answer')?.addEventListener('input', event => { entry().value=event.target.value; save(); updateAction(); });
        app.querySelector('#rounding-answer')?.addEventListener('keydown', event => { if(event.key==='Enter' && !app.querySelector('#rounding-action').disabled) {event.preventDefault(); act();} });
        app.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => {
            const index=slides.findIndex(s => s.stage===Number(button.dataset.stage));
            if(index<=state.highest) {state.slide=index; save(); render(true);}
        }));
        if(slide.item?.explore) {
            const updateLine=() => {
                const n=state.explore, rounded=n<65?60:70;
                const marker=app.querySelector('#line-marker'); marker.textContent=n; marker.style.left=`${(n-60)*10}%`;
                app.querySelector('#line-result').textContent=`${n} ≈ ${rounded}${n===65?' · Halfway: round up':n===60||n===70?' · Already a multiple of 10':''}`;
            };
            updateLine(); app.querySelector('#number-slider').addEventListener('input', event => {state.explore=Number(event.target.value); updateLine(); save();});
        }
        if(focus) {app.querySelector('#rounding-card').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'});}
    }
    function updateAction() {
        const slide=slides[state.slide], button=app.querySelector('#rounding-action');
        const isQuestion=['guided','practice','check'].includes(slide.type);
        const answer=isQuestion?entry():null;
        button.disabled=isQuestion && !answer.done && !answer.value.trim();
        if (slide.type === 'guided') {
            button.textContent = answer.guidedChecked || answer.done ? 'Continue' : 'Check answer';
            button.disabled = !answer.guidedChecked && !answer.done && !answer.value;
            return;
        }
        button.textContent=slide.type==='finish'?'All lessons':isQuestion&&!answer.done ? slide.type==='check'?'Next question':'Check answer' : 'Continue';
        if(slide.type==='check'&&!answer.done&&slide.number===data.check.length) button.textContent='See my results';
    }
    function act() {
        const slide=slides[state.slide];
        if (slide.type === 'guided') { actGuided(); return; }
        if(!['guided','practice','check'].includes(slide.type)||entry().done) {advance();return;}
        const answer=entry();
        if(!answer.value.trim()) return;
        const correct=matches(slide.item,answer.value);
        if(answer.attempts===0) {answer.firstCorrect=correct; answer.firstAnswer=answer.value;}
        answer.attempts++; answer.correct=correct; answer.done=correct||slide.type==='check'; answer.feedback=!correct;
        if(slide.type!=='guided') store.recordSkillAttempt({lessonSlug:slug,skillId:slide.item.skill,questionId:`${slug}:v1:${slide.type}:${slide.number}`,correct});
        save();
        if(slide.type==='check') advance(); else {render(); app.querySelector('#rounding-action').focus();}
    }
    async function init() {
        try {
            const response=await fetch('./lesson.json');
            if(!response.ok) throw new Error('Lesson unavailable');
            data=await response.json();
            slides=[...data.learn.map(item=>({type:'learn',stage:0,item})),...data.guided.map((item,i)=>({type:'guided',stage:1,item,number:i+1})),...data.practice.map((item,i)=>({type:'practice',stage:2,item,number:i+1})),{type:'review',stage:2},...data.check.map((item,i)=>({type:'check',stage:3,item,number:i+1})),{type:'summary',stage:3},{type:'finish',stage:3}];
            const learnIds = ['learn', 'number-line', 'rounding-rule', 'decimal-places', 'significant-figures', 'carrying'];
            slides.forEach((slide, i) => {
                slide.id = slide.type === 'learn' ? learnIds[i]
                    : slide.type === 'guided' ? (slide.number === 1 ? 'step-by-step' : `step-${slide.number}`)
                    : slide.type === 'practice' ? (slide.number === 1 ? 'practice' : `practice-${slide.number}`)
                    : slide.type === 'check' ? (slide.number === 1 ? 'check' : `check-${slide.number}`)
                    : slide.type === 'review' ? 'practice-review' : slide.type === 'finish' ? 'complete' : 'summary';
            });
            const saved=await store.getLessonProgress(slug);
            const candidate=saved?.roundingState;
            state=candidate?.version===1 && Number.isInteger(candidate.slide) && candidate.slide>=0 && candidate.slide<slides.length && Number.isInteger(candidate.highest) && candidate.highest>=candidate.slide && candidate.highest<slides.length && candidate.answers && typeof candidate.answers==='object' ? candidate : {version:1,slide:0,highest:0,answers:{},explore:67,finished:false};
            // Migrate earlier saves without losing earned scores.
            if (!state.completed) state.completed = Object.fromEntries(slides.map((slide, i) => [i, i < state.highest && !['guided','practice','check'].includes(slide.type)]));
            slides.forEach((slide, i) => {
                if (slide.type !== 'guided') return;
                const previous = state.answers[i];
                if (previous?.guidedVersion === 1) return;
                // Preserve completed older examples and all assessed scores.
                state.answers[i] = { value: previous?.done ? slide.item.answer : '', done: previous?.done === true,
                    guidedVersion: 1, guidedStep: previous?.done ? 2 : 0, guidedChecked: previous?.done === true };
            });
            slides.forEach((slide, i) => {
                const aliases = slide.type === 'practice' && slide.number === 1 ? ['practise'] : [];
                router.register(slide.id, () => {
                    state.slide = i;
                    state.highest = Math.max(state.highest, i);
                    save(); render(true);
                }, aliases);
            });
            if (!router.start()) { render(); router.sync(slides[state.slide].id, {replace:true}); }
        } catch(error) {
            app.innerHTML='<div class="lesson-loading">This lesson could not load. Please refresh to try again.</div>';
            console.error(error);
        }
    }
    init();
})();
