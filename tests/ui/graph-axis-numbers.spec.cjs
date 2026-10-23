const { test, expect } = require('@playwright/test');
const { watchForErrors } = require('./helpers.cjs');

for (const width of [375, 1280]) {
    test(`axis numbers stay above reciprocal curves and points at ${width}px`, async ({ page }) => {
        const errors = watchForErrors(page);
        await page.setViewportSize({ width, height: 812 });
        await page.goto('/content/drawing-cubic-graphs/');
        await page.locator('.maths-graph__board').first().waitFor();
        await page.evaluate(() => {
            const host = document.createElement('div');
            host.id = 'axis-number-review';
            host.style.cssText = 'max-width:440px;margin:auto;padding:16px';
            document.body.prepend(host);
            const graph = Maths1to9Graph.create(host, {
                x: [-4, 4], y: [-4, 4], step: { x: 1, y: 1 }, subdivide: { x: 2, y: 2 },
                label: 'Reciprocal curves and points crossing axis numbers'
            });
            graph.plot(x => 1 / x, { domain: [0.25, 4] });
            graph.plot(x => 1 / x, { domain: [-4, -0.25] });
            for (const x of [-2, -1, -0.5, 0.5, 1, 2]) graph.point([x, 1 / x], { size: 'large' });
        });
        await page.evaluate(() => document.fonts.ready);
        const result = await page.locator('#axis-number-review .maths-graph__board').evaluate(element => {
            const board = Object.values(JXG.boards).find(board => board.containerObj === element);
            const objects = Object.values(board.objects);
            const numbers = objects.filter(object => object.visProp.cssclass?.includes('maths-graph__axis-number'));
            const marks = objects.filter(object => object.elType === 'point' && object.visProp.visible || object.elType === 'functiongraph');
            return {
                numbers: numbers.map(number => ({ text: number.rendNode.textContent, layer: number.visProp.layer,
                    shadow: getComputedStyle(number.rendNode).textShadow })),
                markLayers: marks.map(mark => mark.visProp.layer),
                background: getComputedStyle(element).backgroundColor
            };
        });
        expect(result.numbers).toHaveLength(17);
        for (const number of result.numbers) {
            expect(number.layer).toBeGreaterThan(Math.max(...result.markLayers));
            expect(number.shadow).not.toBe('none');
            expect(number.shadow).toContain(result.background);
        }
        await page.locator('#axis-number-review').screenshot({ path: `/tmp/axis-numbers-${width}.png` });
        expect(errors).toEqual([]);
    });

    test(`axis-number halo preserves cubic and quadratic pictures at ${width}px`, async ({ page }) => {
        const errors = watchForErrors(page);
        await page.setViewportSize({ width, height: 812 });
        for (const [slug, label] of [['drawing-cubic-graphs', 'cubic'], ['drawing-quadratic-graphs', 'quadratic']]) {
            await page.goto(`/content/${slug}/`);
            const graph = page.locator('.maths-graph__board').first();
            await graph.waitFor(); await page.evaluate(() => document.fonts.ready);
            await expect(graph.locator('.maths-graph__axis-number')).not.toHaveCount(0);
            await graph.screenshot({ path: `/tmp/axis-halo-${label}-${width}.png` });
        }
        expect(errors).toEqual([]);
    });
}
