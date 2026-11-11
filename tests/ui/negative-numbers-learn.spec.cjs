const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const root = page => page.locator('.nn-learn:visible');

async function picture(page) {
    const lesson = await root(page).evaluate(node => ({
        text: node.innerText,
        lines: [...node.querySelectorAll('svg')].map(svg => svg.innerHTML)
    }));
    const outsideFeedback = await page.locator('.lesson-feedback .question-feedback:visible').allTextContents();
    return { ...lesson, outsideFeedback };
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
        for (const svg of node.querySelectorAll('.nn-number-line svg, .nn-thermometer svg')) {
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
        for (const sum of node.querySelectorAll('.nn-sum, .nn-pattern-row')) {
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
        // Any Learn screen opens from its address, and Next moves on freely.
        await page.goto('content/negative-numbers/#learn-4', { waitUntil: 'networkidle' });
        await expect(page.locator('.lesson-section__title:visible')).toHaveText('When you add a positive number, you move right along the number line.');
        await expect(main(page)).toBeEnabled();
        await page.goto('content/negative-numbers/#learn-1', { waitUntil: 'networkidle' });
        await page.reload({ waitUntil: 'networkidle' });
        await expect(page).toHaveURL(/#learn-1$/);
        await expect(main(page)).toHaveText('Next');
        await expect(main(page)).toBeEnabled();
        await expect(page.locator('.lesson-section__title:visible')).toHaveText('Negative numbers are numbers below zero.');
        await expect(page.locator('.lesson-eyebrow:visible')).toHaveCount(0);
        // Screen 1: drag the thermometer's level, then use the arrow keys.
        const caption = root(page).locator('.nn-caption');
        const thermometer = root(page).locator('.nn-thermometer');
        const svg = await thermometer.locator('svg').boundingBox();
        const levelY = value => svg.y + (24 + (10 - value) * 16) / 410 * svg.height;
        const tubeX = svg.x + svg.width * 60 / 160;
        await expect(caption).toHaveText("It's −3°C. That's 3 degrees below zero, so it's a negative number.");
        await page.mouse.move(tubeX, levelY(-3));
        await page.mouse.down();
        await page.mouse.move(tubeX, levelY(0), { steps: 8 });
        await page.mouse.up();
        await expect(caption).toHaveText("It's 0°C. Zero is neither positive nor negative.");
        await page.mouse.move(tubeX, levelY(0));
        await page.mouse.down();
        await page.mouse.move(tubeX, levelY(6), { steps: 8 });
        await page.mouse.up();
        await expect(caption).toHaveText("It's 6°C. That's 6 degrees above zero, so it's a positive number.");
        await thermometer.focus();
        for (let i = 0; i < 9; i++) await thermometer.press('ArrowDown');
        await expect(caption).toHaveText("It's −3°C. That's 3 degrees below zero, so it's a negative number.");
        await layout(page);
        await reloadAndCompare(page);
        for (let screen = 1; screen <= 9; screen++) {
            await expect(page).toHaveURL(new RegExp(`#learn-${screen}$`));
            // Only the last Learn screen must be finished before moving on.
            if (screen === 9) await expect(main(page)).toBeDisabled();
            else await expect(main(page)).toBeEnabled();
            let taps = 0;
            while (await root(page).locator('[role="button"]').count()) {
                const before = await picture(page);
                // Exercise touch taps and keyboard activation as well as clicks.
                const target = root(page).locator('[role="button"]').first();
                const isLine = await target.evaluate(node => node.classList.contains('nn-number-line'));
                const waiting = isLine && await target.evaluate(node => !node.querySelector('.nn-hop'));
                // Screens 4 and 5 have no blue highlight on their number lines.
                if (waiting && [4, 5].includes(screen)) await expect(target).not.toHaveClass(/nn-awaiting-tap/);
                else if (waiting) await expect(target).toHaveClass(/nn-awaiting-tap/);
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
            expect(taps).toBe([0, 0, 6, 4, 3, 0, 1, 5, 1][screen - 1]);
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
            if (screen === 8) await expect(root(page).getByText('Tap to show the next line.')).toHaveCount(0);
            if (screen === 7) {
                await expect(root(page).locator('.nn-statement-total')).toContainText('£5');
                await expect(page.locator('.question-feedback:visible')).toHaveText('Yes, correct! Subtracting −2 has the same effect as adding 2.');
            }
            await main(page).click();
        }
        await expect(page.locator('.question-prompt:visible')).toBeVisible();
        expect(errors).toEqual([]);
        await context.close();
    });
}
