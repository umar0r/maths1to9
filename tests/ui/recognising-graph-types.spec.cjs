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
