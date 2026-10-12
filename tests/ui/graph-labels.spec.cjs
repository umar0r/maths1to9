const { test, expect } = require('@playwright/test');
const { watchForErrors } = require('./helpers.cjs');

const lesson = '/content/horizontal-and-vertical-lines/';
const surface = '#lesson-section-explanation .maths-graph__board';

// Geometry is checked in the real renderer, including its clipping and font metrics.
async function geometry(page, selector) {
    return page.locator(selector).evaluate(element => {
        const board = Object.values(window.JXG.boards).find(board => board.containerObj === element);
        const rect = element.getBoundingClientRect();
        const pixel = ([x, y]) => ({ x: rect.left + element.clientLeft + board.origin.scrCoords[1] + x * board.unitX,
            y: rect.top + element.clientTop + board.origin.scrCoords[2] - y * board.unitY });
        const labels = [...element.querySelectorAll('.maths-graph__label')];
        const bounds = element => {
            const r = element.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                height: r.height, clip: getComputedStyle(element).clipPath };
        };
        const point = Object.values(board.objects).find(object => object.elType === 'point' &&
            object.visProp.visible && object.visProp.size === 5);
        return {
            min: pixel([-6, 6]), max: pixel([6, -6]),
            point: pixel([point.X(), point.Y()]),
            value: [point.X(), point.Y()],
            coordinate: bounds(labels.find(label => label.textContent.startsWith('('))),
            equation: labels.filter(label => /^[xy]\s*=/.test(label.textContent)).map(bounds)
        };
    });
}

function insideGrid(label, graph) {
    expect(label.left).toBeGreaterThanOrEqual(graph.min.x - 1);
    expect(label.right).toBeLessThanOrEqual(graph.max.x + 1);
    expect(label.top).toBeGreaterThanOrEqual(graph.min.y - 1);
    expect(label.bottom).toBeLessThanOrEqual(graph.max.y + 1);
    expect(label.height).toBeLessThan(20); // Coordinates remain on one line.
}

for (const width of [1280, 375]) {
    for (const labelSide of [undefined, 'right', 'left', 'above', 'below']) {
        test(`${width}px graph point labels: ${labelSide || 'default right'}, edges, corners and resize`, async ({ page }) => {
            await page.setViewportSize({ width, height: 950 });
            const errors = watchForErrors(page);
            await page.goto(lesson);
            await page.locator(surface).waitFor();
            await page.evaluate(side => {
                const host = document.createElement('div');
                host.id = 'label-test';
                host.style.width = 'min(440px, calc(100vw - 32px))';
                document.body.prepend(host);
                const graph = window.Maths1to9Graph.create(host);
                window.labelTest = graph.point([0, 0], {
                    size: 'large', coordinates: true, highlight: 'x', labelSide: side
                });
            }, labelSide);
            const selector = '#label-test .maths-graph__board';
            const side = labelSide || 'right';
            const checkSide = (g, expected) => {
                if (expected === 'right') expect(g.coordinate.left).toBeGreaterThan(g.point.x);
                if (expected === 'left') expect(g.coordinate.right).toBeLessThan(g.point.x);
                if (expected === 'above') expect(g.coordinate.bottom).toBeLessThan(g.point.y);
                if (expected === 'below') expect(g.coordinate.top).toBeGreaterThan(g.point.y);
            };
            checkSide(await geometry(page, selector), side);
            const edge = { right: [6, 0], left: [-6, 0], above: [0, 6], below: [0, -6] }[side];
            await page.evaluate(value => window.labelTest.update({ value }), edge);
            checkSide(await geometry(page, selector), { right: 'left', left: 'right', above: 'below', below: 'above' }[side]);
            for (let value = -6; value <= 6; value++) {
                for (const point of [[value, 6], [value, -6], [-6, value], [6, value]]) {
                    await page.evaluate(value => window.labelTest.update({ value }), point);
                    const graph = await geometry(page, selector);
                    insideGrid(graph.coordinate, graph);
                }
            }
            await page.setViewportSize({ width: width === 375 ? 1280 : 375, height: 950 });
            await expect.poll(async () => {
                const graph = await geometry(page, selector);
                return graph.coordinate.right <= graph.max.x + 1 && graph.coordinate.bottom <= graph.max.y + 1;
            }).toBe(true);
            expect(errors).toEqual([]);
        });
    }

    for (const axis of ['y', 'x']) {
        test(`${width}px Learn ${axis === 'y' ? 1 : 3}: every dot position before and after the line`, async ({ page }) => {
            await page.setViewportSize({ width, height: 950 });
            const errors = watchForErrors(page);
            const next = page.locator('.lesson-controls .button--primary');
            const board = page.locator(surface);
            for (let position = -6; position <= 6; position++) {
                await page.goto(lesson);
                await board.waitFor();
                await page.evaluate(() => localStorage.clear());
                await page.reload();
                await board.waitFor();
                if (axis === 'x') {
                    await board.focus();
                    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
                    await next.click();
                    await board.focus();
                    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
                    await page.keyboard.press('Enter');
                    await page.keyboard.press('ArrowRight');
                    await page.keyboard.press('ArrowRight');
                    await page.keyboard.press('Enter');
                    await next.click();
                }
                await board.scrollIntoViewIfNeeded();
                const start = await geometry(page, surface);
                const unit = (start.max.x - start.min.x) / 12;
                const end = axis === 'y'
                    ? { x: start.min.x + (position + 6) * unit, y: start.point.y }
                    : { x: start.point.x, y: start.max.y - (position + 6) * unit };
                await page.mouse.move(start.point.x, start.point.y);
                await page.mouse.down();
                await page.mouse.move(end.x, end.y);
                await page.mouse.up();
                let graph = await geometry(page, surface);
                insideGrid(graph.coordinate, graph);
                expect(graph.value).toEqual(axis === 'y' ? [position, 4] : [4, position]);
                expect(graph.equation).toHaveLength(0);
                // Four distinct positions reveal the line. Keep checking while dragging.
                await board.focus();
                const negative = axis === 'y' ? 'ArrowLeft' : 'ArrowDown';
                const positive = axis === 'y' ? 'ArrowRight' : 'ArrowUp';
                for (let i = 0; i < 12; i++) await page.keyboard.press(negative);
                for (let i = 0; i < 12; i++) await page.keyboard.press(positive);
                for (let i = 0; i < 6 - position; i++) await page.keyboard.press(negative);
                graph = await geometry(page, surface);
                insideGrid(graph.coordinate, graph);
                expect(graph.value).toEqual(axis === 'y' ? [position, 4] : [4, position]);
                expect(graph.equation).toHaveLength(1);
                insideGrid(graph.equation[0], graph);
                const c = graph.coordinate, l = graph.equation[0];
                expect(c.right <= l.left || l.right <= c.left || c.bottom <= l.top || l.bottom <= c.top).toBe(true);
            }
            expect(errors).toEqual([]);
        });
    }
}
