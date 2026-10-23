const { test, expect } = require('@playwright/test');
const { watchForErrors } = require('./helpers.cjs');
for (const phone of [false, true]) test.describe('graph types small graph gate ' + (phone ? 'phone touch' : 'desktop mouse'), () => {
    test.use({viewport:{width:phone?375:1280,height:phone?812:800},hasTouch:phone,isMobile:phone});
    test('recognising-graph-types small inert graphs route clicks and Tab to option buttons', async ({page}) => {
        const errors=watchForErrors(page);
        await page.goto('/content/drawing-reciprocal-graphs/');
        await page.addScriptTag({url:'/content/recognising-graph-types/graphtypes.js'});
        await page.addStyleTag({url:'/content/recognising-graph-types/lesson.css'});
        await page.evaluate(()=>{
            const Q=GraphTypes,group=Q.node('div','','graphtypes-grid');
            group.id='small-graph-gate';group.setAttribute('role','group');
            const section=Q.node('section','','lesson-section');
            section.style.cssText='width:343px;margin:16px auto;padding:20px;box-sizing:border-box';
            section.append(group);document.body.prepend(section);
            [{kind:'line',m:2,c:-1},{kind:'quadratic',c:-1},{kind:'cubic'},{kind:'reciprocal'}].forEach((form,index)=>{
                const button=Q.node('button','','button graphtypes-choice');
                button.type='button';button.setAttribute('aria-label','Graph '+String.fromCharCode(65+index)+': '+Q.shape(form));
                const host=Q.node('div');button.append(host,Q.node('span','Graph '+String.fromCharCode(65+index),'graphtypes-caption'));group.append(button);
                Q.drawForm(Q.graph(host,form,true),form);
                button.addEventListener('click',()=>button.dataset.pressed='true');
            });
        });
        await page.evaluate(()=>document.fonts.ready);
        const group=page.locator('#small-graph-gate'),buttons=group.getByRole('button');
        await expect(buttons).toHaveCount(4);
        await expect(group.getByRole('application')).toHaveCount(0);
        for(let i=0;i<4;i++){
            const board=buttons.nth(i).locator('.maths-graph__board');
            await board.scrollIntoViewIfNeeded();
            const bounds=await board.boundingBox();
            if(phone)await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
            else await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
            await expect(buttons.nth(i)).toHaveAttribute('data-pressed','true');
        }
        await buttons.first().focus();
        for(let i=1;i<4;i++){await page.keyboard.press('Tab');await expect(buttons.nth(i)).toBeFocused();}
        const dimensions=await buttons.evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect();return {left:r.left,top:item.offsetTop,width:r.width};}));
        expect(dimensions[0].top).toBe(dimensions[1].top);
        expect(dimensions[2].top).toBe(dimensions[3].top);
        expect(dimensions[2].top).toBeGreaterThan(dimensions[0].top);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        const cramped=await group.locator('.maths-graph__board').evaluateAll(boards=>boards.flatMap(board=>{
            const labels=[...board.querySelectorAll('.maths-graph__axis-number')];
            return labels.flatMap((label,i)=>labels.slice(i+1).filter(other=>{
                const a=label.getBoundingClientRect(),b=other.getBoundingClientRect();
                return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
            }).map(other=>label.textContent+' touches '+other.textContent));
        }));
        expect(cramped).toEqual([]);
        await page.mouse.move(0,0);
        await group.screenshot({animations:'disabled',path:'/tmp/graphtypes-small-gate-'+(phone?'375':'1280')+'.png'});
        expect(errors).toEqual([]);
    });
});

const {MAIN_ACTION,screen,checkScreen}=require('./helpers.cjs');
const solve=require('./solvers/recognising-graph-types.cjs');
const {read}=solve;
const slug='recognising-graph-types';
const root=page=>page.locator('.lesson-section:visible');
const main=page=>page.locator(MAIN_ACTION+':visible').first();
async function ready(page){
    await page.waitForFunction(()=>window.GraphTypes&&window.Maths1to9Lesson);
    await root(page).locator('h3').first().waitFor();
}
async function step(page){if(!await solve(page))await main(page).click();}
async function until(page,hash){
    for(let i=0;i<220&&!page.url().endsWith(hash);i++)await step(page);
    await expect(page).toHaveURL(new RegExp(hash+'$'));
}
async function reload(page){
    const hash=new URL(page.url()).hash,label=await main(page).textContent();
    await page.reload();await ready(page);
    await expect(page).toHaveURL(new RegExp(hash+'$'));await expect(main(page)).toHaveText(label);
}
async function shapesOnly(page){
    const names=await root(page).locator('.maths-graph__board').evaluateAll(boards=>boards.map(board=>board.getAttribute('aria-label')));
    expect(names.every(name=>!/y\s*=|x²|x³|\/x/.test(name))).toBe(true);
    const buttons=await root(page).locator('.graphtypes-choice').evaluateAll(items=>items.map(item=>item.getAttribute('aria-label')));
    expect(buttons.every(name=>/^Graph [A-D]: /.test(name)&&!/y\s*=|x²|x³|\/x/.test(name))).toBe(true);
}
async function clippedPlots(page){
    const plots=await root(page).locator('.maths-graph__board').evaluateAll(boards=>boards.flatMap(element=>{
        const board=Object.values(JXG.boards).find(board=>board.containerObj===element);
        return Object.values(board.objects).filter(o=>o.visProp.curvetype==='functiongraph').map(curve=>({
            domain:[curve.minX(),curve.maxX()],ys:Array.from({length:101},(_,i)=>curve.Y(curve.minX()+(curve.maxX()-curve.minX())*i/100))
        }));
    }));
    for(const plot of plots){
        expect(plot.domain.every(x=>Math.abs(x)<=4)).toBe(true);
        expect(plot.ys.every(y=>Math.abs(y)<=6+1e-10)).toBe(true);
    }
}
for(const site of ['', '/dist'])for(const phone of [false,true])test.describe('graph types full '+(site||'PHP')+' '+(phone?'phone':'desktop'),()=>{
    test.use({viewport:{width:phone?375:1280,height:phone?812:800},hasTouch:phone,isMobile:phone});
    test('recognising-graph-types full correct run, retained screens and homepage',async({page})=>{
        test.setTimeout(180000);
        const errors=watchForErrors(page);
        await page.goto(site+'/content/'+slug+'/');await ready(page);
        let points=0,prior='';
        for(let i=0;i<220;i++){
            points=checkScreen(await screen(page),points);
            const hash=new URL(page.url()).hash,data=await read(page);
            expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
            if(data.id==='explanation'){
                await expect(root(page).locator('.graphtypes-learn button')).toHaveCount(0);
                await expect(main(page)).toBeEnabled();
            }else await shapesOnly(page);
            if(hash!==prior){
                await reload(page);await clippedPlots(page);
                if(await page.getByRole('button',{name:'Previous screen',exact:true}).isVisible()){
                    await page.getByRole('button',{name:'Previous screen',exact:true}).click();
                    await main(page).click();await expect(page).toHaveURL(new RegExp(hash+'$'));
                }
                prior=hash;
            }
            if((await main(page).textContent()).trim()==='All lessons')break;
            await step(page);
        }
        await expect(main(page)).toHaveText('All lessons');
        const score=await page.evaluate(()=>Maths1to9Lesson.getScore());expect(score.points).toBe(score.maximumPoints);
        await reload(page);await main(page).click();await expect(page).toHaveURL(new RegExp(site+'/$'));
        const titles=(await page.locator('.lesson-card__title').allTextContents()).map(t=>t.trim());
        expect(titles).toContain('Recognising graph types');
        expect(titles.indexOf('Recognising graph types')).toBe(titles.indexOf('Drawing reciprocal graphs')+1);
        expect(errors).toEqual([]);
    });
});
test.describe('graph types teaching phone',()=>{
    test.use({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
    test('recognising-graph-types seven finished Learn pictures, immediate Next and reduced motion',async({page})=>{
        const errors=watchForErrors(page);
        await page.goto('/content/'+slug+'/');await ready(page);
        for(let i=1;i<=7;i++){
            await expect(main(page)).toBeEnabled();
            await expect(root(page).locator('.graphtypes-learn button')).toHaveCount(0);
            await page.waitForTimeout(1700);await clippedPlots(page);
            if(i===1){
                await expect(root(page).locator('.graphtypes-small')).toHaveCount(4);
                await expect(root(page).getByRole('application')).toHaveCount(0);
            }
            if(i===6)await expect(root(page).locator('mark')).toHaveText('x²');
            if(i===7){
                await expect(root(page).locator('.graphtypes-steps p')).toHaveText(['1. The shape: a stretched S.','2. A stretched S is a cubic: power 3.']);
                await expect(root(page).locator('.graphtypes-right')).toHaveText('y = 2x³ − 1 ✓');
                await expect(root(page).locator('.graphtypes-muted')).toHaveCount(3);
            }
            await page.screenshot({path:'/tmp/graphtypes-learn-'+i+'.png',fullPage:true});
            if(i<7)await main(page).click();
        }
        await reload(page);await expect(root(page).locator('.graphtypes-right')).toHaveCount(1);
        await page.evaluate(()=>localStorage.clear());await page.emulateMedia({reducedMotion:'reduce'});
        await page.goto('/content/'+slug+'/');await ready(page);
        for(let i=0;i<6;i++)await main(page).click();
        await expect(root(page).locator('.graphtypes-right')).toHaveCount(1);
        expect(errors).toEqual([]);
    });
});
for(const phone of [false,true])test.describe('graph types custom answers '+(phone?'touch':'mouse'),()=>{
    test.use({viewport:{width:phone?375:1280,height:phone?812:800},hasTouch:phone,isMobile:phone});
    test('recognising-graph-types graph choices keep selections and boards across wrong and correct updates',async({page})=>{
        test.setTimeout(120000);
        const errors=watchForErrors(page);
        await page.goto('/content/'+slug+'/');await ready(page);await until(page,'#try-it-5');
        await shapesOnly(page);
        const {q}=await read(page),group=root(page).getByRole('group',{name:'Choose a graph',exact:true}),buttons=group.getByRole('button');
        await expect(buttons).toHaveCount(4);await expect(group.getByRole('application')).toHaveCount(0);
        const names=await buttons.evaluateAll(items=>items.map(item=>item.getAttribute('aria-label')));
        await buttons.first().focus();
        for(let i=1;i<4;i++){await page.keyboard.press('Tab');await expect(buttons.nth(i)).toBeFocused();}
        async function pick(id){
            const button=group.locator('[data-option-id="'+id+'"]'),board=button.locator('.maths-graph__board');
            await board.scrollIntoViewIfNeeded();const box=await board.boundingBox();
            if(phone)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
            else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
            await expect(button).toHaveClass(/is-selected/);
        }
        for(const option of q.widget.options.filter(option=>!option.correct)){
            await pick(option.id);await reload(page);
            expect((await read(page)).s.cards['example-5'].value).toBe(option.id);
            expect(await buttons.evaluateAll(items=>items.map(item=>item.getAttribute('aria-label')))).toEqual(names);
            const ids=await group.locator('.maths-graph__board').evaluateAll(boards=>boards.map(board=>board.id));
            await main(page).click();
            await expect(root(page).locator('.question-feedback')).toHaveText(option.feedback);
            expect(await group.locator('.maths-graph__board').evaluateAll(boards=>boards.map(board=>board.id))).toEqual(ids);
            await main(page).click();
            expect(await group.locator('.maths-graph__board').evaluateAll(boards=>boards.map(board=>board.id))).toEqual(ids);
        }
        await pick(q.widget.correctId);await main(page).click();await reload(page);
        await expect(root(page).locator('.question-feedback.is-correct')).toHaveCount(1);
        await expect(group.locator('[data-option-id="'+q.widget.correctId+'"]')).toHaveClass(/is-correct/);
        await page.screenshot({path:'/tmp/graphtypes-choice-'+(phone?'375':'1280')+'.png',fullPage:true});
        expect(errors).toEqual([]);
    });
});
test('recognising-graph-types Practice graph retry, Check selection reload and two extra sessions keep points',async({page})=>{
    test.setTimeout(180000);
    const errors=watchForErrors(page);
    await page.goto('/content/'+slug+'/');await ready(page);await until(page,'#question-bank-question-1');
    for(let i=0;i<30;i++){if((await read(page)).q?.widget?.kind==='graph-choice')break;await step(page);}
    const {q}=await read(page),wrong=q.widget.options.find(option=>!option.correct);
    await root(page).locator('[data-option-id="'+wrong.id+'"]').click();await reload(page);await main(page).click();
    await expect(main(page)).toHaveText('Try again');await reload(page);
    await expect(root(page).locator('[data-option-id="'+wrong.id+'"]')).toHaveClass(/is-incorrect/);
    await main(page).click();await solve(page);await reload(page);
    await until(page,'#check-1');
    const check=(await read(page)).q;
    const chosen=root(page).locator('[data-option-id="'+check.widget.correctId+'"]');
    const letter=(await chosen.getAttribute('aria-label')).split(':')[0];
    await chosen.click();await reload(page);
    expect((await read(page)).s.cards['final-check-1'].value).toBe(check.widget.correctId);
    await main(page).click();await until(page,'#summary');
    await expect(root(page).locator('.retained-result__answer').first()).toContainText('You chose '+letter+'.');
    const score=await page.evaluate(()=>Maths1to9Lesson.getScore());
    await page.getByRole('button',{name:/^Practice,/}).click();
    for(let session=2;session<=3;session++){
        await page.getByRole('button',{name:'Practise again',exact:true}).click();await reload(page);
        await until(page,'#question-bank-question-7');
        expect(await page.evaluate(()=>Maths1to9Lesson.getScore())).toEqual(score);
    }
    await reload(page);expect((await read(page)).s.earlier).toHaveLength(2);expect((await read(page)).s.session).toBe(3);
    expect(errors).toEqual([]);
});

test('recognising-graph-types every wrong choice, graph option and power rule shows its own feedback once',async({page})=>{
    test.setTimeout(120000);
    const errors=watchForErrors(page);
    await page.goto('/content/'+slug+'/');await ready(page);
    const outcomes=await page.evaluate(async()=>{
        const Q=GraphTypes,E=Maths1to9LessonEngine,host=document.createElement('div');document.body.append(host);
        const section={state:{cards:{}},update(change){change(this.state);}};
        let action,serial=0;
        const api={setSectionAction(id,next){action=next;},clearSectionAction(){},recordAssessment(){throw new Error('Unscored fixture');}};
        const render=config=>E.createQuestion(host,{...config,figure:undefined,scored:false,sectionId:'feedback-review',questionId:'review-'+(++serial)},section,api);
        const definitions=[...Q.examples,...Q.checks,...Q.powerSums.map(Q.powerCard),...['line','quadratic','cubic'].map(kind=>Q.missingCard({kind,a:1,m:1,c:-1}))];
        for(let seed=0;seed<20;seed++)for(const type of ['power','missing-power','type-from-equation','type-from-graph','equation-from-graph'])definitions.push(Q.generate({type},E.seededRandom(Math.imul(seed+1,2654435761)>>>0)));
        for(const kind of Q.kinds){
            const forms=Q.formsFor(-1,2),right=forms.find(form=>form.kind===kind);
            definitions.push({input:'custom',prompt:'Choose a graph.',widget:Q.graphChoice(Q.graphOptions(forms,right))});
        }
        const outcomes=[];
        function save(card,expected){
            outcomes.push({expected:Q.prose(expected),actual:host.querySelector('.question-feedback').textContent,
                correct:card.result().correct,boxes:host.querySelectorAll('.question-feedback.is-visible').length});
        }
        for(const definition of definitions){
            if(definition.widget){
                for(const option of definition.widget.options.filter(option=>!option.correct)){
                    const card=render(definition);
                    host.querySelector('[data-option-id="'+option.id+'"]').click();action.onClick();save(card,option.feedback);
                    await Promise.resolve();
                }
            }else if(definition.options){
                for(let i=0;i<definition.options.length;i++){
                    const option=definition.options[i];if(option.correct)continue;
                    const card=render(definition);host.querySelectorAll('button')[i].click();action.onClick();save(card,option.feedback);
                    await Promise.resolve();
                }
            }else for(const rule of definition.rules){
                const card=render(definition),input=host.querySelector('input');
                input.value=rule.value;input.dispatchEvent(new Event('input',{bubbles:true}));action.onClick();save(card,rule.feedback);
                await Promise.resolve();
            }
        }
        host.remove();return outcomes;
    });
    expect(outcomes.length).toBeGreaterThan(250);
    for(const result of outcomes){
        expect(result.actual).toBe(result.expected);expect(result.correct).toBe(false);expect(result.boxes).toBe(1);
    }
    expect(errors).toEqual([]);
});
