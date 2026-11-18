const {test, expect} = require('@playwright/test');

/*
 * Every Learn screen's heading must use the one shared screen-heading size
 * from app.css, the same on every screen, at desktop and phone width.
 * The expected size is read from a probe heading with the shared
 * [data-screen-heading] style, so this test follows the design if that
 * style ever changes, and fails if the lesson sets its own size.
 */
const widths = [
    {name: 'desktop', size: {width: 1280, height: 800}},
    {name: 'phone', size: {width: 375, height: 812}}
];

async function readSizes(page) {
    return page.evaluate(() => {
        const heading = document.querySelector('#lesson-section-explanation [data-screen-heading]');
        // A bare probe outside the lesson's own markup, so only the shared rule applies.
        const title = document.createElement('h3');
        title.setAttribute('data-screen-heading', '');
        document.body.append(title);
        const expected = getComputedStyle(title).fontSize;
        title.remove();
        return {text: heading.textContent, actual: getComputedStyle(heading).fontSize, expected};
    });
}

for (const {name, size} of widths) {
    test(`place-value Learn headings use the shared screen-heading size on every screen (${name})`, async ({page}) => {
        await page.setViewportSize(size);
        await page.goto('content/place-value/', {waitUntil: 'networkidle'});

        const titles = await page.evaluate(() => window.PlaceValue.learnScreens.map(screen => screen.title));
        const main = page.locator('.lesson-controls button.button--primary:visible');
        const heading = page.locator('#lesson-section-explanation [data-screen-heading]');
        const seen = [];

        for (let screen = 0; screen < titles.length; screen++) {
            await expect(heading).toHaveText(titles[screen]);
            const sizes = await readSizes(page);
            expect(sizes.actual, `"${sizes.text}" should be the shared screen-heading size`).toBe(sizes.expected);
            seen.push(sizes.actual);
            if (screen < titles.length - 1) await main.click();
        }

        expect(new Set(seen).size, `heading sizes across Learn: ${seen.join(', ')}`).toBe(1);
    });
}
