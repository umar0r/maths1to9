(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const T = window.TimeSeries;
    const { element } = T;

    function picture(host, context, options = {}) {
        const graph = T.makeGraph(host, context);
        T.drawSeries(graph, context.values, options);
        graph.setEditable(false);
        return graph;
    }

    function readArrows(graph, x, y) {
        graph.arrow([x, 0], [x, y], { dash: true, tone: 'ink' });
        graph.arrow([x, y], [0, y], { dash: true, tone: 'ink' });
    }

    // Learn uses still pictures. All pupil interactions belong in Try it.
    const learn = {
        draw: [
            {
                heading: 'A time series graph shows how something changes over time.',
                draw(host) { return [picture(host, T.GAME)]; }
            },
            {
                heading: 'Time goes along the bottom, in order and evenly spaced. Plot each value above its time.',
                draw(host) {
                    T.table(host, T.GAME, 3);
                    const graph = picture(host, T.GAME, { join: false });
                    readArrows(graph, 3, 26);
                    host.append(T.note('In week 3 there were 26 thousand players, so the point sits above week 3, level with 26.'));
                    return [graph];
                }
            },
            {
                heading: 'Join each point to the next one with a straight line.',
                draw(host) {
                    const graph = picture(host, T.GAME);
                    host.append(T.note("Go in time order, from week 1 to week 6. Don't draw a line of best fit."));
                    return [graph];
                }
            }
        ],
        read: [
            {
                heading: 'To read a value, go up from the time to the point, then across to the side axis.',
                draw(host) {
                    const graph = picture(host, T.GOALS);
                    readArrows(graph, 4, 11);
                    host.append(T.note('In November the club scored 11 goals.'));
                    return [graph];
                }
            },
            {
                heading: 'The highest point shows the most. Its value is on the side axis, not the bottom.',
                draw(host) {
                    const graph = picture(host, T.GOALS, { labels: { 5: 'Most' } });
                    graph.arrow([5, 14], [0, 14], { dash: true, tone: 'ink' });
                    host.append(T.note('The most goals in a month was 14, in December.'));
                    return [graph];
                }
            }
        ],
        trend: [
            {
                heading: 'The trend is the way the graph is heading overall.',
                draw(host) {
                    const graph = picture(host, T.STREAMS);
                    graph.arrow([1, 2], [8, 10], { dash: true, tone: 'ink' });
                    host.append(T.note('The trend: the number of streams goes up over time.'));
                    return [graph];
                }
            },
            {
                heading: "A trend going up doesn't mean it goes up every time.",
                draw(host) {
                    const graph = picture(host, T.STREAMS, {
                        segmentTones: { 2: 'incorrect', 4: 'incorrect', 6: 'incorrect' }
                    });
                    host.append(T.note('Streams fell in March, May and July, but the trend is still up. Compare the start with the end.'));
                    return [graph];
                }
            }
        ],
        seasons: [
            {
                heading: 'Some graphs rise and fall the same way every year. This is a seasonal pattern.',
                draw(host) {
                    const graph = picture(host, T.SALES, { labels: { 4: 'Q4', 8: 'Q4' } });
                    host.append(T.note('A quarter is 3 months. Q4 is October to December.'));
                    host.append(T.note('Sales are highest in Q4 every year, when games are bought for Christmas.'));
                    return [graph];
                }
            },
            {
                heading: 'To see the trend, compare the same quarter in each year.',
                draw(host) {
                    const graph = picture(host, T.SALES);
                    graph.arrow([4, 30], [8, 34], { dash: true, tone: 'ink', label: '30 → 34' });
                    host.append(T.note("Q4 went from 30 thousand to 34 thousand, so sales are going up. The drop from Q4 to Q1 happens every year, so don't compare those."));
                    return [graph];
                }
            }
        ]
    };

    async function mountLearn(api, part) {
        const id = `explanation--${part}`;
        const host = document.getElementById(`lesson-section-${id}`);
        if (!host) return;
        const root = element('article');
        host.append(root);
        api.gateSection(id);
        const screens = learn[part];
        const section = await api.useSectionState(`learn:${part}`, {
            version: 1, upgrade: () => null,
            initial: () => ({ screen: 0, furthest: 0 })
        });
        const state = section.state;
        let boards = [];

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`${part}-learn-${state.screen + 1}`, { replace: true });
            }
        }
        function show(index) {
            section.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
            root.querySelector('[data-screen-heading]')?.focus();
        }
        function render() {
            boards.forEach(board => board.destroy());
            boards = [];
            root.replaceChildren();
            const index = state.screen;
            const heading = element('h2', screens[index].heading);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'time-series-picture');
            root.append(picture);
            boards = screens[index].draw(picture) || [];
            const last = index === screens.length - 1;
            api.setSectionAction(id, {
                label: last ? 'Continue' : 'Next',
                onClick() {
                    if (last) {
                        api.completeSection(id);
                        api.continueSection();
                    } else show(index + 1);
                }
            });
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, null);
            syncHash();
        }

        screens.forEach((_, index) => api.registerHashRoute(`${part}-learn-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.furthest));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        await mountLearn(api, section.part);
        // Stage 1 keeps the later activities empty while their Learn screens can be reviewed.
        api.gateSection(section.id);
        api.setSectionAction(section.id, { label: 'Continue', onClick() {
            api.completeSection(section.id);
            api.continueSection();
        } });
    };
})();
