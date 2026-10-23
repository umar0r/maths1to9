const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors, screen, checkScreen } = require('./helpers.cjs');
const solve = require('./solvers/drawing-reciprocal-graphs.cjs');
const { read, tapPoint } = solve;
const slug = 'drawing-reciprocal-graphs';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const root = page => page.locator('.lesson-section:visible');
async function ready(page) {
    await page.waitForFunction(() => window.Reciprocals && window.Maths1to9Lesson);
    await root(page).locator('h3').first().waitFor();
}
async function step(page) { if (!await solve(page)) await main(page).click(); }
async function until(page, hash) {
    for (let i = 0; i < 200 && !page.url().endsWith(hash); i++) await step(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
}
async function reload(page) {
    const hash = new URL(page.url()).hash, label = await main(page).textContent();
    await page.reload(); await ready(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(main(page)).toHaveText(label);
}
async function tableFit(page) {
    await page.evaluate(() => document.fonts.ready);
    const sizes = await root(page).locator('.reciprocal-cell').evaluateAll(inputs => inputs.map(input => {
        const style = getComputedStyle(input), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        ctx.font = style.font;
        return { width: input.clientWidth, need: ctx.measureText(input.value).width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
            left: input.getBoundingClientRect().left, right: input.getBoundingClientRect().right, value: input.value };
    }));
    expect(sizes).toHaveLength(6);
    for (const size of sizes) {
        expect(size.left).toBeGreaterThanOrEqual(0); expect(size.right).toBeLessThanOrEqual(375);
        expect(size.need, size.value).toBeLessThanOrEqual(size.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function clearLabels(page) {
    const collisions = await root(page).locator('.maths-graph__board').evaluateAll(elements => elements.flatMap(element => {
        const board = Object.values(JXG.boards).find(board => board.containerObj === element), box = element.getBoundingClientRect();
        const labels = [...element.querySelectorAll('.maths-graph__label')];
        const curves = Object.values(board.objects).filter(o => o.visProp.curvetype === 'functiongraph' && typeof o.minX === 'function' && typeof o.maxX === 'function' && typeof o.Y === 'function');
        return labels.filter(label => /^\(/.test(label.textContent)).flatMap(label => {
            const r = label.getBoundingClientRect(), issues = [];
            const axisX=box.left+board.origin.scrCoords[1],axisY=box.top+board.origin.scrCoords[2];
            if(r.left<axisX+2&&r.right>axisX-2||r.top<axisY+2&&r.bottom>axisY-2)issues.push(label.textContent+' touches axis');
            const hits = (x,y,pad=2) => x > r.left-pad && x < r.right+pad && y > r.top-pad && y < r.bottom+pad;
            for (const curve of curves) for (let i=0;i<=1000;i++) {
                const x=curve.minX()+(curve.maxX()-curve.minX())*i/1000, y=curve.Y(x);
                if(hits(box.left+board.origin.scrCoords[1]+x*board.unitX,box.top+board.origin.scrCoords[2]-y*board.unitY)) {
                    issues.push(label.textContent+' touches curve'); break;
                }
            }
            for(const number of labels.filter(l=>l.classList.contains('maths-graph__axis-number'))) {
                const b=number.getBoundingClientRect();
                if(r.left<b.right+2&&r.right>b.left-2&&r.top<b.bottom+2&&r.bottom>b.top-2) issues.push(label.textContent+' touches '+number.textContent);
            }
            return issues;
        });
    }));
    expect(collisions).toEqual([]);
}
async function checkCurves(page, expected) {
    const plots=await root(page).locator('.maths-graph__board').evaluateAll(elements=>elements.flatMap(element=>{
        const board=Object.values(JXG.boards).find(b=>b.containerObj===element);
        return Object.values(board.objects).filter(o=>o.visProp.curvetype==='functiongraph'&&typeof o.minX==='function'&&typeof o.Y==='function')
            .map(curve=>({domain:[curve.minX(),curve.maxX()],ys:Array.from({length:101},(_,i)=>curve.Y(curve.minX()+(curve.maxX()-curve.minX())*i/100))}));
    }));
    if(expected!==undefined)expect(plots).toHaveLength(expected);
    for(const plot of plots){
        expect(plot.domain[0]*plot.domain[1]).toBeGreaterThan(0);
        expect(plot.domain.every(x=>Math.abs(x)<=4)).toBe(true);
        expect(plot.ys.every(y=>Math.abs(y)<=4+1e-10)).toBe(true);
    }
}
test.describe('reciprocal early phone gates', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    test('drawing-reciprocal-graphs early six-box fit and Learn pictures', async ({page}) => {
        test.setTimeout(120000);
        const errors=watchForErrors(page);
        await page.goto('/content/'+slug+'/'); await ready(page);
        for(let i=1;i<=7;i++) {
            await expect(main(page)).toBeEnabled();
            await expect(root(page).locator('.reciprocal-learn button')).toHaveCount(0);
            await page.waitForTimeout(3600);
            await checkCurves(page,i===1?2:undefined);
            await page.screenshot({path:'/tmp/reciprocal-learn-'+i+'.png',fullPage:true});
            await clearLabels(page);
            if(i<7)await main(page).click();
        }
        await until(page,'#try-it-2'); await solve(page); await tableFit(page);
        await page.screenshot({path:'/tmp/reciprocal-try-table.png',fullPage:true});
        await until(page,'#check-1'); await solve(page); await tableFit(page);
        await expect(root(page).locator('.reciprocal-cell').first()).toHaveValue('−0.25');
        await page.screenshot({path:'/tmp/reciprocal-check-table.png',fullPage:true});
        expect(errors).toEqual([]);
    });
});

for (const site of ['', '/dist']) for (const phone of [false, true]) test.describe(`reciprocal ${site || 'PHP'} ${phone ? '375px touch' : 'desktop'}`, () => {
    test.use({ viewport: { width: phone ? 375 : 1280, height: phone ? 812 : 800 }, hasTouch: phone, isMobile: phone });
    test('drawing-reciprocal-graphs full correct run, every section reload and homepage', async ({ page }) => {
        test.setTimeout(180000);
        const errors = watchForErrors(page);
        await page.goto(`${site}/content/${slug}/`); await ready(page);
        let points = 0, prior = '';
        for (let i = 0; i < 220; i++) {
            points = checkScreen(await screen(page), points);
            const hash = new URL(page.url()).hash, data = await read(page);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (data.id === 'explanation') {
                const layout = root(page).locator('.reciprocal-layout');
                if (!phone && hash === '#learn-1') {
                    const figure = await layout.locator('.reciprocal-figure').boundingBox();
                    const notes = await layout.locator('.reciprocal-notes').boundingBox();
                    expect(figure.x + figure.width).toBeLessThan(notes.x);
                    await page.screenshot({ path: `/tmp/reciprocal-desktop${site ? '-dist' : ''}.png`, fullPage: true });
                }
                await expect(root(page).locator('.reciprocal-learn button')).toHaveCount(0);
                await expect(main(page)).toBeEnabled();
            }
            expect(await root(page).locator('.maths-graph__label').filter({ hasText: /^\(/ }).count()).toBeLessThanOrEqual(1);
            if (hash !== prior) {
                await reload(page);
                await clearLabels(page); await checkCurves(page);
                if (await page.getByRole('button', { name: 'Previous screen', exact: true }).isVisible()) {
                    await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
                    await main(page).click(); await expect(page).toHaveURL(new RegExp(`${hash}$`));
                }
                prior = hash;
            }
            if ((await main(page).textContent()).trim() === 'All lessons') break;
            await step(page);
        }
        await expect(main(page)).toHaveText('All lessons');
        const score = await page.evaluate(() => Maths1to9Lesson.getScore());
        expect(score.points).toBe(score.maximumPoints);
        await reload(page); await main(page).click();
        await expect(page).toHaveURL(new RegExp(`${site}/$`));
        const titles = await page.locator('.lesson-card__title').allTextContents();
        expect(titles.map(t => t.trim())).toContain('Drawing reciprocal graphs');
        expect(titles.findIndex(t => t.trim() === 'Drawing reciprocal graphs')).toBe(titles.findIndex(t => t.trim() === 'Drawing cubic graphs') + 1);
        expect(titles.map(t => t.trim())).toContain('Recognising graph types');
        expect(titles.findIndex(t => t.trim() === 'Recognising graph types')).toBe(titles.findIndex(t => t.trim() === 'Drawing reciprocal graphs') + 1);
        expect(titles.findIndex(t => t.trim() === 'Drawing cubic graphs')).toBeGreaterThan(titles.findIndex(t => t.trim() === 'Finding the turning point'));
        expect(errors).toEqual([]);
    });
});

test.describe('reciprocal phone details', () => {
    test.use({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
    test('drawing-reciprocal-graphs moving labels clear every stop and reduced motion finishes instantly', async ({page}) => {
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.goto('/content/'+slug+'/');await ready(page);
        for(let i=0;i<5;i++)await main(page).click();
        await expect(root(page).locator('.reciprocal-right')).toHaveText('✓ Two separate smooth curves.');
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.clock.install();await main(page).click();
        const labels=['(0.5, 2)','(1, 1)','(2, 0.5)','(4, 0.25)'];
        for(let i=0;i<4;i++){
            if(i)await page.clock.runFor(700);
            await expect(root(page).locator('.maths-graph__label').filter({hasText:/^\(/})).toHaveText(labels[i]);
            await page.screenshot({path:'/tmp/reciprocal-moving-'+(i+1)+'.png',fullPage:true});
            await clearLabels(page);
        }
        await reload(page);
        await expect(root(page).locator('.reciprocal-steps')).toHaveText('1 ÷ 4 = 0.25');
        await page.getByRole('button',{name:'Previous screen',exact:true}).click();
        await expect(root(page).locator('.reciprocal-right')).toHaveText('✓ Two separate smooth curves.');
    });

    test('drawing-reciprocal-graphs wrong taps, guides, half keyboard point and four joins', async ({page}) => {
        test.setTimeout(120000);
        const errors=watchForErrors(page);
        await page.goto('/content/'+slug+'/');await ready(page);await until(page,'#try-it-3');
        const dashed=()=>root(page).locator('svg [stroke-dasharray]');
        for(const [point,message] of [
            [[-0.5,-2],'Go across first'],[[2,-0.5],'Check the x sign.'],
            [[-2,0.5],'Check the y sign.'],[[-2,0],'Each faint line is a half.'],[[3,4],'Start at (0, 0).']
        ]){
            await tapPoint(page,point);
            await expect(root(page).locator('.maths-graph__description')).toContainText(message);
            expect(await dashed().count()).toBeGreaterThan(0);
        }
        await tapPoint(page,[-2,-0.5]);await tapPoint(page,[-1,-1]);await reload(page);
        expect((await read(page)).s.plotted).toEqual([[-2,-0.5],[-1,-1]]);
        const board=root(page).locator('[role="application"]');
        await board.press('ArrowLeft');
        for(let i=0;i<4;i++)await board.press('ArrowDown');
        await board.press('Enter');
        expect((await read(page)).s.plotted).toHaveLength(3);
        for(const p of [[0.5,2],[1,1],[2,0.5]])await tapPoint(page,p);
        await until(page,'#try-it-4');
        for(const [label,message] of [
            ['One curve, joined across the middle',"There's no point where"],
            ['Straight lines, dot to dot',"The graph doesn't have corners,"],
            ['Curves that touch the axes','The curves get closer to the axes']
        ]){
            await root(page).getByRole('button',{name:label,exact:true}).tap();
            await expect(root(page).locator('.question-feedback')).toContainText(message);
            await expect(root(page).getByRole('button',{name:label,exact:true})).toHaveClass(/is-selected is-incorrect/);
            await page.screenshot({path:'/tmp/reciprocal-join-'+label.split(',')[0].replaceAll(' ','-')+'.png',fullPage:true});
        }
        await reload(page);
        expect((await read(page)).s.joined).toBe(false);
        await expect(root(page).locator('.question-feedback')).toBeEmpty();
        await root(page).getByRole('button',{name:'Two separate smooth curves',exact:true}).tap();
        await reload(page);
        await expect(root(page).getByRole('button',{name:'Two separate smooth curves',exact:true})).toBeDisabled();
        await expect(root(page).locator('.question-feedback.is-correct')).toHaveCount(1);
        expect(errors).toEqual([]);
    });
});

test('drawing-reciprocal-graphs retained boxes, Practice retry and two extra sessions preserve points', async ({page}) => {
    test.setTimeout(180000);
    const errors=watchForErrors(page);
    await page.goto('/content/'+slug+'/');await ready(page);await until(page,'#try-it-2');
    const cells=root(page).locator('.reciprocal-cell');
    for(const [i,value] of ['-0.5','-1','-2','99','1','0.5'].entries())await cells.nth(i).fill(value);
    await main(page).click();await reload(page);
    await expect(root(page).locator('.question-feedback')).toContainText('One box is wrong');
    await main(page).click();
    await expect(cells.first()).toHaveValue('−0.5');
    await expect(cells.nth(3)).toHaveValue('');
    await solve(page);await until(page,'#question-bank-question-1');
    for(let i=0;i<30;i++){
        const {q}=await read(page);
        if(q?.input==='custom'&&q.widget?.kind!=='table')break;
        await step(page);
    }
    await tapPoint(page,[0,0]);await reload(page);await main(page).click();
    await expect(main(page)).toHaveText('Try again');await reload(page);
    expect(await root(page).locator('svg [stroke-dasharray]').count()).toBeGreaterThan(0);
    await main(page).click();await solve(page);await reload(page);
    await until(page,'#summary');
    const score=await page.evaluate(()=>Maths1to9Lesson.getScore());
    await page.getByRole('button',{name:/^Practice,/}).click();
    for(let session=2;session<=3;session++){
        await page.getByRole('button',{name:'Practise again',exact:true}).click();
        await reload(page);await until(page,'#question-bank-question-7');
        expect(await page.evaluate(()=>Maths1to9Lesson.getScore())).toEqual(score);
    }
    await reload(page);
    expect((await read(page)).s.session).toBe(3);
    expect((await read(page)).s.earlier).toHaveLength(2);
    expect(errors).toEqual([]);
});
test('drawing-reciprocal-graphs every wrong option and number rule shows its own feedback once', async ({ page }) => {
    await page.goto(`/content/${slug}/`); await ready(page);
    const errors = watchForErrors(page);
    const outcomes = await page.evaluate(() => {
        const Q = Reciprocals, E = Maths1to9LessonEngine, host = document.createElement('div');
        document.body.append(host);
        const section = { state: { cards: {} }, update(change) { change(this.state); } };
        let action, serial = 0;
        const api = { setSectionAction(id, next) { action = next; }, clearSectionAction() {}, recordAssessment() { throw new Error('Unscored fixture'); } };
        const render = config => E.createQuestion(host, { ...config, scored: false, sectionId: 'feedback-review', questionId: `feedback-${++serial}` }, section, api);
        const definitions = [...Q.examples.filter(Boolean), ...Q.checks];
        for (let seed = 0; seed < 20; seed++) for (const type of [...Q.typedTypes, ...Q.choiceTypes]) definitions.push(Q.generate({ type }, E.seededRandom(seed)));
        for (const k of [1, 2]) for (const x of [-4, -2, -1, -0.5, 0.5, 1, 2, 4]) definitions.push(Q.prepare(Q.valueCard(k, x)));
        const results = [];
        for (const definition of definitions) {
            if (definition.input === 'custom') continue;
            if (definition.options) for (let i = 0; i < definition.options.length; i++) {
                const option = definition.options[i]; if (option.correct) continue;
                const card = render(definition);
                host.querySelectorAll('button')[i].click(); action.onClick();
                results.push({ expected: option.feedback, actual: host.querySelector('.question-feedback').textContent,
                    correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
            } else for (const rule of definition.rules) {
                const card = render(definition), input = host.querySelector('input');
                input.value = String(rule.value); input.dispatchEvent(new Event('input', { bubbles: true })); action.onClick();
                results.push({ expected: rule.feedback, actual: host.querySelector('.question-feedback').textContent,
                    correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
            }
        }
        const form = 1;
        const right = Object.fromEntries(Q.xs.map(x => ['x'+x, String(1/x)]));
        const tables = [
            Object.fromEntries(Q.xs.map(x => ['x'+x, String(x)])),
            Object.fromEntries(Q.xs.map(x => ['x'+x, String(Math.abs(1/x))])),
            ...Q.xs.map(x => ({...right,['x'+x]:'99'})),
            Object.fromEntries(Q.xs.map(x => ['x'+x, '99']))
        ];
        for (const values of tables) {
            const config = Q.tableCard(form), expected = config.widget.mark(values).feedback;
            const card = render(config);
            host.querySelectorAll('input').forEach((input, i) => {
                input.value = values[`x${Q.xs[i]}`]; input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            action.onClick();
            results.push({ expected, actual: host.querySelector('.question-feedback').textContent,
                correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
        }
        host.remove(); return results;
    });
    expect(outcomes.length).toBeGreaterThan(300);
    for (const outcome of outcomes) {
        expect(outcome.actual).toBe(outcome.expected);
        expect(outcome.correct).toBe(false);
        expect(outcome.boxes).toBe(1);
    }
    expect(errors).toEqual([]);
});

test.describe('reciprocal typed quarter points', () => {
    test.use({viewport:{width:375,height:812},hasTouch:true,isMobile:true});
    test('drawing-reciprocal-graphs Check table shows six exact whole dots when wrong and right', async ({page}) => {
        test.setTimeout(120000);
        const errors=watchForErrors(page);
        await page.goto('/content/'+slug+'/');await ready(page);await until(page,'#check-1');
        const xs=[-4,-1,-0.25,0.25,1,4],wrong=[-0.5,-1,-3.5,4,1,0.25],right=[-0.25,-1,-4,4,1,0.25];
        async function dots(expected){
            const result=await root(page).locator('.maths-graph__board').evaluate(element=>{
                const board=Object.values(JXG.boards).find(b=>b.containerObj===element),bounds=element.getBoundingClientRect();
                return Object.values(board.objects).filter(o=>o.elType==='point'&&o.visProp.visible).map(point=>{
                    const dot=point.rendNode.getBoundingClientRect();
                    return {value:[point.X(),point.Y()],whole:dot.left>=bounds.left&&dot.right<=bounds.right&&dot.top>=bounds.top&&dot.bottom<=bounds.bottom};
                }).sort((a,b)=>a.value[0]-b.value[0]);
            });
            expect(result).toHaveLength(6);
            expect(result.map(dot=>dot.value)).toEqual(xs.map((x,i)=>[x,expected[i]]));
            expect(result.every(dot=>dot.whole)).toBe(true);
        }
        const inputs=root(page).locator('.reciprocal-cell');
        for(let i=0;i<6;i++)await inputs.nth(i).fill(String(wrong[i]));
        await dots(wrong);await main(page).click();
        await expect(main(page)).toHaveText('Try again');await dots(wrong);
        await page.screenshot({path:'/tmp/reciprocal-check-six-dots-wrong.png',fullPage:true});
        await main(page).click();await solve(page);await dots(right);
        await expect(main(page)).toHaveText('Continue');
        await page.screenshot({path:'/tmp/reciprocal-check-six-dots-right.png',fullPage:true});
        await tableFit(page);await reload(page);await dots(right);
        expect(errors).toEqual([]);
    });
});
