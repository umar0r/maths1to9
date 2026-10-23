(() => {
    'use strict';
    const kinds = ['line', 'quadratic', 'cubic', 'reciprocal'];
    const number = value => String(value).replace(/-/g, '−');
    const nb = text => String(text).replace(/ /g, '\u00a0');
    const tail = c => c ? ' ' + (c < 0 ? '−' : '+') + ' ' + number(Math.abs(c)) : '';
    function equationText(form) {
        const { kind, c = 0, a = 1, b = 0, m = 1, k = 1 } = form;
        if (kind === 'line') return 'y = ' + (m === 1 ? '' : m === -1 ? '−' : number(m)) + 'x' + tail(c);
        if (kind === 'quadratic') {
            if (a === -1 && !b) return 'y = ' + (c ? number(c) + ' − x²' : '−x²');
            return 'y = ' + (a === 1 ? '' : number(a)) + 'x²' + (b ? (b > 0 ? ' + ' : ' − ') + (Math.abs(b) === 1 ? '' : number(Math.abs(b))) + 'x' : '') + tail(c);
        }
        if (kind === 'cubic') return 'y = ' + (a === 1 ? '' : number(a)) + 'x³' + tail(c);
        return 'y = ' + k + '/x';
    }
    function valueOf(form, x) {
        if (form.kind === 'reciprocal') {
            if (!x) throw new RangeError('Do not divide by zero.');
            return (form.k || 1) / x;
        }
        if (form.kind === 'line') return (form.m ?? 1) * x + (form.c || 0);
        return (form.a ?? 1) * x ** (form.kind === 'quadratic' ? 2 : 3) + (form.b || 0) * x + (form.c || 0);
    }
    function domains(form) {
        const { kind, a = 1, b = 0, c = 0, m = 1, k = 1 } = form;
        if (kind === 'reciprocal') return [[k / 6, 4], [-4, -k / 6]];
        let ends;
        if (kind === 'line') ends = [(-6 - c) / m, (6 - c) / m].sort((x, y) => x - y);
        else if (kind === 'cubic') ends = [Math.cbrt((-6 - c) / a), Math.cbrt((6 - c) / a)];
        else {
            const centre = -b / (2 * a), vertex = c - b * b / (4 * a);
            const radius = Math.sqrt(((a > 0 ? 6 : -6) - vertex) / a);
            ends = [centre - radius, centre + radius];
        }
        return [[Math.max(-4, ends[0]), Math.min(4, ends[1])]];
    }
    function drawForm(graph, form, options = {}) {
        return domains(form).map(domain => graph.plot(x => valueOf(form, x), { ...options, domain }));
    }
    const name = form => ({ line: 'straight line', quadratic: 'quadratic', cubic: 'cubic', reciprocal: 'reciprocal' })[form.kind];
    const shape = form => form.kind === 'quadratic' ? (form.a === -1 ? 'an upside-down U' : 'a U shape')
        : ({ line: 'a straight line', cubic: 'a stretched S shape', reciprocal: 'two separate curves' })[form.kind];
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = prose(text);
        element.className = className;
        return element;
    }
    function graph(host, form, small = false) {
        if (small) {
            host.inert = true;
            host.setAttribute('aria-hidden', 'true');
            host.classList.add('graphtypes-small');
        }
        const board = window.Maths1to9Graph.create(host, {
            x: [-4, 4], y: [-6, 6], step: { x: 1, y: 1 }, labelEvery: small ? 2 : 1,
            label: 'Coordinate grid with ' + shape(form) + '.'
        });
        board.setEditable(false);
        return board;
    }
    function prose(text) {
        return String(text).replace(/y = [−?\d.x²³/]+(?: [ +−×÷]+ [−?\d.x²³/]+)*/g, nb);
    }
    function prepare(config) {
        const result = { ...config };
        for (const key of ['prompt', 'feedback', 'fallback']) if (result[key]) result[key] = prose(result[key]);
        if (result.options) result.options = result.options.map(option => ({ ...option, label: prose(option.label), feedback: prose(option.feedback) }));
        if (result.rules) result.rules = result.rules.map(rule => ({ ...rule, feedback: prose(rule.feedback) }));
        return result;
    }
    const choice = (label, feedback, correct = false) => ({ label, feedback, correct });
    function bigFigure(form, extra) {
        return host => {
            const figure = node('div', '', 'graphtypes-big');
            host.append(figure);
            drawForm(graph(figure, form), form);
            if (extra) extra(figure);
        };
    }
    function graphChoice(options) {
        return {
            kind: 'graph-choice', options, correctId: options.find(option => option.correct).id,
            isEmpty: value => value === null,
            mark(value) {
                const option = options.find(option => option.id === value);
                return { correct: Boolean(option?.correct), feedback: prose(option?.feedback || 'Choose one graph.') };
            },
            answerText(value) {
                const index = options.findIndex(option => option.id === value);
                return index < 0 ? '' : 'You chose Graph ' + String.fromCharCode(65 + index) + '.';
            },
            render(host, { onChange }) {
                const group = node('div', '', 'graphtypes-grid');
                group.setAttribute('role', 'group');
                group.setAttribute('aria-label', 'Choose a graph');
                host.append(group);
                let current = { value: null, editable: true, phase: 'answer' };
                const buttons = options.map((option, index) => {
                    const caption = 'Graph ' + String.fromCharCode(65 + index);
                    const button = node('button', '', 'button graphtypes-choice');
                    button.type = 'button';
                    button.dataset.optionId = option.id;
                    button.setAttribute('aria-label', caption + ': ' + shape(option.form));
                    const small = node('div');
                    button.append(small, node('span', caption, 'graphtypes-caption'));
                    group.append(button);
                    drawForm(graph(small, option.form, true), option.form);
                    button.addEventListener('click', () => {
                        if (!current.editable) return;
                        current.value = option.id;
                        onChange(option.id);
                        paint();
                    });
                    return button;
                });
                function paint() {
                    buttons.forEach((button, index) => {
                        const selected = options[index].id === current.value;
                        button.disabled = !current.editable;
                        button.classList.toggle('is-selected', selected);
                        button.classList.toggle('is-correct', selected && current.phase === 'correct');
                        button.classList.toggle('is-incorrect', selected && current.phase === 'wrong');
                        button.setAttribute('aria-pressed', String(selected));
                    });
                }
                return {
                    update(next) { current = { ...next }; paint(); },
                    focus() { buttons.find(button => !button.disabled)?.focus(); }
                };
            }
        };
    }
    function graphOptions(forms, right, feedback) {
        return forms.map(form => ({
            id: form.kind, form, correct: form.kind === right.kind,
            feedback: form.kind === right.kind ? 'Right. ' + (right.kind === 'reciprocal' ? 'Two separate curves: a reciprocal graph.' : shape(right).replace(/^a /, 'A ') + ': ' + name(right) + '.')
                : feedback ? feedback(form) : (form.kind === 'reciprocal' ? 'Those two separate curves are' : 'That ' + shape(form).replace(/^(a |an )/, '') + ' is') + ' a ' + name(form) + '. You want ' + shape(right) + '.'
        }));
    }
    const powerSums = [
        { equation: 'y = x² + x', power: 2, lower: 1, coefficient: 1 },
        { equation: 'y = x³ − 4x', power: 3, lower: 1, coefficient: 1 },
        { equation: 'y = 2x² + 3x − 1', power: 2, lower: 1, coefficient: 2 },
        { equation: 'y = x³ + x²', power: 3, lower: 2, coefficient: 1 },
        { equation: 'y = 5x − 2', power: 1, lower: null, coefficient: 5 }
    ];
    const powerText = power => power === 1 ? 'x' : 'x' + (power === 2 ? '²' : '³');
    function powerRules(sum) {
        const rules = [], used = new Set([sum.power]);
        function add(value, feedback) {
            if (value === null || used.has(value)) return;
            used.add(value); rules.push({ value: String(value), feedback });
        }
        add(sum.lower, "There's an " + powerText(sum.lower) + ', but ' + powerText(sum.power) + ' is a higher power.');
        add(sum.coefficient, "That's the number in front. The power is the small raised number.");
        return rules;
    }
    function powerCard(sum) {
        return { input: 'number', answer: String(sum.power), rules: powerRules(sum),
            prompt: 'What is the highest power of x in ' + sum.equation + '?',
            feedback: 'Right. The highest power is ' + sum.power + '.',
            fallback: 'Look for the highest small raised number. Plain x has power 1.' };
    }
    const powerOf = form => ({line:1,quadratic:2,cubic:3})[form.kind];
    const powerShape = power => ({1:'a straight line',2:'a U shape',3:'a stretched S shape'})[power];
    function missingRules(form) {
        return [1,2,3].filter(power => power !== powerOf(form)).map(power => ({
            value: String(power), feedback: 'Power ' + power + ' makes ' + powerShape(power) + '. This graph is ' + shape(form) + '.'
        }));
    }
    function missingCard(form) {
        return { input: 'number', answer: String(powerOf(form)), rules: missingRules(form),
            prompt: "What's the missing power?",
            feedback: 'Right. ' + shape(form).replace(/^a /, 'A ') + ': power ' + powerOf(form) + '.',
            fallback: 'Look at the shape. It is ' + shape(form) + '.',
            figure: bigFigure(form, host => {
                const line = node('p', 'This graph is ', 'graphtypes-equation');
                const equation = node('span');
                equation.append(document.createTextNode(nb('y = x')));
                const raised = node('sup'), box = node('span', '?', 'graphtypes-missing');
                raised.append(box); equation.append(raised, document.createTextNode(nb(tail(form.c || 0))));
                line.append(equation, document.createTextNode('.'));
                host.append(line);
            }) };
    }
    function formsFor(c = 0, k = 1) {
        return [{kind:'line',m:1,c},{kind:'quadratic',a:1,c},{kind:'cubic',a:1,c:Math.max(-2,Math.min(2,c))},{kind:'reciprocal',k}];
    }
    const capitalName = form => name(form)[0].toUpperCase() + name(form).slice(1);
    function typeCard(form, fromGraph = false) {
        const right = form.kind === 'reciprocal' ? 'Right. x on the bottom: a reciprocal.'
            : 'Right. The highest power is ' + powerOf(form) + ", so it's " + (form.kind === 'line' ? 'a straight line.' : 'a ' + name(form) + '.');
        function wrong(kind) {
            if (fromGraph) return 'That name is for ' + shape({kind}) + '. This graph is ' + shape(form) + ': ' + (form.kind === 'line' ? 'a straight line.' : 'a ' + name(form) + '.');
            if (kind === 'line') return form.kind === 'reciprocal' ? "x is on the bottom of a fraction. That's a reciprocal."
                : 'A straight line has power 1. This equation has ' + powerText(powerOf(form)) + ", so it's a curve.";
            if (kind === 'quadratic') return 'A quadratic has x² as its highest power. This has ' + (form.kind === 'reciprocal' ? 'x on the bottom of a fraction.' : powerText(powerOf(form)) + ' as its highest power.');
            if (kind === 'cubic') return 'A cubic has x³ as its highest power. This has ' + (form.kind === 'reciprocal' ? 'x on the bottom of a fraction.' : powerText(powerOf(form)) + ' as its highest power.');
            return "A reciprocal has x on the bottom of a fraction. This doesn't.";
        }
        return { input: 'choice', prompt: fromGraph ? 'What kind of graph is this?' : 'What kind of graph is ' + equationText(form) + '?',
            ...(fromGraph ? {figure:bigFigure(form)} : {}),
            options:kinds.map(kind => ({...choice(capitalName({kind}),kind===form.kind?right:wrong(kind),kind===form.kind),kind})) };
    }
    function equationCard(form, forms = formsFor(form.c || 0, form.k || 1)) {
        const options = forms.map(candidate => candidate.kind === form.kind ? form : candidate);
        return { input:'choice', figure:bigFigure(form), prompt:'Which equation could it be?',
            options:options.map(candidate => ({...choice(equationText(candidate),
                candidate.kind === form.kind ? 'Right. ' + shape(form).replace(/^a /,'A ') + ': a ' + name(form) + '.'
                    : 'That makes ' + shape(candidate) + '. This graph is ' + shape(form) + '.',candidate.kind===form.kind),kind:candidate.kind})) };
    }
    function pick(random) {
        const {shuffle,randomInt}=window.Maths1to9LessonEngine;
        const typed=shuffle(['power','missing-power'],random),choices=shuffle(['type-from-equation','type-from-graph','equation-from-graph','graph-from-equation'],random);
        return [typed[0],choices[0],choices[1],typed[1],choices[2],choices[3]].map(type=>({type,seed:randomInt(0,4294967295,random)}));
    }
    function randomForm(kind, random) {
        const {randomInt}=window.Maths1to9LessonEngine;
        const choose=values=>values[randomInt(0,values.length-1,random)];
        if(kind==='line')return{kind,m:choose([1,2,3,-1]),c:randomInt(-3,3,random)};
        if(kind==='quadratic')return{kind,a:choose([1,-1]),c:randomInt(-3,3,random)};
        if(kind==='cubic')return{kind,a:choose([1,2]),c:randomInt(-2,2,random)};
        return{kind,k:choose([1,2,3])};
    }
    function generate(item, random) {
        const {shuffle,randomInt}=window.Maths1to9LessonEngine;
        const choose=values=>values[randomInt(0,values.length-1,random)];
        let config;
        if(item.type==='power')config=powerCard(choose(powerSums));
        else if(item.type==='missing-power'){
            const kind=choose(['line','quadratic','cubic']),form={kind,a:1,m:1,c:randomInt(kind==='cubic'?-2:-3,kind==='cubic'?2:3,random)};
            config=missingCard(form);
        } else {
            const form=randomForm(choose(kinds),random);
            if(item.type==='type-from-equation')config=typeCard(form);
            else if(item.type==='type-from-graph')config=typeCard(form,true);
            else if(item.type==='equation-from-graph')config=equationCard(form);
            else {
                const forms=kinds.map(kind=>kind===form.kind?form:randomForm(kind,random));
                config={input:'custom',prompt:'Which graph is '+equationText(form)+'?',widget:graphChoice(shuffle(graphOptions(forms,form),random))};
            }
            if(config.options)config.options=shuffle(config.options,random);
            config.form=form;
        }
        return prepare({...config,questionType:item.type});
    }
    window.GraphTypes = { kinds, number, nb, tail, equationText, valueOf, domains, drawForm, name, shape, node, graph,
        prose,prepare,choice,bigFigure,graphChoice,graphOptions,powerSums,powerRules,powerCard,powerOf,powerShape,
        missingRules,missingCard,formsFor,typeCard,equationCard,pick,randomForm,generate };
})();
