(() => {
    'use strict';
    const app = document.getElementById('lesson-app');
    const store = window.Maths1to9Progress;
    const slug = 'percentages-of-amounts';
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
        const activities = [];
        slides.forEach((slide, i) => {
            const id = slide.id || `slide-${i}`;
            const answer = state.answers[i];
            if (['practice','check'].includes(slide.type)) {
                activities.push({id, kind:'answer', completed:answer?.done,
                    firstCorrect:answer?.firstCorrect, correct:answer?.correct});
            } else if (['learn','review','summary'].includes(slide.type)) {
                activities.push({id, kind:'learn', completed:state.completed[i]});
            } else if (slide.type === 'guided') {
                const completed = Math.round(slideCompletion(i) * 3);
                for (let step = 0; step < 3; step++) activities.push({id:`${id}:${step}`, kind:'guided', completed:step < completed});
            }
            if (slide.item?.explore) activities.push({id:`${id}:explore`, kind:'explore', completed:state.interactions?.[slide.id]});
        });
        return engine.calculateScore(activities);
    };
    function refreshScore() {
        const score = scores();
        const badge = app.querySelector('.rounding-score');
        badge.setAttribute('aria-label', `${score.points} points earned`);
        badge.querySelector('.practice-progress-ring').style.setProperty('--practice-progress', `${score.points / score.maximumPoints * 100}%`);
        badge.querySelector('span').textContent = score.points;
    }
    function save() {
        const slide = slides[state.slide];
        const snapshot = JSON.parse(JSON.stringify({
            title: data.title, pathname:location.pathname, lessonId:data.id,
            currentSectionId: String(slide.stage), currentSectionIndex: slide.stage,
            highestUnlockedIndex: slides[state.highest].stage, totalSections:4,
            finished:state.finished, score:scores(), percentageState:state,
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
            save().then(() => location.assign('../../'));
            return;
        }
        state.completed[state.slide] = true;
        state.slide++;
        state.highest = Math.max(state.highest, state.slide);
        if (state.slide === slides.length - 1) state.finished = slides.slice(0, -1).every((slide, i) => state.completed[i] || state.answers[i]?.done);
        save(); render(true);
    }
    const note = text => `<div class="rounding-note"><strong>Remember</strong><p>${escape(text)}</p></div>`;
    function circleHtml() {
        const selected = state.coloured || [];
        const paths = Array.from({length:20},(_,i)=>{
            const start=(i*18-90)*Math.PI/180, end=((i+1)*18-90)*Math.PI/180;
            return `<path class="percentage-sector ${selected.includes(i)?'is-selected':''}" d="M 150 150 L ${150+130*Math.cos(start)} ${150+130*Math.sin(start)} A 130 130 0 0 1 ${150+130*Math.cos(end)} ${150+130*Math.sin(end)} Z" role="checkbox" tabindex="0" aria-label="Sector ${i+1}, 5 percent" aria-checked="${selected.includes(i)}" aria-disabled="${!!state.colourDone}" data-sector="${i}"/>`;
        }).join('');
        return `<svg class="percentage-circle" viewBox="0 0 300 300" aria-label="Colour 75 percent in 20 equal sectors">${paths}</svg><p class="percentage-readout">${selected.length*5}% coloured</p>${state.colourFeedback?`<p role="status" class="percentage-readout">${state.colourDone?'Correct: 15 of 20 sectors is 75%.':'Not quite. Each sector is 5%. Aim for 15 sectors.'}</p>`:''}`;
    }
    function learnHtml(item) {
        let html = `<h2 class="lesson-section__title">${escape(item.title)}</h2><div class="lesson-copy">${item.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</div>`;
        if (item.colour) html += circleHtml();
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
        else html += `<label class="rounding-label" for="rounding-answer">Your answer${question.significant_figures?` (${question.significant_figures} significant ${question.significant_figures===1?'figure':'figures'})`:''}</label><input id="rounding-answer" class="final-check-input" inputmode="decimal" autocomplete="off" value="${escape(answer.value)}" ${answer.done?'disabled':''}>`;
        if (slide.type !== 'check' && (answer.done || answer.feedback)) html += `<div class="question-feedback is-visible ${answer.done?'is-correct':'is-incorrect'}" role="status"><strong>${answer.done?'Correct.':'Not quite. Try again.'}</strong> ${escape(question.explanation)}${slide.type==='practice'&&answer.done?` <strong>+${answer.firstCorrect?10:5} points</strong>`:''}</div>`;
        return html;
    }
    function simpleGuidedHtml(slide) {
        const answer=entry(), step=answer.guidedStep, question=slide.item.steps[step];
        return `<p class="rounding-counter">Example ${slide.number} of ${data.guided.length} · Step ${step+1} of 3</p><h2 class="lesson-section__title">${escape(slide.item.prompt)}</h2><p class="lesson-section__intro">${escape(question.prompt)}</p><div class="question-options">${question.options.map(option=>`<button type="button" class="answer-choice ${answer.value===option?'is-selected':''}" data-choice="${escape(option)}" aria-pressed="${answer.value===option}" ${answer.guidedChecked?'disabled':''}>${escape(option)}</button>`).join('')}</div>${answer.guidedChecked||answer.feedback?`<p class="question-feedback is-visible" role="status">${answer.guidedChecked?'Correct.':'Not quite. Try again.'} ${escape(question.explanation)}</p>`:''}`;
    }
    function guidedHtml(slide) {
        if(!slide.item.rows)return simpleGuidedHtml(slide);
        const answer=entry(), example=slide.item;
        answer.lines ||= example.rows.map(row=>answer.done?row.answer:'');
        answer.activeLine = Math.min(answer.activeLine || 0, example.rows.length-1);
        return `<p class="rounding-counter">Example ${slide.number} of ${data.guided.length}</p><h2 class="lesson-section__title">${escape(example.prompt)}</h2><p class="lesson-copy">${example.percent===75?'Split 75% into 70% + 5%.':example.percent===35?'Split 35% into 30% + 5%.':example.percent===17?'Split 17% into 10% + 7%.':'Find 1%, then multiply by 8.'} Fill in the calculation lines, then check them together. Select a line to see its percentage.</p><div class="percentage-working"><div class="percentage-lines">${example.rows.map((row,i)=>`<div class="percentage-line ${i===answer.activeLine?'is-active':''}"><label for="working-${i}"><strong>${i+1}. ${escape(row.label)}</strong><span>${row.percent}%: ${escape(row.calculation)} =</span></label><input id="working-${i}" data-working="${i}" aria-label="${escape(row.label)}: ${escape(row.calculation)}" inputmode="decimal" autocomplete="off" value="${escape(answer.lines[i])}" ${answer.done?'readonly':''} ${answer.lineChecks?.[i]===false?'aria-invalid="true"':''}><small id="working-feedback-${i}" class="line-feedback">${answer.lineChecks?answer.lineChecks[i]?'Correct':'Check this calculation':''}</small></div>`).join('')}</div><figure class="percentage-model"><figcaption>Whole amount = ${example.whole}<br><span>100 equal percentage parts</span></figcaption><div class="working-grid" aria-hidden="true">${Array.from({length:100},(_,i)=>`<span data-model-cell="${i}"></span>`).join('')}</div><p id="working-model-caption" role="status"></p><p class="rounding-counter">Each small part is 1%. A full row is 10%.</p></figure></div>${answer.done?'<p class="question-feedback is-visible is-correct" role="status">Correct — all the calculations work. Continue when you are ready.</p>':''}`;
    }
    function bindWorking() {
        const inputs=[...app.querySelectorAll('[data-working]')]; if(!inputs.length)return;
        const answer=entry(),example=slides[state.slide].item;
        const show=(i)=>{
            answer.activeLine=i;
            const row=example.rows[i], total=i===example.rows.length-1;
            app.querySelectorAll('.percentage-line').forEach((line,j)=>line.classList.toggle('is-active',i===j));
            app.querySelectorAll('[data-model-cell]').forEach((cell,j)=>{
                const on=j>=row.start&&j<row.start+row.percent;
                cell.classList.toggle('is-blue',on&&!(total&&j>=example.split)&&row.start===0);
                cell.classList.toggle('is-gold',on&&(row.start>0||(total&&j>=example.split)));
            });
            app.querySelector('#working-model-caption').textContent=total&&example.split<example.percent?`${example.split}% + ${example.percent-example.split}% = ${example.percent}% of ${example.whole}`:`${row.percent}% of ${example.whole}: ${row.percent===1?'one small part':row.percent+' small parts'}`;
        };
        inputs.forEach((input,i)=>{
            input.addEventListener('focus',()=>{show(i);save();});
            input.addEventListener('input',()=>{
                answer.lines[i]=input.value;
                if(answer.lineChecks){answer.lineChecks=null;app.querySelectorAll('.line-feedback').forEach(x=>x.textContent='');inputs.forEach(x=>x.removeAttribute('aria-invalid'));}
                save();updateAction();
            });
            input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(i<inputs.length-1)inputs[i+1].focus();else if(!app.querySelector('#rounding-action').disabled)actGuided();}});
        });
        show(answer.activeLine);
    }
    function actGuided() {
        const answer=entry(),example=slides[state.slide].item;
        if(answer.done){advance();return;}
        if(!example.rows){
            if(answer.guidedChecked){answer.guidedStep++;answer.guidedChecked=false;answer.value='';answer.feedback=false;}
            else {if(!answer.value)return;answer.guidedChecked=matches(example.steps[answer.guidedStep],answer.value);answer.feedback=!answer.guidedChecked;answer.done=answer.guidedChecked&&answer.guidedStep===2;}
            save();render();return;
        }
        if(!answer.lines?.every(value=>value.trim()))return;
        answer.lineChecks=example.rows.map((row,i)=>matches(row,answer.lines[i]));
        answer.done=answer.lineChecks.every(Boolean);
        if(answer.done){answer.guidedStep=2;answer.guidedChecked=true;}
        save();render();
        const firstWrong=answer.lineChecks.indexOf(false);
        (firstWrong>=0?app.querySelector(`[data-working="${firstWrong}"]`):app.querySelector('#rounding-action')).focus({preventScroll:true});
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
        return `<h2 class="lesson-section__title">Percentages — key reminders</h2>${note('Per cent means out of 100. Divide by 100 for a decimal multiplier. To find a percentage of an amount, multiply by that decimal. Use 10%, 1% or familiar fractions when they make the calculation easier. More than 100% means more than the whole.')} ${reviewHtml('check')}`;
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
        else body=`<div class="rounding-finish"><p class="lesson-eyebrow">${state.finished?'Lesson complete':'Keep learning'}</p><h2 class="lesson-section__title">Percentages of amounts</h2><p>You earned <strong>${score.points} / ${score.maximumPoints} points</strong>.</p></div><p class="lesson-copy">You have explored parts per hundred, equivalent fractions and decimals, and percentages of amounts.</p><h3>Later percentage lessons</h3><ol class="lesson-copy"><li>Expressing one amount as a percentage of another</li><li>Percentage increase and decrease</li><li>Reverse percentages</li><li>Simple interest</li><li>Repeated percentage change and compound interest</li></ol>${note('Your progress is saved in this browser. Continue returns to all lessons.')}`;
        app.innerHTML=`<header class="lesson-header lesson-header--compact rounding-header"><div class="lesson-header__inner"><h1 class="lesson-header__title">Percentages of amounts</h1><div class="rounding-score" aria-label="${score.points} points earned"><div class="practice-progress-ring" style="--practice-progress:${score.points/score.maximumPoints*100}%"><span>${score.points}</span></div></div></div></header><nav class="lesson-navigation lesson-navigation--stages" aria-label="Lesson sections"><div class="lesson-navigation__buttons">${data.navigation_stages.map((stage,i) => `<button class="lesson-navigation__button ${stageProgress[i].completed===stageProgress[i].total?'lesson-navigation__button--complete':''}" type="button" data-stage="${i}" data-stage-number="${i+1}" aria-pressed="${i===slide.stage}" >${escape(stage.label)}</button>`).join('')}</div></nav><section id="rounding-card" class="lesson-section" tabindex="-1"><p class="lesson-eyebrow">${slide.type==='summary'?'Summary':escape(data.navigation_stages[slide.stage].label)}</p>${body}</section><footer class="lesson-controls"><div class="button-group"><button id="rounding-action" class="button button--primary" type="button">Continue</button></div></footer>`;
        app.querySelectorAll('[data-stage]').forEach((button, i) => {
            engine.updateStageProgress(button, stageProgress[i].completed, stageProgress[i].total);
        });
        router.sync(slide.id);
        updateAction();
        bindWorking();
        app.querySelectorAll('[data-sector]').forEach(sector => {
            const toggle = () => {
                if(state.colourDone) return;
                const n=Number(sector.dataset.sector); state.coloured ||= [];
                state.coloured=state.coloured.includes(n)?state.coloured.filter(x=>x!==n):[...state.coloured,n];
                state.colourFeedback=false; save(); render();
                app.querySelector(`[data-sector="${n}"]`).focus({preventScroll:true});
            };
            sector.addEventListener('click',toggle);
            sector.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle();}});
        });
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
            state.slide=index; state.highest=Math.max(state.highest,index); save(); render(true);
        }));
        if(slide.item?.explore) {
            const updateLine=() => {
                const n=state.explore, rounded=n<65?60:70;
                const marker=app.querySelector('#line-marker'); marker.textContent=n; marker.style.left=`${(n-60)*10}%`;
                app.querySelector('#line-result').textContent=`${n} ≈ ${rounded}${n===65?' · Halfway: round up':n===60||n===70?' · Already a multiple of 10':''}`;
            };
            updateLine(); app.querySelector('#number-slider').addEventListener('input', event => {state.explore=Number(event.target.value); state.interactions[slide.id] = true; updateLine(); refreshScore(); save();});
        }
        if(focus) {app.querySelector('#rounding-card').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'});}
    }
    function updateAction() {
        const slide=slides[state.slide], button=app.querySelector('#rounding-action');
        if(slide.item?.colour) { button.textContent=state.colourDone?'Continue':'Check answer'; button.disabled=false; return; }
        const isQuestion=['guided','practice','check'].includes(slide.type);
        const answer=isQuestion?entry():null;
        button.disabled=isQuestion && !answer.done && !answer.value.trim();
        if (slide.type === 'guided') {
            button.textContent = answer.done || (!slide.item.rows && answer.guidedChecked) ? 'Continue' : 'Check answer';
            button.disabled = slide.item.rows ? !answer.done && !answer.lines?.every(value=>value.trim()) : !answer.done && !answer.guidedChecked && !answer.value;
            return;
        }
        button.textContent=isQuestion&&!answer.done?'Check answer':'Continue';
    }
    function act() {
        const slide=slides[state.slide];
        if(slide.item?.colour && !state.colourDone) { state.colourDone=(state.coloured||[]).length===15; state.colourFeedback=true; save(); render(); app.querySelector('#rounding-action').focus(); return; }
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
            const response=await fetch('./lesson.json?v=3');
            if(!response.ok) throw new Error('Lesson unavailable');
            data=await response.json();
            slides=[...data.learn.map(item=>({type:'learn',stage:0,item})),...data.guided.map((item,i)=>({type:'guided',stage:1,item,number:i+1})),...data.practice.map((item,i)=>({type:'practice',stage:2,item,number:i+1})),{type:'review',stage:2},...data.check.map((item,i)=>({type:'check',stage:3,item,number:i+1})),{type:'summary',stage:3},{type:'finish',stage:3}];
            slides.forEach((slide, i) => {
                slide.id = slide.type === 'learn' ? slide.item.id
                    : slide.type === 'guided' ? (slide.number === 1 ? 'step-by-step' : `step-${slide.number}`)
                    : slide.type === 'practice' ? (slide.number === 1 ? 'practise' : `practice-${slide.number}`)
                    : slide.type === 'check' ? (slide.number === 1 ? 'check' : `check-${slide.number}`)
                    : slide.type === 'review' ? 'practice-review' : slide.type === 'finish' ? 'complete' : 'summary';
            });
            const saved=await store.getLessonProgress(slug);
            const candidate=saved?.percentageState;
            state=candidate?.version===1 && Number.isInteger(candidate.slide) && candidate.slide>=0 && candidate.slide<slides.length && Number.isInteger(candidate.highest) && candidate.highest>=candidate.slide && candidate.highest<slides.length && candidate.answers && typeof candidate.answers==='object' ? candidate : {version:1,slide:0,highest:0,answers:{},explore:67,finished:false};
            state.interactions ||= {};
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
                const aliases = slide.type === 'practice' && slide.number === 1 ? ['practice'] : [];
                router.register(slide.id, () => {
                    state.slide = i;
                    state.highest = Math.max(state.highest, i);
                    save(); render(true);
                }, aliases);
            });
            if (!router.start()) { render(); router.sync(slides[state.slide].id, {replace:true}); }
            save();
        } catch(error) {
            app.innerHTML='<div class="lesson-loading">This lesson could not load. Please refresh to try again.</div>';
            console.error(error);
        }
    }
    init();
})();
