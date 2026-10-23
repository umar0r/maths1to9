(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const Q = window.GraphTypes;
    const { node } = Q;
    const event = (sectionId, name) => document.dispatchEvent(new CustomEvent('maths1to9:section-' + name, { detail: { sectionId } }));
    const firstForms = [{kind:'line',m:2,c:-1},{kind:'quadratic',c:-1},{kind:'cubic'},{kind:'reciprocal',k:1}];
    const learn = [
        {title:'Four kinds of graph.',forms:firstForms,text:["You've drawn all four of these.",'Each kind of equation makes its own shape.']},
        {title:'Power 1: a straight line.',forms:[firstForms[0]],text:[
            'The **power** is the small raised number. x² has power 2. x³ has power 3.',
            'Plain x has power 1. Power 1 makes a **straight line**.']},
        {title:'Power 2: a U shape.',forms:[firstForms[1],{kind:'quadratic',a:-1,c:3}],text:[
            'The highest power is 2: a **quadratic**.','It makes a U shape, or an upside-down U.']},
        {title:'Power 3: an S shape.',forms:[firstForms[2],{kind:'cubic',c:2}],text:[
            'The highest power is 3: a **cubic**.','It makes a stretched S shape.']},
        {title:'x on the bottom: two curves.',forms:[firstForms[3],{kind:'reciprocal',k:2}],text:[
            "When x is on the bottom of a fraction, it's a **reciprocal**.",'It makes two separate curves that never touch the axes.']},
        {title:'The highest power decides.',forms:[{kind:'quadratic',b:1}],text:[
            'y = x² + x has x² and x.',"The **highest** power is 2, so it's a quadratic: a U shape."]},
        {title:'Worked example.',forms:[{kind:'cubic',a:2,c:-1}],text:[
            'Look at the shape first. Then find the equation with the matching power.']}
    ];
    function equation(form, highlight = false) {
        const element = node('p', '', 'graphtypes-equation');
        if (form.kind === 'reciprocal') {
            element.append(document.createTextNode(Q.nb('y = ')));
            const fraction = node('span', '', 'graphtypes-fraction');
            fraction.append(node('span', String(form.k || 1)),node('span','x'));
            element.append(fraction);
        } else if (highlight) {
            element.append(document.createTextNode(Q.nb('y = ')),node('mark','x²'),document.createTextNode(Q.nb(' + x')));
        } else element.textContent = Q.nb(Q.equationText(form));
        return element;
    }
    function strongText(root, text) {
        const paragraph = node('p');
        text.split('**').forEach((part,index)=>paragraph.append(index%2?node('strong',part):document.createTextNode(Q.prose(part))));
        root.append(paragraph);
    }
    async function mountLearn() {
        const api=window.Maths1to9Lesson,root=node('article','','graphtypes-learn');
        document.getElementById('lesson-section-explanation').append(root);
        event('explanation','gate');
        const section=await api.useSectionState('learn',{version:1,initial:()=>({screen:0,furthestScreen:0,finished:false,seen:[]})});
        const state=section.state;
        let boards=[],timers=[];
        function syncHash(){if(api.getCurrentSection().id==='explanation')api.setSlideHash('learn-'+(state.screen+1),{replace:true});}
        function show(screen){
            section.update(s=>{s.screen=screen;s.furthestScreen=Math.max(s.furthestScreen,screen);if(screen===6)s.finished=true;});
            render();const heading=root.querySelector('h3');heading.tabIndex=-1;heading.focus();
        }
        function render(){
            timers.forEach(clearTimeout);timers=[];boards.forEach(board=>board.destroy());boards=[];root.replaceChildren();
            const screen=learn[state.screen],animate=!state.seen[state.screen]&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
            let delay=0;
            function later(run){if(!animate)return run();delay+=500;timers.push(setTimeout(run,delay));}
            root.append(node('h3',screen.title));
            if(state.screen===0){
                const grid=node('div','','graphtypes-grid');root.append(grid);
                screen.forms.forEach(form=>{
                    const cell=node('div'),host=node('div');cell.append(host);grid.append(cell);
                    const board=Q.graph(host,form,true);boards.push(board);Q.drawForm(board,form);
                    cell.append(equation(form),node('p',Q.name(form),'graphtypes-name'));
                });
                screen.text.forEach(text=>strongText(root,text));
            }else{
                const layout=node('div','','graphtypes-layout'),figure=node('div','','graphtypes-figure'),notes=node('div','','graphtypes-notes');
                layout.append(figure,notes);root.append(layout);
                const host=node('div','','graphtypes-big');figure.append(host);
                const board=Q.graph(host,screen.forms[0]);boards.push(board);
                if(state.screen!==6){
                    const legend=node('div','','graphtypes-legend');notes.append(legend);
                    screen.forms.forEach((form,index)=>{
                        const draw=()=>{
                            Q.drawForm(board,form,{tone:index?'ink':'neutral'});
                            const caption=equation(form,state.screen===5);
                            caption.classList.add(index?'graphtypes-ink':'graphtypes-blue');
                            legend.append(caption);
                        };
                        if(index)later(draw);else draw();
                    });
                }else{
                    Q.drawForm(board,screen.forms[0]);
                    const working=node('div','','graphtypes-steps'),options=node('div','','graphtypes-worked-options');
                    notes.append(working,options);
                    const forms=[{kind:'line',m:2,c:-1},{kind:'quadratic',a:2,c:-1},screen.forms[0],{kind:'reciprocal',k:2}];
                    const labels=forms.map(form=>{const label=equation(form);options.append(label);return label;});
                    later(()=>working.append(node('p','1. The shape: a stretched S.')));
                    later(()=>working.append(node('p','2. A stretched S is a cubic: power 3.')));
                    later(()=>labels.forEach((label,index)=>{
                        label.classList.add(index===2?'graphtypes-right':'graphtypes-muted');
                        if(index===2)label.append(document.createTextNode(' ✓'));
                    }));
                }
                screen.text.forEach(text=>strongText(notes,text));
            }
            section.update(s=>{s.seen[s.screen]=true;});
            api.setSectionBack('explanation',state.screen?{onClick:()=>show(state.screen-1)}:null);
            if(state.finished)event('explanation','complete');
            if(state.screen===6)api.clearSectionAction('explanation');
            else api.setSectionAction('explanation',{label:'Next',onClick:()=>show(state.screen+1)});
            syncHash();
        }
        learn.forEach((screen,index)=>api.registerHashRoute('learn-'+(index+1),()=>{
            api.goToSection('explanation',{moveFocus:false});show(Math.min(index,state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change',()=>queueMicrotask(syncHash));
        window.addEventListener('hashchange',()=>queueMicrotask(syncHash));
        const requested=/^#learn-([1-7])$/.exec(initialHash);
        if(requested)show(Math.min(Number(requested[1])-1,state.furthestScreen));else render();
    }
    const quadratic={kind:'quadratic',c:1};
    const tryForms=[{kind:'cubic',c:-2},{kind:'quadratic',c:-2},{kind:'line',c:-2},{kind:'reciprocal',k:2}];
    const tryGraphOptions=Q.graphOptions(tryForms,tryForms[0]);
    ['Right. Power 3: a stretched S.','That U shape is a quadratic. You want power 3: an S.',"That's a straight line: power 1. You want an S.",'Two separate curves make a reciprocal graph. You want one S.']
        .forEach((feedback,index)=>{tryGraphOptions[index].feedback=feedback;});
    const examples=[
        {input:'choice',figure:Q.bigFigure(quadratic),prompt:'What shape is this graph?',options:[
            Q.choice('A U shape','Right. The curve comes down, turns and goes back up.',true),
            Q.choice('A straight line',"It bends at the bottom, so it isn't straight."),
            Q.choice('A stretched S shape','An S keeps going up on both sides of the middle. This curve turns back up.'),
            Q.choice('Two separate curves',"It's one curve. It doesn't break in the middle.")]},
        {input:'choice',figure:Q.bigFigure(quadratic),prompt:'Which equation could it be?',options:[
            Q.choice('y = x² + 1','Right. A U shape is a quadratic: power 2.',true),
            Q.choice('y = x + 1','Power 1 makes a straight line. This is a U shape.'),
            Q.choice('y = x³ + 1','Power 3 makes an S shape. This is a U shape.'),
            Q.choice('y = 1/x','x on the bottom makes two separate curves. This is one U.')]},
        {...Q.powerCard(Q.powerSums[1]),rules:[
            {value:'1',feedback:"There's an x, but x³ is a higher power."},
            {value:'4',feedback:'4 is the number in front of x. The power is the small raised number.'}],
            feedback:"Right. x³ beats x, so it's a cubic."},
        {input:'choice',figure:Q.bigFigure({kind:'reciprocal',k:2}),prompt:'Which equation could it be?',options:[
            Q.choice('y = 2/x','Right. Two separate curves: a reciprocal graph.',true),
            Q.choice('y = 2x',"That's a straight line. This graph has two curves."),
            Q.choice('y = 2x²',"That's a U shape. This graph has two separate curves."),
            Q.choice('y = 2x³',"That's one S-shaped curve. This graph breaks in the middle.")]},
        {input:'custom',prompt:'Which graph is y = x³ − 2?',widget:Q.graphChoice(tryGraphOptions)}
    ].map(Q.prepare);
    Q.examples=examples;
    async function mountTryIt(root){
        const api=window.Maths1to9Lesson,E=window.Maths1to9LessonEngine;
        event('interactive','gate');
        const section=await api.useSectionState('interactive',{version:1,initial:()=>({
            index:0,screen:0,furthestScreen:0,finished:false,cards:{},
            orders:examples.map(q=>E.shuffle((q.options||[]).map((_,i)=>i))),graphOrder:E.shuffle([0,1,2,3])
        })});
        const state=section.state;section.save();
        function syncHash(){if(api.getCurrentSection().id==='interactive')api.setSlideHash('try-it-'+(state.screen+1),{replace:true});}
        function show(screen){section.update(s=>{s.screen=screen;});render();const heading=root.querySelector('h3');heading.tabIndex=-1;heading.focus();}
        function report(){api.setSectionProgress('interactive',examples.filter((q,i)=>state.cards['example-'+(i+1)]?.correct===true).length,5);}
        function advance(){section.update(s=>{s.index++;s.screen=s.index;s.furthestScreen=s.screen;s.finished=s.index===5;});render();}
        function card(host,index,readOnly){
            const question=examples[index];
            api.createQuestion(host,{...question,
                options:state.orders[index].map(i=>question.options[i]),
                ...(index===4?{widget:Q.graphChoice(state.graphOrder.map(i=>tryGraphOptions[i]))}:{}),
                sectionId:'interactive',questionId:'example-'+(index+1),scored:false,readOnly,
                onFeedback:report,onContinue:advance});
        }
        function render(){
            root.replaceChildren();root.append(node('h3',state.screen===5?'Your completed examples':'Question '+(state.screen+1)+' of 5'));
            api.setSectionBack('interactive',state.screen?{onClick:()=>show(state.screen-1)}:null);
            if(state.finished)event('interactive','complete');
            if(state.screen===5){examples.forEach((q,i)=>{const host=node('div');root.append(host);card(host,i,true);});api.clearSectionAction('interactive');}
            else{const host=node('div');root.append(host);card(host,state.screen,state.screen<state.index);
                if(state.screen<state.index)api.setSectionAction('interactive',{label:'Next',onClick:()=>show(state.screen+1)});}
            report();syncHash();
        }
        for(let i=0;i<=5;i++)api.registerHashRoute('try-it-'+(i+1),()=>{if(api.goToSection('interactive',{moveFocus:false}))show(Math.min(i,state.furthestScreen));});
        document.addEventListener('maths1to9:section-change',()=>queueMicrotask(syncHash));
        window.addEventListener('hashchange',()=>queueMicrotask(syncHash));
        render();const requested=/^#try-it-([1-6])$/.exec(initialHash);
        if(requested&&api.goToSection('interactive',{moveFocus:false}))show(Math.min(Number(requested[1])-1,state.furthestScreen));
    }
    window.Maths1to9Interactives??={};
    window.Maths1to9Interactives[SLUG]=mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered',e=>{if(e.detail?.slug===SLUG)mountLearn();});
})();
