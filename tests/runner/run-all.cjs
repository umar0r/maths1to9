#!/usr/bin/env node
// Runs every Maths1to9 test and prints a PASS/FAIL line for each one, why it
// failed, a summary, and suggested fixes. Nothing is changed or fixed.
//
//   node tests/runner/run-all.cjs              maths + file checks, then browser checks
//   node tests/runner/run-all.cjs --unit       maths + file checks only (fast, no browser)
//   node tests/runner/run-all.cjs --ui         browser checks only
//   node tests/runner/run-all.cjs --only place-value     just the tests whose name mentions it
//
// Browser checks start PHP's built-in server themselves (see tests/ui/playwright.config.cjs),
// so XAMPP does not need to be running.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { run } = require('node:test');

const root = path.join(__dirname, '..', '..');
const testsDir = path.join(root, 'tests');
const args = process.argv.slice(2);
const only = args.includes('--only') ? String(args[args.indexOf('--only') + 1] ?? '').toLowerCase() : '';
const wantUnit = !args.includes('--ui');
const wantUi = !args.includes('--unit');

const colour = process.stdout.isTTY;
const paint = (code, text) => colour ? `\x1b[${code}m${text}\x1b[0m` : text;
const green = text => paint('32', text), red = text => paint('31', text), bold = text => paint('1', text), dim = text => paint('2', text);
const stripAnsi = text => String(text ?? '').replace(/\x1b\[[0-9;]*m/g, '');

// Every result: { suite: 'maths' | 'browser', group, name, passed, reasons: [] }
const results = [];

// ---------------------------------------------------------------- maths + file checks

async function runUnitTests() {
    const files = fs.readdirSync(testsDir)
        .filter(file => file.endsWith('.cjs'))
        .map(file => path.join(testsDir, file))
        .filter(file => !only || path.basename(file).toLowerCase().includes(only) || file.endsWith('lessons.test.cjs') || file.endsWith('question-generators.test.cjs'));
    // Names of the enclosing describe() blocks, per file and nesting level.
    const stacks = new Map();
    for await (const event of run({ files, concurrency: true })) {
        const data = event.data ?? {};
        const file = data.file ?? '';
        if (event.type === 'test:start') {
            const stack = stacks.get(file) ?? [];
            stack[data.nesting] = data.name;
            stack.length = data.nesting + 1;
            stacks.set(file, stack);
            continue;
        }
        if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
        if (data.details?.type === 'suite') continue; // a describe() block: its tests are reported one by one
        const outer = (stacks.get(file) ?? []).slice(0, data.nesting).filter(Boolean);
        const name = [...outer, data.name].join(' › ');
        const group = path.basename(file || String(data.name)).replace(/\.cjs$/, '');
        if (only && !`${group} ${name}`.toLowerCase().includes(only)) continue;
        const error = data.details?.error;
        const message = stripAnsi(error?.cause?.message ?? error?.message ?? '');
        results.push({ suite: 'maths', group, name, passed: event.type === 'test:pass', reasons: reasonsFrom(message) });
    }
}

// ---------------------------------------------------------------- browser checks

function runBrowserTests() {
    const report = path.join(os.tmpdir(), `maths1to9-ui-report-${process.pid}.json`);
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const playwrightArgs = ['playwright', 'test', '-c', 'tests/ui', '--reporter=json'];
    if (only) playwrightArgs.push('-g', only);
    console.log(dim('Running the browser checks (a few minutes)…'));
    const outcome = spawnSync(npx, playwrightArgs, {
        cwd: root,
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: report },
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'pipe']
    });
    if (!fs.existsSync(report)) {
        results.push({ suite: 'browser', group: 'browser checks', name: 'the browser checks could run', passed: false,
            reasons: [`Playwright did not produce a report. ${stripAnsi(outcome.stderr).split('\n').filter(Boolean).slice(-3).join(' ')}`,
                'Is @playwright/test installed (npm install) and its browser downloaded (npx playwright install chromium)?'] });
        return;
    }
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    fs.rmSync(report, { force: true });
    const walk = (suite, trail) => {
        for (const child of suite.suites ?? []) walk(child, child.file ? trail : [...trail, child.title]);
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                const last = test.results?.at(-1) ?? {};
                const passed = last.status === 'passed' || test.status === 'expected';
                const file = path.basename(spec.file ?? suite.file ?? '').replace(/\.spec\.cjs$/, '');
                const name = [...trail, spec.title].join(' › ');
                const messages = (last.errors?.length ? last.errors : [last.error]).filter(Boolean).map(e => stripAnsi(e.message));
                results.push({ suite: 'browser', group: file, name, passed, reasons: messages.flatMap(reasonsFrom) });
            }
        }
    };
    walk(json, []);
}

// Readable reasons from an assertion message: its first line, plus any listed items.
function reasonsFrom(message) {
    if (!message) return [];
    const lines = message.split('\n');
    const items = lines.filter(line => /^\s*\+\s+['"]/.test(line)).map(line => line.replace(/^\s*\+\s+['"]|['"],?\s*$/g, '').replace(/\\"/g, '"'));
    const headline = lines.find(line => line.trim() && !/^\s*(Error:\s*)?expect\(|deep equality|^\s*[-+] (Expected|Received)/.test(line))?.replace(/^\s*Error:\s*/, '').trim();
    return [headline, ...items].filter(Boolean);
}

// ---------------------------------------------------------------- suggested fixes

// Each rule: which failures it explains, and what to change (nothing is changed here).
const FIXES = [
    [/hyphen used as a minus sign/, 'Show negative numbers with the minus sign − (U+2212), not a hyphen: e.g. String(n).replace("-", "−") when formatting.'],
    [/untidy number/, 'Round computed values before showing them (e.g. Number(x.toFixed(2))) so no 5.166666666666667-style options appear.'],
    [/wrong sum|contains sums that do not add up/, 'Correct the worked sum in the text or explanation named in the message.'],
    [/feedback for .* says/, 'Reword wrong-answer feedback so it does not state the student\'s wrong comparison as fact (e.g. "3/5 is not larger than 2/2 …").'],
    [/duplicate options|look identical|two options are the same/, 'Remove duplicate answer options (compare after trimming spaces) when building the option list.'],
    [/options marked correct|exactly one correct/, 'Make sure exactly one option is correct for every generated question.'],
    [/explanations describe the step but never give the answer|explanation does not show/, 'End each explanation with the final answer so students can compare.'],
    [/records questionType .* does not map/, 'Add that questionType to assessment.question_types in lesson.json, or record a questionType that is mapped.'],
    [/activities not completed|should earn full marks/, 'Record answers with the ids the engine reserves (answer:question-bank:N, answer:final-check-N). Check the questionId passed to recordAssessment in the lesson\'s questions.js.'],
    [/saves progress .* but no score|no saved progress found/, 'Use the shared score tracker (Maths1to9LessonEngine) so the lesson earns, saves and shows points.'],
    [/no score circle/, 'Show the score circle in the header on every screen (check the lesson\'s lesson.css for display: none on .lesson-header__stage-progress).'],
    [/no main button/, 'Keep one main button in the footer on every screen (disabled until the task is done) instead of moving on with in-content arrows.'],
    [/Continue buttons \(should be at most one\)|main buttons \(should be one\)/, 'Show only one Continue / main button at a time.'],
    [/score went down/, 'The score should never decrease; check how the lesson recalculates points.'],
    [/label .* does not match its number/, 'Keep the score circle\'s aria-label in sync with the number shown.'],
    [/should be locked|these sections should be locked/, 'Disable section tabs beyond the furthest section reached, like the other lessons.'],
    [/final slide button should say/, 'Label the last button "All lessons" like the other lessons.'],
    [/does nothing/, 'Make the last screen\'s button go somewhere (e.g. back to all lessons).'],
    [/ReferenceError|JavaScript error/, 'Fix the JavaScript error named in the message (e.g. define or remove the missing function).'],
    [/404 .*lesson\.json/, 'The "what to learn next" recommendations point to lessons that do not exist yet: hide them or create those lessons.'],
    [/404|the page loads files that do not exist|missing file/, 'Remove the <script>/<link> tag for the missing file, or add the file.'],
    [/never loaded by index\.php/, 'Delete the unused script, or add a <script> tag for it if it should be used.'],
    [/is loaded as .*stale cached copy/, 'Load the shared CSS/JS with the latest ?v= number (e.g. app.css?v=28) in the lesson\'s index.php.'],
    [/dist .* is out of date|dist has no built page|dist index\.html loads|dist has folders|dist is missing/, 'Rebuild the site: ./build.sh'],
    [/no lesson\.json|should show its sections/, 'Move the lesson to the shared lesson format (lesson.json + lesson engine).'],
    [/slug disagree/, 'Make index.php $lessonId match the slug in lesson.json.'],
    [/is not in skills\.json|does not list skill/, 'Add the skill to skills.json / to this lesson\'s skills in curriculum.json.'],
    [/American spelling/, 'Use British spelling.'],
    [/checker rejects|should be accepted|should not be accepted|places/, 'Fix the answer or its accepted formats (e.g. the "places" field) in lesson.json.'],
    [/stuck at|going round in circles|cannot answer|could not work out|unrecognised/, 'The test could not get past this screen: either the lesson has a bug there, or the lesson changed and its test needs updating (tests/ui/solvers/ or the lesson\'s .test.cjs).']
];

function fixFor(reason) {
    return FIXES.find(([pattern]) => pattern.test(reason))?.[1] ?? 'See the reason above.';
}

// ---------------------------------------------------------------- report

function print() {
    for (const suite of ['maths', 'browser']) {
        const list = results.filter(r => r.suite === suite);
        if (!list.length) continue;
        console.log('\n' + bold(suite === 'maths' ? '═══ Maths, content and file checks ═══' : '═══ Browser checks ═══'));
        let group = null;
        for (const result of [...list].sort((a, b) => a.group.localeCompare(b.group))) {
            if (result.group !== group) { group = result.group; console.log('\n' + bold(group)); }
            console.log(`  ${result.passed ? green('PASS') : red('FAIL')}  ${result.name}`);
            if (!result.passed) for (const reason of result.reasons.slice(0, 8)) console.log(dim(`        → ${reason.slice(0, 240)}`));
        }
    }

    const failed = results.filter(r => !r.passed);
    const count = suite => { const l = results.filter(r => r.suite === suite); return `${l.filter(r => r.passed).length} passed, ${l.filter(r => !r.passed).length} failed`; };
    console.log('\n' + bold('═══ Summary ═══'));
    if (wantUnit) console.log(`  Maths, content and file checks: ${count('maths')}`);
    if (wantUi) console.log(`  Browser checks:                 ${count('browser')}`);
    console.log(`  Total:                          ${results.length - failed.length} passed, ${failed.length} failed`);

    if (!failed.length) { console.log(green('\nEverything passed.')); return; }
    // Group failures by the fix that addresses them, listing where each applies.
    const byFix = new Map();
    for (const result of failed) {
        const reasons = result.reasons.length ? result.reasons : [result.name];
        for (const reason of reasons) {
            const fix = fixFor(reason);
            if (!byFix.has(fix)) byFix.set(fix, new Set());
            byFix.get(fix).add(`${result.group}: ${result.name}`);
        }
    }
    console.log('\n' + bold('═══ Suggested fixes (nothing has been changed) ═══'));
    [...byFix.entries()].sort((a, b) => b[1].size - a[1].size).forEach(([fix, where], i) => {
        console.log(`\n  ${i + 1}. ${fix}`);
        const places = [...where];
        for (const place of places.slice(0, 6)) console.log(dim(`       • ${place}`));
        if (places.length > 6) console.log(dim(`       • …and ${places.length - 6} more`));
    });
}

(async () => {
    if (wantUnit) await runUnitTests();
    if (wantUi) runBrowserTests();
    print();
    process.exitCode = results.some(r => !r.passed) ? 1 : 0;
})();
