/*
 * Curriculum-driven lesson recommendations.
 *
 * The catalogue order, category, title, subtitle and skills come from
 * content/curriculum.json. This helper deliberately knows no lesson names,
 * so completed lessons can reuse it without hardcoding a route.
 */
(() => {
    'use strict';

    let cataloguePromise = null;

    function normaliseText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function normalisePath(pathname) {
        return decodeURIComponent(String(pathname || ''))
            .replace(/index\.php$/, '')
            .replace(/\/+$/, '/');
    }

    function lessonUrl(folder) {
        return new URL(
            `../${encodeURIComponent(folder)}/`,
            window.location.href
        ).href;
    }

    async function loadCatalogue() {
        if (!cataloguePromise) {
            const url = new URL('../curriculum.json', window.location.href);

            cataloguePromise = fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Curriculum could not be loaded.');
                    }

                    return response.json();
                })
                .then((curriculum) => {
                    const categories = Array.isArray(curriculum?.categories)
                        ? curriculum.categories
                        : [];

                    return categories.flatMap((category, categoryIndex) => {
                        const lessons = Array.isArray(category?.lessons)
                            ? category.lessons
                            : [];

                        return lessons
                            .filter((lesson) => lesson && typeof lesson === 'object')
                            .map((lesson, lessonIndex) => ({
                                folder: normaliseText(lesson.folder),
                                title: normaliseText(lesson.title),
                                subtitle: normaliseText(lesson.subtitle),
                                skills: Array.isArray(lesson.skills)
                                    ? lesson.skills.map(normaliseText).filter(Boolean)
                                    : [],
                                prerequisites: Array.isArray(lesson.prerequisites)
                                    ? lesson.prerequisites.map(normaliseText).filter(Boolean)
                                    : [],
                                requiredPrerequisites: Array.isArray(
                                    lesson.required_prerequisites
                                )
                                    ? lesson.required_prerequisites
                                        .map(normaliseText)
                                        .filter(Boolean)
                                    : Array.isArray(lesson.requiredPrerequisites)
                                        ? lesson.requiredPrerequisites
                                            .map(normaliseText)
                                            .filter(Boolean)
                                        : [],
                                categoryId: normaliseText(category?.id),
                                categoryIndex,
                                lessonIndex
                            }))
                            .filter((lesson) => lesson.folder !== '');
                    });
                });
        }

        return cataloguePromise;
    }

    function lessonState(lesson, skillRecords, lessonRecords, progressApi) {
        const skills = lesson.skills;
        const statuses = skills.map((skillId) => progressApi.getSkillStatus(
            skillRecords.get(skillId)
        ));
        const routePath = normalisePath(new URL(lessonUrl(lesson.folder)).pathname);
        const lessonRecord = lessonRecords.find((record) => (
            normalisePath(record?.pathname) === routePath
        ));
        const secure = skills.length > 0 && statuses.every((status) => (
            status === 'secure' || status === 'review-due'
        ));
        const started = Boolean(lessonRecord) || statuses.some((status) => (
            status !== 'not-started'
        ));

        return {
            secure,
            label: secure
                ? 'Secure'
                : started
                    ? 'In progress'
                    : 'Not started'
        };
    }

    function prerequisitesAreSecure(lesson, byFolder) {
        return lesson.requiredPrerequisites.every((folder) => (
            byFolder.get(folder)?.state.secure === true
        ));
    }

    async function routeExists(lesson) {
        try {
            const response = await fetch(
                new URL('lesson.json', lessonUrl(lesson.folder)),
                { cache: 'no-store' }
            );

            return response.ok;
        } catch {
            return false;
        }
    }

    async function getForLesson(currentFolder) {
        const progressApi = window.Maths1to9Progress;

        if (
            !progressApi ||
            typeof progressApi.getAllSkillProgress !== 'function' ||
            typeof progressApi.getAllProgress !== 'function' ||
            typeof progressApi.getSkillStatus !== 'function'
        ) {
            return [];
        }

        const [catalogue, allSkillRecords, allLessonRecords] = await Promise.all([
            loadCatalogue(),
            progressApi.getAllSkillProgress(),
            progressApi.getAllProgress()
        ]);
        const skillRecords = new Map(
            (Array.isArray(allSkillRecords) ? allSkillRecords : [])
                .filter((record) => normaliseText(record?.skillId) !== '')
                .map((record) => [record.skillId, record])
        );
        const lessonRecords = Array.isArray(allLessonRecords)
            ? allLessonRecords
            : [];
        const withState = catalogue.map((lesson) => ({
            ...lesson,
            state: lessonState(lesson, skillRecords, lessonRecords, progressApi)
        }));
        const byFolder = new Map(withState.map((lesson) => [lesson.folder, lesson]));
        const current = byFolder.get(currentFolder);

        if (!current) {
            return [];
        }

        const candidates = withState
            .filter((lesson) => (
                lesson.folder !== currentFolder
                && !lesson.state.secure
                && prerequisitesAreSecure(lesson, byFolder)
            ))
            .sort((left, right) => {
                const leftSameCategory = left.categoryId === current.categoryId;
                const rightSameCategory = right.categoryId === current.categoryId;
                const leftLater = leftSameCategory && left.lessonIndex > current.lessonIndex;
                const rightLater = rightSameCategory && right.lessonIndex > current.lessonIndex;

                if (leftLater !== rightLater) {
                    return leftLater ? -1 : 1;
                }

                if (leftSameCategory !== rightSameCategory) {
                    return leftSameCategory ? -1 : 1;
                }

                const leftRecommended = left.prerequisites.filter((folder) => (
                    byFolder.get(folder)?.state.secure === true
                )).length;
                const rightRecommended = right.prerequisites.filter((folder) => (
                    byFolder.get(folder)?.state.secure === true
                )).length;

                if (leftRecommended !== rightRecommended) {
                    return rightRecommended - leftRecommended;
                }

                return left.categoryIndex - right.categoryIndex
                    || left.lessonIndex - right.lessonIndex;
            });
        const recommendations = [];

        for (const candidate of candidates) {
            if (await routeExists(candidate)) {
                recommendations.push({
                    ...candidate,
                    url: lessonUrl(candidate.folder)
                });
            }

            if (recommendations.length === 3) {
                break;
            }
        }

        return recommendations;
    }

    window.Maths1to9Recommendations = { getForLesson };
})();
