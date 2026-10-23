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
        element.textContent = text;
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
    window.GraphTypes = { kinds, number, nb, tail, equationText, valueOf, domains, drawForm, name, shape, node, graph };
})();
