// Solver for algebraic-expressions: each practice story is turned into the
// expression it describes, and the option with that expression is chosen.
const { section, options, choose } = require('./common.cjs');
const { evaluate, close } = require('../../helpers/lessons.cjs');

const WORDS = { twice: 2, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const times = word => WORDS[word] ?? Number(word);
const wellWritten = text => /^(?:\d+)?[a-z](?: [+−] \d+)?$/.test(text);
const equivalent = (a, b, letter) => {
    try { return [-3, 0.5, 2, 7].every(v => close(evaluate(a, { [letter]: v }), evaluate(b, { [letter]: v }))); } catch { return false; }
};

// { letter, expression } for a story, or { answer } for a spot-the-mistake question.
function story(prompt) {
    let m;
    if ((m = prompt.match(/has (twice|(\w+) times) as many (\w+) as \w+\. \w+ has ([a-z]) \3/)) && !/more \w+ than/.test(prompt)) return { letter: m[4], expression: `${times(m[2] ?? 'twice')}${m[4]}` };
    if ((m = prompt.match(/has ([a-z]) (\w+)\. \w+ has (twice|(\w+) times) as many \2 as \w+\. \w+ has (\d+) more \2 than/))) return { letter: m[1], expression: `${times(m[4] ?? 'twice')}${m[1]} + ${m[5]}` };
    if ((m = prompt.match(/has ([a-z]) [\w ]+?\. (?:\w+ )?(\d+) more [\w ]+ are added/))) return { letter: m[1], expression: `${m[1]} + ${m[2]}` };
    if ((m = prompt.match(/(?:have|has) ([a-z]) (\w+)\. \w+ (?:spend|eat|eats|uses|give away|gives away) (\d+)/))) return { letter: m[1], expression: `${m[1]} − ${m[3]}` };
    if ((m = prompt.match(/costs £([a-z])\. A person buys (\d+) \w+ and pays a £(\d+) [\w ]+ once/))) return { letter: m[1], expression: `${m[2]}${m[1]} + ${m[3]}` };
    if ((m = prompt.match(/"(\d+) lots of ([a-z])"/))) return { letter: m[2], expression: `${m[1]}${m[2]}` };
    if ((m = prompt.match(/"([a-z]) add (\d+)" can be written as/))) return { contains: `${m[1]} + ${m[2]}` };
    if ((m = prompt.match(/has ([a-z]) marbles and finds (\d+) more/))) return { contains: `${m[1]} + ${m[2]}` };
    if ((m = prompt.match(/cost of (\d+) pens at £([a-z]) each/))) return { contains: `${m[1]}${m[2]}` };
    return null;
}

module.exports = async function solve(page) {
    if (await section(page) !== 'question-bank') return false;
    const main = page.locator('.lesson-controls button:visible').first();
    if (await main.isEnabled().catch(() => false)) return false;
    const prompt = await page.locator('main .question-prompt:visible, main legend:visible, main h3:visible').first().innerText().catch(() => '');
    const s = story(prompt.replace(/\s+/g, ' '));
    if (!s) throw new Error(`the solver does not recognise this question: "${prompt}"`);
    const all = await options(page);
    const pick = s.contains
        ? all.find(o => o.label.includes(s.contains) && !/^It should be|^Nothing|^There is no/.test(o.label))
        : all.find(o => wellWritten(o.label) && equivalent(o.label, s.expression, s.letter));
    if (!pick) throw new Error(`no option fits "${prompt}" (options: ${all.map(o => o.label).join(' | ')})`);
    return choose(page, pick.label);
};
