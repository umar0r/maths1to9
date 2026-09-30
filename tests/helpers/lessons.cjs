// Shared helpers for lesson tests: find lessons, load a lesson script's
// internal functions without a browser, and put questions into one shape.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const contentDir = path.join(root, 'content');
const read = file => fs.readFileSync(file, 'utf8');
const readJson = file => JSON.parse(read(file));

function lessonFolders() {
    return fs.readdirSync(contentDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
        .map(entry => entry.name)
        .sort();
}

// A stand-in for window/document: any property, call or loop on it is a no-op.
function makeStub() {
    const stub = new Proxy(function () {}, {
        get: (target, key) => key === Symbol.toPrimitive ? () => ''
            : key === Symbol.iterator ? function* () {}
            : key === 'then' ? undefined
            : stub,
        apply: () => stub,
        construct: () => stub
    });
    return stub;
}

// Deterministic Math.random so a failing question can be reproduced.
function seededMath(seed = 1) {
    let state = seed >>> 0;
    const reseed = value => { state = value >>> 0; };
    const random = () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Object.assign(Object.create(Math), { random, reseed });
}

// Evaluate the body of a lesson script's IIFE and return the named
// internal functions/constants. Browser globals are harmless stubs.
// The result's reseed(n) makes the script's Math.random repeatable.
// Pass { window: { ... } } to give the script real objects for some window
// properties (e.g. an empty progress store) instead of stubs.
function loadScript(file, names, overrides = {}) {
    const source = read(file);
    const start = source.indexOf('{', source.indexOf('=>')) + 1;
    const end = source.lastIndexOf('}');
    const body = source.slice(start, end) + `\nreturn { ${names.join(', ')} };`;
    const stub = makeStub();
    const globals = ['window', 'document', 'CustomEvent', 'localStorage', 'location', 'history',
        'requestAnimationFrame', 'setTimeout', 'clearTimeout', 'navigator', 'matchMedia',
        'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'Event', 'HTMLElement', 'fetch', 'console'];
    const math = seededMath();
    const windowObject = new Proxy(overrides.window ?? {}, { get: (target, key) => key in target ? target[key] : stub[key] });
    const values = globals.map(name => name === 'window' ? windowObject : stub);
    const loaded = new Function(...globals, 'Math', body)(...values, math);
    return Object.assign(loaded, { reseed: math.reseed });
}

// Put the three question shapes used across lessons into one form.
function normaliseQuestion(q) {
    let options = [], correct = [];
    const list = Array.isArray(q.answers) ? q.answers : q.options;
    if (Array.isArray(list) && list.length && typeof list[0] === 'object') {
        options = list.map(option => String(option.label));
        correct = list.filter(option => option.correct).map(option => String(option.label));
    } else if (Array.isArray(list)) {
        options = list.map(String);
        correct = options.filter(option => option === String(q.answer));
    }
    const answer = q.correctLabel ?? q.answerLabel ?? q.answer;
    return {
        prompt: String(q.prompt ?? ''),
        answer: Array.isArray(answer) ? answer.join(' → ') : String(answer ?? ''),
        options,
        correct,
        feedback: Array.isArray(list) ? list.map(option => option?.feedback).filter(Boolean) : [],
        explanation: String(q.explanation ?? ''),
        raw: q
    };
}

// Every string anywhere inside a value.
const allStrings = value => typeof value === 'string' ? [value]
    : value && typeof value === 'object' ? Object.values(value).flatMap(allStrings) : [];

// Plain text of a question's HTML fragments.
const plain = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Parse numbers the lessons print: unicode minus, thousands commas.
const num = text => Number(String(text).replace(/−/g, '-').replace(/,/g, '').trim());

// Run a generator many times with different seeds.
function sample(loaded, generator, count = 200) {
    const results = [];
    for (let seed = 1; seed <= count; seed++) {
        loaded.reseed(seed);
        results.push({ seed, question: generator() });
    }
    return results;
}

// Evaluate maths as the lessons print it: − × ÷, powers (², ^), √, ¼-style
// fractions, brackets, implied multiplication (5(…), 3x) and letters from vars.
const SUPERSCRIPTS = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
const VULGAR = { '¼': '(1/4)', '½': '(1/2)', '¾': '(3/4)', '⅓': '(1/3)', '⅔': '(2/3)', '⅕': '(1/5)', '⅛': '(1/8)' };
function evaluate(text, vars = {}) {
    const source = String(text)
        .replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/(\d),(?=\d{3}\b)/g, '$1')
        .replace(/[¼½¾⅓⅔⅕⅛]/g, c => VULGAR[c])
        .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, s => '^' + [...s].map(c => SUPERSCRIPTS[c]).join(''));
    const tokens = source.match(/\d+(?:\.\d+)?|[a-zA-Z]|[-+*/^()√]|\S/g) ?? [];
    let i = 0;
    const peek = () => tokens[i];
    const take = expected => {
        const token = tokens[i++];
        if (expected && token !== expected) throw new Error(`Expected ${expected} in "${text}"`);
        return token;
    };
    const startsFactor = token => token !== undefined && /^[a-zA-Z(√]/.test(token);
    function expression() {
        let value = term();
        while (peek() === '+' || peek() === '-') value = take() === '+' ? value + term() : value - term();
        return value;
    }
    function term() {
        let value = unary();
        for (;;) {
            if (peek() === '*') { take(); value *= unary(); }
            else if (peek() === '/') { take(); value /= unary(); }
            else if (startsFactor(peek())) value *= power();
            else return value;
        }
    }
    function unary() {
        if (peek() === '-') { take(); return -unary(); }
        if (peek() === '+') { take(); return unary(); }
        return power();
    }
    function power() {
        const base = primary();
        if (peek() === '^') { take(); return base ** unary(); }
        return base;
    }
    function primary() {
        const token = take();
        if (token === undefined) throw new Error(`Unexpected end of "${text}"`);
        if (/^\d/.test(token)) return Number(token);
        if (token === '(') { const value = expression(); take(')'); return value; }
        if (token === '√') return Math.sqrt(power());
        if (/^[a-zA-Z]$/.test(token)) {
            if (!(token in vars)) throw new Error(`No value for ${token} in "${text}"`);
            return vars[token];
        }
        throw new Error(`Unexpected "${token}" in "${text}"`);
    }
    const value = expression();
    if (i < tokens.length) throw new Error(`Unexpected "${tokens[i]}" in "${text}"`);
    return value;
}
const close = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

// Find written sums like "3 × 2 + 1 = 7" or "−4 + 9 = 5" in text and return
// the ones that are wrong. Only purely numeric sides are checked.
const NUMERIC_TAIL = /(?:^|[^\w£$.,/])([−\-(√]*[\d(][\d.,⁰¹²³⁴⁵⁶⁷⁸⁹√¼½¾⅓⅔⅕⅛()\s+\-−×÷]*?)\s*$/;
const NUMERIC_HEAD = /^\s*([−\-(√]*[\d(√][\d.,⁰¹²³⁴⁵⁶⁷⁸⁹√¼½¾⅓⅔⅕⅛()\s+\-−×÷]*)/;
function wrongSums(text) {
    const plainText = String(text).replace(/<[^>]*>/g, ' ');
    const parts = plainText.split(/=(?![=>])/);
    const wrong = [];
    for (let k = 0; k < parts.length - 1; k++) {
        const tail = parts[k].match(NUMERIC_TAIL);
        const left = tail?.[1];
        const rightMatch = parts[k + 1].match(NUMERIC_HEAD);
        if (!left || !rightMatch) continue;
        // Skip algebra ("b − 12 = −3") and "75% of 32 = …": the sum must start cleanly.
        const before = parts[k].slice(0, parts[k].length - tail[0].length + tail[0].indexOf(left)).trimEnd();
        if (/(?:[+\-−×÷%*/^]|\b[a-zA-Z])$/.test(before)) continue;
        // Stop at a word straight after the number ("7 miles"), and drop trailing punctuation.
        const rest = parts[k + 1].slice(rightMatch[0].length);
        if (/^[a-zA-Z]/.test(rest)) continue;
        const clean = s => s.replace(/[\s+\-−×÷,.(]+$/, '').trim();
        const [a, b] = [clean(left), clean(rightMatch[1])];
        // The left side must be a calculation, not just a number.
        if (!a || !b || !/\d\s*[+\-−×÷]|[⁰¹²³⁴⁵⁶⁷⁸⁹√¼½¾⅓⅔⅕⅛]|\d\s*\(/.test(a)) continue;
        const balanced = s => [...s].reduce((depth, c) => depth < 0 ? depth : depth + (c === '(') - (c === ')'), 0) === 0;
        if (!balanced(a) || !balanced(b)) continue;
        let x, y;
        try { x = evaluate(a); y = evaluate(b); } catch { continue; }
        if (!close(x, y)) wrong.push(`${a} = ${b}`);
    }
    return wrong;
}

// Fractions as the lessons write them: "3/4", "−3/5", "2 4/6".
function fraction(text) {
    const match = String(text).trim().replace(/−/g, '-').match(/^(-)?(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    if (!match) throw new Error(`Not a fraction: ${text}`);
    const [, sign, whole = '0', top, bottom] = match;
    return { value: (sign ? -1 : 1) * (Number(whole) + Number(top) / Number(bottom)), whole: Number(whole), top: Number(top), bottom: Number(bottom) };
}
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);

// Generated questions of one type from a lesson's question bank, by generator
// key or function name: [{ seed, q (normalised), raw }].
const loadedBanks = {};
function questionsOf(folder, name, count = 300) {
    const file = path.join(contentDir, folder, 'questions.js');
    const loaded = loadedBanks[folder] ??= loadScript(file, ['generators']);
    const generator = Object.entries(loaded.generators)
        .find(([key, fn]) => key === name || fn.name === name)?.[1];
    if (!generator) throw new Error(`${folder} has no question type "${name}"`);
    return sample(loaded, generator, count).map(({ seed, question }) => ({ seed, q: normaliseQuestion(question), raw: question }));
}

module.exports = {
    questionsOf,
    evaluate, close, wrongSums, fraction, gcd,
    root, contentDir, read, readJson, lessonFolders, loadScript, normaliseQuestion,
    allStrings, plain, num, sample, seededMath
};
