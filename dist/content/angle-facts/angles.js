(() => {
    'use strict';

    // Every picture in this lesson is drawn with the shared diagram
    // (assets/js/diagram.js). Nothing here makes its own SVG.

    const RADIANS = Math.PI / 180;
    const number = value => String(Number(Number(value).toPrecision(12)));
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });
    const mistake = (value, feedback) => ({ value: String(value), feedback });

    // A direction in degrees, anticlockwise from due right, to a point.
    function along(origin, direction, length) {
        return [origin[0] + length * Math.cos(direction * RADIANS),
            origin[1] + length * Math.sin(direction * RADIANS)];
    }

    function degrees(value) {
        return `${number(value)}°`;
    }

    // A size that may be negative, written with a proper minus sign.
    function signed(value) {
        return number(value).replace('-', '−');
    }

    function amod(value) {
        const wrapped = value % 360;
        return wrapped < 0 ? wrapped + 360 : wrapped;
    }

    // The six reasons, word for word, everywhere they appear.
    const REASONS = {
        straight: 'Angles on a straight line add up to 180°.',
        around: 'Angles around a point add up to 360°.',
        opposite: 'Vertically opposite angles are equal.',
        corresponding: 'Corresponding angles are equal.',
        alternate: 'Alternate angles are equal.',
        coInterior: 'Co-interior angles add up to 180°.'
    };

    const REASON_LIST = [REASONS.straight, REASONS.around, REASONS.opposite,
        REASONS.corresponding, REASONS.alternate, REASONS.coInterior];

    // ---------------------------------------------------------------
    // Pictures
    // ---------------------------------------------------------------

    // One vertex, straight lines and rays out of it, and the angles
    // between them. Each sector sweeps anticlockwise from `from` to `to`.
    function buildAngles(diagram, config) {
        const vertex = config.vertex || [0, 0];
        const origin = diagram.point(vertex, { mark: 'none', label: config.vertexLabel });
        const reach = config.reach || 2.6;
        const points = new Map();
        const pointAt = direction => {
            const key = Math.round(direction * 1000) / 1000;
            if (!points.has(key)) {
                points.set(key, diagram.point(along(vertex, key, reach), { mark: 'none' }));
            }
            return points.get(key);
        };
        for (const [from, to] of config.lines || []) diagram.line(pointAt(from), pointAt(to));
        for (const direction of config.rays || []) diagram.segment(origin, pointAt(direction));
        if (config.protractor) {
            diagram.protractor(origin, {
                zero: config.protractor.zero,
                turn: config.protractor.turn,
                full: config.protractor.full === true
            });
        }
        const sectors = (config.sectors || []).map(sector => ({
            config: sector,
            handle: diagram.angle(pointAt(sector.from), origin, pointAt(sector.to), {
                turn: 'anticlockwise',
                label: sector.label,
                tone: sector.tone || 'neutral',
                arcs: sector.arcs || 1,
                square: sector.square,
                ...(sector.select ? { select: true, name: sector.name } : {})
            })
        }));
        return { diagram, origin, pointAt, sectors };
    }

    function drawAngles(host, config) {
        const diagram = window.Maths1to9Diagram.create(host, {
            label: config.label,
            view: config.view,
            note: config.note
        });
        return buildAngles(diagram, config);
    }

    // Opens a diagram the lesson can add to itself, for Learn screens
    // that move an extra piece.
    function open(host, options) {
        return window.Maths1to9Diagram.create(host, options);
    }

    // Two parallel lines with a crossing line rising to the right at
    // `theta`. `corners` names the angles to draw, such as
    // 'top-below-right' or 'bottom-above-left'.
    // The two directions round one corner of two parallel lines. The
    // crossing line rises to the right at `theta`, so above-right and
    // below-left are the narrow pair, and above-left and below-right the
    // wide pair.
    function cornerSector(theta, corner) {
        const [, side, end] = corner.split('-');
        if (side === 'above') return end === 'right' ? [0, theta] : [theta, 180];
        return end === 'left' ? [180, 180 + theta] : [180 + theta, 360];
    }

    function buildParallel(diagram, config) {
        const theta = config.theta;
        const gap = config.gap ?? 3.6;
        const slope = gap / Math.tan(theta * RADIANS);
        const bottom = [3.5 - slope / 2, 0];
        const top = [3.5 + slope / 2, gap];
        const tilt = config.skew ?? 0;
        const lowStart = diagram.point([0, 0], { mark: 'none' });
        const lowEnd = diagram.point([7, 0], { mark: 'none' });
        const highStart = diagram.point([0, gap], { mark: 'none' });
        const highEnd = diagram.point([7, gap + tilt], { mark: 'none' });
        diagram.segment(lowStart, lowEnd, { arrows: config.arrows ?? 1 });
        diagram.segment(highStart, highEnd, { arrows: config.arrows ?? 1 });
        const below = diagram.point(bottom, { mark: 'none' });
        const above = diagram.point(top, { mark: 'none' });
        const lowExtra = diagram.point(along(bottom, 180 + theta, 1.3), { mark: 'none' });
        const highExtra = diagram.point(along(top, theta, 1.3), { mark: 'none' });
        diagram.segment(lowExtra, highExtra);

        const corners = new Map();
        for (const [name, settings] of Object.entries(config.corners || {})) {
            const atTop = name.startsWith('top');
            const vertex = atTop ? above : below;
            const [from, to] = cornerSector(theta, name);
            const here = vertex.position();
            const one = diagram.point(along(here, from, 1.15), { mark: 'none' });
            const two = diagram.point(along(here, to, 1.15), { mark: 'none' });
            const handle = diagram.angle(one, vertex, two, {
                turn: 'anticlockwise',
                label: settings.letter ? '' : settings.label,
                tone: settings.tone || 'neutral',
                arcs: settings.arcs || 1,
                ...(settings.select ? { select: true, name: settings.name } : {})
            });
            if (settings.letter) {
                // The letter goes in the middle of its own corner, with a
                // fixed side, so four letters round one crossing never swap
                // places with each other.
                const middle = amod(from + amod(to - from) / 2);
                diagram.point(along(here, middle, 1), {
                    label: settings.label, labelSide: sideFor(middle), mark: 'none'
                });
            }
            corners.set(name, { config: settings, handle, vertex });
        }
        return { diagram, corners, top: above, bottom: below, theta };
    }

    // The side a label should sit on for a direction in degrees.
    function sideFor(direction) {
        const angle = amod(direction);
        if (angle > 45 && angle < 135) return 'above';
        if (angle >= 135 && angle < 225) return 'left';
        if (angle >= 225 && angle < 315) return 'below';
        return 'right';
    }

    function drawParallel(host, config) {
        const diagram = window.Maths1to9Diagram.create(host, {
            label: config.label,
            view: config.view || { x: [-0.9, 7.9], y: [-1.9, 4.9] },
            note: config.note
        });
        return buildParallel(diagram, config);
    }

    // The size at a corner where the crossing line rises to the right at
    // `theta`: matching corners are equal, and the ones next to them add
    // up to 180°.
    // Where the crossing line rises to the right, above-right and below-left
    // are the same size, and above-left and below-right are the other size.
    function cornerAngle(theta, corner) {
        const [where, side, end] = String(corner).split('-');
        if (!['top', 'bottom'].includes(where) || !['above', 'below'].includes(side)
            || !['left', 'right'].includes(end)) {
            throw new TypeError(`${corner} is not a corner of two parallel lines`);
        }
        return (side === 'above') === (end === 'right') ? theta : 180 - theta;
    }

    // ---------------------------------------------------------------
    // Learn
    // ---------------------------------------------------------------

    const learnScreens = [
        {
            kind: 'turn',
            title: 'An angle is an amount of turn',
            lines: [
                'An angle tells you how far something has turned. We measure it in degrees (°).',
                'A full turn, all the way round, is 360°.'
            ],
            callout: 'Half a turn is 180°: a straight line.',
            cards: [
                { key: 'acute', size: 40, name: 'Acute', note: 'less than 90°, like a slice of pizza' },
                { key: 'right', size: 90, name: 'Right angle', note: 'exactly 90°, like the corner of a page; drawn with a little square' },
                { key: 'obtuse', size: 130, name: 'Obtuse', note: 'between 90° and 180°, like a door opened wide' },
                { key: 'reflex', size: 250, name: 'Reflex', note: 'more than 180°, the long way round' }
            ]
        },
        {
            kind: 'straight',
            title: 'Angles on a straight line add up to 180°',
            lines: [
                'A straight line is half a turn, so it is 180°.',
                'The angles on one side of a straight line always add up to 180°.'
            ],
            callout: 'To find a missing angle on a straight line, take the angles you know away from 180.'
        },
        {
            kind: 'around',
            title: 'Angles around a point add up to 360°',
            lines: [
                'Angles all the way round a point make a full turn.',
                'They always add up to 360°.'
            ],
            callout: 'Add the angles you know, then take that away from 360.'
        },
        {
            kind: 'opposite',
            title: 'Vertically opposite angles are equal',
            lines: [
                'When two straight lines cross, they make four angles.',
                'The angles opposite each other are equal. They are called vertically opposite angles, like the blades of open scissors.',
                "'Vertically' doesn't mean up and down here."
            ],
            callout: 'Opposite the angle you know: the same size. Next to it: 180° take away the one you know.'
        },
        {
            kind: 'corresponding',
            title: 'Parallel lines: corresponding angles are equal',
            lines: [
                'Parallel lines go the same way and never meet, like the two rails of a train track. Arrows on the lines show they are parallel.',
                'A crossing line cuts both rails at the same slope. So the angles in matching corners are equal.',
                'They are called corresponding angles. They make an F shape.'
            ],
            callout: 'Matching corners: the same corner at each crossing. Corresponding angles are equal.'
        },
        {
            kind: 'alternate',
            title: 'Alternate angles are equal',
            lines: [
                'Now look between the parallel lines.',
                'Two angles on opposite sides of the crossing line, one at each parallel line, are equal.',
                'They are called alternate angles. They make a Z shape.'
            ],
            callout: 'A Z shape: between the lines, on opposite sides of the crossing line.'
        },
        {
            kind: 'cointerior',
            title: 'Co-interior angles add up to 180°',
            lines: [
                'Two angles between the parallel lines, on the same side of the crossing line, are co-interior angles.',
                'They make a C shape. They are not equal: they add up to 180°.'
            ],
            callout: 'A C shape: between the lines, on the same side. Take the one you know away from 180.'
        },
        {
            kind: 'reason',
            title: 'Find it, and say why',
            lines: [
                'In the exam you must give a reason for every step.',
                'Use the rules you have learned, word for word.'
            ],
            callout: 'One rule for each step. Write it out in full.'
        }
    ];

    // ---------------------------------------------------------------
    // Pictures for Try it and Check
    // ---------------------------------------------------------------

    function straightLineFigure(config) {
        return host => drawAngles(host, {
            label: config.label,
            view: config.view || { x: [-1.3, 7.3], y: [-2.2, 4.2] },
            note: config.note,
            vertex: [2.6, 0],
            lines: [[0, 180]],
            rays: config.rays,
            sectors: config.sectors
        });
    }

    function aroundPointFigure(config) {
        return host => drawAngles(host, {
            label: config.label,
            view: config.view || { x: [-1.5, 4.6], y: [-3.2, 3.2] },
            note: config.note,
            vertex: [1.4, 0],
            rays: config.rays,
            sectors: config.sectors
        });
    }

    function crossingFigure(config) {
        return host => drawAngles(host, {
            label: config.label,
            view: config.view || { x: [-3.4, 3.4], y: [-3.4, 3.4] },
            note: config.note,
            vertex: [0, 0],
            lines: config.lines,
            rays: config.rays,
            sectors: config.sectors
        });
    }

    function parallelFigure(config) {
        return host => drawParallel(host, {
            label: config.label,
            note: config.note,
            theta: config.theta,
            arrows: config.arrows,
            skew: config.skew,
            corners: config.corners
        });
    }

    // The angle each sector covers, from its two directions.
    // The F, C and Z drawn through two corners: a piece of each parallel
    // line, starting at its own crossing and going towards the side its
    // angle is on, joined by the crossing line between the two crossings.
    function shapeThrough(top, bottom, topCorner, bottomCorner, reach = 1.7) {
        const piece = (corner, crossing) => [
            crossing[0] + (corner.endsWith('right') ? reach : -reach), crossing[1]
        ];
        return [piece(topCorner, top), top, bottom, piece(bottomCorner, bottom)];
    }

    function sectorEnds(letters) {
        const starts = Object.values(letters).slice().sort((a, b) => a - b);
        const sectors = [];
        for (const [letter, start] of Object.entries(letters)) {
            const next = starts[(starts.indexOf(start) + 1) % starts.length];
            sectors.push({ from: start, to: next <= start ? next + 360 : next, label: letter });
        }
        return sectors;
    }

    // Tap to choose, for questions with four lettered angles.
    function tapWidget(config) {
        return window.Maths1to9Diagram.questionWidget({
            diagram: { label: config.label, note: config.note, view: config.view },
            setup(diagram) {
                if (config.parallel) buildParallel(diagram, config.parallel);
                else buildAngles(diagram, config.angles);
            },
            answer: 'choose',
            isEmpty: value => value === null || value === undefined,
            mark: name => config.marks[name] ?? { correct: false, feedback: 'Tap one of the lettered angles.' },
            answerText: name => `You chose ${name}.`
        });
    }

    // ---------------------------------------------------------------
    // Try it
    // ---------------------------------------------------------------

    const TRY_4_MARKS = {
        r: { correct: true, feedback: 'r is opposite p, across the crossing. Vertically opposite angles are equal.' },
        p: { feedback: "That's angle p itself. Tap the angle across the crossing from it." },
        q: { feedback: 'q is next to p, on a straight line. They add up to 180°. Vertically opposite means across the crossing.' },
        s: { feedback: 's is next to p, on a straight line. They add up to 180°. Vertically opposite means across the crossing.' }
    };

    const TRY_7_MARKS = {
        b: { correct: true, feedback: 'b is on the other side of the crossing line, between the parallel lines. Alternate angles make a Z shape.' },
        c: { feedback: "c is in the same corner as a. That's corresponding, not alternate." },
        d: { feedback: "d is on the same side of the crossing line as a. That's co-interior: they add up to 180°." },
        e: { feedback: "e is opposite a where the lines cross. That's vertically opposite." }
    };

    function examples() {
        return [
            {
                questionType: 'try-1', skill: 'point-line', asked: 'name',
                input: 'choice', angles: {},
                prompt: 'An angle measures 124°. What type of angle is it?',
                options: [
                    option('Obtuse', '124° is more than 90° and less than 180°.', true),
                    option('Acute', 'Acute angles are less than 90°. 124° is more than 90°.'),
                    option('Reflex', 'Reflex angles are more than 180°. 124° is less than 180°.'),
                    option('Right angle', 'A right angle is exactly 90°.')
                ]
            },
            {
                questionType: 'try-2', skill: 'point-line', asked: 'size',
                input: 'number', unit: '°', angles: { given: { first: 138 }, x: 'second' },
                prompt: 'Find angle x.',
                answer: '42',
                rules: [
                    mistake(222, 'That uses 360°. The angles are on a straight line, so they add up to 180°.'),
                    mistake(138, "x isn't opposite the 138°. It's next to it on a straight line, so they add up to 180°.")
                ],
                fallback: 'Angles on a straight line add up to 180°.',
                feedback: '180 − 138 = 42°',
                figure: straightLineFigure({
                    note: 'Not drawn accurately',
                    label: 'A straight line with a line coming out of it, angles 138 degrees and x',
                    rays: [138],
                    sectors: [
                        { from: 0, to: 138, label: '138°' },
                        { from: 138, to: 180, label: 'x', tone: 'highlight' }
                    ]
                })
            },
            {
                questionType: 'try-3', skill: 'point-line', asked: 'size',
                input: 'choice', angles: { given: { first: 92, second: 146 }, x: 'third' },
                prompt: 'Find angle x.',
                options: [
                    option('122°', 'Angles around a point add up to 360°. 92 + 146 = 238. 360 − 238 = 122°', true),
                    option('214°', 'That only takes away 146°. Take away both angles you know.'),
                    option('−58°', 'That uses 180°. The angles go all the way round, so they add up to 360°.'),
                    option('238°', 'That adds the two angles you know. Now take that away from 360.')
                ],
                figure: aroundPointFigure({
                    note: 'Not drawn accurately',
                    label: 'Three lines from a point, angles 92 degrees, 146 degrees and x',
                    rays: [0, 92, 238],
                    sectors: [
                        { from: 0, to: 92, label: '92°' },
                        { from: 92, to: 238, label: '146°' },
                        { from: 238, to: 360, label: 'x', tone: 'highlight' }
                    ]
                })
            },
            {
                questionType: 'try-4', skill: 'opposite', asked: 'pair',
                input: 'custom', angles: { given: {}, x: 'r' }, marks: TRY_4_MARKS,
                prompt: 'Tap the angle that is vertically opposite angle p.',
                widget: tapWidget({
                    note: 'Not drawn accurately',
                    label: 'Two lines crossing like an X, angles p, q, r and s',
                    view: { x: [-3.4, 3.4], y: [-3.4, 3.4] },
                    angles: {
                        vertex: [0, 0],
                        lines: [[20, 200], [120, 300]],
                        sectors: sectorEnds({ p: 20, q: 300, r: 200, s: 120 }).map(sector => ({
                            ...sector,
                            select: true,
                            name: sector.label
                        }))
                    },
                    marks: TRY_4_MARKS
                })
            },
            {
                questionType: 'try-5', skill: 'opposite', asked: 'size',
                input: 'number', unit: '°', angles: { given: { start: 117 }, x: 'next' },
                prompt: 'Two straight lines cross. Find angle x.',
                answer: '63',
                rules: [
                    mistake(117, "x isn't opposite the 117°. It's next to it, on a straight line."),
                    mistake(243, 'That uses 360°. x and 117° are on a straight line, so they add up to 180°.')
                ],
                fallback: 'Angles on a straight line add up to 180°.',
                feedback: '180 − 117 = 63°',
                figure: crossingFigure({
                    note: 'Not drawn accurately',
                    label: 'Two straight lines crossing, one angle 117 degrees and x next to it',
                    lines: [[0, 180], [117, 297]],
                    sectors: [
                        { from: 0, to: 117, label: '117°' },
                        { from: 117, to: 180, label: 'x', tone: 'highlight' }
                    ]
                })
            },
            {
                questionType: 'try-6', skill: 'parallel', asked: 'size',
                input: 'choice', angles: { given: { 'top-above-right': 73 }, x: 'bottom-above-right' },
                prompt: 'Find angle b.',
                options: [
                    option('73°', '73° and b are in matching corners. Corresponding angles are equal.', true),
                    option('107°', "Corresponding angles are equal. They don't add up to 180°."),
                    option('287°', 'That takes 73 away from 360. Corresponding angles are equal.'),
                    option('17°', "That takes 73 away from 90. b isn't part of a right angle. Corresponding angles are equal.")
                ],
                figure: parallelFigure({
                    note: 'Not drawn accurately',
                    label: 'Two parallel lines crossed by a line, 73 degrees at the top and b at the bottom',
                    theta: 73,
                    corners: {
                        'top-above-right': { label: '73°' },
                        'bottom-above-right': { label: 'b', tone: 'highlight' }
                    }
                })
            },
            {
                questionType: 'try-7', skill: 'parallel', asked: 'pair',
                input: 'custom', angles: { given: {}, x: 'b' }, marks: TRY_7_MARKS,
                prompt: 'Tap the angle that is alternate to angle a.',
                widget: tapWidget({
                    note: 'Not drawn accurately',
                    label: 'Two parallel lines crossed by a line, angles a, b, c, d and e',
                    parallel: {
                        theta: 60,
                        corners: {
                            'top-below-right': { label: 'a', tone: 'highlight' },
                            'bottom-above-left': { label: 'b', letter: true, select: true, name: 'b' },
                            'bottom-below-right': { label: 'c', letter: true, select: true, name: 'c' },
                            'bottom-above-right': { label: 'd', letter: true, select: true, name: 'd' },
                            'top-above-left': { label: 'e', letter: true, select: true, name: 'e' }
                        }
                    },
                    marks: TRY_7_MARKS
                })
            },
            {
                questionType: 'try-8', skill: 'parallel', asked: 'size',
                input: 'number', unit: '°', angles: { given: { 'top-below-left': 64 }, x: 'bottom-above-left' },
                prompt: 'Find angle x.',
                answer: '116',
                rules: [
                    mistake(64, "x and 64° are on the same side of the crossing line. They're co-interior, so they add up to 180°, not equal."),
                    mistake(296, 'That uses 360°. Co-interior angles add up to 180°.')
                ],
                fallback: 'Co-interior angles add up to 180°.',
                feedback: '180 − 64 = 116°',
                figure: parallelFigure({
                    note: 'Not drawn accurately',
                    label: 'Two parallel lines crossed by a line, 64 degrees at the top and x at the bottom',
                    theta: 64,
                    corners: {
                        'top-below-left': { label: '64°' },
                        'bottom-above-left': { label: 'x', tone: 'highlight' }
                    }
                })
            },
            {
                questionType: 'try-9', skill: 'parallel', asked: 'reason',
                input: 'choice', angles: { given: { 'top-below-left': 52 }, x: 'bottom-above-right' },
                prompt: 'x = 52°. Which reason is right?',
                options: [
                    option('Alternate angles are equal.', 'x and 52° are between the parallel lines, on opposite sides of the crossing line: a Z shape.', true),
                    option('Corresponding angles are equal.', 'Corresponding angles are in matching corners, an F shape. These two are in a Z shape.'),
                    option('Vertically opposite angles are equal.', 'Vertically opposite angles are at the same crossing. These are at different crossings.'),
                    option('Co-interior angles add up to 180°.', "Co-interior angles are on the same side of the crossing line. These are on opposite sides, and they're equal.")
                ],
                figure: parallelFigure({
                    note: 'Not drawn accurately',
                    label: 'Two parallel lines crossed by a line, 52 degrees between the lines at the top and x between them at the bottom',
                    theta: 52,
                    corners: {
                        'top-below-left': { label: '52°' },
                        'bottom-above-right': { label: 'x', tone: 'highlight' }
                    }
                })
            },
            {
                questionType: 'try-10', skill: 'parallel', asked: 'size',
                input: 'number', unit: '°', angles: { given: { 'top-above-left': 125 }, x: 'bottom-above-right' },
                prompt: 'Find angle x.',
                answer: '55',
                rules: [
                    mistake(125, "x isn't in the same corner as 125°. Find the angle next to 125° first: 180 − 125 = 55°. Then use corresponding angles."),
                    mistake(235, 'That uses 360°. 125° is on a straight line with the angle next to it.')
                ],
                fallback: 'Find the angle next to 125° first.',
                feedback: '180 − 125 = 55°. Then corresponding angles are equal, so x = 55°',
                figure: parallelFigure({
                    note: 'Not drawn accurately',
                    label: 'Two parallel lines crossed by a line, 125 degrees at the top and x at the bottom',
                    theta: 55,
                    corners: {
                        'top-above-left': { label: '125°' },
                        'bottom-above-right': { label: 'x', tone: 'highlight' }
                    }
                })
            }
        ];
    }

    // ---------------------------------------------------------------
    // Check
    // ---------------------------------------------------------------

    function checks() {
        return [
            {
                questionType: 'check-1', skill: 'point-line', asked: 'judge',
                input: 'choice', angles: { given: { first: 95, second: 125, third: 130 }, x: null },
                prompt: 'Sam says the angles round a point are 95°, 125° and 130°. Why must Sam be wrong?',
                options: [
                    option('They add up to 350°, not 360°.', '95 + 125 + 130 = 350. Angles around a point add up to 360°.', true),
                    option('They add up to 350°, not 180°.', '180° is for a straight line. Angles around a point add up to 360°.'),
                    option('Angles round a point must all be the same size.', 'They can be different sizes. They must add up to 360°.'),
                    option('One of them is obtuse.', 'Angles round a point can be any type. They must add up to 360°.')
                ],
                figure: aroundPointFigure({
                    note: 'Not drawn accurately',
                    label: 'Three lines from a point, angles 95 degrees, 125 degrees and 130 degrees',
                    rays: [0, 95, 220],
                    sectors: [
                        { from: 0, to: 95, label: '95°' },
                        { from: 95, to: 220, label: '125°' },
                        { from: 220, to: 360, label: '130°' }
                    ]
                })
            },
            {
                questionType: 'check-2', skill: 'point-line', asked: 'size',
                input: 'number', unit: '°', angles: { given: { start: 64 }, x: 'reflex' },
                prompt: 'The small angle between two lines is 64°. What is the reflex angle round the outside?',
                answer: '296',
                rules: [
                    mistake(116, 'That uses 180°. The two angles go all the way round, so they add up to 360°.'),
                    mistake(424, 'That adds 64 to 360. Take it away: 360 − 64.')
                ],
                fallback: 'The two angles make a full turn: 360°.',
                feedback: '360 − 64 = 296°',
                figure: crossingFigure({
                    note: 'Not drawn accurately',
                    label: 'Two lines from a point, the small angle 64 degrees and the reflex angle x',
                    rays: [0, 64],
                    sectors: [
                        { from: 0, to: 64, label: '64°' },
                        { from: 64, to: 360, label: 'x', tone: 'highlight' }
                    ]
                })
            },
            {
                questionType: 'check-3', skill: 'parallel', asked: 'pair',
                input: 'choice', angles: { given: {}, x: null },
                prompt: 'Which two angles are alternate?',
                options: [
                    option('p and r', 'p and r are between the parallel lines, on opposite sides of the crossing line: a Z shape.', true),
                    option('p and s', 'p and s are on the same side of the crossing line. That is co-interior.'),
                    option('r and s', 'r and s are next to each other on the bottom line. They add up to 180°.'),
                    option('p and q', 'p and q are next to each other on the top line. They add up to 180°.')
                ],
                figure: parallelFigure({
                    note: 'Not drawn accurately',
                    label: 'Two parallel lines crossed by a line, angles p, q, r and s between the lines',
                    theta: 70,
                    corners: {
                        'top-below-left': { label: 'p' },
                        'top-below-right': { label: 'q' },
                        'bottom-above-right': { label: 'r' },
                        'bottom-above-left': { label: 's' }
                    }
                })
            },
            {
                questionType: 'check-4', skill: 'parallel', asked: 'size',
                input: 'number', unit: '°', angles: { given: { 'top-above-right': 48 }, x: 'bottom-above-left' },
                prompt: 'Find angle x.',
                answer: '132',
                rules: [
                    mistake(48, '48° moves down to the bottom line as a corresponding angle. x is next to it on a straight line, so take it away from 180.'),
                    mistake(312, 'That uses 360°. x is on a straight line with the 48° angle.')
                ],
                fallback: 'Use corresponding angles, then the straight line.',
                feedback: 'Corresponding angles are equal, so the bottom above-right angle is 48°. 180 − 48 = 132°',
                figure: parallelFigure({
                    note: 'Not drawn accurately',
                    label: 'Two parallel lines crossed by a line, 48 degrees at the top and x at the bottom',
                    theta: 48,
                    corners: {
                        'top-above-right': { label: '48°' },
                        'bottom-above-left': { label: 'x', tone: 'highlight' }
                    }
                })
            },
            {
                questionType: 'check-5', skill: 'parallel', asked: 'judge',
                input: 'choice', angles: { given: {}, x: null },
                prompt: 'A line crosses two other lines. The angles in matching corners are 112° and 109°. Are the two lines parallel?',
                options: [
                    option('No. If they were parallel, the angles would be equal.', "Corresponding angles on parallel lines are equal. 112° and 109° aren't equal.", true),
                    option('Yes. Both angles are obtuse.', "Being the same type isn't enough. The angles would have to be equal."),
                    option('No. If they were parallel, the angles would add up to 180°.', "That's co-interior angles. Angles in matching corners are corresponding: they'd be equal."),
                    option('Yes. They are only 3° apart.', "Close isn't enough. On parallel lines these angles are exactly equal.")
                ],
                figure: parallelFigure({
                    note: 'Not drawn accurately',
                    label: 'A line crossing two lines that are not quite parallel, 112 degrees and 109 degrees in matching corners',
                    theta: 70,
                    arrows: 0,
                    skew: 0.5,
                    corners: {
                        'top-above-right': { label: '112°' },
                        'bottom-above-right': { label: '109°' }
                    }
                })
            },
            {
                questionType: 'check-6', skill: 'opposite', asked: 'size',
                input: 'number', unit: '°', angles: { given: { start: 72 }, x: 'vertical-next' },
                prompt: 'Two straight lines cross. One angle is 72°. Angle y is next to it. Angle z is opposite y. Find z.',
                answer: '108',
                rules: [
                    mistake(72, 'z is opposite y, not opposite the 72°. Find y first: 180 − 72.'),
                    mistake(288, 'That uses 360°. y is on a straight line with 72°, so y = 180 − 72.')
                ],
                fallback: 'Find y first, then use vertically opposite angles.',
                feedback: 'y = 180 − 72 = 108°. Vertically opposite angles are equal, so z = 108°',
                figure: crossingFigure({
                    note: 'Not drawn accurately',
                    label: 'Two straight lines crossing, one angle 72 degrees, y next to it and z opposite y',
                    lines: [[0, 180], [72, 252]],
                    sectors: [
                        { from: 0, to: 72, label: '72°' },
                        { from: 72, to: 180, label: 'y' },
                        { from: 252, to: 360, label: 'z', tone: 'highlight' }
                    ]
                })
            }
        ];
    }

    // ---------------------------------------------------------------
    // Practice
    // ---------------------------------------------------------------

    const practiceTypes = ['straight-line', 'around-point', 'opposite', 'find-the-pair', 'parallel-angle', 'which-reason'];

    const SKILLS = {
        'straight-line': 'point-line',
        'around-point': 'point-line',
        'opposite': 'opposite',
        'find-the-pair': 'parallel',
        'parallel-angle': 'parallel',
        'which-reason': 'parallel'
    };

    const INTERIOR = ['top-below-left', 'top-below-right', 'bottom-above-left', 'bottom-above-right'];
    const OTHER_CROSSING = { top: 'bottom', bottom: 'top' };

    function verticalOf(corner) {
        const [where, side, end] = corner.split('-');
        return [where, side === 'above' ? 'below' : 'above', end === 'left' ? 'right' : 'left'].join('-');
    }

    function correspondingOf(corner) {
        const [where, side, end] = corner.split('-');
        return [OTHER_CROSSING[where], side, end].join('-');
    }

    function flip(value) {
        return { above: 'below', below: 'above', left: 'right', right: 'left' }[value];
    }

    // Alternate: the other crossing, other side of the crossing line, still
    // between the lines (a Z shape).
    function alternateOf(corner) {
        if (!INTERIOR.includes(corner)) throw new TypeError(`${corner} is not between the parallel lines`);
        const [where, side, end] = corner.split('-');
        return [OTHER_CROSSING[where], flip(side), flip(end)].join('-');
    }

    // Co-interior: the other crossing, same side of the crossing line, still
    // between the lines (a C shape).
    function coInteriorOf(corner) {
        if (!INTERIOR.includes(corner)) throw new TypeError(`${corner} is not between the parallel lines`);
        const [where, side, end] = corner.split('-');
        return [OTHER_CROSSING[where], flip(side), end].join('-');
    }

    // How the two angles sit together, in words a pupil can use.
    const PAIR_WORDS = {
        vertical: 'opposite each other where the lines cross',
        corresponding: 'in matching corners',
        alternate: 'between the parallel lines, on opposite sides of the crossing line',
        coInterior: 'between the parallel lines, on the same side of the crossing line'
    };

    function pairFeedback(pair) {
        if (pair === 'vertical') return 'The two angles are opposite each other where the lines cross: vertically opposite, so they are equal.';
        if (pair === 'coInterior') return 'The two angles are between the parallel lines, on the same side of the crossing line: co-interior, so they add up to 180°.';
        if (pair === 'corresponding') return 'The two angles are in matching corners: corresponding, so they are equal.';
        return 'The two angles are between the parallel lines, on opposite sides of the crossing line, a Z shape: alternate, so they are equal.';
    }

    function wrongPairFeedback(name, corner, asked, letter) {
        if (name === verticalOf(corner)) {
            return `${letter} is opposite a where the lines cross. That's vertically opposite.`;
        }
        if (name === coInteriorOf(corner)) {
            return `${letter} is on the same side of the crossing line as a. That's co-interior: they add up to 180°.`;
        }
        if (name === alternateOf(corner)) {
            return `${letter} is between the lines, on the other side of the crossing line: a Z shape. That's alternate.`;
        }
        if (name === correspondingOf(corner)) {
            return `${letter} is in the same corner as a. That's corresponding.`;
        }
        return `${letter} is not the angle ${asked} to a.`;
    }

    // Whole numbers from 40 to 140, never 85 to 95.
    function wholeTheta(int) {
        let value = int(40, 140);
        while (value >= 85 && value <= 95) value = int(40, 140);
        return value;
    }

    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown angle facts question type: ${type}`);
        const note = 'Not drawn accurately';

        if (type === 'straight-line') {
            if (int(0, 1) === 0) {
                let g;
                do {
                    g = int(25, 155);
                } while (g === 90);
                const answer = 180 - g;
                return {
                    questionType: type, skill: SKILLS[type], asked: 'size',
                    input: 'number', unit: '°', angles: { given: { first: g }, x: 'second' },
                    prompt: 'Find angle x.',
                    answer: number(answer),
                    rules: [
                        mistake(360 - g, 'That uses 360°. The angles are on a straight line, so they add up to 180°.'),
                        mistake(g, 'x is next to g, on a straight line. They add up to 180°.')
                    ],
                    fallback: 'Angles on a straight line add up to 180°.',
                    feedback: 'Angles on a straight line add to 180°.',
                    figure: straightLineFigure({
                        note,
                        label: `A straight line with a line coming out of it, angles ${g} degrees and x`,
                        rays: [g],
                        sectors: [
                            { from: 0, to: g, label: degrees(g) },
                            { from: g, to: 180, label: 'x', tone: 'highlight' }
                        ]
                    })
                };
            }
            let a;
            let b;
            do {
                a = int(20, 100);
                b = int(20, 100);
            } while (!(a + b <= 160 && a + b !== 90 && a !== b));
            const total = a + b;
            const answer = 180 - total;
            return {
                questionType: type, skill: SKILLS[type], asked: 'size',
                input: 'number', unit: '°',
                angles: { given: { first: a, second: b }, x: 'third' },
                prompt: 'Find angle x.',
                answer: number(answer),
                rules: [
                    mistake(360 - total, 'That uses 360°. The angles are on a straight line, so they add up to 180°.'),
                    mistake(total, 'That adds the two you know. Now take that away from 180.')
                ],
                fallback: 'Angles on a straight line add up to 180°.',
                feedback: 'Add the known angles before subtracting from 180°.',
                figure: straightLineFigure({
                    note,
                    label: `A straight line with two lines coming out of it, angles ${a} degrees, ${b} degrees and x`,
                    rays: [a, total],
                    sectors: [
                        { from: 0, to: a, label: degrees(a) },
                        { from: a, to: total, label: degrees(b) },
                        { from: total, to: 180, label: 'x', tone: 'highlight' }
                    ]
                })
            };
        }

        if (type === 'around-point') {
            let values = null;
            while (!values) {
                const three = int(0, 1) === 1;
                const trial = three ? [int(40, 120), int(40, 120), int(40, 120)] : [int(40, 170), int(40, 170)];
                const total = trial.reduce((sum, value) => sum + value, 0);
                if (three ? total > 300 : (total < 150 || total > 300)) continue;
                const answer = 360 - total;
                const wrongs = [180 - total, 360 - Math.max(...trial), total];
                if (new Set([answer, ...wrongs]).size !== 4) continue;
                values = trial;
            }
            const total = values.reduce((sum, value) => sum + value, 0);
            const answer = 360 - total;
            const biggest = Math.max(...values);
            const sectors = [];
            let running = 0;
            for (const value of values) {
                sectors.push({ from: running, to: running + value, label: degrees(value) });
                running += value;
            }
            sectors.push({ from: running, to: 360, label: 'x', tone: 'highlight' });
            return {
                questionType: type, skill: SKILLS[type], asked: 'size',
                input: 'choice', angles: { given: { values }, x: 'last' },
                prompt: 'Find angle x.',
                options: shuffle([
                    option(`${number(answer)}°`, `Angles around a point add up to 360°. ${values.join(' + ')} = ${total}. 360 − ${total} = ${number(answer)}°`, true),
                    option(`${signed(180 - total)}°`, 'That uses 180°. The angles go all the way round, so they add up to 360°.'),
                    option(`${number(360 - biggest)}°`, 'That only takes away one angle. Take away all the angles you know.'),
                    option(`${number(total)}°`, 'That adds the angles you know. Now take that away from 360.')
                ], random),
                figure: aroundPointFigure({
                    note,
                    label: `Lines from a point, angles ${values.join(' degrees, ')} degrees and x`,
                    rays: [0, ...sectors.slice(0, -1).map(sector => sector.to)],
                    sectors
                })
            };
        }

        if (type === 'opposite') {
            let g;
            do {
                g = int(20, 160);
            } while (g === 90);
            const isOpposite = int(0, 1) === 1;
            const answer = isOpposite ? g : 180 - g;
            return {
                questionType: type, skill: SKILLS[type], asked: 'size',
                input: 'number', unit: '°',
                angles: { given: { start: g }, x: isOpposite ? 'opposite' : 'next' },
                prompt: 'Two straight lines cross. Find angle x.',
                answer: number(answer),
                rules: isOpposite
                    ? [
                        mistake(180 - g, 'x is opposite g, not next to it. Vertically opposite angles are equal.'),
                        mistake(360 - g, 'Vertically opposite angles are equal.')
                    ]
                    : [
                        mistake(g, 'x is next to g, on a straight line. They add up to 180°.'),
                        mistake(360 - g, 'x and g are on a straight line, so they add up to 180°.')
                    ],
                fallback: 'Look at where x is: opposite the angle you know, or next to it.',
                feedback: isOpposite
                    ? `x = ${g}°. Vertically opposite angles are equal.`
                    : `180 − ${g} = ${answer}°`,
                figure: crossingFigure({
                    note,
                    label: `Two straight lines crossing, one angle ${g} degrees and x`,
                    lines: [[0, 180], [g, 180 + g]],
                    sectors: isOpposite
                        ? [
                            { from: 0, to: g, label: degrees(g) },
                            { from: 180, to: 180 + g, label: 'x', tone: 'highlight' }
                        ]
                        : [
                            { from: 0, to: g, label: degrees(g) },
                            { from: g, to: 180, label: 'x', tone: 'highlight' }
                        ]
                })
            };
        }

        if (type === 'find-the-pair') {
            const theta = wholeTheta(int);
            const corner = choose(INTERIOR);
            const relation = choose(['corresponding', 'alternate', 'coInterior']);
            const target = relation === 'corresponding' ? correspondingOf(corner)
                : relation === 'alternate' ? alternateOf(corner) : coInteriorOf(corner);
            const others = [
                correspondingOf(corner), alternateOf(corner), coInteriorOf(corner), verticalOf(corner)
            ];
            const order = shuffle(others, random);
            const named = new Map();
            order.forEach((name, index) => named.set(name, ['b', 'c', 'd', 'e'][index]));
            const marks = {};
            for (const [name, letter] of named) {
                if (name === target) {
                    marks[letter] = {
                        correct: true,
                        feedback: `${letter} is ${PAIR_WORDS[relation]}. ${relation === 'corresponding' ? 'Corresponding angles are equal.'
                            : relation === 'alternate' ? 'Alternate angles make a Z shape.' : 'Co-interior angles add up to 180°.'}`
                    };
                } else {
                    marks[letter] = { feedback: wrongPairFeedback(name, corner, relation === 'coInterior' ? 'co-interior' : relation, letter) };
                }
            }
            const lettersAt = { [corner]: 'a' };
            for (const [name, letter] of named) lettersAt[name] = letter;
            const asked = relation === 'coInterior' ? 'co-interior' : relation;
            return {
                questionType: type, skill: SKILLS[type], asked: 'pair',
                input: 'custom',
                angles: { given: { [corner]: cornerAngle(theta, corner) }, x: target, relation },
                prompt: `Tap the angle that is ${asked} to angle a.`,
                marks: { ...marks },
                widget: tapWidget({
                    note,
                    label: `Two parallel lines crossed by a line, angles ${Object.values(lettersAt).join(', ')}`,
                    parallel: { theta, corners: Object.fromEntries(Object.entries(lettersAt).map(([name, letter]) => [
                        name, { label: letter, letter: true, select: true, name: letter, ...(letter === 'a' ? { tone: 'highlight' } : {}) }
                    ])) },
                    marks: { ...marks }
                })
            };
        }

        if (type === 'parallel-angle') {
            const theta = wholeTheta(int);
            const corner = choose(INTERIOR);
            const relation = choose(['corresponding', 'alternate', 'coInterior']);
            const target = relation === 'corresponding' ? correspondingOf(corner)
                : relation === 'alternate' ? alternateOf(corner) : coInteriorOf(corner);
            const g = cornerAngle(theta, corner);
            const answer = relation === 'coInterior' ? 180 - g : g;
            const wrong = relation === 'coInterior' ? g : 180 - g;
            return {
                questionType: type, skill: SKILLS[type], asked: 'size',
                input: 'number', unit: '°',
                angles: { given: { [corner]: g }, x: target, relation },
                prompt: 'Find angle x.',
                answer: number(answer),
                rules: [
                    mistake(wrong, relation === 'coInterior'
                        ? `x and ${g}° are co-interior, so they add up to 180°, not equal.`
                        : `x and ${g}° are ${relation === 'alternate' ? 'alternate' : 'corresponding'}, so they are equal. They don't add up to 180°.`),
                    mistake(360 - g, `That uses 360°. ${relation === 'coInterior' ? 'Co-interior angles add up to 180°.' : 'Find the pair first: corresponding and alternate angles are equal.'}`)
                ],
                fallback: 'Find the pair first: which angle matches x?',
                feedback: relation === 'coInterior'
                    ? `180 − ${g} = ${answer}°`
                    : `x = ${g}°. ${relation === 'alternate' ? 'Alternate' : 'Corresponding'} angles are equal.`,
                figure: parallelFigure({
                    note,
                    label: `Two parallel lines crossed by a line, ${g} degrees and x`,
                    theta,
                    corners: { [corner]: { label: degrees(g) }, [target]: { label: 'x', tone: 'highlight' } }
                })
            };
        }

        // which-reason
        const theta = wholeTheta(int);
        const corner = choose(INTERIOR);
        const pair = choose(['vertical', 'corresponding', 'alternate', 'coInterior']);
        const target = pair === 'vertical' ? verticalOf(corner)
            : pair === 'corresponding' ? correspondingOf(corner)
                : pair === 'alternate' ? alternateOf(corner) : coInteriorOf(corner);
        const g = cornerAngle(theta, corner);
        const x = pair === 'coInterior' ? 180 - g : g;
        const reasons = {
            vertical: REASONS.opposite,
            corresponding: REASONS.corresponding,
            alternate: REASONS.alternate,
            coInterior: REASONS.coInterior
        };
        const wrongs = {
            vertical: 'Vertically opposite angles are at the same crossing. These two are at different crossings.',
            corresponding: 'Corresponding angles are in matching corners, an F shape. These two are not in matching corners.',
            alternate: 'Alternate angles are between the parallel lines, on opposite sides of the crossing line: a Z shape. These two are not a Z.',
            coInterior: 'Co-interior angles are on the same side of the crossing line and add up to 180°. These two are not co-interior.'
        };
        const options = [option(reasons[pair], pairFeedback(pair), true)];
        for (const other of ['vertical', 'corresponding', 'alternate', 'coInterior']) {
            if (other !== pair) options.push(option(reasons[other], wrongs[other]));
        }
        return {
            questionType: type, skill: SKILLS[type], asked: 'reason',
            input: 'choice',
            angles: { given: { [corner]: g }, x: target, relation: pair },
            prompt: `x = ${x}°. Which reason is right?`,
            options: shuffle(options, random),
            figure: parallelFigure({
                note,
                label: `Two parallel lines crossed by a line, ${g} degrees and x`,
                theta,
                corners: { [corner]: { label: degrees(g) }, [target]: { label: 'x', tone: 'highlight' } }
            })
        };
    }

    // Each session has one card of every type, in a mixed order.
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        return shuffle(practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    // Choice options are shuffled with the seeded random, so a reload
    // shows the same card in the same order.
    function prepare(question, random) {
        return question.options
            ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) }
            : { ...question };
    }

    window.AngleFacts = {
        number, REASONS, REASON_LIST, learnScreens, examples, checks,
        practiceTypes, pick, generate, prepare, cornerAngle, shapeThrough,
        open, drawAngles, drawParallel, buildAngles, buildParallel
    };
})();
