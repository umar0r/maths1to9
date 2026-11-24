(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'scatter-graph-outliers' : document.body.dataset.lessonId;
    const O = typeof module !== 'undefined' && module.exports ? require('./outliers.js') : window.Outliers;

    const partNames = { spot: 'Spot', read: 'Read', reason: 'Reason', ignore: 'Ignore' };

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    /* One picture of a whole graph, with no point picked out: every point is
       small and blue, and some can carry a letter. */
    function drawPoints(host, { points, labels = [], axisNames, label }) {
        const boardHost = element('div', '', 'outliers-graph');
        host.append(boardHost);
        const board = O.makeGraph(boardHost, { axisNames, label });
        points.forEach(point => {
            const text = labels.find(entry => O.samePoint(entry.point, point))?.text ?? null;
            const options = { size: 'small', tone: 'neutral', coordinates: false };
            if (text) options.label = text;
            board.point(point, options);
        });
        board.setEditable(false);
        return board;
    }

    /* The pictures the Check questions show. */
    const checkPictures = {
        sunshine: host => drawPoints(host, {
            axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
            label: 'Scatter graph of hours of sunshine and ice creams sold, with points labelled A, B, C and D.',
            points: [[1, 2], [2, 2], [3, 3], [4, 5], [5, 5], [6, 7], [7, 7], [9, 9], [8, 2]],
            labels: [
                { point: [9, 9], text: 'A' },
                { point: [8, 2], text: 'B' },
                { point: [1, 2], text: 'C' },
                { point: [5, 5], text: 'D' }
            ]
        }),
        revision: host => drawPoints(host, {
            axisNames: { x: 'Hours of revision', y: 'Test mark' },
            label: 'Scatter graph of hours of revision and test marks.',
            points: [[1, 2], [2, 3], [3, 3], [4, 4], [5, 6], [7, 7], [8, 8], [9, 9], [6, 1]]
        }),
        heating: host => drawPoints(host, {
            axisNames: O.contexts.heating.axisNames,
            label: 'Scatter graph of outdoor temperature and heating used.',
            points: [...O.sets.HEATING.main, O.sets.HEATING.outlier]
        })
    };

    function checkQuestion(definition, random, { shuffle }) {
        const question = {
            input: 'choice', questionType: definition.type, prompt: definition.prompt, lockedReview: true,
            options: shuffle([{ label: definition.correct, correct: true, feedback: definition.feedback },
                ...definition.wrong], random)
        };
        if (definition.picture) question.figure = host => checkPictures[definition.picture](host);
        return question;
    }

    /* Check: five fixed questions, each answer kept so Back shows it marked. */
    async function mountCheck(api, root) {
        const id = 'comparison';
        const { questions, summary } = api.getSection(id).config;
        const E = window.Maths1to9LessonEngine;
        const count = questions.length;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Check');
        api.gateSection(id);
        const section = await api.useSectionState(id, {
            version: 1, upgrade: () => null,
            initial: () => ({ index: 0, screen: 0, finished: false, cards: {}, seed: E.randomInt(0, 0xffffffff) })
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(state.screen === count ? 'summary' : `check-${state.screen + 1}`, { replace: true });
            }
        }
        function show(screen) {
            section.update(saved => { saved.screen = screen; });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            if (heading) {
                heading.tabIndex = -1;
                heading.focus();
            }
        }
        function progress() {
            const current = state.cards[`final-check-${state.index + 1}`];
            api.setSectionProgress(id, state.finished ? count : state.index + Number(current?.correct === true), count);
        }
        function render() {
            root.replaceChildren();
            api.setSectionBack(id, state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            api.setSectionPosition(id, null);
            if (state.finished) api.completeSection(id);
            if (state.screen === count && state.finished) {
                const heading = document.createElement('h3');
                heading.dataset.screenHeading = '';
                heading.textContent = summary.title;
                const list = document.createElement('ul');
                list.className = 'outliers-learned';
                summary.points.forEach(point => {
                    const item = document.createElement('li');
                    item.textContent = point.text;
                    list.append(item);
                });
                root.append(heading, list);
                api.setSectionReset(id, null);
                api.setSectionAction(id, {
                    label: 'All lessons',
                    async onClick() {
                        api.completeLesson();
                        await window.Maths1to9Progress.saveCurrentLesson();
                        window.location.assign(new URL('../../', window.location.href).href);
                    }
                });
            } else {
                const index = state.screen;
                const readOnly = index < state.index;
                api.createQuestion(root, {
                    ...checkQuestion(questions[index], E.seededRandom((state.seed + index) >>> 0), E),
                    sectionId: id, questionId: `final-check-${index + 1}`, scored: true, readOnly, lockedReview: true,
                    onFeedback: progress,
                    onContinue() {
                        section.update(saved => {
                            saved.index++;
                            saved.screen = saved.index;
                            saved.finished = saved.index === count;
                        });
                        progress();
                        render();
                    }
                });
                if (readOnly) api.setSectionAction(id, { label: 'Next', onClick: () => show(index + 1) });
            }
            syncHash();
        }

        for (let index = 0; index <= count; index++) {
            api.registerHashRoute(index === count ? 'summary' : `check-${index + 1}`, () => {
                if (!api.goToSection(id, { moveFocus: false })) return false;
                show(Math.min(index, state.index));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        progress();
        render();
    }

    /* Part Practice and Mixed Practice are placeholders until their stages:
       one screen that says so, and Continue. */
    function mountPracticePlaceholder(api, host, section) {
        const id = section.id;
        const box = host.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', section.part ? `${partNames[section.part]} Practice` : 'Mixed Practice');
        api.gateSection(id);
        host.replaceChildren();
        const root = element('article');
        host.append(root);
        const heading = element('h2', 'Not built yet.');
        heading.id = `lesson-section-title-${id}`;
        heading.dataset.screenHeading = '';
        root.append(heading);
        root.append(element('p', section.part
            ? `The ${partNames[section.part]} Practice questions are added in a later stage.`
            : 'Mixed Practice is added in a later stage.', 'outliers-note'));
        api.setSectionBack(id, null);
        api.setSectionReset(id, null);
        api.setSectionAction(id, {
            label: 'Continue',
            onClick() {
                api.completeSection(id);
                api.continueSection();
            }
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { checkQuestion, checkPictures, drawPoints };
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        for (const { id } of api.getSections()) {
            const section = api.getSection(id);
            const { kind } = section;
            if (kind !== 'question-bank' && kind !== 'comparison') continue;
            const host = document.getElementById(helpers.questionSetContainerId(slug, id));
            if (!host) continue;
            if (kind === 'question-bank') {
                mountPracticePlaceholder(api, host, section);
                continue;
            }
            await mountCheck(api, host);
        }
    };
})();
