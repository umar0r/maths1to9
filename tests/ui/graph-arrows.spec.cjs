const { test, expect } = require('@playwright/test');
const { watchForErrors } = require('./helpers.cjs');

async function setup(page) {
    await page.goto('/content/horizontal-and-vertical-lines/');
    await page.locator('.maths-graph__board').first().waitFor();
    await page.evaluate(() => {
        const panel = document.createElement('section');
        panel.id = 'arrow-review';
        panel.style.cssText = 'padding:16px;max-width:960px;margin:auto;background:var(--surface)';
        document.body.prepend(panel);
        function graph(id, title) {
            const heading = document.createElement('h2');
            heading.textContent = title;
            const host = document.createElement('div');
            host.id = id;
            panel.append(heading, host);
            return window.Maths1to9Graph.create(host);
        }
        const heads = graph('arrow-heads', 'Small arrowheads, clear marked points');
        // Both creation orders must keep the marked point above the arrow.
        heads.point([-2, 3], { size: 'large', coordinates: true });
        heads.arrow([-3, 3], [-2, 3], { tone: 'ink', label: '1 right' });
        heads.arrow([-3, -3], [3, -3], { tone: 'ink', label: '6 right' });
        heads.point([3, -3], { size: 'large', coordinates: true });
        const labels = graph('arrow-labels', 'Labels clear of axis numbers');
        labels.line({ m: 2, c: -1 });
        labels.point([-2, -5], { size: 'large', coordinates: true });
        labels.point([-1, -3], { size: 'large', coordinates: true });
        const across = labels.arrow([-2, -5], [-1, -5], { tone: 'ink', label: '1 right' });
        const up = labels.arrow([-1, -5], [-1, -3], { tone: 'ink', label: '2 up' });
        window.arrowReview = { across, up };
    });
    await page.evaluate(() => document.fonts.ready);
}

for (const width of [1280, 375]) {
    test(`${width}px arrows: compact heads and large endpoints above arrows`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const errors = watchForErrors(page);
        await setup(page);
        const geometry = await page.locator('#arrow-heads .maths-graph__board').evaluate(element => {
            const board = Object.values(window.JXG.boards).find(board => board.containerObj === element);
            return Object.values(board.objects).filter(object => object.visProp.lastarrow &&
                object.visProp.strokewidth === 3).map(arrow => {
                const end = Object.values(board.objects).find(object => object.elType === 'point' &&
                    object.visProp.visible && object.X() === arrow.point2.X() && object.Y() === arrow.point2.Y());
                return {
                    size: arrow.visProp.lastarrow.size,
                    headLength: arrow.visProp.lastarrow.size * arrow.visProp.strokewidth,
                    lineLength: Math.hypot(arrow.point2.X() - arrow.point1.X(),
                        arrow.point2.Y() - arrow.point1.Y()) * board.unitX,
                    arrowLayer: arrow.visProp.layer, pointLayer: end.visProp.layer,
                    pointPaintedLast: Boolean(end.rendNode.compareDocumentPosition(arrow.rendNode) & Node.DOCUMENT_POSITION_PRECEDING)
                };
            });
        });
        expect(geometry).toHaveLength(2);
        for (const arrow of geometry) {
            expect(arrow.size).toBe(3); // JSXGraph's previous default was 6.
            expect(arrow.headLength).toBeLessThan(arrow.lineLength / 2);
            expect(arrow.pointLayer).toBeGreaterThan(arrow.arrowLayer);
            expect(arrow.pointPaintedLast).toBe(true);
        }
        expect(errors).toEqual([]);
    });

    test(`${width}px arrows: labels avoid axis numbers through updates and resize`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const errors = watchForErrors(page);
        await setup(page);
        async function check() {
            const collisions = await page.locator('#arrow-labels .maths-graph__board').evaluate(element => {
                const labels = [...element.querySelectorAll('.maths-graph__label')];
                const numbers = labels.filter(label => /^[−\d]/.test(label.textContent) &&
                    !/right|up/.test(label.textContent));
                return labels.filter(label => /right|up/.test(label.textContent)).flatMap(label => {
                    const a = label.getBoundingClientRect();
                    const board = Object.values(window.JXG.boards).find(board => board.containerObj === element);
                    const surface = element.getBoundingClientRect();
                    const line = Object.values(board.objects).find(object => object.elType === 'line');
                    const pixel = point => [surface.left + board.origin.scrCoords[1] + point.X() * board.unitX,
                        surface.top + board.origin.scrCoords[2] - point.Y() * board.unitY];
                    const from = pixel(line.point1), to = pixel(line.point2);
                    const sides = [[a.left - 3, a.top - 3], [a.right + 3, a.top - 3],
                        [a.left - 3, a.bottom + 3], [a.right + 3, a.bottom + 3]].map(([x, y]) =>
                        (x - from[0]) * (to[1] - from[1]) - (y - from[1]) * (to[0] - from[0]));
                    const onLine = Math.min(...sides) <= 0 && Math.max(...sides) >= 0;
                    const axisCollisions = numbers.filter(number => {
                        const b = number.getBoundingClientRect();
                        return a.left < b.right + 5 && a.right > b.left - 5 &&
                            a.top < b.bottom + 5 && a.bottom > b.top - 5;
                    }).map(number => `${label.textContent} touches ${number.textContent}`);
                    return [...axisCollisions, ...(onLine ? [`${label.textContent} touches the given line`] : [])];
                });
            });
            expect(collisions).toEqual([]);
        }
        await check();
        for (const x of [-1, 0, 1, 2]) {
            await page.evaluate(x => {
                window.arrowReview.across.update({ value: { from: [-2, -5], to: [x, -5] } });
                window.arrowReview.up.update({ value: { from: [x, -5], to: [x, 2 * x - 1] } });
            }, x);
            await check();
        }
        await page.setViewportSize({ width: width === 375 ? 1280 : 375, height: 1000 });
        await expect.poll(() => page.locator('#arrow-labels .maths-graph').evaluate(element => element.getBoundingClientRect().width))
            .toBe(width === 375 ? 440 : 343);
        await check();
        // Restore the exact reported example for the review screenshot.
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => {
            window.arrowReview.across.update({ value: { from: [-2, -5], to: [-1, -5] } });
            window.arrowReview.up.update({ value: { from: [-1, -5], to: [-1, -3] } });
        });
        await check();
        if (process.env.ARROW_REVIEW_OUTPUT) {
            await page.locator('#arrow-review').screenshot({ path: `${process.env.ARROW_REVIEW_OUTPUT}/arrows-${width}.png` });
        }
        expect(errors).toEqual([]);
    });
}
