/*
 * Maths1to9 progress store.
 *
 * Saves where a pupil is in each lesson and restores it when
 * they return. Storage is behind a small adapter interface so
 * the backend can be swapped later (e.g. a server API keyed by
 * a real user id) without changing the lesson engine or this
 * file's public API.
 *
 * Public API (window.Maths1to9Progress):
 *   getUserId()                  -> current user id string
 *   setUserId(id)                -> switch user (re-reads progress)
 *   getLessonProgress(slug)      -> Promise<record|null>
 *   getAllProgress()             -> Promise<record[]>
 *   getSkillProgress(skillId)    -> Promise<record|null>
 *   getAllSkillProgress()        -> Promise<record[]>
 *   recordSkillAttempt(detail)   -> Promise<record|null>
 *   clearLessonProgress(slug)    -> Promise<void>
 *   clearSkillProgress(skillId)  -> Promise<void>
 *   clearAllProgress()           -> Promise<void>
 *   use(adapter, userId?)        -> plug in a different backend
 *
 * Adapter interface (all methods return promises):
 *   load(userId, slug)           -> record | null
 *   save(userId, slug, record)   -> void
 *   remove(userId, slug)         -> void
 *   list(userId)                 -> record[]
 *
 * A future server adapter only needs to implement those four
 * methods, e.g. save() -> POST /api/progress.
 */
(() => {
    'use strict';

    const STORAGE_VERSION = 'v1';
    const KEY_PREFIX = `maths1to9:progress:${STORAGE_VERSION}`;
    const SKILL_STORAGE_VERSION = 'v1';
    const SKILL_KEY_PREFIX =
        `maths1to9:skills:${SKILL_STORAGE_VERSION}`;
    const USER_KEY = 'maths1to9:user-id';
    const ANONYMOUS_PREFIX = 'anon-';
    const MAX_RECENT_QUESTIONS = 100;

    /* ------------------------------------------------------------------ *
     * Derived skill status
     *
     * One shared definition of "where is this skill?", used by the
     * homepage badges and the Daily Review section so the thresholds
     * live in exactly one place. This never rewrites the raw evidence
     * above — the status is derived from it on read.
     *
     *   not-started : no assessed questions yet
     *   learning    : fewer than SECURE_MIN_ASSESSED assessed questions,
     *                 or mastery below SECURE_MIN_MASTERY
     *   secure      : meets both thresholds and was last practised
     *                 within the last REVIEW_AFTER_DAYS full days
     *   review-due  : met the secure thresholds, but the last practice
     *                 is at least REVIEW_AFTER_DAYS full days ago
     * ------------------------------------------------------------------ */

    const SKILL_STATUS_THRESHOLDS = {
        SECURE_MIN_ASSESSED: 3,
        SECURE_MIN_MASTERY: 0.8,
        REVIEW_AFTER_DAYS: 7
    };

    const DAY_MS = 24 * 60 * 60 * 1000;

    function toEpochMs(value) {
        if (value instanceof Date) {
            return value.getTime();
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : NaN;
        }

        return Date.parse(value);
    }

    function meetsSecureThresholds(record) {
        const assessed = Number.isInteger(record?.assessedQuestions)
            ? record.assessedQuestions
            : 0;
        const mastery =
            typeof record?.mastery === 'number' ? record.mastery : 0;

        return (
            assessed >= SKILL_STATUS_THRESHOLDS.SECURE_MIN_ASSESSED &&
            mastery >= SKILL_STATUS_THRESHOLDS.SECURE_MIN_MASTERY
        );
    }

    /**
     * Derive the status of a single skill from its evidence record.
     *
     * @param {object|null|undefined} record  a per-skill evidence record
     * @param {Date|string|number} [now]  current time, injectable so the
     *        seven-day boundary can be tested without waiting.
     * @returns {'not-started'|'learning'|'secure'|'review-due'}
     */
    function getSkillStatus(record, now = new Date()) {
        const assessed = Number.isInteger(record?.assessedQuestions)
            ? record.assessedQuestions
            : 0;

        if (assessed === 0) {
            return 'not-started';
        }

        if (!meetsSecureThresholds(record)) {
            return 'learning';
        }

        const lastMs = toEpochMs(record?.lastPractisedAt);
        const nowMs = toEpochMs(now);

        if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs)) {
            return 'review-due';
        }

        const fullDaysSince = Math.floor((nowMs - lastMs) / DAY_MS);

        return fullDaysSince >= SKILL_STATUS_THRESHOLDS.REVIEW_AFTER_DAYS
            ? 'review-due'
            : 'secure';
    }

    /* ------------------------------------------------------------------ *
     * localStorage adapter (default backend)
     * ------------------------------------------------------------------ */

    function storageAvailable() {
        try {
            const probe = '__maths1to9_probe__';

            window.localStorage.setItem(probe, probe);
            window.localStorage.removeItem(probe);

            return true;
        } catch {
            return false;
        }
    }

    function recordKey(userId, slug) {
        return `${KEY_PREFIX}:${userId}:${slug}`;
    }

    function skillRecordKey(userId, skillId) {
        return `${SKILL_KEY_PREFIX}:${userId}:${skillId}`;
    }

    const localStorageAdapter = {
        async load(userId, slug) {
            try {
                const raw = window.localStorage.getItem(
                    recordKey(userId, slug)
                );

                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        },

        async save(userId, slug, record) {
            try {
                window.localStorage.setItem(
                    recordKey(userId, slug),
                    JSON.stringify(record)
                );
            } catch {
                /* Quota exceeded or private mode: fail silently. */
            }
        },

        async remove(userId, slug) {
            try {
                window.localStorage.removeItem(
                    recordKey(userId, slug)
                );
            } catch {
                /* Ignore. */
            }
        },

        async list(userId) {
            const records = [];
            const prefix = `${KEY_PREFIX}:${userId}:`;

            try {
                for (let i = 0; i < window.localStorage.length; i += 1) {
                    const key = window.localStorage.key(i);

                    if (!key || !key.startsWith(prefix)) {
                        continue;
                    }

                    try {
                        const record = JSON.parse(
                            window.localStorage.getItem(key)
                        );

                        if (record && typeof record === 'object') {
                            records.push(record);
                        }
                    } catch {
                        /* Skip corrupt entries. */
                    }
                }
            } catch {
                /* Ignore. */
            }

            return records;
        }
    };

    const localSkillStorageAdapter = {
        async load(userId, skillId) {
            try {
                const raw = window.localStorage.getItem(
                    skillRecordKey(userId, skillId)
                );

                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        },

        async save(userId, skillId, record) {
            try {
                window.localStorage.setItem(
                    skillRecordKey(userId, skillId),
                    JSON.stringify(record)
                );
            } catch {
                /* Quota exceeded or private mode: fail silently. */
            }
        },

        async remove(userId, skillId) {
            try {
                window.localStorage.removeItem(
                    skillRecordKey(userId, skillId)
                );
            } catch {
                /* Ignore. */
            }
        },

        async list(userId) {
            const records = [];
            const prefix = `${SKILL_KEY_PREFIX}:${userId}:`;

            try {
                for (let i = 0; i < window.localStorage.length; i += 1) {
                    const key = window.localStorage.key(i);

                    if (!key || !key.startsWith(prefix)) {
                        continue;
                    }

                    try {
                        const record = JSON.parse(
                            window.localStorage.getItem(key)
                        );

                        if (record && typeof record === 'object') {
                            records.push(record);
                        }
                    } catch {
                        /* Skip corrupt entries. */
                    }
                }
            } catch {
                /* Ignore. */
            }

            return records;
        }
    };

    /* In-memory fallback so the page still works when
     * localStorage is blocked (private mode, school devices). */
    const memoryStore = new Map();

    const memoryAdapter = {
        async load(userId, slug) {
            return memoryStore.get(recordKey(userId, slug)) ?? null;
        },
        async save(userId, slug, record) {
            memoryStore.set(recordKey(userId, slug), record);
        },
        async remove(userId, slug) {
            memoryStore.delete(recordKey(userId, slug));
        },
        async list(userId) {
            const prefix = `${KEY_PREFIX}:${userId}:`;
            return [...memoryStore.entries()]
                .filter(([key]) => key.startsWith(prefix))
                .map(([, record]) => record);
        }
    };

    const memorySkillAdapter = {
        async load(userId, skillId) {
            return memoryStore.get(
                skillRecordKey(userId, skillId)
            ) ?? null;
        },
        async save(userId, skillId, record) {
            memoryStore.set(skillRecordKey(userId, skillId), record);
        },
        async remove(userId, skillId) {
            memoryStore.delete(skillRecordKey(userId, skillId));
        },
        async list(userId) {
            const prefix = `${SKILL_KEY_PREFIX}:${userId}:`;

            return [...memoryStore.entries()]
                .filter(([key]) => key.startsWith(prefix))
                .map(([, record]) => record);
        }
    };

    /* ------------------------------------------------------------------ *
     * User identity
     *
     * Until real accounts exist, each browser gets a stable
     * anonymous id. When accounts arrive, call
     * Maths1to9Progress.setUserId(realId) after sign-in and
     * (optionally) migrate the anonymous records server-side.
     * ------------------------------------------------------------------ */

    function randomId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    }

    function loadOrCreateAnonymousId() {
        try {
            let id = window.localStorage.getItem(USER_KEY);

            if (!id) {
                id = ANONYMOUS_PREFIX + randomId();
                window.localStorage.setItem(USER_KEY, id);
            }

            return id;
        } catch {
            return ANONYMOUS_PREFIX + 'session';
        }
    }

    /* ------------------------------------------------------------------ *
     * Store state
     * ------------------------------------------------------------------ */

    const hasLocalStorage = storageAvailable();

    const store = {
        adapter: hasLocalStorage ? localStorageAdapter : memoryAdapter,
        skillAdapter: hasLocalStorage
            ? localSkillStorageAdapter
            : memorySkillAdapter,
        userId: hasLocalStorage
            ? loadOrCreateAnonymousId()
            : ANONYMOUS_PREFIX + 'session'
    };

    /* The slug for the current page's lesson, set once the
     * engine announces itself. */
    let activeSlug = null;
    let restoring = false;

    /*
     * The engine emits a section-change for section 0 as soon
     * as it renders — before we have had a chance to read any
     * saved record. Saving that event immediately would wipe
     * the record we are about to restore, so section-change
     * saves are held until the restore attempt has finished.
     */
    let restoreAttempted = false;
    let pendingDetail = null;

    function buildRecord(detail, extra = {}) {
        const previousTitle =
            document.querySelector('.lesson-header__title')
                ?.textContent ?? '';

        return {
            slug: detail.slug,
            lessonId: detail.lessonId ?? detail.slug,
            title: previousTitle.trim(),
            pathname: window.location.pathname,
            currentSectionId: detail.sectionId ?? null,
            currentSectionIndex:
                Number.isInteger(detail.sectionIndex)
                    ? detail.sectionIndex
                    : 0,
            totalSections:
                Number.isInteger(detail.totalSections)
                    ? detail.totalSections
                    : null,
            highestUnlockedIndex: 0,
            finished: false,
            updatedAt: new Date().toISOString(),
            ...extra
        };
    }

    async function saveFromEngine(detail, extra = {}) {
        if (!detail || typeof detail.slug !== 'string') {
            return;
        }

        const engineProgress =
            window.Maths1to9Lesson?.getProgress?.() ?? {};

        const record = buildRecord(detail, {
            highestUnlockedIndex:
                Number.isInteger(
                    engineProgress.highestUnlockedIndex
                )
                    ? engineProgress.highestUnlockedIndex
                    : 0,
            finished: engineProgress.finished === true,
            ...extra
        });

        await store.adapter.save(store.userId, detail.slug, record);
    }

    /* ------------------------------------------------------------------ *
     * Engine wiring
     * ------------------------------------------------------------------ */

    document.addEventListener(
        'maths1to9:lesson-rendered',
        (event) => {
            const slug = event.detail?.slug;

            if (typeof slug !== 'string' || slug === '') {
                return;
            }

            activeSlug = slug;

            /*
             * The engine calls showSection(0) immediately after
             * dispatching lesson-rendered, so restoring must be
             * deferred until the current call stack finishes.
             */
            window.setTimeout(() => {
                restoreLesson(slug);
            }, 0);
        }
    );

    async function restoreLesson(slug) {
        const record = await store.adapter.load(store.userId, slug);

        const restorable =
            record &&
            window.Maths1to9Lesson?.restoreProgress &&
            record.finished !== true &&
            Number.isInteger(record.currentSectionIndex) &&
            record.currentSectionIndex > 0;

        let restored = false;

        if (restorable) {
            restoring = true;

            restored = window.Maths1to9Lesson.restoreProgress({
                currentSectionIndex: record.currentSectionIndex,
                currentSectionId: record.currentSectionId,
                highestUnlockedIndex: record.highestUnlockedIndex,
                finished: record.finished
            });

            restoring = false;
        }

        restoreAttempted = true;

        if (restored) {
            pendingDetail = null;
            announceResume(record);
        } else if (pendingDetail) {
            /* Nothing restored: record that the lesson was
             * opened at its held initial section. */
            saveFromEngine(pendingDetail);
            pendingDetail = null;
        }
    }

    document.addEventListener(
        'maths1to9:section-change',
        (event) => {
            if (restoring) {
                return;
            }

            if (!restoreAttempted) {
                pendingDetail = event.detail;

                return;
            }

            saveFromEngine(event.detail);
        }
    );

    document.addEventListener(
        'maths1to9:lesson-complete',
        (event) => {
            const detail = {
                slug: event.detail?.slug ?? activeSlug,
                lessonId: event.detail?.lessonId,
                sectionId: event.detail?.sectionId
            };

            const current =
                window.Maths1to9Lesson?.getProgress?.() ?? {};

            saveFromEngine(
                {
                    ...detail,
                    sectionIndex: current.currentSectionIndex,
                    totalSections: null
                },
                { finished: true }
            );
        }
    );

    /* ------------------------------------------------------------------ *
     * Per-skill evidence
     *
     * Question banks emit one event each time an answer is checked. A
     * stable question id lets this store distinguish a first attempt from
     * a retry without coupling the shared progress code to question UI.
     * ------------------------------------------------------------------ */

    const skillWriteQueues = new Map();

    function trimRecentQuestions(questions) {
        const entries = Object.entries(questions);

        if (entries.length <= MAX_RECENT_QUESTIONS) {
            return questions;
        }

        entries.sort(
            ([, a], [, b]) =>
                String(a.lastAnsweredAt).localeCompare(
                    String(b.lastAnsweredAt)
                )
        );

        return Object.fromEntries(
            entries.slice(-MAX_RECENT_QUESTIONS)
        );
    }

    async function saveSkillAttempt(detail) {
        const skillId =
            typeof detail?.skillId === 'string'
                ? detail.skillId.trim()
                : '';
        const questionId =
            typeof detail?.questionId === 'string'
                ? detail.questionId.trim()
                : '';

        if (
            skillId === '' ||
            questionId === '' ||
            typeof detail?.correct !== 'boolean'
        ) {
            return null;
        }

        const saved = await store.skillAdapter.load(
            store.userId,
            skillId
        );
        const previous =
            saved && typeof saved === 'object' ? saved : {};
        const recentQuestions =
            previous.recentQuestions &&
            typeof previous.recentQuestions === 'object'
                ? { ...previous.recentQuestions }
                : {};
        const previousQuestion = recentQuestions[questionId];
        const isFirstAttempt = !previousQuestion;
        const now = new Date().toISOString();
        const assessedQuestions =
            (Number.isInteger(previous.assessedQuestions)
                ? previous.assessedQuestions
                : 0) + (isFirstAttempt ? 1 : 0);
        const correctFirstTry =
            (Number.isInteger(previous.correctFirstTry)
                ? previous.correctFirstTry
                : 0) +
            (isFirstAttempt && detail.correct ? 1 : 0);
        const newlyCorrect =
            detail.correct && previousQuestion?.correctEventually !== true;
        const correctEventually =
            (Number.isInteger(previous.correctEventually)
                ? previous.correctEventually
                : 0) + (newlyCorrect ? 1 : 0);
        const totalAnswerAttempts =
            (Number.isInteger(previous.totalAnswerAttempts)
                ? previous.totalAnswerAttempts
                : 0) + 1;
        const lessonSlugs = Array.isArray(previous.lessonSlugs)
            ? [...previous.lessonSlugs]
            : [];

        if (
            typeof detail.lessonSlug === 'string' &&
            detail.lessonSlug.trim() !== '' &&
            !lessonSlugs.includes(detail.lessonSlug.trim())
        ) {
            lessonSlugs.push(detail.lessonSlug.trim());
        }

        recentQuestions[questionId] = {
            firstAttemptCorrect: isFirstAttempt
                ? detail.correct
                : previousQuestion.firstAttemptCorrect === true,
            correctEventually:
                detail.correct ||
                previousQuestion?.correctEventually === true,
            lastAnsweredAt: now
        };

        const record = {
            skillId,
            assessedQuestions,
            correctFirstTry,
            correctEventually,
            totalAnswerAttempts,
            mastery:
                assessedQuestions === 0
                    ? 0
                    : Number(
                        (correctFirstTry / assessedQuestions)
                            .toFixed(4)
                    ),
            lessonSlugs,
            lastPractisedAt: now,
            updatedAt: now,
            recentQuestions: trimRecentQuestions(recentQuestions)
        };

        await store.skillAdapter.save(
            store.userId,
            skillId,
            record
        );

        document.dispatchEvent(
            new CustomEvent('maths1to9:skill-progress', {
                detail: { ...record }
            })
        );

        return record;
    }

    function recordSkillAttempt(detail) {
        const skillId =
            typeof detail?.skillId === 'string'
                ? detail.skillId.trim()
                : '';

        if (skillId === '') {
            return Promise.resolve(null);
        }

        const previous =
            skillWriteQueues.get(skillId) ?? Promise.resolve();
        const next = previous
            .catch(() => null)
            .then(() => saveSkillAttempt(detail));

        skillWriteQueues.set(skillId, next);

        next.finally(() => {
            if (skillWriteQueues.get(skillId) === next) {
                skillWriteQueues.delete(skillId);
            }
        });

        return next;
    }

    document.addEventListener(
        'maths1to9:skill-attempt',
        (event) => {
            recordSkillAttempt(event.detail);
        }
    );

    /* ------------------------------------------------------------------ *
     * "Welcome back" notice
     * ------------------------------------------------------------------ */

    function announceResume(record) {
        if (document.querySelector('.resume-notice')) {
            return;
        }

        const notice = document.createElement('div');

        notice.className = 'resume-notice';
        notice.setAttribute('role', 'status');

        const message = document.createElement('span');

        message.textContent =
            'Welcome back — picked up where you left off.';

        const restart = document.createElement('button');

        restart.type = 'button';
        restart.className = 'resume-notice__restart';
        restart.textContent = 'Start over';

        restart.addEventListener('click', async () => {
            if (activeSlug) {
                await store.adapter.remove(store.userId, activeSlug);
            }

            window.Maths1to9Lesson?.goToSection?.(0, {
                moveFocus: true
            });

            notice.remove();
        });

        notice.append(message, restart);
        document.body.append(notice);

        window.setTimeout(() => {
            notice.classList.add('is-leaving');
            window.setTimeout(() => notice.remove(), 400);
        }, 6000);
    }

    /* ------------------------------------------------------------------ *
     * Public API
     * ------------------------------------------------------------------ */

    window.Maths1to9Progress = {
        getUserId() {
            return store.userId;
        },

        setUserId(userId) {
            if (typeof userId === 'string' && userId.trim() !== '') {
                store.userId = userId.trim();

                try {
                    window.localStorage.setItem(USER_KEY, store.userId);
                } catch {
                    /* Ignore. */
                }
            }

            return store.userId;
        },

        getLessonProgress(slug) {
            return store.adapter.load(store.userId, slug);
        },

        getAllProgress() {
            return store.adapter.list(store.userId);
        },

        getSkillProgress(skillId) {
            return store.skillAdapter.load(store.userId, skillId);
        },

        getAllSkillProgress() {
            return store.skillAdapter.list(store.userId);
        },

        recordSkillAttempt(detail) {
            return recordSkillAttempt(detail);
        },

        /**
         * Shared derived-status helper. See getSkillStatus above.
         * `now` is injectable for testing the seven-day boundary.
         */
        getSkillStatus(record, now) {
            return getSkillStatus(record, now);
        },

        /** Count + mastery half of "secure", without the recency check. */
        meetsSecureThresholds(record) {
            return meetsSecureThresholds(record);
        },

        /** Read-only copy of the thresholds behind getSkillStatus. */
        SKILL_STATUS_THRESHOLDS: { ...SKILL_STATUS_THRESHOLDS },

        clearLessonProgress(slug) {
            return store.adapter.remove(store.userId, slug);
        },

        clearSkillProgress(skillId) {
            return store.skillAdapter.remove(store.userId, skillId);
        },

        async clearAllProgress() {
            const records = await store.adapter.list(store.userId);
            const skillRecords = await store.skillAdapter.list(
                store.userId
            );

            await Promise.all(
                [
                    ...records.map((record) =>
                        store.adapter.remove(store.userId, record.slug)
                    ),
                    ...skillRecords.map((record) =>
                        store.skillAdapter.remove(
                            store.userId,
                            record.skillId
                        )
                    )
                ]
            );
        },

        /**
         * Swap the storage backend, e.g. for a server API once
         * user accounts exist:
         *
         *   Maths1to9Progress.use(serverAdapter, signedInUserId);
         */
        use(adapter, userId, skillAdapter = null) {
            if (
                adapter &&
                typeof adapter.load === 'function' &&
                typeof adapter.save === 'function' &&
                typeof adapter.remove === 'function' &&
                typeof adapter.list === 'function'
            ) {
                store.adapter = adapter;
            }

            if (
                skillAdapter &&
                typeof skillAdapter.load === 'function' &&
                typeof skillAdapter.save === 'function' &&
                typeof skillAdapter.remove === 'function' &&
                typeof skillAdapter.list === 'function'
            ) {
                store.skillAdapter = skillAdapter;
            }

            if (userId) {
                this.setUserId(userId);
            }
        }
    };
})();
