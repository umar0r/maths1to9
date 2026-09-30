const {test,expect}=require('@playwright/test');
test('decimal addition journey, retry, scoring and four anchors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/content/adding-decimal-numbers/');
 const next=()=>page.getByRole('button',{name:'Continue',exact:true}).click();
 const left=()=>page.getByRole('button',{name:'Move second number left'}).click();
 await expect(page.locator('.rounding-score')).toContainText('0');
 await expect(page.locator('nav a')).toHaveCount(4);
 await next();await left();await next();
 await page.locator('#guided-input').fill('0');await next();
 for(const digit of ['5','7','0','1']){await page.locator('#guided-input').fill(digit);await next();}
 await page.locator('#guided-input').selectOption('aligned');await next();await next();
 await left();await next();
 for(const digit of ['5','8','4']){await page.locator('#guided-input').fill(digit);await next();}
 await next();
 for(const [i,v] of [[2,'16.78'],[3,'3.55'],[4,'11.24'],[5,'9.150']]){
 await left();await page.locator(`#value-${i}`).fill(v);await next();await expect(page.locator('.rounding-note')).toContainText('Correct');await next();}
 await expect(page).toHaveURL(/#check$/);
 await expect(page.locator('#reason-review')).toHaveCount(0);
 for(const [i,v] of [[6,'6.14'],[7,'2.55']]){await page.locator(`[data-move="${i},-1"]`).click();await page.locator(`#value-${i}`).fill(v);}
 await page.locator('#reason').fill('8 is tenths and 4 is hundredths. Line up decimal points so equal place values are added.');await next();
 await page.locator('#reason-review').check();await next();
 await expect(page.locator('#result')).toContainText('You’re ready');
 await expect(page.locator('.rounding-score')).toContainText('85');
 await page.reload();await expect(page.locator('#result')).toContainText('You’re ready');
 await page.locator('nav a[href="#practice"]').click();
 await expect(page.locator('#value-5')).toBeEnabled();
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('mobile keyboard alignment and supported feedback',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/content/adding-decimal-numbers/#practice');
 await page.locator('#value-2').fill('16.78');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('#feedback')).toContainText('decimal points');
 await page.locator('.movable').focus();await page.keyboard.press('ArrowLeft');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('.rounding-note')).toContainText('Correct');
 await expect(page.locator('.rounding-score')).toContainText('5');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/decimal-addition-mobile.png',fullPage:true});
});
test('final check withholds answers and allows a corrected retry',async({page})=>{
 await page.goto('/content/adding-decimal-numbers/#check');
 for(const i of [6,7])await page.locator(`#value-${i}`).fill('1');
 await page.locator('#reason').fill('Line up the last digits.');
 await expect(page.locator('.lesson-section')).not.toContainText('6.14');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('#result')).toContainText('Practise once more');
 await page.locator('#retry-check').click();
 for(const [i,v] of [[6,'6.14'],[7,'2.55']]){await page.locator(`[data-move="${i},-1"]`).click();await page.locator(`#value-${i}`).fill(v);}
 await page.locator('#reason').fill('8 is tenths, 4 is hundredths. Line up decimal points.');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#reason-review').check();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('#result')).toContainText('You’re ready');await expect(page.locator('.rounding-score')).toContainText('15');
});
