const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors, screen, checkScreen } = require('./helpers.cjs');
const solve = require('./solvers/drawing-quadratic-graphs.cjs');
const { read, tapPoint } = solve;
const slug='drawing-quadratic-graphs';
const main=page=>page.locator(`${MAIN_ACTION}:visible`).first();
const root=page=>page.locator('.lesson-section:visible');
async function ready(page) { await page.waitForFunction(()=>window.Quadratics&&window.Maths1to9Lesson); await root(page).locator('h3').first().waitFor(); }
async function step(page) { if(!await solve(page))await main(page).click(); }
async function until(page,hash) { for(let i=0;i<180&&!page.url().endsWith(hash);i++)await step(page); await expect(page).toHaveURL(new RegExp(`${hash}$`)); }
async function reload(page) {const hash=new URL(page.url()).hash, label=await main(page).textContent();await page.reload();await ready(page);await expect(page).toHaveURL(new RegExp(`${hash}$`));await expect(main(page)).toHaveText(label);}
async function layout(page) {
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const data = await read(page);
    if (page.viewportSize().width === 375 && (page.url().endsWith('#learn-5') || page.url().endsWith('#try-it-3') || data.q?.input === 'custom')) {
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.evaluate(() => document.fonts.ready);
        await expect.poll(async () => { const box = await root(page).locator('.maths-graph__board').boundingBox(); return box.y + box.height; }).toBeLessThanOrEqual(812);
        const table = await root(page).locator('table').boundingBox();
        const board = await root(page).locator('.maths-graph__board').boundingBox();
        expect(table.y).toBeGreaterThanOrEqual(60);
        expect(board.y + board.height).toBeLessThanOrEqual(812);
    }
    for(const input of await root(page).locator('.question-card input').all()) {
        await expect(input).toHaveAttribute('inputmode','text');
        const box=await input.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width);
    }
}
for(const site of ['', '/dist'])for(const phone of [false,true])test.describe(`drawing-quadratic-graphs ${site||'PHP'} ${phone?'375px touch':'desktop'}`,()=>{
    test.use({viewport:{width:phone?375:1280,height:phone?812:1000},hasTouch:phone,isMobile:phone});
    test('full correct run, reloads, back and homepage',async({page})=>{
        test.setTimeout(180000);const errors=watchForErrors(page);await page.goto(`${site}/content/${slug}/`);await ready(page);
        let points=0,prior='';
        for(let i=0;i<200;i++) {
            points=checkScreen(await screen(page),points);
            const hash=new URL(page.url()).hash;
            const data = await read(page);
            const coordinateLabels = root(page).locator('.maths-graph__label').filter({hasText:/^\(/});
            expect(await coordinateLabels.count()).toBeLessThanOrEqual(1);
            if ((data.id === 'explanation' && ([5,6].includes(data.s.screen) || data.s.screen === 4 && data.s.plotted.length === 5)) ||
                (data.id === 'interactive' && data.s.screen >= 3) || (data.q?.input === 'custom' && (await main(page).textContent()).trim() === 'Continue')) {
                await expect(coordinateLabels).toHaveCount(0);
            }
            if (data.id === 'explanation' && data.s.screen === 2) {
                await expect(root(page).getByRole('button',{name:'y when x = 1',exact:true})).toHaveCount(0);
                await expect(root(page).getByRole('button',{name:'y when x = 2',exact:true})).toHaveCount(0);
                expect(await root(page).locator('p').filter({hasText:'Tap each empty box to work it out.'}).evaluate(p => Boolean(p.compareDocumentPosition(p.parentElement.querySelector('table')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
            }
            if (data.id === 'interactive' && data.s.screen >= 3 && data.s.joined) {
                await expect(root(page).locator('.question-feedback.is-correct').last()).toHaveText('✓ The graph goes through all five points and curves smoothly at the bottom.');
            }
            if (process.env.DEBUG_RUN) console.log(i,hash,await main(page).textContent(),(await read(page)).s?.screen);
            if(hash!==prior) {
                await reload(page);await layout(page);
                if(await page.getByRole('button',{name:'Previous screen',exact:true}).isVisible()) {
                    await page.getByRole('button',{name:'Previous screen',exact:true}).click();await main(page).click();await expect(page).toHaveURL(new RegExp(`${hash}$`));
                }
                prior=hash;
            }
            if((await main(page).textContent()).trim()==='All lessons')break;
            await step(page);
        }
        await expect(main(page)).toHaveText('All lessons');
        const score=await page.evaluate(()=>Maths1to9Lesson.getScore());expect(score.points).toBe(score.maximumPoints);
        await reload(page);await main(page).click();await expect(page).toHaveURL(new RegExp(`${site}/$`));
        await expect(page.locator('.lesson-card__title').filter({hasText:/^\s*Drawing quadratic graphs\s*$/})).toBeVisible();
        for(const title of ['Finding the turning point','Finding roots from a graph','Cubic and reciprocal graphs']) await expect(page.locator('.lesson-card__title').filter({hasText:new RegExp(`^\\s*${title}\\s*$`)})).toHaveCount(0);
        expect(errors).toEqual([]);
    });
});
test.describe('phone review fixes', () => {
    test.use({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
test('drawing-quadratic-graphs wrong Learn options, guides, saved points and all join pictures',async({page})=>{
    test.setTimeout(120000);const errors=watchForErrors(page);await page.goto(`/content/${slug}/`);await ready(page);await until(page,'#learn-2');
    await root(page).getByRole('button',{name:'−25',exact:true}).tap();await expect(root(page).locator('.question-feedback')).toContainText('A negative times a negative');await reload(page);
    await expect(root(page).getByRole('button',{name:'−25',exact:true})).toBeDisabled();
    for (const label of ['−10', '10']) {
        await root(page).getByRole('button',{name:label,exact:true}).tap();
        await expect(root(page).locator('.question-feedback.is-visible')).toHaveCount(1);
    }
    await root(page).getByRole('button',{name:'25',exact:true}).tap(); await reload(page);
    await until(page,'#learn-4');
    for (const label of ['1', '2']) await root(page).getByRole('button',{name:label,exact:true}).tap();
    await root(page).getByRole('button',{name:'0',exact:true}).tap();
    for (const label of ['1', '5']) await root(page).getByRole('button',{name:label,exact:true}).tap();
    await until(page,'#learn-5');
    for (const [point, message] of [
        [[3,-2], 'Go across first for x, then up or down for y.'],
        [[2,3], 'Check the x sign. Negative x is to the left of 0.'],
        [[-2,-3], 'Check the y sign. Negative y is below 0.'],
        [[4,5], 'Start at (0, 0). Go across to x = −2, then up to y = 3.']
    ]) {
        await tapPoint(page,point);
        await expect(root(page).locator('.maths-graph__description')).toHaveText(message);
    }
    const dashed=()=>root(page).locator('svg [stroke-dasharray]');expect(await dashed().count()).toBeGreaterThan(0);
    await tapPoint(page,[-2,3]);expect(await dashed().count()).toBe(0);await tapPoint(page,[-1,0]);await reload(page);expect((await read(page)).s.plotted).toEqual([[-2,3],[-1,0]]);
    await tapPoint(page,[0,1]);
    await expect(root(page).locator('.maths-graph__description')).toHaveText('Check the y sign. Negative y is below 0.');
    const board = root(page).locator('[role="application"]');
    await board.press('ArrowDown'); await board.press('Enter');
    await tapPoint(page,[3,4]);
    await expect(root(page).locator('.maths-graph__description')).toHaveText('Start at (0, 0). Go across to x = 1, then stay on the x-axis.');
    await board.press('ArrowRight'); await board.press('ArrowUp'); await board.press('Enter');
    await until(page,'#learn-6');
    for(const [label,text]of [['Straight lines, dot to dot',"The graph doesn't have corners"],['Flat across the bottom','Your curve misses (0, −1)']]) {
        await root(page).getByRole('button',{name:label,exact:true}).tap();await expect(root(page).locator('.question-feedback')).toContainText(text);
        await expect(root(page).locator('.maths-graph__label').filter({hasText:/^\(/})).toHaveCount(0);
        await page.screenshot({path:label.startsWith('Flat')?'/tmp/quadratic-flat-bottom.png':'/tmp/quadratic-straight-join.png',fullPage:true});
    }
    await root(page).getByRole('button',{name:'A smooth curve',exact:true}).tap();await reload(page);await expect(root(page).getByRole('button',{name:'A smooth curve',exact:true})).toBeDisabled();
    await expect(root(page).locator('.question-feedback.is-correct')).toHaveText('✓ Right. One smooth curve through every point.');
    await main(page).tap();
    await root(page).getByRole('button',{name:'Draw it',exact:true}).tap();
    await page.waitForFunction(() => Object.values(JXG.boards).some(board => Object.values(board.objects).filter(o => o.elType === 'point' && o.visProp.visible === true && [-2,-1,0,1,2].includes(o.X()) && o.Y() === 3 - o.X() ** 2).length === 5));
    await expect(root(page).locator('.maths-graph__label').filter({hasText:/^\(/})).toHaveCount(0);
    await page.screenshot({path:'/tmp/quadratic-fix-learn7-phone.png',fullPage:true});
    expect(errors).toEqual([]);
});

});
test('drawing-quadratic-graphs wrong Practice plot, reload phases and two more sessions preserve score',async({page})=>{
    test.setTimeout(180000);const errors=watchForErrors(page);await page.goto(`/content/${slug}/`);await ready(page);await until(page,'#try-it-1');
    await root(page).getByRole('textbox').fill('-6'); await main(page).click(); await reload(page);
    await main(page).click(); await root(page).getByRole('textbox').fill('2'); await main(page).click(); await reload(page);
    await main(page).click();
    await root(page).getByRole('textbox').first().fill('-1'); await reload(page);
    await expect(root(page).getByRole('textbox').first()).toHaveValue('-1');
    await until(page,'#question-bank-question-1');
    for(let i=0;i<30;i++){const data=await read(page);if(data.q?.input==='custom')break;await step(page);}
    const labels = () => root(page).locator('.maths-graph__label').filter({hasText:/^\(/});
    await expect(labels()).toHaveCount(0);
    await tapPoint(page,[4,6]); await expect(labels()).toHaveCount(1);
    await reload(page); await main(page).click(); await expect(main(page)).toHaveText('Try again');
    await expect(labels()).toHaveCount(1); await reload(page); await main(page).click();
    await expect(labels()).toHaveCount(0); await solve(page); await expect(labels()).toHaveCount(0); await reload(page);
    await until(page,'#question-bank-question-7');await main(page).click();await until(page,'#check-1');
    for (const input of await root(page).getByRole('textbox').all()) await input.fill('99');
    await main(page).click(); await reload(page); await main(page).click(); await solve(page); await reload(page);
    await until(page,'#summary');
    const score=await page.evaluate(()=>Maths1to9Lesson.getScore());
    await page.getByRole('button',{name:/^Practice,/}).click();
    for(let session=2;session<=3;session++) {
        await page.getByRole('button',{name:'Practise again',exact:true}).click();await reload(page);await until(page,'#question-bank-question-7');
        expect(await page.evaluate(()=>Maths1to9Lesson.getScore())).toEqual(score);
    }
    await reload(page);const state=(await read(page)).s;expect(state.session).toBe(3);expect(state.earlier).toHaveLength(2);expect(errors).toEqual([]);
});

test('drawing-quadratic-graphs every generated wrong option and typed feedback rule uses one feedback box',async({page})=>{
    await page.goto(`/content/${slug}/`);await ready(page);
    const errors=watchForErrors(page);
    const results=await page.evaluate(()=>{
        const Q=Quadratics,E=Maths1to9LessonEngine,host=document.createElement('div');document.body.append(host);
        const section={state:{cards:{}},update(change){change(this.state);}};
        let action,serial=0;
        const api={setSectionAction(id,next){action=next;},clearSectionAction(){},recordAssessment(){throw new Error('Unscored feedback check');}};
        const render=config=>E.createQuestion(host,{...config,scored:false,sectionId:'feedback-review',questionId:`feedback-${++serial}`},section,api);
        const definitions=[...Q.examples,...Q.checks];
        for(let seed=0;seed<20;seed++)for(const type of [...Q.typedTypes,...Q.choiceTypes])definitions.push(Q.generate({type,varied:seed%2===0},E.seededRandom(seed)));
        for(const a of [1,2,-1])for(const c of [-4,0,3])for(const x of [-3,-2,-1,0,1,2,3])definitions.push(Q.valueCard({a,c},x));
        const outcomes=[];
        for(const definition of definitions) {
            if(definition.input==='custom')continue;
            if(definition.options)for(let i=0;i<definition.options.length;i++) {
                const option=definition.options[i];if(option.correct)continue;
                const card=render(definition);host.querySelectorAll('button')[i].click();action.onClick();
                outcomes.push({expected:option.feedback,actual:host.querySelector('.question-feedback').textContent,correct:card.result().correct,boxes:host.querySelectorAll('.question-feedback.is-visible').length});
            }
            else for(const rule of definition.rules) {
                const values=definition.fields?definition.fields.map(f=>String(rule.value[f.id]??99)):[String(rule.value)];
                const first=definition.fields?definition.rules.find(r=>Object.entries(r.value).every(([id,v])=>Number(values[definition.fields.findIndex(f=>f.id===id)])===Number(v))):rule;
                const card=render(definition);host.querySelectorAll('input').forEach((input,i)=>{input.value=values[i];input.dispatchEvent(new Event('input',{bubbles:true}));});action.onClick();
                outcomes.push({expected:first.feedback,actual:host.querySelector('.question-feedback').textContent,correct:card.result().correct,boxes:host.querySelectorAll('.question-feedback.is-visible').length});
            }
        }
        host.remove();return outcomes;
    });
    expect(results.length).toBeGreaterThan(300);
    for(const result of results){expect(result.actual).toBe(result.expected);expect(result.correct).toBe(false);expect(result.boxes).toBe(1);}
    expect(errors).toEqual([]);
});

test('drawing-quadratic-graphs upgrades review saves without showing the old answer as the new question', async ({page}) => {
    await page.goto(`/content/${slug}/`); await ready(page); await until(page,'#learn-2');
    await read(page);
    await page.evaluate(async slug => {
        const saved = await Maths1to9Progress.getLessonActivityState(slug,'learn');
        saved.version = 1;
        saved.data.negativeChoice = {selected:0,rejected:[],correct:true};
        saved.data.filled = [-2,-1,0,1,2];
        saved.data.highlighted = 2;
        await Maths1to9Progress.saveLessonActivityState(slug,'learn',saved);
    },slug);
    await page.reload(); await ready(page);
    await expect(root(page).getByRole('button',{name:'25',exact:true})).toBeEnabled();
    await expect(main(page)).toBeDisabled();
    const state = (await read(page)).s;
    expect(state.negativeChoice.correct).toBe(false);
    expect(state.filled).toEqual([-2,-1,0]);
    expect(state.highlighted).toBe(null);
    expect(state.screen).toBe(1);
});
