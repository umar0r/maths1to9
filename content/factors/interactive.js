(() => {
    'use strict';
    window.Maths1to9Interactives ??= {};
    const slug = 'factors';
    const TOTAL = 24;
    const MUST_TRY = [1, 2, 3, 4, 5];
    const ROW_CHOICES = [1, 2, 3, 4, 5, 6];
    const GAP = 24;
    const MARGIN = 24;
    const colours = ['#536dfe', '#009b83', '#c87500', '#bd3d88'];

    function rainbow(pairs, label='Factor pairs') {
        if (!pairs.length) return '';
        const numbers = [...new Set(pairs.flat())].sort((a,b)=>a-b);
        const x = number => 35 + numbers.indexOf(number) * 530 / Math.max(1,numbers.length-1);
        const arcs = pairs.map(([a,b],i)=>`<path d="M ${x(a)} 100 Q 300 ${-35+i*36} ${x(b)} 100" fill="none" stroke="${colours[i]}" stroke-width="4"/>`).join('');
        return `<figure class="factors-rainbow"><figcaption>${label}</figcaption><svg viewBox="0 0 600 145" role="img" aria-label="${pairs.map(([a,b])=>`${a} and ${b}`).join('; ')}">${arcs}${numbers.map(n=>`<text x="${x(n)}" y="130" text-anchor="middle">${n}</text>`).join('')}</svg></figure>`;
    }

    // Each arrangement gets a viewBox that fits it, so counters stay full size
    // on a phone unless the arrangement is genuinely too wide (1 row of 24).
    function pilePositions() {
        return Array.from({length:TOTAL}, (_,i) => {
            const radius = 14 * Math.sqrt(i + 0.5), angle = i * 2.39996;
            return {x:85 + radius*Math.cos(angle), y:85 + radius*Math.sin(angle), left:false};
        });
    }

    function rowPositions(rows) {
        const perRow = Math.floor(TOTAL/rows), leftOver = TOTAL%rows;
        const width = (perRow-1)*GAP + 2*MARGIN;
        const leftStartX = width/2 - (leftOver-1)*GAP/2;
        return Array.from({length:TOTAL}, (_,i) => i < rows*perRow
            ? {x:MARGIN + (i%perRow)*GAP, y:20 + Math.floor(i/perRow)*GAP, left:false}
            : {x:leftStartX + (i-rows*perRow)*GAP, y:20 + rows*GAP + 22, left:true});
    }

    function board(rows) {
        const positions = rows ? rowPositions(rows) : pilePositions();
        const perRow = rows ? Math.floor(TOTAL/rows) : 0, leftOver = rows ? TOTAL%rows : 0;
        const width = rows ? (perRow-1)*GAP + 2*MARGIN : 170;
        const height = rows ? 20 + rows*GAP + (leftOver ? 30 : 0) : 170;
        const label = rows
            ? `${rows} ${rows===1?'row':'rows'} of ${perRow}${leftOver?`, with ${leftOver} left over`:''}`
            : `${TOTAL} counters`;
        return `<div class="factors-board"><svg style="max-width:${width}px" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${positions.map((p,i)=>`<circle data-counter-id="${i}" cx="${p.x}" cy="${p.y}" r="9" class="${p.left?'factors-leftover':'factors-dot'}"/>`).join('')}</svg></div>`;
    }

    function counterCentres(root) {
        return new Map([...root.querySelectorAll('[data-counter-id]')].map(dot => {
            const box = dot.getBoundingClientRect();
            return [dot.dataset.counterId, {x:box.left + box.width/2, y:box.top + box.height/2}];
        }));
    }

    // Slide each counter from its old screen position to its new one. SVG
    // transforms are in viewBox units, so convert the pixel distance.
    function animateCounters(root, before) {
        if (!before.size || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const svg = root.querySelector('.factors-board svg');
        if (!svg) return;
        const scale = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
        const after = counterCentres(root);
        root.querySelectorAll('[data-counter-id]').forEach(dot => {
            const from = before.get(dot.dataset.counterId), to = after.get(dot.dataset.counterId);
            if (!from || !to) return;
            const dx = (from.x - to.x) * scale, dy = (from.y - to.y) * scale;
            if (dx || dy) dot.animate([{transform:`translate(${dx}px, ${dy}px)`},{transform:'translate(0, 0)'}],{duration:500,easing:'ease-in-out'});
        });
    }

    function pairsFound(tried) {
        const pairs = tried.filter(rows => TOTAL%rows===0)
            .map(rows => [Math.min(rows,TOTAL/rows), Math.max(rows,TOTAL/rows)]);
        const unique = [...new Map(pairs.map(pair => [pair.join(), pair])).values()];
        return unique.sort((a,b)=>a[0]-b[0]);
    }

    function result(rows, tried) {
        const perRow = Math.floor(TOTAL/rows), leftOver = TOTAL%rows;
        if (leftOver) return {correct:false, text:`${rows} rows of ${perRow}, with ${leftOver} left over. ${rows} is not a factor of ${TOTAL}.`};
        const repeat = rows > perRow && tried.includes(perRow);
        return {correct:true, text: repeat
            ? `${rows} rows of ${perRow}, none left over. That is the pair ${perRow} and ${rows} again.`
            : `${rows} ${rows===1?'row':'rows'} of ${perRow}, none left over. ${rows} and ${perRow} are a factor pair.`};
    }

    const question = {
        prompt: `What are all the factors of ${TOTAL}?`,
        correct: '1, 2, 3, 4, 6, 8, 12, 24',
        wrong: {
            '1, 2, 3, 4': 'Those are only the numbers of rows. Each pair has a second number too: 24, 12, 8 and 6.',
            '1, 2, 3, 4, 5, 6, 8, 12, 24': '5 rows left 4 over, so 5 is not a factor.',
            '1, 2, 3, 4, 8, 12, 24': '4 rows of 6 gives the pair 4 and 6. Do not forget 6.'
        },
        explanation: 'Use both numbers from each pair: 1 and 24, 2 and 12, 3 and 8, 4 and 6.'
    };

    function shuffle(items) {
        const copy = [...items];
        for (let i = copy.length-1; i > 0; i--) {
            const j = Math.floor(Math.random()*(i+1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function freshState() {
        return {kind:'row-explorer', version:1, rows:null, tried:[], stage:'explore', options:shuffle([question.correct, ...Object.keys(question.wrong)]), selected:null, phase:'answer', finished:false};
    }

    window.Maths1to9Interactives[slug] = async root => {
        if (!root || root.dataset.mounted) return;
        root.dataset.mounted = 'true';
        const api = window.Maths1to9Lesson;
        const progress = window.Maths1to9Progress;
        const dispatch = name => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {detail:{sectionId:'interactive'}}));
        let state = await progress.getLessonActivityState(slug, 'interactive');
        if (state?.kind !== 'row-explorer' || state.version !== 1) state = freshState();
        dispatch('gate');

        state.contentVersion = 1;
        state.attempts ??= [];

        function explored() {
            return MUST_TRY.every(rows => state.tried.includes(rows));
        }

        function renderExplore() {
            const outcome = state.rows ? result(state.rows, state.tried) : null;
            const remaining = MUST_TRY.filter(rows => !state.tried.includes(rows));
            const status = outcome
                ? `<p class="question-feedback is-visible ${outcome.correct?'is-correct':'is-incorrect'}" role="status">${outcome.text}</p>`
                : '<p class="question-feedback" role="status"></p>';
            const next = explored()
                ? '<p class="factors-explorer__done">The pairs have met in the middle. Any more rows would only repeat a pair, so you have found them all.</p>'
                : `<p class="factors-explorer__todo">Still to try: ${remaining.join(', ')}.</p>`;
            return `<h3 class="question-prompt">How many equal rows can you make?</h3>
                ${board(state.rows)}
                <div class="factors-options factors-options--rows" role="group" aria-label="Number of rows">${ROW_CHOICES.map(rows => {
                    const cls = rows===state.rows ? 'is-selected' : state.tried.includes(rows) ? (TOTAL%rows===0 ? 'is-correct' : 'is-incorrect') : '';
                    return `<button type="button" class="button ${cls}" data-rows="${rows}" aria-pressed="${rows===state.rows}">${rows} ${rows===1?'row':'rows'}</button>`;
                }).join('')}</div>
                ${status}
                ${rainbow(pairsFound(state.tried))}
                ${next}`;
        }

        function renderQuestion() {
            const answered = state.phase !== 'answer';
            const feedback = state.phase==='correct'
                ? `<p class="question-feedback is-visible is-correct" role="status">Correct. ${question.explanation}</p>`
                : state.phase==='wrong'
                    ? `<p class="question-feedback is-visible is-incorrect" role="status">Not yet. ${question.wrong[state.options[state.selected]]}</p>`
                    : '<p class="question-feedback" role="status"></p>';
            return `${rainbow(pairsFound(state.tried))}
                <h3 class="question-prompt">${question.prompt}</h3>
                <div class="factors-options" role="group" aria-label="Choose an answer">${state.options.map((option,i) => {
                    const cls = i!==state.selected ? '' : state.phase==='correct' ? 'is-correct' : state.phase==='wrong' ? 'is-incorrect' : 'is-selected';
                    return `<button type="button" class="button ${cls}" data-option="${i}" aria-pressed="${i===state.selected}" ${answered?'disabled':''}>${option}</button>`;
                }).join('')}</div>
                ${feedback}`;
        }

        function render() {
            progress.saveLessonActivityState(slug, 'interactive', state);
            const oldPositions = counterCentres(root);
            if (state.finished) {
                root.innerHTML = `<article class="question-card question-card--bare factors-explorer">${board(state.rows)}${rainbow(pairsFound(state.tried))}<p>${question.prompt}</p><p><strong>${question.correct}</strong> ${state.firstCorrect === true ? '✓' : state.firstCorrect === false ? '2nd try' : 'Correct'}</p></article>`;
                dispatch('complete');
                api.clearSectionAction('interactive');
                return;
            }
            root.innerHTML = `<article class="question-card question-card--bare factors-explorer">${state.stage==='explore' ? renderExplore() : renderQuestion()}</article>`;
            animateCounters(root, oldPositions);

            root.querySelectorAll('[data-rows]').forEach(button => button.onclick = () => {
                const rows = Number(button.dataset.rows);
                state.rows = rows;
                if (!state.tried.includes(rows)) state.tried.push(rows);
                if (explored()) api.recordActivity({id:'factors:row-explorer', kind:'explore'});
                render();
            });
            root.querySelectorAll('[data-option]').forEach(button => button.onclick = () => {
                state.selected = Number(button.dataset.option);
                render();
            });

            if (state.finished) {
                dispatch('complete');
                api.clearSectionAction('interactive');
            } else if (state.stage === 'explore') {
                api.setSectionAction('interactive', {label:'Continue', disabled:!explored(), onClick:() => {
                    state.stage = 'question';
                    render();
                }});
            } else {
                api.setSectionAction('interactive', {
                    label: state.phase==='wrong' ? 'Try again' : 'Check',
                    disabled: state.phase==='answer' && state.selected===null,
                    onClick: () => {
                        if (state.phase === 'wrong') {
                            state.phase = 'answer';
                            state.selected = null;
                        } else if (state.options[state.selected] === question.correct) {
                            state.attempts.push({ selected: state.options[state.selected], correct: true });
                            state.firstCorrect ??= true;
                            state.phase = 'correct';
                            state.finished = true;
                            api.recordActivity({id:'factors:all-factors-24', kind:'guided'});
                        } else {
                            state.attempts.push({ selected: state.options[state.selected], correct: false });
                            state.firstCorrect ??= false;
                            state.phase = 'wrong';
                        }
                        render();
                    }
                });
            }
        }

        render();
    };

    function mountLearn() {
        const first=document.getElementById('lesson-section-explanation');
        if(first&&!first.querySelector('.factors-counters')) {
            const sentence=first.querySelector('.lesson-copy p:nth-child(2)');
            if(sentence){const figure=document.createElement('figure');figure.className='factors-first-figure';figure.innerHTML=`<div class="factors-counters" role="img" aria-label="12 counters in 3 rows of 4">${'<span class="factors-counter"></span>'.repeat(12)}</div><figcaption>3 rows of 4 = 12</figcaption>`;sentence.after(figure);}
        }
        const second=document.getElementById('lesson-section-worked-examples');
        if(!second||second.dataset.factorsVisual)return;
        second.dataset.factorsVisual='true';
        second.innerHTML=`<p class="lesson-eyebrow">Learn</p><h2 class="lesson-section__title">Factors come in pairs</h2><p>Factors come in pairs. When the pairs meet in the middle, you have found them all.</p><div class="factors-arrangements">${[1,2,3].map(rows=>`<figure><div class="factors-small-grid" style="grid-template-columns:repeat(${12/rows},12px)" role="img" aria-label="${rows} ${rows===1?'row':'rows'} of ${12/rows}">${'<span class="factors-counter"></span>'.repeat(12)}</div><figcaption>${rows} × ${12/rows}</figcaption></figure>`).join('')}</div>${rainbow([[1,12],[2,6],[3,4]],'Factor pairs of 12')}`;
    }
    document.addEventListener('maths1to9:lesson-rendered',mountLearn);
})();
