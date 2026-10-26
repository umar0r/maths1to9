const { test, expect } = require('@playwright/test');
const { watchForErrors } = require('./helpers.cjs');

test('375px named first-quadrant graph keeps every axis label inside and separate', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 950 });
    const errors = watchForErrors(page);
    await page.goto('/content/finding-the-gradient/');
    await page.locator('.maths-graph__board').first().waitFor();
    await page.evaluate(() => {
        const host = document.createElement('div');
        host.id = 'named-axis-test';
        host.style.cssText = 'width:calc(100vw - 32px);margin:auto';
        document.body.prepend(host);
        window.Maths1to9Graph.create(host, { x: [0, 10], y: [0, 30],
            step: { x: 1, y: 2 }, labelEvery: 1, aspect: 1,
            axisNames: { x: 'Time (s)', y: 'Distance (m)' }, label: 'Distance–time graph.' });
    });
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.locator('#named-axis-test .maths-graph__board').evaluate(element => {
        const board = Object.values(JXG.boards).find(board => board.containerObj === element);
        const rect = element.getBoundingClientRect();
        const labels = [...element.querySelectorAll('.maths-graph__label')].map(node => {
            const r = node.getBoundingClientRect();
            return { text: node.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                fontSize: parseFloat(getComputedStyle(node).fontSize), fontFamily: getComputedStyle(node).fontFamily };
        });
        return { labels, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
            gridAspect: 10 * board.unitX / (30 * board.unitY) };
    });
    expect(geometry.gridAspect).toBeCloseTo(1, 2);
    expect(geometry.labels.map(label => label.text)).toEqual(expect.arrayContaining(['30', '10', 'Time (s)', 'Distance (m)']));
    for (const [index, label] of geometry.labels.entries()) {
        expect(label.fontSize).toBeGreaterThanOrEqual(12);
        expect(label.fontFamily).toContain('Nunito');
        expect(label.left).toBeGreaterThanOrEqual(geometry.left);
        expect(label.right).toBeLessThanOrEqual(geometry.right);
        expect(label.top).toBeGreaterThanOrEqual(geometry.top);
        expect(label.bottom).toBeLessThanOrEqual(geometry.bottom);
        for (const other of geometry.labels.slice(index + 1)) {
            expect(label.right <= other.left || other.right <= label.left ||
                label.bottom <= other.top || other.bottom <= label.top,
            `${label.text} overlaps ${other.text}`).toBe(true);
        }
    }
    expect(errors).toEqual([]);
});
