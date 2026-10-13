const { test, expect } = require('@playwright/test');
for (const mode of [
    { name: 'desktop', viewport: { width: 1280, height: 1000 } },
    { name: '375px', viewport: { width: 375, height: 1000 } },
    { name: 'touch', viewport: { width: 375, height: 1000 }, hasTouch: true, isMobile: true }
]) {
    test.describe(`shared results ${mode.name}`, () => {
        test.use({ viewport: mode.viewport, hasTouch: mode.hasTouch || false, isMobile: mode.isMobile || false });
        test('long chosen answers wrap, marks stay together and the following action works', async ({ page }) => {
            await page.goto('/content/horizontal-and-vertical-lines/');
            await page.locator('.maths-graph__board').first().waitFor();
            await page.evaluate(() => {
                const host = document.createElement('section');
                host.id = 'wrap-test';
                host.style.cssText = 'width:min(440px, calc(100vw - 32px));margin:auto';
                document.body.prepend(host);
                const rows = document.createElement('div');
                host.append(rows);
                window.Maths1to9LessonEngine.renderResults(rows, [{
                    prompt: 'What has Amir missed?',
                    answer: 'The line goes down, so the vertical change is −6. The gradient is −2.',
                    firstCorrect: false, correct: true
                }]);
                const button = document.createElement('button');
                button.textContent = 'Finish results check';
                button.className = 'button button--primary';
                button.onclick = () => { button.textContent = 'Results check complete'; };
                host.append(button);
            });
            const geometry = await page.locator('#wrap-test').evaluate(host => {
                const answer = host.querySelector('.retained-result__answer > span:first-child');
                const mark = host.querySelector('.retained-result__answer > span:nth-child(2)');
                const bounds = answer.getBoundingClientRect(), parent = host.getBoundingClientRect();
                return { answerRight: bounds.right, parentRight: parent.right,
                    height: bounds.height, lineHeight: parseFloat(getComputedStyle(answer).lineHeight),
                    markWhiteSpace: getComputedStyle(mark).whiteSpace, width: document.documentElement.scrollWidth };
            });
            expect(geometry.answerRight).toBeLessThanOrEqual(geometry.parentRight + 1);
            expect(geometry.height).toBeGreaterThan(geometry.lineHeight);
            expect(geometry.markWhiteSpace).toBe('nowrap');
            expect(geometry.width).toBeLessThanOrEqual(mode.viewport.width);
            const button = page.locator('#wrap-test button');
            if (mode.hasTouch) await button.tap();
            else await button.click();
            await expect(button).toHaveText('Results check complete');
        });
    });
}
