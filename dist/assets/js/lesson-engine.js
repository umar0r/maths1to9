(() => {
    'use strict';

    const app = document.getElementById('lesson-app');

    if (!app) {
        console.error(
            'Lesson engine could not find #lesson-app.'
        );

        return;
    }

    const lessonSource = document.body.dataset.lessonSrc;
    const assessmentSessionId =
        `${Date.now().toString(36)}-` +
        Math.random().toString(36).slice(2, 10);

    if (!lessonSource) {
        showFatalError(
            'The lesson source has not been specified.'
        );

        return;
    }

    const state = {
        lesson: null,
        slug: '',
        sections: [],
        sectionElements: [],
        navigationButtons: [],
        navigationGroups: [],
        currentIndex: 0,
        highestUnlockedIndex: 0,
        finished: false,

        /*
         * Lesson modules can place their current Check / Retry /
         * Next action in the shared footer. One action is stored
         * per section, so hidden sections never leak controls into
         * the section the pupil is viewing.
         */
        sectionActions: new Map(),

        /*
         * Section gating. A lesson script can declare that a
         * section must be completed before the pupil can move
         * on. Sections that never register a gate behave
         * exactly as before, so older lessons are unaffected.
         */
        gatedSections: new Set(),
        completedSections: new Set()
    };

    const elements = {
        header: null,
        headerStageProgress: null,
        navigation: null,
        sectionActionButton: null,
        nextButton: null,
        status: null
    };

    initialise();

    async function initialise() {
        try {
            const lesson = await loadLesson(lessonSource);

            validateLesson(lesson);

            state.lesson = lesson;
            state.slug = getLessonSlug(lesson);
            state.sections = createSectionDefinitions(lesson);
            state.navigationGroups = createNavigationGroups(
                lesson,
                state.sections
            );

            if (state.sections.length === 0) {
                throw new Error(
                    'The lesson does not contain any displayable sections.'
                );
            }

            injectV2Styles();
            renderLesson();

            /*
             * Gating listeners must exist before any lesson
             * module mounts, because modules dispatch their
             * gate events during mounting.
             */
            listenForSectionGating();

            exposeLessonApi();
            mountLessonInteractive();

            document.dispatchEvent(
                new CustomEvent(
                    'maths1to9:lesson-rendered',
                    {
                        detail: {
                            lesson: state.lesson,
                            slug: state.slug,
                            sections: state.sections.map(
                                (section) => ({
                                    id: section.id,
                                    label: section.label
                                })
                            ),
                            interactiveRoot: document.getElementById(
                                `${state.slug}-interactive`
                            ),
                            questionsRoot: document.getElementById(
                                `${state.slug}-questions`
                            )
                        }
                    }
                )
            );

            showSection(0, {
                moveFocus: false,
                emitEvent: true
            });
        } catch (error) {
            console.error(error);

            showFatalError(
                error instanceof Error
                    ? error.message
                    : 'The lesson could not be loaded.'
            );
        }
    }

    async function loadLesson(source) {
        const response = await fetch(source, {
            cache: 'no-store',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(
                `lesson.json could not be loaded ` +
                `(${response.status}).`
            );
        }

        try {
            return await response.json();
        } catch {
            throw new Error(
                'lesson.json contains invalid JSON.'
            );
        }
    }

    function validateLesson(lesson) {
        if (
            lesson === null ||
            typeof lesson !== 'object' ||
            Array.isArray(lesson)
        ) {
            throw new Error(
                'lesson.json must contain a JSON object.'
            );
        }

        if (
            typeof lesson.title !== 'string' ||
            lesson.title.trim() === ''
        ) {
            throw new Error(
                'lesson.json must contain a lesson title.'
            );
        }

        const questionTypes =
            lesson.assessment?.question_types;

        if (questionTypes === undefined) {
            return;
        }

        if (!isObject(questionTypes)) {
            throw new Error(
                'assessment.question_types must be a JSON object.'
            );
        }

        Object.entries(questionTypes).forEach(
            ([questionType, mappedSkills]) => {
                const skillIds = Array.isArray(mappedSkills)
                    ? mappedSkills
                    : [mappedSkills];

                if (
                    normaliseText(questionType) === '' ||
                    skillIds.length === 0 ||
                    skillIds.some(
                        (skillId) => normaliseText(skillId) === ''
                    )
                ) {
                    throw new Error(
                        'Every assessment question type must map ' +
                        'to at least one skill id.'
                    );
                }
            }
        );
    }

    function getLessonSlug(lesson) {
        const suppliedSlug =
            typeof lesson.slug === 'string'
                ? lesson.slug.trim()
                : '';

        const bodyLessonId =
            document.body.dataset.lessonId?.trim() ?? '';

        const source =
            suppliedSlug ||
            bodyLessonId ||
            lesson.title ||
            'lesson';

        return source
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function createSectionDefinitions(lesson) {
        const sections = [];

        if (hasExplanation(lesson.explanation)) {
            sections.push({
                id: 'explanation',
                label: 'Learn',
                className: 'lesson-explanation',
                render(container) {
                    renderExplanation(
                        container,
                        lesson.explanation
                    );
                }
            });
        }

        if (hasMethod(lesson.method)) {
            sections.push({
                id: 'method',
                label: 'Method',
                className: 'lesson-method',
                render(container) {
                    renderMethod(
                        container,
                        lesson.method
                    );
                }
            });
        }

        if (hasInteractive(lesson.interactive)) {
            sections.push({
                id: 'interactive',
                label: 'Try it',
                className: 'lesson-interactive',
                render(container) {
                    renderInteractive(
                        container,
                        lesson.interactive
                    );
                }
            });
        }

        if (hasProductInteractive(lesson.product_interactive)) {
            sections.push({
                id: 'product-interactive',
                label: 'Explore',
                className: 'lesson-interactive',
                render(container) {
                    renderProductInteractive(
                        container,
                        lesson.product_interactive
                    );
                }
            });
        }

        if (hasExplore(lesson.explore)) {
            sections.push({
                id: 'explore',
                label: 'Explore',
                className: 'lesson-interactive',
                render(container) {
                    renderExplore(
                        container,
                        lesson.explore
                    );
                }
            });
        }

        if (
            Array.isArray(lesson.worked_examples) &&
            lesson.worked_examples.length > 0
        ) {
            sections.push({
                id: 'worked-examples',
                label: 'Worked examples',
                className: 'lesson-worked-examples',
                render(container) {
                    renderWorkedExamples(
                        container,
                        lesson.worked_examples,
                        lesson.worked_examples_title
                    );
                }
            });
        }

        if (isObject(lesson.summary) && hasItems(lesson.summary.points)) {
            sections.push({
                id: 'summary',
                label: 'Summary',
                className: 'lesson-summary',
                render(container) {
                    appendSectionHeading(container, lesson.summary, 'Summary', 'Key reminders', 'summary');
                    const list = createElement('ol', 'lesson-steps');
                    for (const point of safeArray(lesson.summary.points).filter(isObject)) {
                        const item = createElement('li', 'lesson-step');
                        item.append(
                            createElement('h3', 'lesson-step__title', normaliseText(point.title)),
                            createElement('p', 'lesson-step__text', normaliseText(point.text))
                        );
                        list.append(item);
                    }
                    container.append(list);
                }
            });
        }

        if (hasComparison(lesson.comparison)) {
            sections.push({
                id: 'comparison',
                label: 'Compare',
                className: 'lesson-questions',
                render(container) {
                    renderComparison(
                        container,
                        lesson.comparison
                    );
                }
            });
        }

        if (hasQuestionBank(lesson.question_bank)) {
            sections.push({
                id: 'question-bank',
                label: 'Practice',
                className: 'lesson-questions',
                render(container) {
                    renderQuestionBank(
                        container,
                        lesson.question_bank
                    );
                }
            });
        }

        /*
         * Optional authored ordering. Sections whose ids are not
         * listed keep their default position at the end. Lessons
         * without section_order are untouched.
         */
        const order = safeArray(lesson.section_order)
            .map(normaliseText)
            .filter(Boolean);

        if (order.length > 0) {
            sections.sort((a, b) => {
                const aIndex = order.indexOf(a.id);
                const bIndex = order.indexOf(b.id);

                return (
                    (aIndex === -1 ? order.length : aIndex) -
                    (bIndex === -1 ? order.length : bIndex)
                );
            });
        }

        return sections;
    }

    /*
     * Lessons can group their existing sections into a simpler pupil-facing
     * journey without changing section rendering, gates, or progress data.
     * Lessons without navigation_stages retain one navigation item per section.
     */
    function createNavigationGroups(lesson, sections) {
        const configuredStages = safeArray(
            lesson.navigation_stages
        ).filter(isObject);

        if (configuredStages.length === 0) {
            return sections.map((section, index) => ({
                id: section.id,
                label: section.label,
                sectionIndexes: [index],
                firstIndex: index,
                lastIndex: index
            }));
        }

        const usedSectionIds = new Set();
        const groups = [];

        configuredStages.forEach((stage, stageIndex) => {
            const id = normaliseText(stage.id) ||
                `stage-${stageIndex + 1}`;
            const sectionIds = safeArray(stage.sections)
                .map(normaliseText)
                .filter(Boolean);
            const sectionIndexes = sectionIds
                .map(findId => sections.findIndex(
                    section => section.id === findId
                ))
                .filter(index => index !== -1)
                .filter(index => {
                    const sectionId = sections[index].id;

                    if (usedSectionIds.has(sectionId)) {
                        return false;
                    }

                    usedSectionIds.add(sectionId);
                    return true;
                })
                .sort((a, b) => a - b);

            if (sectionIndexes.length === 0) {
                return;
            }

            groups.push({
                id,
                label: normaliseText(stage.label) || id,
                sectionIndexes,
                firstIndex: sectionIndexes[0],
                lastIndex: sectionIndexes.at(-1)
            });
        });

        sections.forEach((section, index) => {
            if (usedSectionIds.has(section.id)) {
                return;
            }

            groups.push({
                id: section.id,
                label: section.label,
                sectionIndexes: [index],
                firstIndex: index,
                lastIndex: index
            });
        });

        return groups;
    }

    function hasExplanation(explanation) {
        if (!isObject(explanation)) {
            return false;
        }

        return Boolean(
            normaliseText(explanation.title) ||
            normaliseText(explanation.eyebrow) ||
            hasItems(explanation.paragraphs) ||
            hasItems(explanation.key_points) ||
            hasItems(explanation.cards) ||
            isObject(explanation.hook)
        );
    }

    function hasMethod(method) {
        return (
            isObject(method) &&
            (
                normaliseText(method.title) !== '' ||
                hasItems(method.steps)
            )
        );
    }

    function hasInteractive(interactive) {
        return (
            isObject(interactive) &&
            (
                normaliseText(interactive.title) !== '' ||
                normaliseText(interactive.intro) !== ''
            )
        );
    }

    function hasQuestionBank(questionBank) {
        return (
            isObject(questionBank) &&
            (
                normaliseText(questionBank.title) !== '' ||
                normaliseText(questionBank.intro) !== ''
            )
        );
    }

    function hasProductInteractive(productInteractive) {
        return (
            isObject(productInteractive) &&
            (
                (
                    hasItems(productInteractive.factors) &&
                    normaliseText(productInteractive.product) !== ''
                ) || hasItems(productInteractive.examples)
            )
        );
    }

    function hasComparison(comparison) {
        return (
            isObject(comparison) &&
            hasItems(comparison.questions)
        );
    }

    function hasItems(value) {
        return Array.isArray(value) && value.length > 0;
    }

    function isObject(value) {
        return (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value)
        );
    }

    function normaliseText(value) {
        if (
            typeof value !== 'string' &&
            typeof value !== 'number'
        ) {
            return '';
        }

        return String(value).trim();
    }

    function renderLesson() {
        app.replaceChildren();

        const header = renderLessonHeader();
        const navigation = renderSectionNavigation();

        const sectionContainer = createElement(
            'div',
            'lesson-section-container'
        );

        state.sectionElements = state.sections.map(
            (definition, index) => {
                const section = createElement(
                    'section',
                    [
                        'lesson-section',
                        definition.className
                    ].join(' ')
                );

                section.id = `lesson-section-${definition.id}`;
                section.dataset.lessonSection = definition.id;
                section.dataset.sectionIndex = String(index);
                section.hidden = true;

                section.setAttribute(
                    'aria-labelledby',
                    `lesson-section-title-${definition.id}`
                );

                definition.render(section);

                sectionContainer.append(section);

                return section;
            }
        );

        const controls = renderLessonControls();

        app.append(
            header,
            navigation,
            sectionContainer,
            controls
        );

        document.title =
            `${state.lesson.title} | Maths1to9`;
    }

    function renderLessonHeader() {
        const header = createElement(
            'header',
            'lesson-header'
        );

        const inner = createElement(
            'div',
            'lesson-header__inner'
        );

        elements.header = header;

        const meta = createElement(
            'div',
            'lesson-header__meta'
        );

        const grade = normaliseText(
            state.lesson.grade
        );

        const estimatedMinutes = Number(
            state.lesson.estimated_minutes
        );

        if (grade !== '') {
            meta.append(
                createElement(
                    'span',
                    'lesson-tag',
                    `Grades ${grade}`
                )
            );
        }

        if (
            Number.isFinite(estimatedMinutes) &&
            estimatedMinutes > 0
        ) {
            meta.append(
                createElement(
                    'span',
                    'lesson-tag',
                    `${estimatedMinutes} minutes`
                )
            );
        }

        const title = createElement(
            'h1',
            'lesson-header__title',
            state.lesson.title
        );

        inner.append(meta, title);

        const subtitle = normaliseText(
            state.lesson.subtitle
        );

        if (subtitle !== '') {
            inner.append(
                createElement(
                    'p',
                    'lesson-header__subtitle',
                    subtitle
                )
            );
        }

        const stageProgress = createElement(
            'div',
            'lesson-header__stage-progress'
        );

        stageProgress.hidden = true;
        stageProgress.setAttribute('role', 'status');
        stageProgress.append(createElement('span'));
        inner.append(stageProgress);
        elements.headerStageProgress = stageProgress;

        header.append(inner);

        return header;
    }

    function renderSectionNavigation() {
        const navigation = createElement(
            'nav',
            'lesson-navigation'
        );

        navigation.setAttribute(
            'aria-label',
            state.lesson.navigation_stages
                ? 'Lesson stages'
                : 'Lesson sections'
        );

        if (safeArray(state.lesson.navigation_stages).length > 0) {
            navigation.classList.add('lesson-navigation--stages');
        }

        const buttonGroup = createElement(
            'div',
            'button-group lesson-navigation__buttons'
        );

        state.navigationButtons = state.navigationGroups.map(
            (group, index) => {
                const button = createElement(
                    'button',
                    'button lesson-navigation__button',
                    group.label
                );

                button.type = 'button';
                button.dataset.stageIndex = String(index);
                button.dataset.stageNumber = String(index + 1);
                button.disabled = group.firstIndex > 0;
                button.setAttribute(
                    'aria-controls',
                    `lesson-section-${
                        state.sections[group.firstIndex].id
                    }`
                );
                button.setAttribute(
                    'aria-pressed',
                    index === 0 ? 'true' : 'false'
                );

                button.addEventListener('click', () => {
                    if (
                        group.firstIndex >
                        state.highestUnlockedIndex
                    ) {
                        return;
                    }

                    showSection(group.firstIndex);
                });

                buttonGroup.append(button);

                return button;
            }
        );

        navigation.append(buttonGroup);
        elements.navigation = navigation;

        return navigation;
    }

    function renderLessonControls() {
        const footer = createElement(
            'footer',
            'lesson-controls'
        );

        const buttonGroup = createElement(
            'div',
            'button-group lesson-controls__buttons'
        );

        elements.sectionActionButton = createElement(
            'button',
            'button',
            ''
        );

        elements.sectionActionButton.type = 'button';

        elements.sectionActionButton.addEventListener(
            'click',
            () => {
                const section =
                    state.sections[state.currentIndex];

                const action =
                    state.sectionActions.get(section?.id);

                if (
                    !action ||
                    action.disabled ||
                    typeof action.onClick !== 'function'
                ) {
                    return;
                }

                action.onClick();
            }
        );

        elements.nextButton = createElement(
            'button',
            'button button--primary',
            'Continue'
        );

        elements.nextButton.type = 'button';

        elements.nextButton.addEventListener(
            'click',
            handlePrimaryAction
        );

        elements.status = createElement(
            'p',
            'lesson-controls__status'
        );

        elements.status.id = 'lesson-status';
        elements.status.setAttribute(
            'role',
            'status'
        );
        elements.status.setAttribute(
            'aria-live',
            'polite'
        );

        /*
         * Controls are inserted by updateControls(). This prevents
         * an unavailable section action or Continue button
         * from flashing into view while the lesson is rendering.
         */
        buttonGroup.hidden = true;

        elements.controlButtonGroup = buttonGroup;

        footer.append(
            buttonGroup,
            elements.status
        );

        return footer;
    }

    function renderExplanation(container, explanation) {
        if (
            hasItems(explanation.cards) ||
            isObject(explanation.hook)
        ) {
            renderCardExplanation(container, explanation);

            return;
        }

        appendSectionHeading(
            container,
            explanation,
            'Explanation',
            'What you need to know',
            'explanation'
        );

        /*
         * Optional lesson video. Sits at the top of Learn so a
         * teacher sharing their screen can play it without
         * scrolling. Configure per lesson in lesson.json:
         *
         *   "explanation": {
         *       "video": {
         *           "youtube_id": "dQw4w9WgXcQ",
         *           "title": "Place value in 3 minutes"
         *       }
         *   }
         *
         * or, for a self-hosted file:
         *
         *   "video": { "mp4": "./video.mp4", "poster": "./poster.jpg" }
         *
         * A top-level lesson.video works too.
         */
        renderLessonVideo(
            container,
            isObject(explanation.video)
                ? explanation.video
                : state.lesson.video
        );

        appendMedia(container, explanation.media);

        const copy = createElement(
            'div',
            'lesson-copy'
        );

        for (
            const paragraph of safeArray(
                explanation.paragraphs
            )
        ) {
            const text = normaliseText(paragraph);

            if (text !== '') {
                copy.append(
                    createElement('p', '', text)
                );
            }
        }

        if (copy.childElementCount > 0) {
            container.append(copy);
        }

        const keyPoints = safeArray(
            explanation.key_points
        )
            .map(normaliseText)
            .filter(Boolean);

        if (keyPoints.length > 0) {
            const aside = createElement(
                'aside',
                'lesson-key-points'
            );

            aside.append(
                createElement('h3', '', 'Remember')
            );

            const list = document.createElement('ul');

            for (const point of keyPoints) {
                list.append(
                    createElement('li', '', point)
                );
            }

            aside.append(list);
            container.append(aside);
        }
    }

    function renderLessonVideo(container, video) {
        if (!isObject(video)) {
            return;
        }

        const youtubeId = normaliseText(video.youtube_id);
        const mp4 = normaliseText(video.mp4);

        if (youtubeId === '' && mp4 === '') {
            return;
        }

        const figure = createElement(
            'figure',
            'lesson-video'
        );

        const frame = createElement(
            'div',
            'lesson-video__frame'
        );

        if (youtubeId !== '') {
            const iframe =
                document.createElement('iframe');

            /*
             * youtube-nocookie keeps tracking cookies out of
             * the classroom until the pupil presses play.
             */
            iframe.src =
                'https://www.youtube-nocookie.com/embed/' +
                encodeURIComponent(youtubeId) +
                '?rel=0';

            iframe.title = normaliseText(
                video.title
            ) || 'Lesson video';

            iframe.loading = 'lazy';
            iframe.allow =
                'accelerometer; autoplay; ' +
                'clipboard-write; encrypted-media; ' +
                'gyroscope; picture-in-picture; ' +
                'web-share';
            iframe.allowFullscreen = true;
            iframe.referrerPolicy =
                'strict-origin-when-cross-origin';

            frame.append(iframe);
        } else {
            const player =
                document.createElement('video');

            player.src = mp4;
            player.controls = true;
            player.preload = 'metadata';
            player.playsInline = true;

            const poster = normaliseText(video.poster);

            if (poster !== '') {
                player.poster = poster;
            }

            frame.append(player);
        }

        figure.append(frame);

        const caption = normaliseText(video.caption);

        if (caption !== '') {
            figure.append(
                createElement(
                    'figcaption',
                    'lesson-video__caption',
                    caption
                )
            );
        }

        container.append(figure);
    }

    /*
     * Shared media renderer. Learn cards, Method steps and
     * Worked Examples all accept the same object:
     *
     *   "media": {
     *       "type": "image",          image | svg (both use <img>)
     *       "src": "./assets/images/coins.webp",
     *       "alt": "Five coins grouped together",
     *       "caption": "Optional caption",
     *       "size": "medium"          small | medium | large | wide
     *   }
     *
     * External SVG files loaded through <img> cannot run
     * scripts, so this stays consistent with the engine's
     * no-innerHTML policy.
     *
     * alt is required. For purely decorative images set
     * "decorative": true instead, which produces alt="" so
     * screen readers skip the image. A missing alt logs a
     * console warning and renders with empty alt rather than
     * breaking the lesson.
     */
    const MEDIA_SIZES = new Set([
        'small',
        'medium',
        'large',
        'wide'
    ]);

    function renderMedia(media) {
        if (!isObject(media)) {
            return null;
        }

        const src = normaliseText(media.src);

        if (src === '') {
            return null;
        }

        const type = normaliseText(media.type);

        if (
            type !== '' &&
            type !== 'image' &&
            type !== 'svg'
        ) {
            console.warn(
                'Unknown media type "' + type +
                '" for ' + src + '. Skipping.'
            );

            return null;
        }

        const size = MEDIA_SIZES.has(media.size)
            ? media.size
            : 'medium';

        const figure = createElement(
            'figure',
            'lesson-media lesson-media--' + size
        );

        const image =
            document.createElement('img');

        image.src = src;
        image.loading = 'lazy';
        image.decoding = 'async';

        const alt = normaliseText(media.alt);

        if (alt !== '') {
            image.alt = alt;
        } else if (media.decorative === true) {
            image.alt = '';
        } else {
            console.warn(
                'Media "' + src + '" has no alt ' +
                'text. Add "alt" or set ' +
                '"decorative": true.'
            );

            image.alt = '';
        }

        figure.append(image);

        const caption = normaliseText(media.caption);

        if (caption !== '') {
            figure.append(
                createElement(
                    'figcaption',
                    'lesson-media__caption',
                    caption
                )
            );
        }

        return figure;
    }

    function appendMedia(container, media) {
        const figure = renderMedia(media);

        if (figure) {
            container.append(figure);
        }
    }

    function renderMethod(container, method) {
        if (method.interaction === 'place-value-locator') {
            renderGuidedPlaceValueMethod(container, method);

            return;
        }

        if (isRichMethod(method)) {
            renderRichMethod(container, method);

            return;
        }

        appendSectionHeading(
            container,
            method,
            'Step-by-step guide',
            'Method',
            'method'
        );

        const list = createElement(
            'ol',
            'lesson-steps'
        );

        for (const step of safeArray(method.steps)) {
            if (!isObject(step)) {
                continue;
            }

            const item = createElement(
                'li',
                'lesson-step'
            );

            const title = normaliseText(step.title);
            const text = normaliseText(step.text);

            if (title !== '') {
                item.append(
                    createElement(
                        'h3',
                        'lesson-step__title',
                        title
                    )
                );
            }

            if (text !== '') {
                item.append(
                    createElement(
                        'p',
                        'lesson-step__text',
                        text
                    )
                );
            }

            appendMedia(item, step.media);

            if (item.childElementCount > 0) {
                list.append(item);
            }
        }

        container.append(list);
    }

    function renderGuidedPlaceValueMethod(container, method) {
        container.classList.add('lesson-section--guided');

        const root = createElement(
            'div',
            'lesson-module place-value-guided-method'
        );

        root.id = `${state.slug}-guided-method`;
        root.dataset.guidedMethod = JSON.stringify(
            safeArray(method.guided_examples)
        );

        container.append(root);
    }

    function renderInteractive(container, interactive) {
        if (hasItems(interactive.rounds)) {
            renderInteractiveRounds(container, interactive);

            return;
        }

        if (!interactive.hide_heading) {
            appendSectionHeading(
                container,
                interactive,
                'Try it',
                'Try it yourself',
                'interactive'
            );
        }

        if (interactive.prominent_intro) {
            container.append(
                createElement(
                    'p',
                    'lesson-section__intro lesson-section__intro--prominent',
                    normaliseText(interactive.intro)
                )
            );
        } else {
            appendIntro(
                container,
                interactive.intro
            );
        }

        const interactiveRoot = createElement(
            'div',
            'lesson-module lesson-module--interactive'
        );

        interactiveRoot.id =
            `${state.slug}-interactive`;

        interactiveRoot.dataset.lessonModule =
            'interactive';

        interactiveRoot.dataset.interactive =
            state.slug;

        if (normaliseText(interactive.number) !== '') {
            interactiveRoot.dataset.number =
                normaliseText(interactive.number);
        }

        if (hasItems(interactive.columns)) {
            interactiveRoot.dataset.columns =
                JSON.stringify(interactive.columns);
        }

        container.append(interactiveRoot);
    }

    function renderProductInteractive(
        container,
        productInteractive
    ) {
        appendSectionHeading(
            container,
            productInteractive,
            'Explore',
            'Use what you already know',
            'product-interactive'
        );

        const known = normaliseText(
            productInteractive.known
        );

        if (known !== '') {
            container.append(
                createElement(
                    'p',
                    'interactive-equation',
                    known
                )
            );
        }

        const question = normaliseText(
            productInteractive.question
        );

        if (question !== '') {
            container.append(
                createElement(
                    'p',
                    'lesson-section__intro',
                    question
                )
            );
        }

        appendIntro(
            container,
            productInteractive.intro
        );

        const productRoot = createElement(
            'div',
            'lesson-module lesson-module--interactive'
        );

        productRoot.id =
            `${state.slug}-product-interactive`;

        productRoot.dataset.lessonModule =
            'product-interactive';

        productRoot.dataset.factors =
            JSON.stringify(
                safeArray(productInteractive.factors)
            );

        productRoot.dataset.product =
            normaliseText(productInteractive.product);

        if (hasItems(productInteractive.examples)) {
            productRoot.dataset.productExamples =
                JSON.stringify(productInteractive.examples);
        }

        if (hasItems(productInteractive.columns)) {
            productRoot.dataset.columns =
                JSON.stringify(
                    productInteractive.columns
                );
        }

        if (Number.isFinite(productInteractive.minimum_offset)) {
            productRoot.dataset.minimumOffset =
                String(productInteractive.minimum_offset);
        }

        if (Number.isFinite(productInteractive.maximum_offset)) {
            productRoot.dataset.maximumOffset =
                String(productInteractive.maximum_offset);
        }

        container.append(productRoot);
    }

    function renderComparison(container, comparison) {
        appendSectionHeading(
            container,
            comparison,
            'Try it',
            'Compare the decimals',
            'comparison'
        );

        appendIntro(
            container,
            comparison.intro
        );

        const comparisonRoot = createElement(
            'div',
            'lesson-module lesson-module--questions'
        );

        comparisonRoot.id =
            `${state.slug}-comparison`;

        comparisonRoot.dataset.lessonModule =
            'comparison';

        comparisonRoot.dataset.questions =
            JSON.stringify(
                safeArray(comparison.questions)
            );

        container.append(comparisonRoot);
    }

    function mountLessonInteractive() {
        /*
         * JSON-driven rounds are rendered by the engine itself,
         * so no per-lesson interactive module is expected.
         */
        if (hasItems(state.lesson?.interactive?.rounds)) {
            return;
        }

        const interactiveRoot =
            document.getElementById(
                `${state.slug}-interactive`
            );

        if (!interactiveRoot) {
            return;
        }

        const mountInteractive =
            window.Maths1to9Interactives?.[
                state.slug
            ];

        if (typeof mountInteractive !== 'function') {
            console.warn(
                `No interactive has been registered for ` +
                `"${state.slug}".`
            );

            return;
        }

        mountInteractive(interactiveRoot);
    }

    function renderWorkedExamples(
        container,
        workedExamples,
        title
    ) {
        const headingData = {
            eyebrow: 'Worked examples',
            title: normaliseText(title) || 'See the method in action'
        };

        appendSectionHeading(
            container,
            headingData,
            'Worked examples',
            'See the method in action',
            'worked-examples'
        );

        const list = createElement(
            'div',
            'worked-example-list'
        );

        workedExamples.forEach((example, index) => {
            if (!isObject(example)) {
                return;
            }

            const article = createElement(
                'article',
                'worked-example'
            );

            const exampleLabel =
                normaliseText(example.eyebrow) ||
                `Example ${index + 1}`;

            article.append(
                createElement(
                    'p',
                    'worked-example__number',
                    exampleLabel
                )
            );

            const title = normaliseText(
                example.title
            );

            if (title !== '') {
                article.append(
                    createElement(
                        'h3',
                        'worked-example__title',
                        title
                    )
                );
            }

            appendMedia(article, example.media);

            if (hasItems(example.method_steps)) {
                renderRichWorkedExample(article, example);
                list.append(article);

                return;
            }

            const steps = safeArray(example.steps)
                .map(normaliseText)
                .filter(Boolean);

            const revealSteps = example.reveal_steps === true;

            if (steps.length > 0 && revealSteps) {
                let visibleStepCount = 1;
                const answer = normaliseText(example.answer);

                const renderRevealedSteps = () => {
                    article.querySelector('.worked-example__steps')?.remove();
                    article.querySelector('.worked-example__reveal')?.remove();
                    article.querySelectorAll('.worked-example__answer')
                        .forEach((element) => element.remove());

                    const stepList = createElement(
                        'ol',
                        'worked-example__steps'
                    );

                    steps.slice(0, visibleStepCount).forEach((step) => {
                        stepList.append(createElement('li', '', step));
                    });
                    article.append(stepList);

                    safeArray(example.step_callouts)
                        .slice(0, visibleStepCount)
                        .map(normaliseText)
                        .filter(Boolean)
                        .forEach((callout) => {
                            article.append(createElement(
                                'p',
                                'worked-example__answer',
                                callout
                            ));
                        });

                    if (visibleStepCount < steps.length) {
                        const revealButton = createElement(
                            'button',
                            'button worked-example__reveal',
                            'Continue'
                        );
                        revealButton.type = 'button';
                        revealButton.addEventListener('click', () => {
                            visibleStepCount += 1;
                            renderRevealedSteps();
                        });
                        article.append(revealButton);
                        return;
                    }

                    if (answer !== '') {
                        const answerButton = createElement(
                            'button',
                            'button worked-example__reveal',
                            'Show answer'
                        );
                        answerButton.type = 'button';
                        answerButton.addEventListener('click', () => {
                            answerButton.remove();
                            article.append(createElement(
                                'p',
                                'worked-example__answer',
                                answer
                            ));
                        });
                        article.append(answerButton);
                    }
                };

                renderRevealedSteps();
            } else if (steps.length > 0) {
                const stepList = createElement(
                    'ol',
                    'worked-example__steps'
                );

                for (const step of steps) {
                    stepList.append(
                        createElement('li', '', step)
                    );
                }

                article.append(stepList);
            }

            const answer = normaliseText(example.answer);

            if (answer !== '' && !revealSteps) {
                article.append(
                    createElement(
                        'p',
                        'worked-example__answer',
                        answer
                    )
                );
            }

            list.append(article);
        });

        container.append(list);
    }

    function renderQuestionBank(
        container,
        questionBank
    ) {
        if (!questionBank.hide_heading) {
            appendSectionHeading(
                container,
                questionBank,
                'Question bank',
                'Practise',
                'question-bank'
            );

            appendIntro(
                container,
                questionBank.intro
            );
        }

        if (hasItems(questionBank.method_reminder)) {
            const reminderRow = createElement(
                'div',
                'lx2-chip-row'
            );

            const reminderSteps = safeArray(
                questionBank.method_reminder
            );

            reminderSteps.forEach((step, index) => {
                reminderRow.append(
                    createElement(
                        'span',
                        'lx2-chip',
                        normaliseText(step)
                    )
                );

                if (index < reminderSteps.length - 1) {
                    reminderRow.append(
                        createElement(
                            'span',
                            'lx2-arrow',
                            '\u2192'
                        )
                    );
                }
            });

            container.append(reminderRow);
        }

        const questionsRoot = createElement(
            'div',
            'lesson-module lesson-module--questions'
        );

        questionsRoot.id =
            `${state.slug}-questions`;

        questionsRoot.dataset.lessonModule =
            'questions';

        if (Number.isFinite(Number(questionBank.session_length))) {
            questionsRoot.dataset.sessionLength = String(
                Number(questionBank.session_length)
            );
        }

        if (Number.isFinite(Number(questionBank.ready_score))) {
            questionsRoot.dataset.readyScore = String(
                Number(questionBank.ready_score)
            );
        }

        container.append(questionsRoot);
    }

    function appendSectionHeading(
        container,
        data,
        fallbackEyebrow,
        fallbackTitle,
        sectionId
    ) {
        const eyebrow = data.hide_eyebrow
            ? ''
            : (
                normaliseText(data.eyebrow) ||
                fallbackEyebrow
            );

        const title =
            normaliseText(data.title) ||
            fallbackTitle;

        if (eyebrow !== '') {
            container.append(
                createElement(
                    'p',
                    'lesson-eyebrow',
                    eyebrow
                )
            );
        }

        const heading = createElement(
            'h2',
            'lesson-section__title',
            title
        );

        heading.id =
            `lesson-section-title-${sectionId}`;

        heading.tabIndex = -1;

        container.append(heading);
    }

    function appendIntro(container, value) {
        const intro = normaliseText(value);

        if (intro === '') {
            return;
        }

        container.append(
            createElement(
                'p',
                'lesson-section__intro',
                intro
            )
        );
    }

    /*
     * Lesson scripts opt in to gating by dispatching:
     *
     *   maths1to9:section-gate      { sectionId }
     *   maths1to9:section-complete  { sectionId }
     *
     * Gate as soon as the activity mounts. Complete when the
     * pupil has finished it. The Continue button stays
     * disabled in between.
     */
    function listenForSectionGating() {
        document.addEventListener(
            'maths1to9:section-gate',
            (event) => {
                gateSectionById(
                    event.detail?.sectionId
                );
            }
        );

        document.addEventListener(
            'maths1to9:section-complete',
            (event) => {
                completeSectionById(
                    event.detail?.sectionId
                );
            }
        );
    }

    function gateSectionById(sectionId) {
        const id = normaliseText(sectionId);

        if (findSectionIndex(id) === -1) {
            return false;
        }

        state.gatedSections.add(id);
        updateControls();

        return true;
    }

    function completeSectionById(sectionId) {
        const id = normaliseText(sectionId);

        if (
            findSectionIndex(id) === -1 ||
            state.completedSections.has(id)
        ) {
            return false;
        }

        state.completedSections.add(id);
        updateControls();

        return true;
    }

    function isSectionComplete(index) {
        const section = state.sections[index];

        if (!section) {
            return true;
        }

        return (
            !state.gatedSections.has(section.id) ||
            state.completedSections.has(section.id)
        );
    }

    function handleNext() {
        const lastIndex =
            state.sections.length - 1;

        if (!isSectionComplete(state.currentIndex)) {
            return;
        }

        if (state.currentIndex < lastIndex) {
            const nextIndex =
                state.currentIndex + 1;

            state.highestUnlockedIndex = Math.max(
                state.highestUnlockedIndex,
                nextIndex
            );

            updateUnlockedNavigation();
            showSection(nextIndex);

            return;
        }

        finishLesson();
    }

    function handlePrimaryAction() {
        const section = state.sections[state.currentIndex];
        const action = state.sectionActions.get(section?.id);

        if (action && !action.disabled && typeof action.onClick === 'function') {
            action.onClick();
            return;
        }

        handleNext();
    }

    function showSection(
        index,
        options = {}
    ) {
        const {
            moveFocus = true,
            emitEvent = true,
            unlock = false
        } = options;

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= state.sections.length
        ) {
            return false;
        }

        if (
            index > state.highestUnlockedIndex &&
            !unlock
        ) {
            return false;
        }

        if (unlock) {
            state.highestUnlockedIndex = Math.max(
                state.highestUnlockedIndex,
                index
            );

            updateUnlockedNavigation();
        }

        state.currentIndex = index;

        state.sectionElements.forEach(
            (sectionElement, sectionIndex) => {
                const isCurrent =
                    sectionIndex === index;

                sectionElement.hidden = !isCurrent;
                sectionElement.classList.toggle(
                    'is-active',
                    isCurrent
                );
            }
        );

        const currentGroup = findNavigationGroup(index);

        updateHeaderMode(currentGroup);

        state.navigationButtons.forEach(
            (button, buttonIndex) => {
                const isCurrent =
                    state.navigationGroups[buttonIndex] ===
                    currentGroup;

                button.setAttribute(
                    'aria-pressed',
                    isCurrent ? 'true' : 'false'
                );

                button.classList.toggle(
                    'button--primary',
                    isCurrent
                );
                button.classList.toggle(
                    'lesson-navigation__button--complete',
                    state.navigationGroups[buttonIndex].lastIndex <
                    state.highestUnlockedIndex
                );
                button.classList.toggle(
                    'lesson-navigation__button--locked',
                    state.navigationGroups[buttonIndex].firstIndex >
                    state.highestUnlockedIndex
                );
            }
        );

        updateProgress();
        updateControls();

        const activeSection =
            state.sectionElements[index];

        if (moveFocus) {
            const heading =
                activeSection.querySelector('h2');

            heading?.focus({
                preventScroll: true
            });

            activeSection.scrollIntoView({
                behavior: prefersReducedMotion()
                    ? 'auto'
                    : 'smooth',
                block: 'start'
            });
        }

        if (emitEvent) {
            dispatchSectionChange();
        }

        return true;
    }

    function updateProgress() {
        // Progress is communicated by the stage navigation. Individual
        // activities can add their own focused progress indicator.
    }

    function updateHeaderMode(currentGroup) {
        const hasJourney = safeArray(
            state.lesson.navigation_stages
        ).length > 0;
        const isCompact = (
            hasJourney
            && currentGroup !== null
            && currentGroup.id !== 'learn'
        );

        elements.header?.classList.toggle(
            'lesson-header--compact',
            isCompact
        );

        const stageProgress = elements.headerStageProgress;
        if (!stageProgress) {
            return;
        }

        const stageIndex = state.navigationGroups.indexOf(
            currentGroup
        );
        const showStageProgress = isCompact && currentGroup.id !== 'practice';

        stageProgress.hidden = !showStageProgress;

        if (!showStageProgress) {
            return;
        }

        const stageNumber = stageIndex + 1;
        const totalStages = state.navigationGroups.length;

        stageProgress.style.setProperty(
            '--stage-progress',
            `${Math.round((stageNumber / totalStages) * 100)}%`
        );
        stageProgress.setAttribute(
            'aria-label',
            `${currentGroup.label}, stage ${stageNumber} of ${totalStages}`
        );
        stageProgress.querySelector('span').textContent = String(stageNumber);
    }

    function updateControls() {
        const isLast =
            state.currentIndex ===
            state.sections.length - 1;

        const complete =
            isSectionComplete(state.currentIndex);

        const section =
            state.sections[state.currentIndex];

        const sectionAction =
            state.sectionActions.get(section?.id);

        const showSectionAction = Boolean(sectionAction) && !state.finished;
        const showForward = complete && !(isLast && state.finished);
        const showPrimaryButton = showSectionAction || showForward;

        elements.sectionActionButton.remove();

        if (showPrimaryButton) {
            elements.nextButton.disabled = showSectionAction
                ? sectionAction.disabled
                : false;
            elements.controlButtonGroup.append(elements.nextButton);
        } else {
            elements.nextButton.remove();
        }

        elements.controlButtonGroup.hidden = !showPrimaryButton;

        elements.nextButton.textContent = showSectionAction
            ? sectionAction.label
            : 'Continue';

        if (state.finished) {
            elements.status.textContent =
                'Lesson complete.';
            elements.status.hidden = false;
        } else {
            elements.status.textContent = '';
            elements.status.hidden = true;
        }
    }

    function updateUnlockedNavigation() {
        state.navigationButtons.forEach(
            (button, index) => {
                button.disabled =
                    state.navigationGroups[index].firstIndex >
                    state.highestUnlockedIndex;
                button.classList.toggle(
                    'lesson-navigation__button--complete',
                    state.navigationGroups[index].lastIndex <
                    state.highestUnlockedIndex
                );
                button.classList.toggle(
                    'lesson-navigation__button--locked',
                    button.disabled
                );
            }
        );
    }

    function findNavigationGroup(sectionIndex) {
        return state.navigationGroups.find(group =>
            group.sectionIndexes.includes(sectionIndex)
        ) ?? null;
    }

    function finishLesson() {
        if (state.finished) {
            return;
        }

        state.finished = true;

        elements.status.textContent =
            'Lesson complete.';

        updateControls();

        document.dispatchEvent(
            new CustomEvent(
                'maths1to9:lesson-complete',
                {
                    detail: {
                        lessonId:
                            state.lesson.id ||
                            state.slug,

                        slug: state.slug,

                        sectionId:
                            state.sections[
                                state.currentIndex
                            ].id
                    }
                }
            )
        );
    }

    function dispatchSectionChange() {
        const currentSection =
            state.sections[state.currentIndex];

        document.dispatchEvent(
            new CustomEvent(
                'maths1to9:section-change',
                {
                    detail: {
                        lessonId:
                            state.lesson.id ||
                            state.slug,

                        slug: state.slug,

                        sectionId:
                            currentSection.id,

                        sectionIndex:
                            state.currentIndex,

                        sectionNumber:
                            state.currentIndex + 1,

                        totalSections:
                            state.sections.length,

                        highestUnlockedIndex:
                            state.highestUnlockedIndex
                    }
                }
            )
        );
    }

    function recordAssessment(detail) {
        if (!isObject(detail)) {
            return false;
        }

        const questionType = normaliseText(
            detail.questionType
        );
        const questionId = normaliseText(
            detail.questionId
        );
        const mappedSkills =
            state.lesson?.assessment?.question_types?.[
                questionType
            ];
        const skillIds = (
            Array.isArray(mappedSkills)
                ? mappedSkills
                : [mappedSkills]
        )
            .map(normaliseText)
            .filter(Boolean);

        if (
            questionType === '' ||
            questionId === '' ||
            typeof detail.correct !== 'boolean' ||
            skillIds.length === 0
        ) {
            return false;
        }

        const stableQuestionId =
            `${state.slug}:${assessmentSessionId}:${questionId}`;

        [...new Set(skillIds)].forEach((skillId) => {
            document.dispatchEvent(
                new CustomEvent('maths1to9:skill-attempt', {
                    detail: {
                        skillId,
                        questionId: stableQuestionId,
                        correct: detail.correct,
                        lessonSlug: state.slug,
                        questionType
                    }
                })
            );
        });

        return true;
    }

    function setSectionAction(sectionId, config) {
        const id = normaliseText(sectionId);

        if (
            findSectionIndex(id) === -1 ||
            !isObject(config) ||
            typeof config.onClick !== 'function'
        ) {
            return false;
        }

        const label = normaliseText(config.label);

        if (label === '') {
            return false;
        }

        state.sectionActions.set(id, {
            label,
            disabled: config.disabled === true,
            onClick: config.onClick
        });

        updateControls();

        return true;
    }

    function clearSectionAction(sectionId) {
        const id = normaliseText(sectionId);

        if (!state.sectionActions.delete(id)) {
            return false;
        }

        updateControls();

        return true;
    }

    function useButtonAsSectionAction(sectionId, button) {
        if (!(button instanceof HTMLButtonElement)) {
            return false;
        }

        const registered = setSectionAction(sectionId, {
            label: button.textContent,
            disabled: button.disabled,
            onClick: () => button.click()
        });

        if (!registered) {
            return false;
        }

        const row = button.closest(
            '.question-answer-row, .lesson-actions, .order-actions'
        );

        if (!row) {
            button.remove();
            return true;
        }

        /*
         * The lesson footer owns the current contextual action.
         * Remove every button in its former action row so a stale
         * sibling (for example, an old Next button) cannot remain in
         * a question card. Inputs stay in place for unusual rows that
         * also contain an answer field.
         */
        row.querySelectorAll('button').forEach(
            (rowButton) => rowButton.remove()
        );

        if (
            row.querySelectorAll('input, select, textarea').length === 0
        ) {
            row.remove();
        }

        return true;
    }

    function exposeLessonApi() {
        window.Maths1to9Lesson = {
            getLesson() {
                return state.lesson;
            },

            getSections() {
                return state.sections.map(
                    (section, index) => ({
                        id: section.id,
                        label: section.label,
                        index
                    })
                );
            },

            getCurrentSection() {
                const section =
                    state.sections[
                        state.currentIndex
                    ];

                return {
                    id: section.id,
                    label: section.label,
                    index: state.currentIndex
                };
            },

            getProgress() {
                return {
                    currentSectionId:
                        state.sections[
                            state.currentIndex
                        ].id,

                    currentSectionIndex:
                        state.currentIndex,

                    highestUnlockedIndex:
                        state.highestUnlockedIndex,

                    finished:
                        state.finished
                };
            },

            goToSection(sectionReference, options = {}) {
                const index = findSectionIndex(
                    sectionReference
                );

                if (index === -1) {
                    return false;
                }

                return showSection(index, {
                    unlock:
                        options.unlock === true,

                    moveFocus:
                        options.moveFocus !== false,

                    emitEvent:
                        options.emitEvent !== false
                });
            },

            restoreProgress(progress) {
                if (!isObject(progress)) {
                    return false;
                }

                const currentIndex =
                    findSectionIndex(
                        progress.currentSectionId ??
                        progress.currentSectionIndex
                    );

                if (currentIndex === -1) {
                    return false;
                }

                const requestedUnlocked =
                    Number.isInteger(
                        progress.highestUnlockedIndex
                    )
                        ? progress.highestUnlockedIndex
                        : currentIndex;

                state.highestUnlockedIndex =
                    clamp(
                        Math.max(
                            requestedUnlocked,
                            currentIndex
                        ),
                        0,
                        state.sections.length - 1
                    );

                state.finished =
                    progress.finished === true;

                updateUnlockedNavigation();

                return showSection(currentIndex, {
                    unlock: true,
                    moveFocus: false,
                    emitEvent: true
                });
            },

            gateSection(sectionId) {
                return gateSectionById(sectionId);
            },

            completeSection(sectionId) {
                return completeSectionById(sectionId);
            },

            recordAssessment(detail) {
                return recordAssessment(detail);
            },

            setSectionAction(sectionId, config) {
                return setSectionAction(sectionId, config);
            },

            clearSectionAction(sectionId) {
                return clearSectionAction(sectionId);
            },

            useButtonAsSectionAction(sectionId, button) {
                return useButtonAsSectionAction(sectionId, button);
            },

            completeLesson() {
                finishLesson();
            }
        };
    }

    function findSectionIndex(reference) {
        if (Number.isInteger(reference)) {
            return (
                reference >= 0 &&
                reference < state.sections.length
            )
                ? reference
                : -1;
        }

        const id = normaliseText(reference);

        if (id === '') {
            return -1;
        }

        return state.sections.findIndex(
            (section) => section.id === id
        );
    }

    function prefersReducedMotion() {
        return window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
        ).matches ?? false;
    }

    function safeArray(value) {
        return Array.isArray(value)
            ? value
            : [];
    }

    function clamp(value, minimum, maximum) {
        return Math.min(
            Math.max(value, minimum),
            maximum
        );
    }

    function createElement(
        tagName,
        className = '',
        text = null
    ) {
        const element =
            document.createElement(tagName);

        if (className !== '') {
            element.className = className;
        }

        if (text !== null) {
            element.textContent =
                normaliseText(text);
        }

        return element;
    }

    function showFatalError(message) {
        app.replaceChildren();

        const errorBox = createElement(
            'section',
            'lesson-section lesson-error'
        );

        errorBox.setAttribute(
            'role',
            'alert'
        );

        errorBox.append(
            createElement(
                'p',
                'lesson-eyebrow',
                'Lesson error'
            ),
            createElement(
                'h1',
                'lesson-section__title',
                'The lesson could not be displayed'
            ),
            createElement(
                'p',
                'lesson-section__intro',
                message
            )
        );

        app.append(errorBox);
    }

    /* ================================================================
     * v2 lesson schema support
     *
     * Everything below renders the card-based lesson schema
     * (hook + Learn cards, rich method steps, JSON-driven Try It
     * rounds, Explore playgrounds, rich worked examples). All v2
     * paths are reached only through shape detection, so every
     * existing lesson renders exactly as before.
     * ================================================================ */

    function isRichMethod(method) {
        return (
            isObject(method) &&
            safeArray(method.steps).some(
                (step) =>
                    isObject(step) &&
                    (
                        step.working !== undefined ||
                        step.check_question !== undefined ||
                        hasItems(step.show) ||
                        hasItems(step.checklist)
                    )
            )
        );
    }

    function hasExplore(explore) {
        return (
            isObject(explore) &&
            hasItems(explore.playgrounds)
        );
    }

    function renderCardExplanation(container, explanation) {
        appendSectionHeading(
            container,
            explanation,
            'Learn',
            'What you need to know',
            'explanation'
        );

        renderLessonVideo(
            container,
            isObject(explanation.video)
                ? explanation.video
                : state.lesson.video
        );

        appendMedia(container, explanation.media);

        appendIntro(container, explanation.intro);

        if (isObject(explanation.hook)) {
            container.append(buildHookCard(explanation.hook));
        }

        for (const card of safeArray(explanation.cards)) {
            if (isObject(card)) {
                container.append(buildLearnCard(card));
            }
        }

        const summary = safeArray(explanation.summary)
            .map(normaliseText)
            .filter(Boolean);

        if (summary.length > 0) {
            const aside = createElement('aside', 'lesson-key-points');
            aside.append(createElement('h3', '', 'Remember'));

            const list = document.createElement('ul');

            for (const point of summary) {
                list.append(createElement('li', '', point));
            }

            aside.append(list);
            container.append(aside);
        }
    }

    function buildHookCard(hook) {
        const card = createElement('article', 'lx2-card lx2-card--hook');

        const title = normaliseText(hook.title);
        if (title) card.append(createElement('h3', 'lx2-card__title', title));

        const context = normaliseText(hook.context);
        if (context) card.append(createElement('p', 'lx2-context', context));

        appendMedia(card, hook.media);

        const formula = normaliseText(hook.formula);
        if (formula) card.append(createElement('p', 'lx2-formula', formula));

        if (isObject(hook.letter_meanings)) {
            const meanings = createElement('dl', 'lx2-meanings');

            for (const [letter, meaning] of Object.entries(hook.letter_meanings)) {
                const row = createElement('div', 'lx2-meanings__row');
                row.append(
                    createElement('dt', '', letter),
                    createElement('dd', '', normaliseText(meaning))
                );
                meanings.append(row);
            }

            card.append(meanings);
        }

        const cases = safeArray(hook.cases).filter(isObject);

        if (cases.length > 0) {
            const grid = createElement('div', 'lx2-cases');

            for (const item of cases) {
                const mini = createElement('div', 'lx2-case');

                for (const key of ['label', 'given', 'substitution', 'answer']) {
                    const value = normaliseText(item[key]);
                    if (value) mini.append(createElement('p', 'lx2-case__' + key, value));
                }

                grid.append(mini);
            }

            card.append(grid);
        }

        if (hasItems(hook.options)) {
            card.append(buildChoice(hook));
        }

        return card;
    }

    function buildLearnCard(card) {
        const article = createElement('article', 'lx2-card');

        const title = normaliseText(card.title);
        if (title) article.append(createElement('h3', 'lx2-card__title', title));

        const formula = normaliseText(card.formula);
        if (formula) article.append(createElement('p', 'lx2-formula', formula));

        const inlineTransform = buildCardVisual({
            given: card.given,
            formula_before: card.formula_before,
            formula_after: card.formula_after
        });
        if (inlineTransform) article.append(inlineTransform);

        const visual = buildCardVisual(card.visual);
        if (visual) article.append(visual);

        appendMedia(article, card.media);

        const bigIdea = normaliseText(card.big_idea);
        if (bigIdea) article.append(createElement('p', 'lx2-big-idea', bigIdea));

        if (hasItems(card.options)) {
            article.append(buildChoice(card));
        }

        return article;
    }

    function buildCardVisual(visual) {
        if (!isObject(visual)) {
            return null;
        }

        const box = createElement('div', 'lx2-visual');

        if (
            visual.formula_before !== undefined ||
            visual.formula_after !== undefined
        ) {
            const given = normaliseText(visual.given);
            if (given) box.append(createElement('p', 'lx2-chip', given));

            const before = normaliseText(visual.formula_before);
            const after = normaliseText(visual.formula_after);

            box.append(createElement(
                'p',
                'lx2-transform',
                before + (before && after ? '  \u2192  ' : '') + after
            ));
        }

        if (isObject(visual.contrast)) {
            const row = createElement('div', 'lx2-chip-row');
            const good = normaliseText(visual.contrast.with_brackets);
            const bad = normaliseText(visual.contrast.without_brackets);
            if (good) row.append(createElement('span', 'lx2-chip is-good', '\u2713 ' + good));
            if (bad) row.append(createElement('span', 'lx2-chip is-bad', '\u2717 ' + bad));
            box.append(row);
        }

        if (
            visual.expression !== undefined &&
            visual.expansion !== undefined
        ) {
            box.append(createElement(
                'p',
                'lx2-transform',
                normaliseText(visual.expression) + ' = ' + normaliseText(visual.expansion)
            ));

            const readAs = normaliseText(visual.read_as);
            if (readAs) box.append(createElement('p', 'lx2-hint', '\u201c' + readAs + '\u201d'));
        }

        if (hasItems(visual.sample_values)) {
            const label = normaliseText(visual.label);
            if (label) box.append(createElement('p', 'lx2-hint', label));

            const row = createElement('div', 'lx2-chip-row');
            const letter = normaliseText(visual.letter);

            for (const value of visual.sample_values) {
                row.append(createElement(
                    'span',
                    'lx2-chip',
                    (letter ? letter + ' = ' : '') + normaliseText(value)
                ));
            }

            box.append(row);
        }

        if (hasItems(visual.inputs) && hasItems(visual.outputs)) {
            const grid = createElement('div', 'lx2-io');

            visual.inputs.forEach((input, index) => {
                grid.append(createElement(
                    'p',
                    'lx2-io__row',
                    normaliseText(input) + '  \u2192  ' +
                    normaliseText(visual.outputs[index] ?? '')
                ));
            });

            box.append(grid);
        }

        return box.childElementCount > 0 ? box : null;
    }

    function buildChoice(config) {
        const wrap = createElement('div', 'lx2-choice');

        const prompt = normaliseText(config.prompt);
        if (prompt) wrap.append(createElement('p', 'lx2-choice__prompt', prompt));

        const optionsRow = createElement('div', 'lx2-choice__options');
        const feedbackElement = createElement('p', 'lx2-choice__feedback');
        feedbackElement.hidden = true;

        const feedback = isObject(config.feedback) ? config.feedback : {};
        let answered = false;

        safeArray(config.options).forEach((option, index) => {
            const button = createElement('button', 'lx2-option', option);
            button.type = 'button';

            button.addEventListener('click', () => {
                if (answered) return;

                if (index === config.correct_index) {
                    answered = true;
                    button.classList.add('is-correct');
                    optionsRow.querySelectorAll('button').forEach((b) => {
                        b.disabled = true;
                    });
                    feedbackElement.textContent =
                        normaliseText(feedback.correct) || 'Correct.';
                    feedbackElement.className =
                        'lx2-choice__feedback is-correct';
                    feedbackElement.hidden = false;

                    if (typeof config.onCorrect === 'function') {
                        config.onCorrect();
                    }
                } else {
                    button.classList.add('is-wrong');
                    feedbackElement.textContent =
                        normaliseText(feedback.incorrect) ||
                        'Not quite. Try again.';
                    feedbackElement.className =
                        'lx2-choice__feedback is-wrong';
                    feedbackElement.hidden = false;
                }
            });

            optionsRow.append(button);
        });

        wrap.append(optionsRow, feedbackElement);
        return wrap;
    }

    function renderRichMethod(container, method) {
        appendSectionHeading(
            container,
            method,
            'Step-by-step guide',
            'Method',
            'method'
        );

        appendIntro(container, method.intro);

        if (isObject(method.example)) {
            const exampleBox = createElement('div', 'lx2-card lx2-card--example');

            const context = normaliseText(method.example.context);
            if (context) exampleBox.append(createElement('p', 'lx2-context', context));

            const formula = normaliseText(method.example.formula);
            if (formula) exampleBox.append(createElement('p', 'lx2-formula', formula));

            const givenList = Array.isArray(method.example.given)
                ? method.example.given
                : (method.example.given !== undefined ? [method.example.given] : []);

            if (givenList.length > 0) {
                const row = createElement('div', 'lx2-chip-row');

                for (const given of givenList) {
                    row.append(createElement('span', 'lx2-chip', normaliseText(given)));
                }

                exampleBox.append(row);
            }

            container.append(exampleBox);
        }

        const list = createElement('ol', 'lesson-steps lx2-method');
        const stepElements = [];
        const steps = safeArray(method.steps).filter(isObject);

        steps.forEach((step, index) => {
            const item = createElement('li', 'lesson-step lx2-step');

            const title = normaliseText(step.title);
            if (title) item.append(createElement('h3', 'lesson-step__title', title));

            const body = createElement('div', 'lx2-step__body');

            const instruction = normaliseText(step.instruction || step.text);
            if (instruction) body.append(createElement('p', 'lesson-step__text', instruction));

            const workingLines = Array.isArray(step.working)
                ? step.working
                : (step.working !== undefined ? [step.working] : []);

            for (const line of workingLines) {
                const text = normaliseText(line);
                if (text) body.append(createElement('p', 'lx2-live-line', text));
            }

            appendMedia(body, step.media);

            const showItems = safeArray(step.show).map(normaliseText).filter(Boolean);

            if (showItems.length > 0) {
                const notes = document.createElement('ul');
                notes.className = 'lx2-notes';
                for (const note of showItems) notes.append(createElement('li', '', note));
                body.append(notes);
            }

            const checklist = safeArray(step.checklist).map(normaliseText).filter(Boolean);

            if (checklist.length > 0) {
                const notes = document.createElement('ul');
                notes.className = 'lx2-notes';
                for (const check of checklist) {
                    notes.append(createElement('li', '', '\u2610 ' + check));
                }
                body.append(notes);
            }

            const advance = () => unlockStep(index + 1);

            if (
                normaliseText(step.check_question) !== '' &&
                hasItems(step.options)
            ) {
                body.append(buildChoice({
                    prompt: step.check_question,
                    options: step.options,
                    correct_index: step.correct_index,
                    onCorrect: advance
                }));
            } else if (index < steps.length - 1) {
                const button = createElement('button', 'lx2-continue', 'Next step');
                button.type = 'button';
                button.addEventListener('click', advance, { once: true });
                body.append(button);
            }

            item.append(body);
            list.append(item);
            stepElements.push(item);
        });

        container.append(list);
        unlockStep(0);

        function unlockStep(index) {
            stepElements.forEach((element, i) => {
                element.classList.toggle('lx2-step--locked', i > index);
                element.classList.toggle('lx2-step--done', i < index);
            });
        }
    }

    function renderInteractiveRounds(container, interactive) {
        appendSectionHeading(
            container,
            interactive,
            'Try it',
            'Try it yourself',
            'interactive'
        );

        appendIntro(container, interactive.intro);

        if (hasItems(interactive.method_steps)) {
            const row = createElement('div', 'lx2-chip-row');
            const reminderSteps = safeArray(interactive.method_steps);

            reminderSteps.forEach((step, index) => {
                row.append(createElement('span', 'lx2-chip', normaliseText(step)));
                if (index < reminderSteps.length - 1) {
                    row.append(createElement('span', 'lx2-arrow', '\u2192'));
                }
            });

            container.append(row);
        }

        const rounds = safeArray(interactive.rounds).filter(isObject);
        const wrap = createElement('div', 'lx2-rounds');
        container.append(wrap);

        /*
         * Gate the section so Continue only appears once every
         * round is complete. Deferred because section renderers
         * run before the lesson controls exist.
         */
        setTimeout(() => gateSectionById('interactive'), 0);

        let roundIndex = 0;
        showRound();

        function showRound() {
            wrap.textContent = '';

            const round = rounds[roundIndex];

            if (!round) {
                finishRounds();
                return;
            }

            const card = createElement('article', 'lx2-card');

            card.append(createElement(
                'p',
                'lx2-eyebrow',
                'Round ' + (roundIndex + 1) + ' of ' + rounds.length
            ));

            const title = normaliseText(round.title);
            if (title) card.append(createElement('h3', 'lx2-card__title', title));

            const context = normaliseText(round.context);
            if (context) card.append(createElement('p', 'lx2-context', context));

            const formula = normaliseText(round.formula);
            if (formula) card.append(createElement('p', 'lx2-formula', formula));

            const givenList = Array.isArray(round.given)
                ? round.given
                : (round.given !== undefined ? [round.given] : []);

            if (givenList.length > 0) {
                const row = createElement('div', 'lx2-chip-row');
                for (const given of givenList) {
                    row.append(createElement('span', 'lx2-chip', normaliseText(given)));
                }
                card.append(row);
            }

            const stageHost = createElement('div', 'lx2-stage-host');
            card.append(stageHost);
            wrap.append(card);

            runStage(round, 0, stageHost);
        }

        function runStage(round, stageIndex, host) {
            const stages = safeArray(round.stages).filter(isObject);
            const stage = stages[stageIndex];

            if (!stage) {
                roundComplete(round, host);
                return;
            }

            const box = createElement('div', 'lx2-stage');

            const badge = normaliseText(stage.method_step);
            if (badge) box.append(createElement('p', 'lx2-badge', badge));

            const prompt = normaliseText(stage.prompt);
            if (prompt) box.append(createElement('p', 'lx2-choice__prompt', prompt));

            host.append(box);

            const next = () => {
                box.classList.add('is-done');

                const success = normaliseText(stage.success);
                if (success) {
                    box.append(createElement(
                        'p',
                        'lx2-choice__feedback is-correct',
                        success
                    ));
                }

                runStage(round, stageIndex + 1, host);
            };

            buildStageBody(stage, box, next);
        }

        function buildStageBody(stage, box, next) {
            const action = normaliseText(stage.action);

            if (
                hasItems(stage.options) &&
                stage.correct_index !== undefined
            ) {
                box.append(buildChoice({
                    options: stage.options,
                    correct_index: stage.correct_index,
                    feedback: stage.feedback,
                    onCorrect: () => {
                        for (const line of safeArray(stage.reveals)) {
                            box.append(createElement(
                                'p',
                                'lx2-live-line',
                                normaliseText(line)
                            ));
                        }
                        next();
                    }
                }));
                return;
            }

            if (
                action === 'move-value-to-letter' ||
                action === 'replace-all'
            ) {
                const targets = action === 'replace-all'
                    ? safeArray(stage.targets)
                    : [stage.target];

                const built = buildTappableFormula(stage.before, targets);

                const chip = createElement(
                    'button',
                    'lx2-chip lx2-chip--value',
                    normaliseText(stage.value)
                );
                chip.type = 'button';

                let armed = false;
                let remaining = built.spans.length;

                chip.addEventListener('click', () => {
                    armed = true;
                    chip.classList.add('is-armed');
                });

                built.spans.forEach((span) => {
                    span.addEventListener('click', () => {
                        if (!armed || span.classList.contains('is-found')) {
                            return;
                        }

                        span.classList.add('is-found');
                        remaining -= 1;

                        if (remaining === 0) {
                            box.append(createElement(
                                'p',
                                'lx2-formula',
                                normaliseText(stage.after)
                            ));
                            next();
                        }
                    });
                });

                box.append(chip, built.element);
                return;
            }

            if (action === 'fill-slots') {
                const slots = safeArray(stage.slots).filter(isObject);
                const built = buildTappableFormula(
                    stage.before,
                    slots.map((slot) => slot.letter)
                );

                const chipRow = createElement('div', 'lx2-chip-row');
                let armedValue = null;
                let filled = 0;

                for (const slot of slots) {
                    const chip = createElement(
                        'button',
                        'lx2-chip lx2-chip--value',
                        normaliseText(slot.value)
                    );
                    chip.type = 'button';

                    chip.addEventListener('click', () => {
                        chipRow.querySelectorAll('button').forEach((b) => {
                            b.classList.remove('is-armed');
                        });
                        chip.classList.add('is-armed');
                        armedValue = normaliseText(slot.value);
                    });

                    chipRow.append(chip);
                }

                built.spans.forEach((span, index) => {
                    span.addEventListener('click', () => {
                        const slot = slots[index];

                        if (!slot || span.classList.contains('is-found')) {
                            return;
                        }

                        if (armedValue !== normaliseText(slot.value)) {
                            flashWrong(span);
                            return;
                        }

                        span.classList.add('is-found');
                        span.textContent = armedValue;
                        filled += 1;

                        if (filled === slots.length) {
                            box.append(createElement(
                                'p',
                                'lx2-formula',
                                normaliseText(stage.after)
                            ));
                            next();
                        }
                    });
                });

                box.append(chipRow, built.element);
                return;
            }

            if (action === 'match') {
                const pairs = safeArray(stage.pairs).filter(isObject);
                const lettersRow = createElement('div', 'lx2-chip-row');
                const valuesRow = createElement('div', 'lx2-chip-row');

                let armedLetter = null;
                let matched = 0;

                for (const pair of pairs) {
                    const letterChip = createElement(
                        'button',
                        'lx2-chip',
                        normaliseText(pair.letter)
                    );
                    letterChip.type = 'button';

                    letterChip.addEventListener('click', () => {
                        lettersRow.querySelectorAll('button').forEach((b) => {
                            b.classList.remove('is-armed');
                        });
                        letterChip.classList.add('is-armed');
                        armedLetter = normaliseText(pair.letter);
                    });

                    lettersRow.append(letterChip);

                    const valueChip = createElement(
                        'button',
                        'lx2-chip lx2-chip--value',
                        normaliseText(pair.value)
                    );
                    valueChip.type = 'button';

                    valueChip.addEventListener('click', () => {
                        if (valueChip.classList.contains('is-found')) {
                            return;
                        }

                        if (armedLetter === normaliseText(pair.letter)) {
                            valueChip.classList.add('is-found');
                            valueChip.textContent =
                                armedLetter + ' = ' + normaliseText(pair.value);

                            const armedChip =
                                lettersRow.querySelector('.is-armed');

                            if (armedChip) {
                                armedChip.disabled = true;
                                armedChip.classList.remove('is-armed');
                            }

                            armedLetter = null;
                            matched += 1;

                            if (matched === pairs.length) {
                                next();
                            }
                        } else {
                            flashWrong(valueChip);
                        }
                    });

                    valuesRow.append(valueChip);
                }

                box.append(lettersRow, valuesRow);
                return;
            }

            /*
             * Unknown action type: never leave the pupil stuck.
             */
            const continueButton = createElement('button', 'lx2-continue', 'Continue');
            continueButton.type = 'button';
            continueButton.addEventListener('click', next, { once: true });
            box.append(continueButton);
        }

        function roundComplete(round, host) {
            const stages = safeArray(round.stages).filter(isObject);
            const lastStage = stages[stages.length - 1];
            const answer = normaliseText(lastStage && lastStage.answer);

            if (answer) {
                host.append(createElement('p', 'worked-example__answer', answer));
            }

            const isLastRound = roundIndex === rounds.length - 1;
            const button = createElement(
                'button',
                'lx2-continue',
                isLastRound ? 'Finish' : 'Next round'
            );
            button.type = 'button';

            button.addEventListener('click', () => {
                roundIndex += 1;

                if (roundIndex >= rounds.length) {
                    finishRounds();
                } else {
                    showRound();
                }
            }, { once: true });

            host.append(button);
        }

        function finishRounds() {
            wrap.textContent = '';
            wrap.append(createElement(
                'p',
                'lx2-choice__feedback is-correct',
                'All rounds complete.'
            ));
            completeSectionById('interactive');
        }
    }

    function flashWrong(element) {
        element.classList.add('is-wrong-flash');
        setTimeout(() => {
            element.classList.remove('is-wrong-flash');
        }, 400);
    }

    function buildTappableFormula(text, targets) {
        const source = normaliseText(text);
        const spans = [];
        const element = createElement('p', 'lx2-formula');

        const pieces = [];
        let lastIndex = 0;
        let searchFrom = 0;

        for (const target of safeArray(targets)) {
            const needle = normaliseText(target);

            if (needle === '') {
                continue;
            }

            const index = source.indexOf(needle, searchFrom);

            if (index === -1) {
                continue;
            }

            pieces.push({ text: source.slice(lastIndex, index), tap: false });
            pieces.push({ text: needle, tap: true });

            lastIndex = index + needle.length;
            searchFrom = lastIndex;
        }

        pieces.push({ text: source.slice(lastIndex), tap: false });

        for (const piece of pieces) {
            if (piece.text === '') {
                continue;
            }

            if (piece.tap) {
                const span = createElement('button', 'lx2-tap', piece.text);
                span.type = 'button';
                spans.push(span);
                element.append(span);
            } else {
                element.append(document.createTextNode(piece.text));
            }
        }

        return { element, spans };
    }

    function renderExplore(container, explore) {
        appendSectionHeading(
            container,
            explore,
            'Explore',
            'Play with the rule',
            'explore'
        );

        appendIntro(container, explore.intro);

        const bigIdea = normaliseText(explore.big_idea);
        if (bigIdea) container.append(createElement('p', 'lx2-big-idea', bigIdea));

        const playgrounds = safeArray(explore.playgrounds).filter(isObject);

        if (playgrounds.length === 0) {
            return;
        }

        const tabRow = createElement('div', 'lx2-tabs');
        const panelHost = createElement('div', 'lx2-panel-host');
        container.append(tabRow, panelHost);

        const tabButtons = playgrounds.map((playground, index) => {
            const button = createElement(
                'button',
                'lx2-tab',
                normaliseText(playground.label) || ('Rule ' + (index + 1))
            );
            button.type = 'button';
            button.addEventListener('click', () => showPlayground(index));
            tabRow.append(button);
            return button;
        });

        showPlayground(0);

        function showPlayground(index) {
            tabButtons.forEach((button, i) => {
                button.classList.toggle('is-active', i === index);
            });

            panelHost.textContent = '';
            panelHost.append(buildPlayground(playgrounds[index]));
        }
    }

    function buildPlayground(playground) {
        const panel = createElement('div', 'lx2-card');

        const context = normaliseText(playground.context);
        if (context) panel.append(createElement('p', 'lx2-context', context));

        const formula = normaliseText(playground.formula);
        if (formula) panel.append(createElement('p', 'lx2-formula', formula));

        const values = {};
        const controlsWrap = createElement('div', 'lx2-controls');
        const liveWrap = createElement('div', 'lx2-live');

        for (const control of safeArray(playground.controls).filter(isObject)) {
            const letter = normaliseText(control.letter);
            values[letter] = Number(control.start ?? control.min ?? 0);

            const field = createElement('label', 'lx2-slider');
            const caption = createElement(
                'span',
                'lx2-slider__label',
                (normaliseText(control.label) || letter) + ': '
            );
            const readout = createElement('strong', '', String(values[letter]));
            caption.append(readout);

            const input = document.createElement('input');
            input.type = 'range';
            input.min = String(control.min ?? 0);
            input.max = String(control.max ?? 10);
            input.step = String(control.step ?? 1);
            input.value = String(values[letter]);

            input.addEventListener('input', () => {
                values[letter] = Number(input.value);
                readout.textContent = String(values[letter]);
                update();
            });

            field.append(caption, input);
            controlsWrap.append(field);
        }

        panel.append(controlsWrap, liveWrap);

        const observation = normaliseText(playground.observation);
        if (observation) panel.append(createElement('p', 'lx2-hint', observation));

        const challenge = isObject(playground.challenge)
            ? playground.challenge
            : null;

        if (challenge) {
            const box = createElement('div', 'lx2-challenge');

            const prompt = normaliseText(challenge.prompt);
            if (prompt) box.append(createElement('p', 'lx2-choice__prompt', prompt));

            if (hasItems(challenge.options)) {
                box.append(buildChoice(challenge));
            } else {
                const button = createElement('button', 'lx2-continue', 'Check');
                button.type = 'button';

                const feedbackElement =
                    createElement('p', 'lx2-choice__feedback');
                feedbackElement.hidden = true;

                button.addEventListener('click', () => {
                    const success =
                        checkChallenge(challenge, playground, values);

                    feedbackElement.hidden = false;
                    feedbackElement.className =
                        'lx2-choice__feedback ' +
                        (success ? 'is-correct' : 'is-wrong');
                    feedbackElement.textContent = success
                        ? 'Challenge complete.'
                        : 'Not yet. Move the sliders and try again.';
                });

                box.append(button, feedbackElement);
            }

            panel.append(box);
        }

        update();
        return panel;

        function update() {
            const result = evaluateFormulaRhs(playground.formula, values);
            liveWrap.textContent = '';

            for (const line of safeArray(playground.live_lines)) {
                const text = normaliseText(line).replace(
                    /\{(\w+)\}/g,
                    (match, key) => {
                        if (key === 'answer') {
                            const unit = normaliseText(playground.output_unit);
                            const formatted = formatNumber(result);

                            if (unit === '\u00a3') {
                                return unit + formatted;
                            }

                            return unit
                                ? formatted + ' ' + unit
                                : formatted;
                        }

                        if (key === 'square') {
                            const first = Object.values(values)[0];
                            return formatNumber(first * first);
                        }

                        if (key in values) {
                            return String(values[key]);
                        }

                        return match;
                    }
                );

                liveWrap.append(createElement('p', 'lx2-live-line', text));
            }
        }
    }

    function checkChallenge(challenge, playground, values) {
        const result = evaluateFormulaRhs(playground.formula, values);

        if (challenge.target_answer !== undefined) {
            return Number(result) === Number(challenge.target_answer);
        }

        if (hasItems(challenge.accepted_solutions)) {
            return challenge.accepted_solutions.some((solution) =>
                isObject(solution) &&
                Object.entries(solution).every(
                    ([letter, value]) =>
                        Number(values[letter]) === Number(value)
                )
            );
        }

        const rule = normaliseText(challenge.accepted_rule);

        if (rule !== '') {
            const parts = rule.split('=');

            if (parts.length === 2) {
                const left = evaluateFormulaRhs('r =' + parts[0], values);
                return Number(left) === Number(parts[1].trim());
            }
        }

        return false;
    }

    function evaluateFormulaRhs(formula, values) {
        const parts = String(formula).split('=');
        let expression = parts.length > 1
            ? parts.slice(1).join('=')
            : parts[0];

        for (const [letter, value] of Object.entries(values)) {
            expression = expression.split(letter).join('(' + value + ')');
        }

        expression = expression
            .replace(/\u00d7/g, '*')
            .replace(/\u00f7/g, '/')
            .replace(/\u2212/g, '-')
            .replace(/\u00b2/g, '**2')
            .replace(/\)\s*\(/g, ')*(')
            .replace(/(\d)\s*\(/g, '$1*(')
            .replace(/\)\s*(\d)/g, ')*$1');

        if (!/^[\d+\-*/().\s]*$/.test(expression)) {
            return null;
        }

        try {
            return Function(
                '"use strict"; return (' + expression + ');'
            )();
        } catch {
            return null;
        }
    }

    function formatNumber(value) {
        if (
            typeof value !== 'number' ||
            !Number.isFinite(value)
        ) {
            return '?';
        }

        return String(Math.round(value * 100) / 100);
    }

    function renderRichWorkedExample(article, example) {
        const question = normaliseText(example.question);
        if (question) article.append(createElement('p', 'lx2-context', question));

        const stepsWrap = createElement('ol', 'lesson-steps lx2-we-steps');

        for (const step of safeArray(example.method_steps)) {
            if (!isObject(step)) {
                continue;
            }

            const item = createElement('li', 'lesson-step');

            const title = normaliseText(step.title);
            if (title) item.append(createElement('h4', 'lesson-step__title', title));

            const lines = hasItems(step.lines)
                ? step.lines
                : (step.line !== undefined ? [step.line] : []);

            const interaction = isObject(step.interaction)
                ? step.interaction
                : null;

            const targets = interaction
                ? safeArray(interaction.targets).concat(
                    interaction.target !== undefined
                        ? [interaction.target]
                        : []
                )
                : [];

            lines.forEach((line, index) => {
                const text = normaliseText(line);

                if (text === '') {
                    return;
                }

                if (index === 0 && targets.length > 0) {
                    const built = buildTappableFormula(text, targets);

                    if (built.spans.length > 0) {
                        built.spans.forEach((span) => {
                            span.addEventListener('click', () => {
                                span.classList.toggle('is-found');
                            });
                        });

                        item.append(built.element);
                        return;
                    }
                }

                item.append(createElement('p', 'lx2-live-line', text));
            });

            if (interaction) {
                const prompt = normaliseText(interaction.prompt);
                if (prompt) item.append(createElement('p', 'lx2-hint', prompt));
            }

            stepsWrap.append(item);
        }

        article.append(stepsWrap);

        const mistakes = safeArray(example.mistakes_to_watch).filter(isObject);

        if (mistakes.length > 0) {
            const box = createElement('div', 'lx2-mistakes');
            box.append(createElement('h4', '', 'Mistakes to watch'));

            for (const mistake of mistakes) {
                const card = createElement('div', 'lx2-mistake');

                const wrong = normaliseText(mistake.wrong);
                if (wrong) card.append(createElement('p', 'lx2-mistake__wrong', '\u2717 ' + wrong));

                const reason = normaliseText(mistake.reason);
                if (reason) card.append(createElement('p', 'lx2-mistake__reason', reason));

                const correct = normaliseText(mistake.correct);
                if (correct) card.append(createElement('p', 'lx2-mistake__correct', '\u2713 ' + correct));

                box.append(card);
            }

            article.append(box);
        }

        const answer = normaliseText(example.answer);
        if (answer) article.append(createElement('p', 'worked-example__answer', answer));
    }

    function injectV2Styles() {
        if (document.getElementById('lx2-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'lx2-styles';
        style.textContent = [
            '.lx2-card{border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:1rem 1.25rem;margin:1rem 0;background:var(--color-surface,#fff);}',
            '.lx2-card__title{margin:.25rem 0 .5rem;}',
            '.lx2-eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:rgba(0,0,0,.5);margin:0 0 .25rem;}',
            '.lx2-context{color:rgba(0,0,0,.7);margin:.25rem 0;}',
            '.lx2-formula{font-size:1.35rem;font-weight:600;font-variant-numeric:tabular-nums;margin:.5rem 0;}',
            '.lx2-big-idea{border-left:4px solid var(--color-accent,#2563eb);background:rgba(37,99,235,.06);padding:.5rem .75rem;border-radius:0 8px 8px 0;font-weight:600;margin:.75rem 0;}',
            '.lx2-chip-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.5rem 0;}',
            '.lx2-chip{display:inline-block;border:1px solid rgba(0,0,0,.15);border-radius:999px;padding:.15rem .65rem;background:rgba(0,0,0,.04);font-variant-numeric:tabular-nums;}',
            '.lx2-chip--value{font:inherit;cursor:pointer;background:rgba(37,99,235,.1);border-color:rgba(37,99,235,.4);}',
            '.lx2-chip.is-armed{outline:2px solid var(--color-accent,#2563eb);}',
            '.lx2-chip.is-good{border-color:rgba(22,163,74,.5);background:rgba(22,163,74,.08);}',
            '.lx2-chip.is-bad{border-color:rgba(220,38,38,.5);background:rgba(220,38,38,.08);}',
            '.lx2-chip.is-found{background:rgba(22,163,74,.15);border-color:rgba(22,163,74,.5);cursor:default;}',
            '.lx2-tap{font:inherit;border:1px dashed var(--color-accent,#2563eb);background:rgba(37,99,235,.08);border-radius:6px;padding:0 .25rem;cursor:pointer;}',
            '.lx2-tap.is-found{border-style:solid;background:rgba(22,163,74,.15);border-color:rgba(22,163,74,.6);}',
            '.lx2-tap.is-wrong-flash,.lx2-chip.is-wrong-flash{animation:lx2-shake .3s;border-color:rgba(220,38,38,.7);}',
            '@keyframes lx2-shake{25%{transform:translateX(-3px);}75%{transform:translateX(3px);}}',
            '.lx2-choice__prompt{font-weight:600;margin:.75rem 0 .35rem;}',
            '.lx2-choice__options{display:flex;flex-wrap:wrap;gap:.5rem;}',
            '.lx2-option{font:inherit;border:1px solid rgba(0,0,0,.2);border-radius:8px;padding:.4rem .8rem;background:#fff;cursor:pointer;}',
            '.lx2-option.is-correct{border-color:rgba(22,163,74,.7);background:rgba(22,163,74,.12);}',
            '.lx2-option.is-wrong{border-color:rgba(220,38,38,.7);background:rgba(220,38,38,.08);}',
            '.lx2-option:disabled{cursor:default;opacity:.75;}',
            '.lx2-choice__feedback{margin:.4rem 0 0;font-weight:500;}',
            '.lx2-choice__feedback.is-correct{color:#15803d;}',
            '.lx2-choice__feedback.is-wrong{color:#b91c1c;}',
            '.lx2-hint{font-size:.9em;color:rgba(0,0,0,.6);margin:.25rem 0;}',
            '.lx2-transform{font-size:1.15rem;font-variant-numeric:tabular-nums;margin:.4rem 0;}',
            '.lx2-meanings__row{display:flex;gap:.5rem;}',
            '.lx2-meanings dt{font-weight:700;}',
            '.lx2-meanings dd{margin:0;}',
            '.lx2-cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin:.75rem 0;}',
            '.lx2-case{border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:.6rem .8rem;background:rgba(0,0,0,.02);}',
            '.lx2-case__label{font-weight:600;margin:0 0 .25rem;}',
            '.lx2-case__given{color:rgba(0,0,0,.65);margin:.1rem 0;}',
            '.lx2-case__substitution,.lx2-case__answer{font-variant-numeric:tabular-nums;margin:.1rem 0;}',
            '.lx2-case__answer{font-weight:700;}',
            '.lx2-io__row{font-variant-numeric:tabular-nums;margin:.15rem 0;}',
            '.lx2-step--locked .lx2-step__body{display:none;}',
            '.lx2-step--locked .lesson-step__title{opacity:.45;}',
            '.lx2-step--done{opacity:.55;}',
            '.lx2-notes{margin:.4rem 0 .4rem 1.1rem;padding:0;}',
            '.lx2-continue{font:inherit;border:none;border-radius:8px;padding:.5rem 1rem;background:var(--color-accent,#2563eb);color:#fff;cursor:pointer;margin-top:.6rem;}',
            '.lx2-badge{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--color-accent,#2563eb);margin:.75rem 0 .1rem;}',
            '.lx2-stage{border-top:1px dashed rgba(0,0,0,.15);padding-top:.35rem;margin-top:.6rem;}',
            '.lx2-stage.is-done .lx2-option,.lx2-stage.is-done .lx2-continue,.lx2-stage.is-done .lx2-tap,.lx2-stage.is-done .lx2-chip--value{pointer-events:none;opacity:.7;}',
            '.lx2-tabs{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0;}',
            '.lx2-tab{font:inherit;border:1px solid rgba(0,0,0,.2);border-radius:999px;padding:.3rem .9rem;background:#fff;cursor:pointer;}',
            '.lx2-tab.is-active{background:var(--color-accent,#2563eb);color:#fff;border-color:transparent;}',
            '.lx2-slider{display:flex;flex-direction:column;gap:.25rem;margin:.5rem 0;}',
            '.lx2-slider input[type=range]{width:min(100%,320px);}',
            '.lx2-live-line{font-size:1.15rem;font-variant-numeric:tabular-nums;margin:.2rem 0;}',
            '.lx2-mistakes{margin-top:.75rem;}',
            '.lx2-mistake{border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:.5rem .75rem;margin:.5rem 0;}',
            '.lx2-mistake__wrong{color:#b91c1c;margin:.1rem 0;font-variant-numeric:tabular-nums;}',
            '.lx2-mistake__correct{color:#15803d;margin:.1rem 0;font-variant-numeric:tabular-nums;}',
            '.lx2-mistake__reason{margin:.1rem 0;color:rgba(0,0,0,.7);}',
            '.lx2-arrow{color:rgba(0,0,0,.45);}',
            '.lx2-challenge{margin-top:.75rem;border-top:1px dashed rgba(0,0,0,.15);padding-top:.5rem;}'
        ].join('\n');

        document.head.append(style);
    }

})();
