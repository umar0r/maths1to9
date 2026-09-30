// Maths checks for algebraic-expressions: the expected expression is built
// from the story, then compared with the answer by substituting values.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, evaluate, close } = require('./helpers/lessons.cjs');

const folder = 'algebraic-expressions';
const WORDS = { twice: 2, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const multiplier = text => WORDS[text] ?? Number(text);

// Same expression if it gives the same value for several letter values.
function equivalent(a, b, letter) {
    try {
        return [-3, 0.5, 2, 7, 13].every(value => close(evaluate(a, { [letter]: value }), evaluate(b, { [letter]: value })));
    } catch {
        return false; // not valid algebra (e.g. "g2"), so not the same expression
    }
}
// GCSE notation: number before letter, no ×, e.g. "3g", "g − 4", "2q + 10".
const wellWritten = text => /^(?:\d+)?[a-z](?: [+−] \d+)?$/.test(text);

// The expression each story describes, and its letter.
function expected(type, prompt) {
    let m;
    switch (type) {
        case 'multiplyVariable':
            m = prompt.match(/(twice|(\w+) times) as many (\w+) as \w+\. \w+ has ([a-z]) \3/);
            return m && { letter: m[4], expression: `${multiplier(m[2] ?? 'twice')}${m[4]}` };
        case 'twoStep':
            m = prompt.match(/has ([a-z]) (\w+)\. \w+ has (twice|(\w+) times) as many \2 as \w+\. \w+ has (\d+) more \2 than/);
            return m && { letter: m[1], expression: `${multiplier(m[4] ?? 'twice')}${m[1]} + ${m[5]}` };
        case 'addFixedAmount':
        case 'orderSensitive':
            m = prompt.match(/has ([a-z]) [\w ]+?\. (?:\w+ )?(\d+) more [\w ]+ are added/);
            if (m) return { letter: m[1], expression: `${m[1]} + ${m[2]}` };
            m = prompt.match(/(?:have|has) ([a-z]) (\w+)\. \w+ (?:spend|eat|eats|uses|give away|gives away) (\d+)/);
            return m && { letter: m[1], expression: `${m[1]} − ${m[3]}` };
        case 'matchStory':
            m = prompt.match(/costs £([a-z])\. A person buys (\d+) \w+ and pays a £(\d+) [\w ]+ once/);
            return m && { letter: m[1], expression: `${m[2]}${m[1]} + ${m[3]}` };
        case 'notation':
            m = prompt.match(/"(\d+) lots of ([a-z])"/);
            return m && { letter: m[2], expression: `${m[1]}${m[2]}` };
    }
}

for (const type of ['multiplyVariable', 'twoStep', 'addFixedAmount', 'orderSensitive', 'matchStory', 'notation']) {
    test(`${type}: the answer is the story's expression, written properly, and no distractor is equivalent`, () => {
        for (const { seed, q } of questionsOf(folder, type)) {
            const story = expected(type, q.prompt);
            assert.ok(story, `unrecognised story, add a pattern for it: "${q.prompt}" (seed ${seed})`);
            assert.ok(equivalent(q.answer, story.expression, story.letter), `"${q.prompt}" should be ${story.expression}, answer ${q.answer} (seed ${seed})`);
            assert.ok(wellWritten(q.answer), `answer ${q.answer} is not in standard notation (seed ${seed})`);
            for (const option of q.options.filter(option => option !== q.answer)) {
                // An equivalent distractor is only fair if its notation is the mistake (e.g. "4 × x").
                if (equivalent(option, story.expression, story.letter)) {
                    assert.ok(!wellWritten(option), `distractor ${option} is also correct for "${q.prompt}" (seed ${seed})`);
                }
            }
        }
    });
}

test('spotMistake: the pupil really is wrong and the answer gives the right expression', () => {
    for (const { seed, q } of questionsOf(folder, 'spotMistake')) {
        let m, right, written, letter;
        if ((m = q.prompt.match(/"([a-z]) add (\d+)" can be written as (\S+)\./))) {
            [letter, right, written] = [m[1], `${m[1]} + ${m[2]}`, m[3]];
        } else if ((m = q.prompt.match(/has ([a-z]) marbles and finds (\d+) more\. \w+ writes the total as (\S+)\./))) {
            [letter, right, written] = [m[1], `${m[1]} + ${m[2]}`, m[3]];
        } else if ((m = q.prompt.match(/cost of (\d+) pens at £([a-z]) each as (\S+)\./))) {
            [letter, right, written] = [m[2], `${m[1]}${m[2]}`, m[3]];
        } else {
            assert.fail(`unrecognised story, add a pattern for it: "${q.prompt}" (seed ${seed})`);
        }
        assert.ok(!(equivalent(written, right, letter) && wellWritten(written)), `the pupil's ${written} is actually right for "${q.prompt}" (seed ${seed})`);
        assert.ok(q.answer.includes(right), `the answer should give ${right}: "${q.answer}" (seed ${seed})`);
    }
});
