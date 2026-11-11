(() => {
    'use strict';

    // Rounds away float noise, so 600 / 0.3 shows as 2000, not 1999.999999.
    const number = value => String(Number(Number(value).toPrecision(12)));
    const round = (value, places) => Math.round(value * 10 ** places + 1e-9) / 10 ** places;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(value), feedback });
    const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);
    const steps = (from, to, by) => Array.from({ length: Math.round((to - from) / by) + 1 },
        (_, index) => Number(number(from + index * by)));

    const practiceTypes = ['find-density', 'find-mass', 'find-volume', 'find-pressure', 'which-calculation', 'kg-to-g', 'pressure-calculation'];
    const TYPED_TYPES = ['find-density', 'find-mass', 'find-volume', 'find-pressure'];
    const DENSITY_TYPES = ['find-density', 'find-mass', 'find-volume'];
    const CHOICE_TYPES = ['which-calculation', 'kg-to-g', 'pressure-calculation'];

    const MATERIALS = ['a block of wood', 'a stone', 'a piece of plastic', 'a metal bar', 'a glass marble'];
    const PLACES = [
        { who: 'A box', where: 'the floor' },
        { who: 'A machine', where: 'the floor' },
        { who: 'A chair leg', where: 'the floor' },
        { who: 'A person', where: 'the ground' }
    ];

    const learnScreens = [
        {
            title: 'Same size, different mass',
            lines: [
                "In this lesson, you'll learn how to work out density and pressure. You can use a calculator.",
                'Mass is how heavy something is. It is measured in grams (g) or kilograms (kg).',
                '1 cm³ is a tiny cube, 1 cm long, 1 cm wide and 1 cm tall.',
                'These two blocks are the same size. Move the slider and compare them.'
            ],
            trays: [
                { name: 'Wood', density: 0.5, tone: 'wood' },
                { name: 'Metal', density: 8, tone: 'metal' }
            ],
            result: 'Same size. The metal is 16 times heavier, because each cm³ of metal is heavier.',
            sliders: [{ id: 'volume', label: 'Volume', min: 1, max: 12, step: 1, start: 6, unit: ' cm³' }]
        },
        {
            title: '8 g/cm³ means 8 g in each cm³',
            lines: [
                'Density tells you the mass of each cm³. 8 g/cm³ means 8 g in each cm³.',
                "You say it '8 grams per cubic centimetre'. Per means 'in each'.",
                'So 6 cm³ has a mass of 8 g six times: 8 × 6.'
            ],
            sliders: [
                { id: 'density', label: 'Density', min: 1, max: 10, step: 1, start: 8, unit: ' g/cm³' },
                { id: 'volume', label: 'Volume', min: 1, max: 12, step: 1, start: 6, unit: ' cm³' }
            ]
        },
        {
            title: 'Find the density: share it out',
            lines: [
                'Now turn it round. A stone has a mass of 72 g and a volume of 12 cm³.',
                'Share the 72 g equally between the 12 cm³. Each cm³ gets 6 g, so the density is 6 g/cm³.',
                'Sharing is dividing: density = mass ÷ volume.'
            ],
            sliders: [
                { id: 'mass', label: 'Mass', min: 24, max: 240, step: 24, start: 72, unit: ' g' },
                { id: 'volume', label: 'Volume', values: [1, 2, 3, 4, 6, 8, 12], start: 12, unit: ' cm³' }
            ]
        },
        {
            title: 'Find the volume: how many cm³ fit?',
            lines: [
                'A metal block has a mass of 48 g. Its density is 8 g/cm³, so each cm³ is 8 g.',
                'How many 8 g pieces make 48 g? 48 ÷ 8 = 6.',
                'So the volume is 6 cm³: volume = mass ÷ density.'
            ],
            callout: 'A heavier material needs fewer cm³ to make the same mass.',
            mass: 48,
            sliders: [{ id: 'density', label: 'Density', values: [1, 2, 3, 4, 6, 8, 12], start: 8, unit: ' g/cm³' }]
        },
        {
            title: 'The triangle comes from the unit',
            lines: [
                'g/cm³ means grams ÷ cm³: mass ÷ volume. So mass goes on top of the triangle. Density and volume sit underneath.',
                'Tap the one you want to find to cover it. The other two show you what to do.'
            ],
            callout: "You don't need to learn the triangle by heart. The unit tells you: g/cm³ has g on top.",
            key: 'density',
            unit: {
                chip: 'g/cm³', top: 'g', bottom: 'cm³',
                label: 'grams per cubic centimetre, which is grams divided by cm³'
            },
            names: { M: 'Mass', D: 'Density', V: 'Volume' },
            cover: {
                M: { rule: 'M = D × V', example: '8 × 6 = 48 g', how: 'Side by side means times.' },
                D: { rule: 'D = M ÷ V', example: '72 ÷ 12 = 6 g/cm³', how: 'One above the other means divide.' },
                V: { rule: 'V = M ÷ D', example: '48 ÷ 8 = 6 cm³', how: 'One above the other means divide.' }
            },
            start: 'D'
        },
        {
            title: 'Make the units match',
            lines: ['g/cm³ counts grams. So if the mass is in kg, change it to grams first: times by 1000.'],
            chips: ['1 kg = 1000 g', 'kg to g: × 1000. g to kg: ÷ 1000'],
            callout: "Don't work out 1.5 ÷ 2.5. The density is in grams, so the mass must be in grams too.",
            density: 2.5,
            sliders: [{ id: 'mass', label: 'Mass', min: 0.5, max: 3, step: 0.5, start: 1.5, unit: ' kg' }]
        },
        {
            title: 'Pressure: force on each m²',
            lines: [
                'A person pushes down on the snow with a force of 600 N.',
                'A force is a push. It is measured in newtons (N).',
                'Pressure is how much force pushes on each m². It is measured in N/m²: newtons per square metre.',
                'Pressure = force ÷ area.'
            ],
            callout: "Same force, bigger area, less pressure. That's why snowshoes stop you sinking.",
            force: 600,
            sliderNotes: [{ at: 'first', text: 'Boots' }, { at: 'last', text: 'Snowshoes' }],
            sliders: [{ id: 'area', label: 'Area touching the snow', values: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3], start: 0.05, unit: ' m²' }]
        },
        {
            title: 'The pressure triangle',
            lines: [
                'N/m² means newtons ÷ m²: force ÷ area. So force goes on top.',
                'It works just like the density triangle.'
            ],
            callout: 'Sometimes the area is in cm². Then the pressure is in N/cm².',
            key: 'pressure',
            unit: {
                chip: 'N/m²', top: 'N', bottom: 'm²',
                label: 'newtons per square metre, which is newtons divided by m²'
            },
            names: { F: 'Force', P: 'Pressure', A: 'Area' },
            cover: {
                F: { rule: 'F = P × A', example: '2000 × 0.3 = 600 N', how: 'Side by side means times.' },
                P: { rule: 'P = F ÷ A', example: '600 ÷ 0.3 = 2000 N/m²', how: 'One above the other means divide.' },
                A: { rule: 'A = F ÷ P', example: '600 ÷ 2000 = 0.3 m²', how: 'One above the other means divide.' }
            },
            start: 'P'
        }
    ];

    // values: { mass, density, volume } in grams, or { force, pressure, area },
    // with null for the one the question asks for.
    function card(questionType, values, asked, config) {
        return {
            questionType, values, asked,
            ...(config.input === 'number' ? { inputLabel: 'Answer' } : {}),
            ...config
        };
    }

    function examples() {
        return [
            card('try-1', { mass: null, density: 7.9, volume: null }, 'meaning', {
                input: 'choice', prompt: 'Iron has a density of 7.9 g/cm³. What does this mean?', options: [
                    option('Each cm³ of iron has a mass of 7.9 g', "Per means 'in each': 7.9 g in each cm³.", true),
                    option('A block of iron has a mass of 7.9 g', "7.9 g/cm³ doesn't tell you the mass of the whole block. It's the mass of each cm³."),
                    option('A block of iron has a volume of 7.9 cm³', "7.9 is a mass in grams, not a volume. It's the mass of each cm³."),
                    option('Each gram of iron takes up 7.9 cm³', "That's the wrong way round. g/cm³ means grams in each cm³.")
                ]
            }),
            card('try-2', { mass: null, density: 7.5, volume: 24 }, 'mass', {
                bankId: 'density-and-pressure-02', input: 'number', unit: 'g',
                prompt: 'A metal block has a volume of 24 cm³. Its density is 7.5 g/cm³. What is its mass?',
                answer: '180', rules: [
                    mistake(3.2, 'That divides. Each of the 24 cm³ has a mass of 7.5 g, so multiply.'),
                    mistake(31.5, 'That adds. Mass = density × volume.')
                ], fallback: 'Cover M: density × volume.', feedback: '7.5 × 24 = 180 g'
            }),
            card('try-3', { mass: 96, density: null, volume: 12 }, 'density', {
                input: 'number', unit: 'g/cm³',
                prompt: 'A stone has a mass of 96 g and a volume of 12 cm³. What is its density?',
                answer: '8', rules: [
                    mistake(1152, 'That multiplies. Share the 96 g between the 12 cm³: divide.'),
                    mistake(0.125, "That's the wrong way round. Density = mass ÷ volume, so the mass goes first."),
                    mistake(84, 'That takes 12 away. Divide the mass by the volume.')
                ], fallback: 'Density = mass ÷ volume.', feedback: '96 ÷ 12 = 8 g/cm³'
            }),
            card('try-4', { mass: 50, density: 2, volume: null }, 'calculation', {
                input: 'choice',
                prompt: 'A block has a mass of 50 g and a density of 2 g/cm³. Which calculation finds its volume?',
                options: [
                    option('50 ÷ 2', 'Volume = mass ÷ density. How many 2 g pieces make 50 g?', true),
                    option('2 ÷ 50', "That's the wrong way round. See how many 2 g pieces make 50 g: 50 ÷ 2."),
                    option('50 × 2', 'Multiplying gives 100, a mass bigger than the block. Cover V: mass ÷ density.'),
                    option('50 − 2', "Taking away doesn't give a volume. Divide.")
                ]
            }),
            card('try-5', { mass: 936, density: 2.6, volume: null }, 'volume', {
                bankId: 'density-and-pressure-03', input: 'number', unit: 'cm³',
                prompt: 'A sample has a mass of 936 g. Its density is 2.6 g/cm³. What is its volume?',
                answer: '360', rules: [
                    mistake(2433.6, 'That multiplies. See how many 2.6 g pieces make 936 g: divide.'),
                    mistake(936, '936 is the mass. Divide it by the density to get the volume.')
                ], fallback: 'Cover V: mass ÷ density.', feedback: '936 ÷ 2.6 = 360 cm³'
            }),
            card('try-6', { mass: 2400, density: null, volume: null }, 'grams', {
                input: 'choice', prompt: 'Write 2.4 kg in grams.', options: [
                    option('2400 g', '1 kg is 1000 g. 2.4 × 1000 = 2400 g.', true),
                    option('240 g', '1 kg is 1000 g, not 100 g. Times by 1000.'),
                    option('24 g', '1 kg is 1000 g. Times by 1000, not 10.'),
                    option('0.0024 g', 'That divides by 1000. To change kg to g, times by 1000.')
                ]
            }),
            card('try-7', { mass: 1620, density: null, volume: 180 }, 'density', {
                bankId: 'density-and-pressure-01', input: 'number', unit: 'g/cm³',
                prompt: 'A solid has a mass of 1.62 kg and a volume of 180 cm³. What is its density in g/cm³?',
                answer: '9', rules: [
                    mistake(0.009, 'That uses the mass in kg. The density is in grams, so change 1.62 kg to 1620 g first.'),
                    mistake(291.6, 'That multiplies. Density = mass ÷ volume.')
                ], fallback: 'Change the mass to grams first.', feedback: '1.62 kg = 1620 g. 1620 ÷ 180 = 9 g/cm³'
            }),
            card('try-8', { force: 300, pressure: null, area: 2 }, 'pressure', {
                input: 'choice',
                prompt: 'A box pushes down on the floor with a force of 300 N. Its base has an area of 2 m². What is the pressure?',
                options: [
                    option('150 N/m²', 'Pressure = force ÷ area. 300 ÷ 2 = 150 N/m²', true),
                    option('600 N/m²', 'That multiplies. Pressure is the force on each m², so divide.'),
                    option('298 N/m²', 'That takes 2 away. Divide the force by the area.'),
                    option('0.0067 N/m²', "That's the wrong way round. Force ÷ area: the force goes first.")
                ]
            }),
            card('try-9', { force: null, pressure: 40, area: 3 }, 'force', {
                input: 'number', unit: 'N',
                prompt: 'A crate presses on the floor with a pressure of 40 N/m². Its base has an area of 3 m². What force does it push down with?',
                answer: '120', rules: [
                    mistake(13.33, 'That divides. 40 N pushes on each of the 3 m², so multiply.'),
                    mistake(43, 'That adds. Force = pressure × area.')
                ], fallback: 'Cover F: pressure × area.', feedback: '40 × 3 = 120 N'
            }),
            card('try-10', { mass: 2000, density: 0.8, volume: null }, 'mistake', {
                input: 'choice',
                prompt: "Ali says: 'A block has a mass of 2 kg and a density of 0.8 g/cm³. Its volume is 2 ÷ 0.8 = 2.5 cm³.' What has Ali done wrong?",
                options: [
                    option("Ali didn't change 2 kg to grams. It's 2000 ÷ 0.8 = 2500 cm³.",
                        'The density is in grams, so the mass must be in grams: 2 kg = 2000 g.', true),
                    option('Nothing. Ali is right.', 'Check it: 2.5 cm³ of this material has a mass of 2.5 × 0.8 = 2 g. That is not 2 kg.'),
                    option('Ali should multiply: 2 × 0.8 = 1.6 cm³', 'Multiplying finds a mass. Volume = mass ÷ density.'),
                    option('Ali divided the wrong way round: 0.8 ÷ 2 = 0.4 cm³', 'Volume = mass ÷ density, so the mass goes first.')
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-1', { mass: 150, density: 7.5, volume: null }, 'volume', {
                bankId: 'density-and-pressure-06', input: 'choice',
                prompt: 'Two solids have the same density. Solid A has a mass of 90 g and a volume of 12 cm³. Solid B has a mass of 150 g. What is the volume of solid B?',
                options: [
                    option('20 cm³', 'A has a density of 90 ÷ 12 = 7.5 g/cm³. B has a volume of 150 ÷ 7.5 = 20 cm³.', true),
                    option('12 cm³', "B has a bigger mass, so it can't have the same volume as A. Find the density first."),
                    option('1125 cm³', 'That multiplies 150 by the density. Volume = mass ÷ density.'),
                    option('0.05 cm³', "That's the wrong way round. Divide the mass by the density: 150 ÷ 7.5.")
                ]
            }),
            card('check-2', { mass: 1850, density: null, volume: 250 }, 'compare', {
                bankId: 'density-and-pressure-14', input: 'choice',
                prompt: 'A metal sample has a mass of 1.85 kg and a volume of 250 cm³. Steel has a density of 7.8 g/cm³. Could the sample be steel?',
                options: [
                    option('No. Its density is 7.4 g/cm³, not 7.8 g/cm³.', '1.85 kg = 1850 g. 1850 ÷ 250 = 7.4 g/cm³. That is not 7.8 g/cm³.', true),
                    option('No. Its density is 0.0074 g/cm³.', 'That uses the mass in kg. Change 1.85 kg to 1850 g first.'),
                    option('No. Its density is 0.135 g/cm³.', "That's the wrong way round. Density = mass ÷ volume: 1850 ÷ 250."),
                    option('No. Its density is 462 500 g/cm³.', 'That multiplies. Density = mass ÷ volume.')
                ]
            }),
            card('check-3', { force: 60, pressure: null, area: 0.2 }, 'pressure', {
                input: 'number', unit: 'N/m²',
                prompt: 'A box has a base 0.5 m long and 0.4 m wide. It pushes down on the floor with a force of 60 N. What is the pressure on the floor?',
                answer: '300', rules: [
                    mistake(12, 'That multiplies the force by the area. Pressure = force ÷ area.'),
                    mistake(120, 'That divides by 0.5 only. Find the area of the base first: 0.5 × 0.4.'),
                    mistake(150, 'That divides by 0.4 only. Find the area of the base first: 0.5 × 0.4.')
                ], fallback: 'Find the area of the base first.',
                feedback: 'The area is 0.5 × 0.4 = 0.2 m². 60 ÷ 0.2 = 300 N/m²'
            }),
            card('check-4', { mass: null, density: 19.3, volume: 50 }, 'mass', {
                input: 'number', unit: 'kg', tolerance: 0.001,
                prompt: 'Gold has a density of 19.3 g/cm³. A gold bar has a volume of 50 cm³. What is its mass in kg?',
                answer: '0.965', rules: [
                    mistake(965, "That's the mass in grams. Divide by 1000 to get kg."),
                    mistake(2.59, 'That divides. Mass = density × volume.')
                ], fallback: 'Find the mass in grams, then change it to kg.',
                feedback: '19.3 × 50 = 965 g. 965 ÷ 1000 = 0.965 kg'
            }),
            card('check-5', { force: 120, pressure: 300, area: 0.4 }, 'compare', {
                input: 'choice',
                prompt: "Two boxes each push down with a force of 120 N. Box A's base has an area of 0.4 m². Box B's base has an area of 0.6 m². Which box puts more pressure on the floor?",
                options: [
                    option('Box A: 300 N/m², more than 200 N/m²', 'A: 120 ÷ 0.4 = 300 N/m². B: 120 ÷ 0.6 = 200 N/m². The same force on a smaller area gives more pressure.', true),
                    option('Box B, because its base is bigger', 'A bigger area spreads the force out, so the pressure is less. Work out force ÷ area for each box.'),
                    option('Box B: 72 N/m², more than 48 N/m²', 'That multiplies force by area. Pressure = force ÷ area.'),
                    option('The same, because the forces are the same', "The forces are the same, but the areas aren't. Work out force ÷ area for each box.")
                ]
            }),
            card('check-6', { force: 600, pressure: 25, area: null }, 'area', {
                input: 'number', unit: 'cm²',
                prompt: 'A machine presses down with a force of 600 N. The pressure is 25 N/cm². What area does it press on?',
                answer: '24', rules: [
                    mistake(15000, 'That multiplies. Cover A: force ÷ pressure.'),
                    mistake(575, 'That takes 25 away. Area = force ÷ pressure.')
                ], fallback: 'Cover A: force ÷ pressure.', feedback: '600 ÷ 25 = 24 cm²'
            })
        ];
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }

    // Each session: find-pressure, two of the three density types, and the
    // three choice types.
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const density = shuffle(DENSITY_TYPES, random).slice(0, 2);
        const types = [...density, 'find-pressure', ...CHOICE_TYPES];
        return shuffle(types.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    // Keeps rules that differ from the answer, and from each other, by more than the tolerance.
    function cleanRules(answer, rules, tolerance = 0) {
        const kept = [];
        for (const rule of rules) {
            const value = Number(rule.value);
            if (value <= 0) continue;
            if ([answer, ...kept.map(each => Number(each.value))].some(other => Math.abs(other - value) <= tolerance + 1e-9)) continue;
            kept.push(rule);
        }
        return kept;
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown density question type: ${type}`);
        let question;

        if (type === 'find-density') {
            const material = capitalise(choose(MATERIALS));
            const density = choose(steps(0.5, 9.5, 0.5));
            const volume = int(4, 60);
            const mass = Number(number(density * volume));
            question = card(type, { mass, density: null, volume }, 'density', {
                input: 'number', unit: 'g/cm³',
                prompt: `${material} has a mass of ${number(mass)} g and a volume of ${volume} cm³. What is its density?`,
                answer: number(density), rules: cleanRules(density, [
                    mistake(round(mass * volume, 2), 'That multiplies. Share the mass between the cm³: divide.'),
                    mistake(round(mass - volume, 2), 'That takes the volume away. Divide the mass by the volume.')
                ]),
                fallback: 'Density = mass ÷ volume.',
                feedback: 'Density is the mass for each cubic centimetre.'
            });
        } else if (type === 'find-mass') {
            const material = capitalise(choose(MATERIALS));
            const density = choose(steps(0.5, 9.5, 0.5));
            const volume = int(4, 60);
            const mass = Number(number(density * volume));
            question = card(type, { mass: null, density, volume }, 'mass', {
                input: 'number', unit: 'g',
                prompt: `${material} has a volume of ${volume} cm³. Its density is ${number(density)} g/cm³. What is its mass?`,
                answer: number(mass), rules: cleanRules(mass, [
                    mistake(round(volume / density, 2), `That divides. Each cm³ has a mass of ${number(density)} g, so multiply.`),
                    mistake(round(density + volume, 2), 'That adds. Mass = density × volume.')
                ]),
                fallback: 'Cover M: density × volume.',
                feedback: 'Multiply the mass for one cubic centimetre by the volume.'
            });
        } else if (type === 'find-volume') {
            const volume = 10 * int(1, 60);
            const density = choose(steps(0.5, 9.5, 0.1));
            const mass = Number(number(density * volume));
            question = card(type, { mass, density, volume: null }, 'volume', {
                input: 'number', unit: 'cm³',
                prompt: `A sample has a mass of ${number(mass)} g. Its density is ${number(density)} g/cm³. What is its volume?`,
                answer: number(volume), rules: cleanRules(volume, [
                    mistake(round(mass * density, 2), `That multiplies. See how many ${number(density)} g pieces make ${number(mass)} g: divide.`),
                    mistake(mass, "That's the mass. Divide it by the density."),
                    mistake(round(mass - density, 2), 'That takes the density away. Divide the mass by the density.')
                ]),
                fallback: 'Cover V: mass ÷ density.',
                feedback: 'Divide mass by density to find volume.'
            });
        } else if (type === 'find-pressure') {
            const metric = int(0, 1) === 0;
            const place = choose(PLACES);
            const area = metric ? choose([0.1, 0.2, 0.25, 0.4, 0.5, 2, 3, 4, 5, 8]) : int(5, 60);
            const pressure = metric ? 10 * int(1, 50) : int(2, 20);
            const force = Number(number(pressure * area));
            const pressureUnit = metric ? 'N/m²' : 'N/cm²';
            const areaUnit = metric ? 'm²' : 'cm²';
            const unknown = choose(['pressure', 'force', 'area']);
            const both = `The area touching ${place.where} is ${number(area)} ${areaUnit}.`;
            let config;
            if (unknown === 'pressure') {
                config = {
                    unit: pressureUnit,
                    prompt: `${place.who} presses on ${place.where} with a force of ${number(force)} N. ${both} What is the pressure?`,
                    answer: number(pressure), rules: cleanRules(pressure, [
                        mistake(round(force * area, 2), `That multiplies. Pressure is the force on each ${areaUnit}, so divide.`),
                        mistake(round(area / force, 4), "That's the wrong way round. Force ÷ area: the force goes first."),
                        mistake(round(Math.abs(force - area), 2), `That takes ${number(area)} away. Divide the force by the area.`)
                    ]),
                    feedback: 'Pressure is force per unit of area.'
                };
            } else if (unknown === 'force') {
                config = {
                    unit: 'N',
                    prompt: `${place.who} presses on ${place.where}. The pressure is ${number(pressure)} ${pressureUnit}. ${both} What force is pushing down?`,
                    answer: number(force), rules: cleanRules(force, [
                        mistake(round(pressure / area, 2), `That divides. ${number(pressure)} N pushes on each of the ${number(area)} ${areaUnit}, so multiply.`),
                        mistake(round(area / pressure, 4), "That's the wrong way round. Force = pressure × area, so the pressure goes first."),
                        mistake(round(pressure + area, 2), 'That adds. Force = pressure × area.')
                    ]),
                    feedback: 'Multiply the force per unit of area by the whole area.'
                };
            } else {
                config = {
                    unit: areaUnit,
                    prompt: `${place.who} presses on ${place.where} with a force of ${number(force)} N. The pressure is ${number(pressure)} ${pressureUnit}. What area is touching ${place.where}?`,
                    answer: number(area), rules: cleanRules(area, [
                        mistake(round(force * pressure, 2), `That multiplies. See how many ${number(pressure)} N pieces make ${number(force)} N: divide.`),
                        mistake(round(pressure / force, 4), "That's the wrong way round. Area = force ÷ pressure, so the force goes first."),
                        mistake(round(Math.abs(force - pressure), 2), 'That takes away. Divide the force by the pressure.')
                    ]),
                    feedback: 'Divide force by pressure to find the area.'
                };
            }
            question = card(type, unknown === 'pressure' ? { force, pressure: null, area }
                : unknown === 'force' ? { force: null, pressure, area } : { force, pressure, area: null }, unknown, {
                input: 'number', ...config, fallback: `Cover ${unknown === 'pressure' ? 'P' : unknown === 'force' ? 'F' : 'A'}: ${unknown === 'force' ? 'pressure × area' : `force ÷ ${unknown === 'pressure' ? 'area' : 'pressure'}`}`
            });
        } else if (type === 'which-calculation') {
            const material = capitalise(choose(MATERIALS));
            let density;
            let volume;
            // Density and volume must be different numbers, or two buttons read the same.
            do {
                density = int(2, 9);
                volume = int(2, 12);
            } while (density === volume);
            const mass = density * volume;
            const unknown = choose(['density', 'volume', 'mass']);
            const m = `${mass}`;
            const d = `${density}`;
            const v = `${volume}`;
            let prompt;
            let options;
            if (unknown === 'density') {
                prompt = `${material} has a mass of ${m} g and a volume of ${v} cm³. Which calculation finds its density?`;
                options = [
                    option(`${m} ÷ ${v}`, `Density = mass ÷ volume. Share the ${m} g between the ${v} cm³.`, true),
                    option(`${v} ÷ ${m}`, "That's the wrong way round. Density = mass ÷ volume, so the mass goes first."),
                    option(`${m} × ${v}`, 'Multiplying gives a bigger number than the mass. Density = mass ÷ volume.'),
                    option(`${m} − ${v}`, "You can't take cm³ away from grams. Divide.")
                ];
            } else if (unknown === 'volume') {
                prompt = `${material} has a mass of ${m} g and a density of ${d} g/cm³. Which calculation finds its volume?`;
                options = [
                    option(`${m} ÷ ${d}`, `Volume = mass ÷ density. How many ${d} g pieces make ${m} g?`, true),
                    option(`${d} ÷ ${m}`, `That's the wrong way round. See how many ${d} g pieces make ${m} g: ${m} ÷ ${d}.`),
                    option(`${m} × ${d}`, 'Multiplying gives a mass bigger than the block. Cover V: mass ÷ density.'),
                    option(`${m} − ${d}`, "Taking away doesn't give a volume. Divide.")
                ];
            } else {
                prompt = `${material} has a volume of ${v} cm³ and a density of ${d} g/cm³. Which calculation finds its mass?`;
                options = [
                    option(`${d} × ${v}`, `Mass = density × volume. Each cm³ has ${d} g, so multiply.`, true),
                    option(`${d} ÷ ${v}`, `Dividing gives less than ${d} g. Each cm³ has ${d} g, so multiply.`),
                    option(`${v} ÷ ${d}`, 'That divides. Mass = density × volume.'),
                    option(`${d} + ${v}`, "You can't add cm³ and g/cm³. Multiply.")
                ];
            }
            question = card(type, unknown === 'density' ? { mass, density: null, volume }
                : unknown === 'volume' ? { mass, density, volume: null } : { mass: null, density, volume }, 'calculation',
            { input: 'choice', prompt, options });
        } else if (type === 'kg-to-g') {
            const material = capitalise(choose(MATERIALS));
            let volume;
            let density;
            let grams;
            let kilograms;
            let labels;
            do {
                volume = 50 * int(1, 40);
                density = choose([0.5, 0.8, 1.2, 1.5, 2, 2.5, 4, 5, 8]);
                grams = Number(number(volume * density));
                kilograms = Number(number(grams / 1000));
                labels = [
                    `${volume} cm³`,
                    `${number(round(kilograms / density, 3))} cm³`,
                    `${number(round(100 * kilograms / density, 3))} cm³`,
                    `${number(grams * density)} cm³`
                ];
            } while (!Number.isInteger(round(grams / 100, 6)) || new Set(labels).size < 4);
            const [right, inKg, hundred, multiplied] = labels;
            question = card(type, { mass: grams, density, volume: null }, 'volume', {
                input: 'choice',
                prompt: `${material} has a mass of ${number(kilograms)} kg. Its density is ${number(density)} g/cm³. What is its volume?`,
                options: [
                    option(right, `${number(kilograms)} kg = ${number(grams)} g. ${number(grams)} ÷ ${number(density)} = ${right}`, true),
                    option(inKg, 'That uses the mass in kg. The density counts grams, so change the kg to grams first: × 1000.'),
                    option(hundred, '1 kg is 1000 g, not 100 g.'),
                    option(multiplied, 'That multiplies. Volume = mass ÷ density.')
                ]
            });
        } else {
            const place = choose(PLACES);
            let pressure;
            let area;
            // Pressure and area must be different numbers, or two buttons read the same.
            do {
                pressure = 10 * int(1, 9);
                area = int(2, 9);
            } while (pressure === area);
            const force = pressure * area;
            const unknown = choose(['pressure', 'area', 'force']);
            const f = `${force}`;
            const p = `${pressure}`;
            const a = `${area}`;
            const noTakeAway = "You can't swap a force and an area like that. Force = pressure × area.";
            let prompt;
            let options;
            if (unknown === 'pressure') {
                prompt = `${place.who} pushes down with a force of ${f} N. The area touching ${place.where} is ${a} m². Which calculation finds the pressure?`;
                options = [
                    option(`${f} ÷ ${a}`, `Pressure = force ÷ area. N/m² means newtons ÷ m².`, true),
                    option(`${a} ÷ ${f}`, "That's the wrong way round. N/m² means newtons ÷ m², so the force goes first."),
                    option(`${f} × ${a}`, 'Multiplying gives far more than the force on one m². Pressure = force ÷ area.'),
                    option(`${f} − ${a}`, noTakeAway)
                ];
            } else if (unknown === 'area') {
                prompt = `${place.who} pushes down with a force of ${f} N. The pressure is ${p} N/m². Which calculation finds the area?`;
                options = [
                    option(`${f} ÷ ${p}`, `Area = force ÷ pressure. See how many ${p} N pieces make ${f} N.`, true),
                    option(`${p} ÷ ${f}`, "That's the wrong way round. Area = force ÷ pressure, so the force goes first."),
                    option(`${f} × ${p}`, 'Multiplying finds a bigger force. Cover A: force ÷ pressure.'),
                    option(`${f} − ${p}`, 'Taking away does not give an area. Divide.')
                ];
            } else {
                prompt = `${place.who} presses on ${place.where} with a pressure of ${p} N/m². The area touching ${place.where} is ${a} m². Which calculation finds the force?`;
                options = [
                    option(`${p} × ${a}`, `Force = pressure × area. ${p} N pushes on each of the ${a} m².`, true),
                    option(`${p} ÷ ${a}`, 'Dividing gives less than the pressure. Each m² takes the whole pressure, so multiply.'),
                    option(`${a} ÷ ${p}`, 'That divides the area by the pressure. Force = pressure × area.'),
                    option(`${p} + ${a}`, "You can't add N/m² and m². Multiply.")
                ];
            }
            question = card(type, unknown === 'pressure' ? { force, pressure: null, area }
                : unknown === 'area' ? { force, pressure, area: null } : { force: null, pressure, area }, 'calculation',
            { input: 'choice', prompt, options });
        }
        return prepare(question, random);
    }

    window.DensityAndPressure = {
        number, learnScreens, examples, checks,
        practiceTypes, TYPED_TYPES, DENSITY_TYPES, CHOICE_TYPES, pick, generate, prepare
    };
})();
