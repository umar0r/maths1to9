const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const root = page => page.locator('.nn-learn:visible');

async function picture(page) {
    return root(page).evaluate(node => ({
        text: node.innerText,
        lines: [...node.querySelectorAll('svg')].map(svg => svg.innerHTML)
    }));
}

async function reloadAndCompare(page) {
    const before = await picture(page);
    const score = await page.evaluate(() => window.Maths1to9Lesson.getScore());
    await page.reload({ waitUntil: 'networkidle' });
    await expect(root(page)).toBeVisible();
    expect(await picture(page)).toEqual(before);
    expect(await page.evaluate(() => window.Maths1to9Lesson.getScore())).toEqual(score);
}

async function layout(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const problems = await root(page).evaluate(node => {
        const issues = [];
        for (const svg of node.querySelectorAll('svg')) {
            const box = svg.getBoundingClientRect();
            const labels = [...svg.querySelectorAll('.nn-value')].map(label => label.getBoundingClientRect());
            if (labels.some((a, i) => labels.slice(i + 1).some(b =>
                a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom))) issues.push('overlapping labels');
            for (const hop of svg.querySelectorAll('.nn-hop')) {
                const h = hop.getBoundingClientRect();
                if (h.left < box.left || h.right > box.right || h.top < box.top) issues.push('hop outside line');
            }
            if (labels.length !== 21) issues.push('missing whole-number labels');
        }
        for (const sum of node.querySelectorAll('.nn-working, .nn-sum, .nn-pattern-row')) {
            if (sum.scrollWidth > sum.clientWidth + 1) issues.push('sum overflows');
        }
        return issues;
    });
    expect(problems).toEqual([]);
}

for (const width of [1280, 375]) {
    test(`negative-numbers Learn ${width}px: every tap, reload, Back and completed picture`, async ({ browser }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        const errors = watchForErrors(page);
        await page.goto('content/negative-numbers/#learn-8', { waitUntil: 'networkidle' });
        await expect(page).toHaveURL(/#learn-1$/);
        await expect(main(page)).toHaveText('Next');
        await expect(main(page)).toBeEnabled();
        const line = root(page).locator('.nn-explore');
        const box = await line.boundingBox();
        const marker = await line.locator('.nn-dot').boundingBox();
        const hit = await line.locator('.nn-drag-target').boundingBox();
        const zero = await line.locator('.nn-zero-circle').boundingBox();
        await expect(root(page).locator('.nn-caption')).toHaveText("You're on −4. That's 4 to the left of zero, so it's a negative number.");
        expect(marker.x + marker.width).toBeLessThan(zero.x);
        expect(marker.width).toBeGreaterThanOrEqual(22);
        expect(marker.width).toBeLessThan(26);
        expect(hit.width).toBeGreaterThanOrEqual(44);
        expect(hit.height).toBeGreaterThanOrEqual(44);
        if (width === 375) {
            expect(box.width).toBeGreaterThan(335);
            expect(box.height).toBeGreaterThan(150);
        }
        await expect(page.locator('.lesson-section__title:visible')).toHaveText('Subtracting negative numbers');
        await expect(page.locator('.lesson-eyebrow:visible')).toHaveCount(0);
        // Drag from the new starting position to zero, then back to −4.
        await page.mouse.move(marker.x + marker.width / 2, marker.y + marker.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, marker.y + marker.height / 2, { steps: 8 });
        await page.mouse.up();
        await expect(root(page).locator('.nn-caption')).toHaveText("You're on 0. Zero is neither positive nor negative.");
        await page.mouse.move(box.x + box.width / 2, marker.y + marker.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 210 / 660, marker.y + marker.height / 2, { steps: 8 });
        await page.mouse.up();
        await expect(root(page).locator('.nn-caption')).toHaveText("You're on −4. That's 4 to the left of zero, so it's a negative number.");
        await line.focus();
        for (let i = 0; i < 10; i++) await line.press('ArrowRight');
        await expect(root(page).locator('.nn-caption')).toHaveText("You're on 6. That's 6 to the right of zero, so it's a positive number.");
        for (let i = 0; i < 10; i++) await line.press('ArrowLeft');
        await reloadAndCompare(page);
        for (let screen = 1; screen <= 8; screen++) {
            await expect(page).toHaveURL(new RegExp(`#learn-${screen}$`));
            if (screen > 1) await expect(main(page)).toBeDisabled();
            let taps = 0;
            while (await root(page).locator('[role="button"]').count()) {
                const before = await picture(page);
                // Exercise touch taps and keyboard activation as well as clicks.
                const target = root(page).locator('[role="button"]').first();
                const isLine = await target.evaluate(node => node.classList.contains('nn-number-line'));
                const waiting = isLine && await target.evaluate(node => !node.querySelector('.nn-hop'));
                if (waiting) await expect(target).toHaveClass(/nn-awaiting-tap/);
                if (width === 375) await target.tap();
                else if (taps === 0) { await target.focus(); await target.press('Enter'); }
                else await target.click();
                expect(await picture(page)).not.toEqual(before);
                if (isLine) {
                    const moved = root(page).locator('.nn-number-line').filter({ has: page.locator('.nn-hop') });
                    for (const line of await moved.all()) await expect(line).not.toHaveClass(/nn-awaiting-tap/);
                    if (width === 375) {
                        const hop = await moved.last().locator('.nn-hop').last().boundingBox();
                        expect(hop.height).toBeGreaterThan(39);
                    }
                }
                await layout(page);
                await reloadAndCompare(page);
                taps++;
                expect(taps).toBeLessThan(20);
            }
            expect(taps).toBe([0, 11, 11, 8, 2, 6, 5, 4][screen - 1]);
            await layout(page);
            await reloadAndCompare(page);
            await page.screenshot({ path: `/private/tmp/negative-learn-${width}-screen-${screen}.png`, fullPage: true });
            if (screen > 1) {
                const retained = await picture(page);
                await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
                await main(page).click();
                expect(await picture(page)).toEqual(retained);
            }
            await expect(main(page)).toBeEnabled();
            await main(page).click();
        }
        await expect(page.locator('.question-prompt:visible')).toBeVisible();
        expect(errors).toEqual([]);
        await context.close();
    });
}
