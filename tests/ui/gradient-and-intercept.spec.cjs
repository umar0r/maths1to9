const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const slug = 'gradient-and-intercept';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const board = page => page.locator('.maths-graph__board:visible').first();
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const input = page => page.locator('.question-card input:visible');
const plain = text => text.replace(/\u00a0/g, ' ');
async function capture(page, name) {
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(process.env.GRADIENT_REVIEW_OUTPUT) await page.locator('.lesson-section:visible').screenshot({path:`${process.env.GRADIENT_REVIEW_OUTPUT}/${page.viewportSize().width}-${name}.png`});
}
async function reload(page) { const hash = new URL(page.url()).hash; await page.reload(); await main(page).waitFor(); await expect(page).toHaveURL(new RegExp(`${hash}$`)); }
async function state(page, key) { await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); return page.evaluate(async ({slug,key}) => (await Maths1to9Progress.getLessonActivityState(slug,key))?.data, {slug,key}); }
async function pixels(page, points) {
    await board(page).scrollIntoViewIfNeeded();
    return board(page).evaluate((element, points) => {
        const b = Object.values(JXG.boards).find(b => b.containerObj === element), r = element.getBoundingClientRect();
        return points.map(([x,y]) => [r.left + b.origin.scrCoords[1] + x*b.unitX, r.top + b.origin.scrCoords[2] - y*b.unitY]);
    }, points);
}
async function tap(page, position, touch) { const [p] = await pixels(page, [position]); if (touch) await page.touchscreen.tap(...p); else await page.mouse.click(...p); }
async function drag(page, from, to, touch) {
    const [a,b] = await pixels(page,[from,to]);
    if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a[0],y:a[1]}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b[0],y:b[1]}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
    } else { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b,{steps:6}); await page.mouse.up(); }
}
async function arrows(page) {
    return board(page).evaluate(element => {
        const b = Object.values(JXG.boards).find(b => b.containerObj === element);
        return Object.values(b.objects).filter(o=>o.visProp.strokewidth===3&&o.visProp.lastarrow).map(o=>({from:[o.point1.X(),o.point1.Y()],to:[o.point2.X(),o.point2.Y()],dash:o.visProp.dash}));
    });
}
async function clearLabels(page) {
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const collisions = await board(page).evaluate(element => {
        const b=Object.values(JXG.boards).find(b=>b.containerObj===element), r=element.getBoundingClientRect();
        const px=([x,y])=>[r.left+b.origin.scrCoords[1]+x*b.unitX,r.top+b.origin.scrCoords[2]-y*b.unitY];
        const all=[...element.querySelectorAll('.maths-graph__label')], labels=all.filter(l=>/right|up|down|\(/.test(l.textContent));
        const given=Object.values(b.objects).find(o=>o.elType==='line');
        const lines=[[px([given.point1.X(),given.point1.Y()]),px([given.point2.X(),given.point2.Y()]),'given line'],[px([-6,0]),px([6,0]),'x-axis'],[px([0,-6]),px([0,8]),'y-axis']];
        return labels.flatMap(label=>{
            const a=label.getBoundingClientRect();
            const others=all.filter(other=>other!==label).filter(other=>{const z=other.getBoundingClientRect();return a.left<z.right&&a.right>z.left&&a.top<z.bottom&&a.bottom>z.top;}).map(other=>`${label.textContent} overlaps ${other.textContent}`);
            return [...others,...lines.filter(([from,to])=>{
                const sides=[[a.left,a.top],[a.right,a.top],[a.left,a.bottom],[a.right,a.bottom]].map(([x,y])=>(x-from[0])*(to[1]-from[1])-(y-from[1])*(to[0]-from[0]));
                return Math.min(...sides)<=0&&Math.max(...sides)>=0;
            }).map(line=>`${label.textContent} overlaps ${line[2]}`)];
        });
    });
    expect(collisions).toEqual([]);
}
async function setSlider(page, id, value) {
    const slider=page.getByRole('slider',{name:id==='m'?'Gradient m':'y-intercept c',exact:true});
    await slider.evaluate((element,value)=>{element.value=String(value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));},value);
}
async function learn(page, touch, detailed=false) {
    await board(page).waitFor(); if(detailed) await reload(page); await main(page).click();
    await expect(main(page)).toBeDisabled();
    const cases=[[[0,1],"That's on the y-axis"],[[1,5],'That point is on the line'],[[2,0],"That's on the x-axis"],[[2,2],'Tap where the line meets'],[[6,0],"That's on the x-axis"]];
    for(const [point,message] of detailed?cases:[cases[0]]) {await tap(page,point,touch);await expect(page.locator('.question-feedback:visible')).toContainText(message);if(detailed)await reload(page);}
    if(detailed) {
        await board(page).focus();let cursor=[0,0];
        for(const [target,message] of cases) {
            for(const [axis,negative,positive] of [[0,'ArrowLeft','ArrowRight'],[1,'ArrowDown','ArrowUp']]) {
                while(cursor[axis]!==target[axis]){const sign=Math.sign(target[axis]-cursor[axis]);await board(page).press(sign>0?positive:negative);cursor[axis]+=sign;}
            }
            await board(page).press('Enter');await expect(page.locator('.question-feedback:visible')).toContainText(message);
        }
        for(let n=0;n<6;n++) await board(page).press('ArrowLeft');
        for(let n=0;n<3;n++) await board(page).press('ArrowUp');await board(page).press('Enter');
    } else await tap(page,[0,3],touch);
    await expect(page.locator('.question-feedback:visible')).toContainText('✓ The line crosses');await clearLabels(page);await capture(page,'learn-2');
    if(detailed)await reload(page);await main(page).click();
    await expect(main(page)).toBeDisabled();
    await board(page).focus();await board(page).press('ArrowRight');expect((await arrows(page)).length).toBe(2);await clearLabels(page);
    if(detailed) {
        await reload(page);expect((await state(page,'learn')).position).toBe(1);
        await drag(page,[1,5],[0,3],touch);expect((await arrows(page)).length).toBe(0);
        await drag(page,[0,3],[2,7],touch);expect((await arrows(page)).length).toBe(4);await clearLabels(page);
        await drag(page,[2,7],[1,5],touch);expect((await arrows(page)).length).toBe(2);
    }
    await board(page).focus();await board(page).press('ArrowRight');
    await expect(main(page)).toBeEnabled();expect((await arrows(page)).length).toBe(4);await clearLabels(page);
    await expect(page.getByRole('table')).toContainText('7');await capture(page,'learn-3');
    if(detailed)await reload(page);await main(page).click();await clearLabels(page);await capture(page,'learn-4');if(detailed)await reload(page);await main(page).click();
    const m=page.getByRole('slider',{name:'Gradient m',exact:true}),c=page.getByRole('slider',{name:'y-intercept c',exact:true});
    await expect(c).toBeDisabled();await expect(main(page)).toBeDisabled();if(detailed)await reload(page);
    await m.focus();for(let n=0;n<4;n++)await m.press('ArrowLeft');await expect(m).toHaveValue('-2');await expect(m).toBeDisabled();await expect(c).toBeEnabled();
    await reload(page);await expect(m).toHaveValue('-2');await expect(c).toHaveValue('3');await expect(m).toBeDisabled();
    await c.focus();for(let n=0;n<6;n++)await c.press('ArrowLeft');await expect(c).toHaveValue('-3');await expect(m).toBeEnabled();await expect(main(page)).toBeEnabled();
    if(detailed) {
        await reload(page);
        for(let gradient=-3;gradient<=3;gradient++) for(let intercept=-4;intercept<=4;intercept++) {
            await setSlider(page,'m',gradient);await setSlider(page,'c',intercept);
            const expected=await page.evaluate(([m,c])=>GradientIntercept.step(m,c),[gradient,intercept]);
            const drawn=await arrows(page);expect(drawn.map(a=>({from:a.from,to:a.to}))).toEqual(expected?[{from:expected.from,to:expected.corner},{from:expected.corner,to:expected.to}]:[]);
            await clearLabels(page);
        }
        await m.focus();await m.press('ArrowLeft');await expect(m).toBeFocused();
        const identity=await m.evaluate(e=>{window.rangeReference=e;return true;});expect(identity).toBe(true);
        const box=await m.boundingBox();await page.mouse.move(box.x+box.width*.3,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height/2,{steps:5});await page.mouse.up();
        expect(await m.evaluate(e=>e===window.rangeReference)).toBe(true);await expect(m).toBeFocused();
        if(touch){
            await c.scrollIntoViewIfNeeded();await c.focus();
            const r=await c.boundingBox(),cdp=await page.context().newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.2,y:r.y+r.height/2}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width*.8,y:r.y+r.height/2}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
            await expect(c).toBeFocused();
        }
        await reload(page);
    }
    await capture(page,'learn-5');await main(page).click();
    for(const [label,hidden] of [['y = x + 4','1'],['y = −x + 4','−1'],['y = 3x','+ 0']]) {
        await page.getByRole('button',{name:label.replace(/ /g,'\u00a0'),exact:true}).click();
        expect(plain(await page.locator('.equation-hidden:visible').innerText()).trim()).toBe(hidden);await clearLabels(page);await capture(page,`learn-6-${hidden.replace(/[^0-9]/g,'')}`);
    }
    if(detailed) {
        await reload(page);
        for(let index=5;index>0;index--){await back(page).click();await expect(page).toHaveURL(new RegExp(`#learn-${index}$`));await main(page).click();await back(page).click();}
        // Return from the first Learn screen to the final one.
        for(let index=0;index<5;index++)await main(page).click();
    }
    await main(page).click();
}
async function definition(page, section) {
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    return page.evaluate(async({slug,section})=>{
        const E=GradientIntercept;
        const saved=(await Maths1to9Progress.getLessonActivityState(slug,section)).data;
        if(section==='question-bank') {const item=saved.items[saved.screen];return E.generate(item,Maths1to9LessonEngine.seededRandom(item.seed));}
        return (section==='interactive'?E.examples:E.checks)[saved.screen];
    },{slug,section});
}
async function fillCorrect(page, question) {
    if(question.input==='choice') {
        expect(new Set(question.options.map(option=>option.label)).size).toBe(question.options.length);
        await page.getByRole('button',{name:question.options.find(option=>option.correct).label,exact:true}).click();
    } else if(question.fields) {await input(page).nth(0).fill(question.answer.m);await input(page).nth(1).fill(question.answer.c);}
    else await input(page).fill(question.answer);
    if(question.fields){
        const boxes=await input(page).evaluateAll(elements=>elements.map(e=>({y:e.getBoundingClientRect().y,mode:e.inputMode})));
        expect(boxes[0].y).toBe(boxes[1].y);expect(boxes.map(box=>box.mode)).toEqual(['text','text']);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
async function cards(page, section, count, detailed=false, retry=false) {
    for(let index=0;index<count;index++) {
        const question=await definition(page,section);
        if(detailed&&section==='interactive'&&question.input==='choice') {
            for(const option of question.options.filter(option=>!option.correct)) {
                await page.getByRole('button',{name:option.label,exact:true}).click();await main(page).click();
                await expect(page.locator('.question-feedback:visible')).toHaveText(option.feedback);
                await reload(page);await main(page).click();
            }
        }
        if(retry&&index===0) {
            await input(page).nth(0).fill(question.answer.m);await input(page).nth(1).fill(String(Number(question.answer.c)+20));await main(page).click();await reload(page);await main(page).click();
            await expect(input(page).nth(0)).toHaveValue(question.answer.m.replace('-','−'));await expect(input(page).nth(1)).toBeFocused();
        }
        await fillCorrect(page,question);if(detailed)await reload(page);await main(page).click();await expect(main(page)).toHaveText('Continue');
        if(detailed)await reload(page);await main(page).click();
        if(detailed){await back(page).click();expect(await input(page).count()).toBe(0);await expect(main(page)).toHaveText('Next');await main(page).click();}
    }
}
const modes=[{name:'desktop',viewport:{width:1280,height:1000}},{name:'375px',viewport:{width:375,height:1000}},{name:'touch',viewport:{width:375,height:1000},hasTouch:true,isMobile:true}];
for(const mode of modes) test.describe(mode.name,()=>{
    test.use({viewport:mode.viewport,hasTouch:!!mode.hasTouch,isMobile:!!mode.isMobile});
    for(const site of ['', '/dist']) test(`${site||'PHP'}: full correct run, saved Learn, feedback, navigation and homepage`,async({page})=>{
        test.setTimeout(240_000);const errors=watchForErrors(page);
        await page.goto(`${site}/content/${slug}/`);const maximum=await page.evaluate(()=>Maths1to9Lesson.getScore().maximumPoints);
        await learn(page,mode.hasTouch,site==='');await cards(page,'interactive',6,site==='');await main(page).click();
        await cards(page,'question-bank',8,site==='');await main(page).click();await cards(page,'comparison',7,site==='');
        const progress=await page.evaluate(()=>Maths1to9Lesson.getProgress());expect(progress.score.points).toBe(maximum);expect(progress.scoreActivities.filter(a=>!a.completed)).toEqual([]);
        await expect(main(page)).toHaveText('All lessons');await main(page).click();await expect(page).toHaveURL(new RegExp(`${site}/$`));
        const algebra=page.locator('.lesson-category').filter({has:page.getByRole('heading',{name:'Algebra',exact:true})});
        const titles=(await algebra.locator('.lesson-card__title').allTextContents()).map(t=>t.trim());expect(titles[titles.indexOf('Finding the gradient')+1]).toBe('Gradient and intercept');
        await expect(algebra.locator(`a[href*="${slug}"]`)).toContainText('Read the gradient and y-intercept from an equation like y = 2x + 3.');
        const collections=await page.evaluate(async()=>await(await fetch('./content/collections.json')).json());expect(collections.collections.find(c=>c.id==='graphs').lessons).toContain(slug);
        expect(errors).toEqual([]);
    });
    test('wrong then right keeps the right field; Practise again twice keeps the score',async({page})=>{
        test.setTimeout(240_000);const errors=watchForErrors(page);await page.goto(`/content/${slug}/`);await learn(page,mode.hasTouch);await cards(page,'interactive',6);await main(page).click();
        await cards(page,'question-bank',8,false,true);const before=await page.evaluate(()=>Maths1to9Lesson.getScore());
        for(let session=0;session<2;session++) {await page.getByRole('button',{name:'Practise again',exact:true}).click();await cards(page,'question-bank',8);await reload(page);expect(await page.evaluate(()=>Maths1to9Lesson.getScore())).toEqual(before);}
        expect((await state(page,'question-bank')).earlier.length).toBe(2);
        await main(page).click();const question=await definition(page,'comparison');
        const wrong=question.options.find(option=>!option.correct);
        await page.getByRole('button',{name:wrong.label,exact:true}).click();await main(page).click();await reload(page);
        await expect(page.locator('.question-feedback:visible')).toHaveText(wrong.feedback);await expect(main(page)).toHaveText('Try again');
        await main(page).click();await fillCorrect(page,question);await main(page).click();await reload(page);await main(page).click();
        await back(page).click();expect(await input(page).count()).toBe(0);await reload(page);await main(page).click();
        await cards(page,'comparison',6);await reload(page);await expect(main(page)).toHaveText('All lessons');
        expect(errors).toEqual([]);
    });
});

test('every reading rule and every wrong choice shows its own feedback through the shared card',async({page})=>{
    test.setTimeout(120_000);const errors=watchForErrors(page);await page.goto(`/content/${slug}/`);await board(page).waitFor();
    const results=await page.evaluate(()=>{
        const E=GradientIntercept, engine=Maths1to9LessonEngine;
        const host=document.createElement('div');document.body.append(host);
        let action;let serial=0;const feedback=[];
        const section={state:{cards:{}},update(change){change(this.state);}};
        const api={setSectionAction(id,next){action=next;},clearSectionAction(){},recordAssessment(){throw new Error('Feedback review must not score');}};
        function render(config){return engine.createQuestion(host,{...config,scored:false,sectionId:'feedback-review',questionId:`review-${++serial}`},section,api);}
        function type(values){[...host.querySelectorAll('input')].forEach((input,index)=>{input.value=Array.isArray(values)?values[index]:values;input.dispatchEvent(new Event('input',{bubbles:true}));});}
        const definitions=[...E.examples,...E.checks];
        for(const type of E.choiceTypes)for(let seed=0;seed<20;seed++)definitions.push(E.generate({type,seed},engine.seededRandom(seed)));
        for(const definition of definitions){
            if(definition.input==='choice')for(const option of definition.options.filter(option=>!option.correct)){
                const card=render(definition);const buttons=[...host.querySelectorAll('button')];buttons[definition.options.indexOf(option)].click();action.onClick();
                feedback.push({expected:option.feedback,actual:host.querySelector('.question-feedback').textContent,correct:card.result().correct});
            }
            else if(!definition.fields)for(const rule of definition.rules||[]){const card=render(definition);type(rule.value);action.onClick();feedback.push({expected:rule.feedback,actual:host.querySelector('.question-feedback').textContent,correct:card.result().correct});}
        }
        for(const [m,c] of [[-1,6],[1,-5],[6,0],[-4,-7],[5,3]])for(const rule of E.readingRules(m,c)){
            const value={m:rule.value.m??String(m+20),c:rule.value.c??String(c+20)};
            // For c = 0, the first partial rule intentionally catches swapped values too.
            const first=E.readingRules(m,c).find(candidate=>Object.entries(candidate.value).every(([id,expected])=>Number(value[id])===Number(expected)));
            const card=render(E.typed(m,c));type([value.m,value.c]);action.onClick();
            feedback.push({expected:first.feedback,actual:host.querySelector('.question-feedback').textContent,correct:card.result().correct});
        }
        host.remove();return feedback;
    });
    expect(results.length).toBeGreaterThan(200);
    for(const result of results){expect(result.actual).toBe(result.expected);expect(result.correct).toBe(false);}
    expect(errors).toEqual([]);
});
