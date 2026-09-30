// Shared tools for lesson solvers: find the active section, read the question,
// list the answer options and pick one, move sliders and order tiles.
const fs = require('node:fs');
const path = require('node:path');

const contentDir = path.join(__dirname, '..', '..', '..', 'content');
const lessonData = folder => JSON.parse(fs.readFileSync(path.join(contentDir, folder, 'lesson.json'), 'utf8'));
const num = text => Number(String(text).replace(/[,£\s]/g, '').replace(/−/g, '-'));
const same = (a, b) => String(a).replace(/[\s,]/g, '').replace(/−/g, '-') === String(b).replace(/[\s,]/g, '').replace(/−/g, '-');
const tidy = text => String(text ?? '').replace(/\s+/g, ' ').trim();

// The section currently shown (by hash, falling back to the visible one).
async function section(page) {
    return page.evaluate(() => {
        const visible = el => !!(el.offsetWidth || el.offsetHeight) && !el.closest('[hidden]');
        const active = [...document.querySelectorAll('[data-lesson-section]')].find(visible);
        return active?.dataset.lessonSection ?? location.hash.slice(1);
    });
}

// Visible text of the active section.
async function sectionText(page) {
    return page.evaluate(() => {
        const visible = el => !!(el.offsetWidth || el.offsetHeight) && !el.closest('[hidden]');
        const active = [...document.querySelectorAll('[data-lesson-section], .lesson-section')].find(visible) ?? document.querySelector('main');
        return active.innerText.replace(/\s+/g, ' ').trim();
    });
}

// Answer options on screen: radios (by their label), answer buttons and choices.
async function options(page) {
    const handles = await page.locator(
        'main input[type="radio"]:visible:enabled, main .answer-choice:visible:enabled, main [data-answer]:visible:enabled, main [data-choice]:visible:enabled, main [data-try-option]:visible:enabled, main [data-hook]:visible:enabled'
    ).all();
    const found = [];
    for (const locator of handles) {
        const label = await locator.evaluate(el => {
            if (el.type === 'radio') {
                const label = el.closest('label') ?? document.querySelector(`label[for="${el.id}"]`);
                return (label?.innerText ?? el.value).replace(/\s+/g, ' ').trim();
            }
            return el.innerText.replace(/\s+/g, ' ').trim();
        });
        found.push({ label, locator });
    }
    return found;
}

// Click the option whose label matches `answer` (exactly, or ignoring spaces, commas and minus style).
async function choose(page, answer) {
    const all = await options(page);
    const match = all.find(o => o.label === answer) ?? all.find(o => same(o.label, answer));
    if (!match) throw new Error(`no option matches "${answer}" (options: ${all.map(o => o.label).join(' | ')})`);
    // Radios are often covered by their styled label, so check them directly.
    if (await match.locator.evaluate(el => el.type === 'radio')) await match.locator.check({ force: true });
    else await match.locator.click();
    return true;
}

// Press arrow keys on a slider until aria-valuenow reaches the target.
async function setSlider(page, locator, target) {
    for (let i = 0; i < 20; i++) {
        const now = Number(await locator.getAttribute('aria-valuenow'));
        if (now === target) return true;
        await locator.focus();
        await page.keyboard.press(now < target ? 'ArrowRight' : 'ArrowLeft');
        await page.waitForTimeout(60);
    }
    throw new Error(`slider did not reach ${target}`);
}

// HTML5 drag and drop by firing the drag events directly (mouse drags are
// unreliable while the page re-renders).
async function htmlDrag(page, source, target) {
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    for (const [element, type] of [[source, 'dragstart'], [target, 'dragenter'], [target, 'dragover'], [target, 'drop'], [source, 'dragend']]) {
        await element.dispatchEvent(type, { dataTransfer });
    }
}

module.exports = { lessonData, num, same, tidy, section, sectionText, options, choose, setSlider, htmlDrag };
