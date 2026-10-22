const { test, expect } = require('@playwright/test');
const { watchForErrors } = require('./helpers.cjs');

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

test('subdivided y axis accepts odd values by touch and keyboard', async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto('/content/drawing-quadratic-graphs/');
    await page.locator('.maths-graph__board').first().waitFor();
    await page.evaluate(() => {
        const host = document.createElement('div');
        host.id = 'subdivide-review';
        host.style.cssText = 'width:299px;margin:auto';
        document.body.prepend(host);
        const graph = window.Maths1to9Graph.create(host, {
            x: [-3, 3], y: [-10, 10], step: { x: 1, y: 2 },
            subdivide: { x: 1, y: 2 }, label: 'Subdivided coordinate grid'
        });
        graph.pick({ onPick: value => { window.picked = value; } });
    });
    const surface = page.locator('#subdivide-review .maths-graph__board');
    const target = await surface.evaluate(element => {
        const board = Object.values(window.JXG.boards).find(board => board.containerObj === element);
        const rect = element.getBoundingClientRect();
        return { x: rect.left + board.origin.scrCoords[1] + board.unitX,
            y: rect.top + board.origin.scrCoords[2] - 9 * board.unitY };
    });
    await page.touchscreen.tap(target.x, target.y);
    await expect.poll(() => page.evaluate(() => window.picked)).toEqual([1, 9]);
    await surface.focus();
    // Keyboard picking starts at the origin; each Up/Down is one minor step.
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.picked)).toEqual([0, -7]);
    const grid = await surface.evaluate(element => {
        const board = Object.values(window.JXG.boards).find(board => board.containerObj === element);
        return {
            minors: Object.values(board.objects).filter(object => object.elType === 'segment' &&
                object.visProp.strokeopacity === 0.35).length,
            labels: [...element.querySelectorAll('.maths-graph__label')].map(label => label.textContent)
        };
    });
    expect(grid.minors).toBe(10);
    expect(grid.labels).not.toContain('9');
    expect(grid.labels).not.toContain('−7');
    expect(errors).toEqual([]);
});
