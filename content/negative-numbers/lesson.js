(() => {
'use strict';
const app = document.getElementById('lesson-app');
const engine = window.Maths1to9LessonEngine;
const store = window.Maths1to9Progress;
const router = engine.createRouter();
const stages = ['Learn','Step by Step','Practise','Check'];
const ids = ['learn','step-by-step','practise','check'];
const signed = n => String(n).replace('-', '−');
const equation = (a,b) => `${signed(a)} − (−${b})`;
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalise = s => String(s).replace(/−/g,'-').replace(/\s/g,'').replace(/[()]/g,'');
let state = {contentVersion:1, stage:0, answers:{}, learned:false}, queue = Promise.resolve();
function scoringActivities() {
 const current = [
  {id:'learn',kind:'learn',completed:state.learned},
  ...['guided-1','guided-2','guided-3','guided-4'].map(id=>({id,kind:'guided',completed:state.answers[id]?.done&&state.answers[id]?.correct})),
  ...[...practice,...checkQuestions].map(q=>{
   const a=state.answers[q.id];
   return {id:q.id,kind:'answer',completed:a?.done===true,correct:a?.correct===true,
    firstCorrect:a?.firstCorrect===true&&(!q.explain||a?.explanationCorrect===true)};
  })
 ];
 // Merge into saved activities so a retry cannot erase earned points or first attempts.
 const tracker=engine.createScoreTracker([...(state.scoreActivities||[]),...current]);
 state.scoreActivities=tracker.export();
 return state.scoreActivities;
}
function refreshScore(score) {
 const badge=app.querySelector('.rounding-score');
 if(!badge)return;
 badge.setAttribute('aria-label',`${score.points} of ${score.maximumPoints} points earned`);
 badge.querySelector('span').textContent=score.points;
 badge.querySelector('.practice-progress-ring').style.setProperty('--practice-progress',`${score.points/score.maximumPoints*100}%`);
}
function save() {
 const scoreActivities=scoringActivities(), score=engine.calculateScore(scoreActivities);
 refreshScore(score);
 const answers = Object.entries(state.answers).filter(([id])=>id!=='extra').map(([,answer])=>answer);
 const snapshot = JSON.parse(JSON.stringify({title:'Subtracting negative numbers',score,scoreActivities,pathname:location.pathname,totalSections:4,currentSectionId:ids[state.stage],currentSectionIndex:state.stage,highestUnlockedIndex:3,finished:checkQuestions.every(q=>state.answers[q.id]?.done),completionPercent:Math.round((answers.filter(a=>a.done).length + Number(state.learned))/22*100),negativeSubtractionState:state}));
 queue = queue.catch(()=>{}).then(()=>store.saveLessonProgress('negative-numbers',snapshot));
}
const practice = [
 ...[[6,2],[-5,4],[9,7],[-12,8]].map(([a,b],i)=>({id:`rewrite-${i}`,title:`A${i+1}. Rewrite only`,prompt:equation(a,b),answer:`${signed(a)} + ${b}`,feedback:`${equation(a,b)} = ${signed(a)} + ${b}. Keep the starting number unchanged.`})),
 ...[[4,5],[7,8],[-3,6],[-9,4],[-5,12],[-11,11]].map(([a,b],i)=>({id:`calculate-${i}`,title:`B${i+1}. Calculate`,prompt:equation(a,b),answer:signed(a+b),feedback:`${equation(a,b)} = ${signed(a)} + ${b} = ${signed(a+b)}.`})),
 {id:'sam',title:'C. Find the mistake',prompt:'Sam writes: −8 − (−3) = 8 + 3 = 11. What has Sam done wrong?',explain:true,answer:'−5',feedback:'Sam incorrectly changed the starting number from −8 to 8. Only subtracting −3 changes to adding 3. Correct working: −8 − (−3) = −8 + 3 = −5.'}
];
const guided = [
 {id:'guided-1',title:'1. Rewrite the calculation',prompt:'5 − (−3)',options:['5 − 3','5 + 3','−5 + 3'],answer:'5 + 3',feedback:'Correct. Subtracting −3 becomes adding 3.'},
 {id:'guided-4',title:'4. Fading support',prompt:'−4 − (−9)',answer:'5',hint:'Rewrite subtracting −9 as adding 9.',feedback:'−4 − (−9) = −4 + 9 = 5.'}
];
const checkQuestions = [
 {id:'check-1',title:'1. Work out',prompt:'13 − (−6)',answer:'19',feedback:'13 − (−6) = 13 + 6 = 19.'},
 {id:'check-2',title:'2. Work out',prompt:'−15 − (−7)',answer:'−8',feedback:'−15 − (−7) = −15 + 7 = −8.'},
 {id:'check-3',title:'3. Choose the equivalent calculation',prompt:'−6 − (−10)',options:['−6 − 10','−6 + 10','6 + 10','6 − 10'],answer:'−6 + 10',feedback:'−6 − (−10) = −6 + 10.'},
 {id:'check-4',title:'4. Explain the error',prompt:'A student says: −4 − (−7) = −4 − 7 = −11. Explain the mistake and give the correct answer.',explain:true,answer:'3',feedback:'The student treated subtracting −7 as subtracting 7. Subtracting a negative becomes addition: −4 − (−7) = −4 + 7 = 3.'},
 {id:'check-5',title:'5. GCSE application',prompt:'At 6 a.m., the temperature is −7°C. By midday, it is 4°C. By how many degrees has the temperature increased? Explain your calculation.',explain:true,answer:'11',unit:'°C',feedback:'Increase = final temperature − starting temperature = 4 − (−7) = 4 + 7 = 11°C.'}
];
function card(title,body) { return `<article class="negative-card"><h2>${title}</h2>${body}</article>`; }
function lineHtml(id,value=0) {
 return `<div class="negative-line"><div class="negative-track"><span class="negative-marker" aria-hidden="true" style="left:${(value+10)*5}%">●</span><div class="negative-ticks">${Array.from({length:21},(_,i)=>`<span>${signed(i-10)}</span>`).join('')}</div><input id="${id}" type="range" min="-10" max="10" step="1" value="${value}" aria-label="Number line marker"></div></div><p data-position>Marker: ${signed(value)}</p>`;
}
function mountLine(root, onMove) {
 const input=root.querySelector('input[type=range]');
 input.addEventListener('input',()=>{
  const n=Number(input.value);
  root.querySelector('.negative-marker').style.left=`${(n+10)*5}%`;
  root.querySelector('[data-position]').textContent=`Marker: ${signed(n)}`;
  onMove(n,input);
 });
}
function resultRows(list) {
 return '<ol class="retained-results">'+list.map(q=>{
  const a=state.answers[q.id]||{};
  const first=a.firstCorrect&&(!q.explain||a.explanationCorrect);
  return `<li><div class="retained-result"><span>${escape(q.prompt)}</span><strong>${escape(a.value||'')}</strong><span>${a.correct?(first?'✓':'2nd try'):'Incorrect'}</span></div>${q.explain?`<p>${escape(a.reason||'')}</p>`:''}${first?'':`<p>${escape(q.feedback)}</p>`}</li>`;
 }).join('')+'</ol>';
}
function questionHtml(q) {
 const a=state.answers[q.id]||{};
 if(a.done&&a.correct)return card(q.title,`<p class="negative-equation">${escape(q.prompt)} = ${escape(a.value)}</p><p>${a.firstCorrect&&(!q.explain||a.explanationCorrect)?'✓':'2nd try'}</p>`);
 return card(q.title,`<form data-question="${q.id}"><p class="${q.prompt.length<45?'negative-equation':''}">${escape(q.prompt)}</p>${q.explain?`<label>Your explanation<textarea name="reason" required>${escape(a.reason||'')}</textarea></label>`:''}${q.options?`<div class="negative-options">${q.options.map(o=>`<label><input type="radio" name="answer" value="${escape(o)}" required ${a.value===o?'checked':''}> ${escape(o)}</label>`).join('')}</div>`:`<label>${q.explain?'Correct answer':'Your answer'} <input type="text" name="answer" autocomplete="off" required value="${escape(a.value||'')}"> ${q.unit||''}</label>`}${q.hint?`<details><summary>Show a hint</summary><p>${q.hint}</p></details>`:''}<div class="negative-feedback" role="status">${escape(a.feedback||'')}</div><button class="button" type="submit" ${a.awaitingReview?'disabled':''}>${a.done?'Check again':'Check answer'}</button><div data-self></div></form>`);
}
function mountQuestions(list) {
 list.forEach(q=>{
  const form=app.querySelector(`[data-question="${q.id}"]`);
  if(!form)return;
  const feedback=form.querySelector('[role=status]');
  const a=state.answers[q.id]||(state.answers[q.id]={});
  function mountReview(){
   if(!a.awaitingReview)return;
   form.querySelector('[type=submit]').disabled=true;
   form.querySelector('[data-self]').innerHTML='<p>Compare your explanation with the model answer above. Did it explain the same mistake or reasoning?</p><button type="button" class="button" data-review="yes">My explanation matches</button><button type="button" class="button" data-review="no">I need to review it</button>';
   form.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{
    const matches=b.dataset.review==='yes';
    if(a.explanationCorrect===undefined)a.explanationCorrect=matches;
    a.done=true;a.correct=a.numericCorrect&&matches;a.awaitingReview=false;
    a.feedback=a.correct?'Explanation self-checked.':'Review the model explanation before moving on. '+q.feedback;
    save();show(state.stage);
   });
  }
  mountReview();
  form.addEventListener('input',()=>{
   a.value=new FormData(form).get('answer')||'';
   a.reason=new FormData(form).get('reason')||'';
   save();
  });
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const value=new FormData(form).get('answer');
   const correct=normalise(value)===normalise(q.answer);
   a.value=value;a.reason=new FormData(form).get('reason')||'';
   if(a.firstCorrect===undefined)a.firstCorrect=correct;
   a.history=a.history||[];a.history.push({value,reason:a.reason,correct});
   a.feedback=correct?q.feedback:`Not quite. ${q.feedback}`;
   feedback.textContent=a.feedback;
   if(q.explain){a.numericCorrect=correct;a.awaitingReview=true;mountReview();save();}
   else {a.done=true;a.correct=correct;save();show(state.stage);}
  });
 });
}
function mountGuidedLine(root,start,amount,id,needsOperation=false) {
 state.lines=state.lines||{};
 const line=state.lines[id]||(state.lines[id]={phase:'start',position:0,jumps:0,operationReady:!needsOperation,feedback:''});
 if(state.answers[id]?.done){line.phase='done';line.position=start+amount;line.jumps=amount;line.operationReady=true;}
 function render(){
  const done=line.phase==='done';
  root.innerHTML=`<p class="negative-equation">${equation(start,amount)}</p>${needsOperation?`<p>Step 1: subtracting −6 becomes −2 <span data-operation>${line.operationReady?'+':'<button class="button" data-op="+">+</button><button class="button" data-op="−">−</button><button class="button" data-op="×">×</button>'}</span> 6.</p>`:''}<p>${done?'Completed':line.phase==='move'?`Move the marker ${amount} spaces to the right, one space at a time.`:`Drag the marker to ${signed(start)}.`}</p>${lineHtml(id,line.position)}<div data-direction ${line.phase==='direction'?'':'hidden'}><p>You are subtracting −${amount}. Which direction should you move?</p><button class="button" data-dir="left">Left</button><button class="button" data-dir="right">Right</button></div><p>${line.jumps?Array.from({length:line.jumps+1},(_,i)=>signed(start+i)).join(' → '):''}</p><p role="status">${escape(done?`${equation(start,amount)} = ${signed(start)} + ${amount} = ${signed(start+amount)}.`:line.feedback)}</p>`;
  const input=root.querySelector('input');
  input.disabled=!line.operationReady||done||line.phase==='direction';
  function update(){save();render();}
  root.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{
   if(b.dataset.op!=='+')line.feedback='Subtracting a negative becomes addition. Choose +.';
   else {line.operationReady=true;line.feedback='Correct. Now start at −2.';}
   update();
  });
  mountLine(root,n=>{
   if(line.phase==='start'){
    line.position=n;
    if(n===start)line.phase='direction';
   }else if(line.phase==='move'){
    if(n!==line.position+1)line.feedback='Move one space to the right for each jump.';
    else {
     line.position=n;line.jumps++;line.feedback=`${line.jumps} of ${amount} jumps.`;
     if(line.jumps===amount){line.phase='done';state.answers[id]={done:true,correct:true};if(id==='learn-line')state.learned=true;}
    }
   }
   update();
  });
  root.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>{
   if(b.dataset.dir==='left')line.feedback='Not quite. Subtracting a negative number becomes addition, so move to the right.';
   else {line.phase='move';line.feedback='';}
   update();
  });
 }
 render();
}
function renderLearn() {
 app.querySelector('[data-panel]').innerHTML=card('Two minus signs, two different jobs',`<p class="negative-equation">3 − (−4)</p><p>The first − is the <strong>operation</strong>: subtract. The second − belongs to the <strong>number</strong>: negative four.</p><p>To subtract a negative number, rewrite it as adding the positive number:</p><p class="negative-equation">3 − (−4) = 3 + 4 = 7</p><p class="negative-note"><strong>Subtracting a negative becomes adding a positive.</strong></p><p>On a number line, numbers increase as you move right and decrease as you move left.</p>`)+card('Interactive number line','<div data-guided-line></div>')+card('Explore different starting numbers',`<div class="negative-explore"><label>Starting number: <output data-start>2</output><input data-start-slider type="range" min="-10" max="9" value="2"></label><label>Subtract negative: <output data-negative>−5</output><input data-amount-slider type="range" min="1" max="8" value="5"></label><p>Choose both numbers, then watch the movement to the right. The range adjusts to keep the answer on the line.</p><button class="button" data-example="2,5">2 − (−5)</button><button class="button" data-example="-3,4">−3 − (−4)</button><button class="button" data-example="-6,2">−6 − (−2)</button><div data-explore-line>${lineHtml('explore-line',2)}</div><button class="button" data-animate>Show the jumps</button><p class="negative-equation" data-explore-equation></p></div>`);
 mountGuidedLine(app.querySelector('[data-guided-line]'),3,4,'learn-line');
 const start=app.querySelector('[data-start-slider]'),amount=app.querySelector('[data-amount-slider]'),line=app.querySelector('[data-explore-line]');
 line.querySelector('input').disabled=true;state.explore=state.explore||{start:2,amount:5,position:2};start.value=state.explore.start;amount.max=10-Number(start.value);amount.value=state.explore.amount;
 let timer;
 const move=n=>{state.explore.position=n;save();line.querySelector('.negative-marker').style.left=`${(n+10)*5}%`;line.querySelector('input').value=n;line.querySelector('[data-position]').textContent=`Marker: ${signed(n)}`;};
 const update=()=>{clearInterval(timer);state.explore.start=Number(start.value);state.explore.amount=Number(amount.value);amount.max=10-Number(start.value);if(Number(amount.value)>Number(amount.max))amount.value=amount.max;app.querySelector('[data-start]').textContent=signed(start.value);app.querySelector('[data-negative]').textContent=`−${amount.value}`;move(Number(start.value));app.querySelector('[data-explore-equation]').textContent=`${equation(Number(start.value),Number(amount.value))} = ${signed(start.value)} + ${amount.value} = ${signed(Number(start.value)+Number(amount.value))}`;};
 const animate=()=>{update();let n=Number(start.value),end=n+Number(amount.value);timer=setInterval(()=>{if(!line.isConnected||n>=end){clearInterval(timer);return;}move(++n);},350);};
 start.oninput=animate;amount.oninput=animate;app.querySelector('[data-animate]').onclick=animate;
 app.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{const [a,c]=b.dataset.example.split(',');start.value=a;amount.max=10-Number(a);amount.value=c;animate();});const restoredPosition=state.explore.position;update();move(restoredPosition);
}
function renderGuided() {
 app.querySelector('[data-panel]').innerHTML=questionHtml(guided[0])+card('2. Complete each step','<div data-guided-line></div>')+card('3. Spot what changes',`<p>Click the two minus signs that need to change. Keep the starting number unchanged.</p><p class="negative-equation"><button class="button" data-sign="start" aria-label="Minus sign of starting number">−</button>7 <button class="button" data-sign="operation" aria-label="Subtraction sign" aria-pressed="false">−</button> (<button class="button" data-sign="number" aria-label="Minus sign of negative three" aria-pressed="false">−</button>3)</p><p data-sign-feedback role="status"></p>`)+questionHtml(guided[1]);
 mountQuestions(guided);mountGuidedLine(app.querySelector('[data-guided-line]'),-2,6,'guided-2',true);
 state.signs=state.signs||{selected:[],feedback:''};const selected=new Set(state.signs.selected);app.querySelector('[data-sign-feedback]').textContent=state.signs.feedback;app.querySelectorAll('[data-sign]').forEach(b=>{b.setAttribute('aria-pressed',selected.has(b.dataset.sign));b.disabled=!!state.answers['guided-3']?.done;});app.querySelectorAll('[data-sign]').forEach(b=>b.onclick=()=>{
 const feedback=app.querySelector('[data-sign-feedback]');
 if(b.dataset.sign==='start'){feedback.textContent='The starting number stays at −7. Only subtracting −3 changes to adding 3.';state.signs.feedback=feedback.textContent;save();return;}
 selected.has(b.dataset.sign)?selected.delete(b.dataset.sign):selected.add(b.dataset.sign);b.setAttribute('aria-pressed',selected.has(b.dataset.sign));
 feedback.textContent=selected.size===2?'−7 − (−3) → −7 + 3 = −4. The starting number stays at −7. Only subtracting −3 changes to adding 3.':'Select the other sign that changes too.';
 state.signs.selected=[...selected];state.signs.feedback=feedback.textContent;if(selected.size===2){state.answers['guided-3']={done:true,correct:true};app.querySelectorAll('[data-sign]').forEach(button=>button.disabled=true);}save();
 });
}
function checkHistoryHtml() {
 return (state.checkHistory||[]).map((session,index)=>`<details><summary>Earlier Check ${index+1}</summary><ol class="retained-results">${session.map(a=>{const q=checkQuestions.find(question=>question.id===a.question);return `<li><div class="retained-result"><span>${escape(q.prompt)}</span><strong>${escape(a.value||'')}</strong><span>${a.correct?(a.firstCorrect&&(!q.explain||a.explanationCorrect)?'✓':'2nd try'):'Incorrect'}</span></div></li>`;}).join('')}</ol></details>`).join('');
}
function updateResult() {
 const result=app.querySelector('[data-result]');if(!result)return;
 if(!checkQuestions.every(q=>state.answers[q.id]?.done)){result.textContent='Complete all five questions. Questions 1–4 determine your mastery result; Question 5 checks GCSE reasoning. Explanations are self-assessed against a model answer.';return;}
 const score=checkQuestions.slice(0,4).filter(q=>state.answers[q.id].firstCorrect && (!q.explain||state.answers[q.id].explanationCorrect)).length;
 result.innerHTML=`<h2>${score} out of 4</h2><p>${score===4?'You’re ready.':score===3?'Review your mistake, then try one more question.':'Return to the interactive number line and practise again.'}</p><p>Based on first attempts, including your self-assessed explanation. GCSE reasoning: ${state.answers['check-5'].correct?'completed correctly':'review the model answer'}.</p>${score===3?'<div data-extra></div>':score<3?'<button class="button" data-return>Return to Learn</button>':''}<p class="negative-note">Subtracting a negative becomes adding a positive.<br>−8 − (−3) = −8 + 3<br>The starting number remains unchanged.</p><button class="button" data-retry>Try the Check again</button>`;
 if(score===3){const q={id:'extra',title:'One more question',prompt:'−10 − (−6)',answer:'−4',feedback:'−10 − (−6) = −10 + 6 = −4.'};result.querySelector('[data-extra]').innerHTML=questionHtml(q);mountQuestions([q]);}
 result.querySelector('[data-return]')?.addEventListener('click',()=>show(0));
 result.querySelector('[data-retry]').onclick=()=>{state.checkHistory=state.checkHistory||[];state.checkHistory.push(JSON.parse(JSON.stringify(checkQuestions.map(q=>({question:q.id,...state.answers[q.id]})))));checkQuestions.forEach(q=>delete state.answers[q.id]);save();show(3);};
}
function show(stage) {
 state.stage=stage;router.sync(ids[stage]);
 app.innerHTML=`<header class="negative-header"><div class="negative-header__copy"><p>Learning goal</p><h1>Subtracting negative numbers</h1><p>Learn how to subtract a negative number by rewriting it as addition.</p>${stage===0?'<p class="negative-equation">a − (−b) = a + b</p>':''}</div><div class="rounding-score" aria-live="polite"><div class="practice-progress-ring"><span>0</span></div></div></header><nav class="negative-nav" aria-label="Lesson stages">${stages.map((label,i)=>`<button class="button" data-stage="${i}" aria-pressed="${i===stage}">${label}</button>`).join('')}</nav><section data-panel aria-label="${stages[stage]}"></section><div class="negative-nav">${stage>0?'<button class="button" data-back>Back</button>':''}${stage<3?`<button class="button" data-next>Continue to ${stages[stage+1]}</button>`:''}</div>`;
 app.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>show(Number(b.dataset.stage)));
 app.querySelector('[data-back]')?.addEventListener('click',()=>show(stage-1));app.querySelector('[data-next]')?.addEventListener('click',()=>show(stage+1));
 if(stage===0)renderLearn();else if(stage===1)renderGuided();else {
  const list=stage===2?practice:checkQuestions;
  app.querySelector('[data-panel]').innerHTML=`<h2>${stages[stage]}</h2><p>${stage===2?'Rewrite without calculating in A. Calculate in B. Explain the mistake in C.':'Complete without hints or a number line.'}</p>`+(list.every(q=>state.answers[q.id]?.done&&(stage===3||state.answers[q.id]?.correct))?resultRows(list):list.map(questionHtml).join(''))+(stage===3?'<article class="negative-card" data-result aria-live="polite"></article>'+checkHistoryHtml():'');mountQuestions(list);updateResult();
 }
 save();
}
(async()=>{
 try { const saved=await store.getLessonProgress('negative-numbers');if(saved?.negativeSubtractionState&&(!saved.negativeSubtractionState.contentVersion||saved.negativeSubtractionState.contentVersion===1))state={...state,...saved.negativeSubtractionState,contentVersion:1}; }catch(error){console.warn('Progress could not be restored.',error);}
 ids.forEach((id,i)=>router.register(id,()=>show(i),i===1?['try-it','method']:i===2?['practice']:i===3?['comparison']:['explanation','interactive']));
 if(!router.start())show(Math.max(0,Math.min(3,state.stage||0)));
})();
})();
