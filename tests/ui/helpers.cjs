// Shared browser helpers: read the score circle and the lesson controls, and
// check the rules every lesson screen must follow.
const { expect } = require('@playwright/test');

const SCORE = '.rounding-score, .lesson-header__stage-progress';
const MAIN_ACTION = '.lesson-controls button.button--primary';

// Collect JavaScript errors and failed requests for the whole visit.
function watchForErrors(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(`JavaScript error: ${error.message}`));
    page.on('console', message => {
        if (message.type() !== 'error') return;
        const url = message.location()?.url ?? '';
        // Chrome asks for /favicon.ico by itself; the site has none. Not a lesson error.
        if (url.endsWith('/favicon.ico')) return;
        errors.push(`console error: ${message.text()}${url ? ` (${url})` : ''}`);
    });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    return errors;
}

// What is on screen now: score circles, main actions and Continue buttons.
async function screen(page) {
    return page.evaluate(({ SCORE, MAIN_ACTION }) => {
        const visible = el => !!(el.offsetWidth || el.offsetHeight) && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]');
        const text = el => el.textContent.replace(/\s+/g, ' ').trim();
        const scores = [...document.querySelectorAll(SCORE)].filter(visible);
        const buttons = [...document.querySelectorAll('button, a.button')].filter(visible).filter(b => !b.closest('nav'));
        return {
            where: `${location.hash || '(no hash)'} "${text([...document.querySelectorAll('h2')].find(visible) ?? document.body).slice(0, 60)}"`,
            hash: location.hash,
            heading: text([...document.querySelectorAll('h2')].find(visible) ?? document.body).slice(0, 80),
            scores: scores.map(el => ({ text: text(el), label: el.getAttribute('aria-label') ?? '', inHeader: !!el.closest('header') })),
            mainActions: [...document.querySelectorAll(MAIN_ACTION)].filter(visible).map(b => ({ text: text(b), disabled: b.disabled })),
            continues: buttons.filter(b => /^continue\b/i.test(text(b))).length
        };
    }, { SCORE, MAIN_ACTION });
}

// The rules every screen must follow. Returns the points shown and a list of
// broken rules ({ rule, where }) so a walk can report every problem at once.
function screenProblems(state, previousPoints = 0) {
    const problems = [];
    const broken = rule => problems.push({ rule, where: state.where });
    let points = previousPoints;
    if (state.scores.length !== 1) {
        broken(state.scores.length ? `${state.scores.length} score circles (should be one)` : 'no score circle at the top');
    } else {
        const [score] = state.scores;
        if (!score.inHeader) broken('the score circle is not at the top (in the header)');
        if (!/^\d+$/.test(score.text)) broken(`the score circle shows "${score.text}", not a number`);
        points = Number(score.text);
        if (Number(score.label.match(/\d+/)?.[0]) !== points) broken(`the score's screen-reader label ("${score.label}") does not match its number (${points})`);
        if (points < previousPoints) broken(`the score went down from ${previousPoints} to ${points}`);
    }
    if (state.continues > 1) broken(`${state.continues} Continue buttons (should be at most one)`);
    if (state.mainActions.length > 1) broken(`${state.mainActions.length} main buttons (should be one)`);
    if (state.mainActions.length === 0) broken('no main button: the lesson moves on with its own controls instead');
    return { points, problems };
}

// Strict version for runs that must be perfect: fail on the first broken rule.
function checkScreen(state, previousPoints = 0) {
    const { points, problems } = screenProblems(state, previousPoints);
    expect(problems.map(p => `${p.rule} at ${p.where}`), 'screen rules').toEqual([]);
    return points;
}

module.exports = { SCORE, MAIN_ACTION, watchForErrors, screen, screenProblems, checkScreen };
