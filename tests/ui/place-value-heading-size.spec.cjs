const {test, expect} = require('@playwright/test');

/*
 * Every Learn screen's heading must be the same size as the lesson's
 * large section title, on every screen, at desktop and phone width.
 * The expected size is read from the shared .lesson-section__title style,
 * so this test follows the design if that style ever changes.
 */
const widths = [
    {name: 'desktop', size: {width: 1280, height: 800}},
    {name: 'phone', size: {width: 375, height: 812}}
];

async function readSizes(page) {
    return page.evaluate(() => {
        const heading = document.querySelector('#lesson-section-explanation [data-screen-heading]');
        const title = document.createElement('h2');
        title.className = 'lesson-section__title';
        heading.parentElement.append(title);
        const expected = getComputedStyle(title).fontSize;
        title.remove();
        return {text: heading.textContent, actual: getComputedStyle(heading).fontSize, expected};
    });
}

for (const {name, size} of widths) {
    test(`place-value Learn headings stay the large title size on every screen (${name})`, async ({page}) => {
        await page.setViewportSize(size);
        await page.goto('content/place-value/', {waitUntil: 'networkidle'});

        const titles = await page.evaluate(() => window.PlaceValue.learnScreens.map(screen => screen.title));
        const main = page.locator('.lesson-controls button.button--primary:visible');
        const heading = page.locator('#lesson-section-explanation [data-screen-heading]');
        const seen = [];

        for (let screen = 0; screen < titles.length; screen++) {
            await expect(heading).toHaveText(titles[screen]);
            const sizes = await readSizes(page);
            expect(sizes.actual, `"${sizes.text}" should be the large title size`).toBe(sizes.expected);
            seen.push(sizes.actual);
            if (screen < titles.length - 1) await main.click();
        }

        expect(new Set(seen).size, `heading sizes across Learn: ${seen.join(', ')}`).toBe(1);
    });
}
