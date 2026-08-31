/*
 * Annotates homepage lesson cards with saved progress and
 * builds the Daily Review section.
 *
 * Reads lesson position plus per-skill evidence written by
 * progress.js. Skill ids are supplied by curriculum.json on
 * each lesson card, so folder names and lesson slugs never
 * need to agree.
 *
 * The mastery thresholds and the derived skill status are
 * owned by progress.js (window.Maths1to9Progress), which must
 * load before this file. This file keeps no copy of them.
 */
(() => {
    'use strict';

    const STORAGE_VERSION = 'v1';
    const KEY_PREFIX = `maths1to9:progress:${STORAGE_VERSION}`;
    const SKILL_STORAGE_VERSION = 'v1';
    const SKILL_KEY_PREFIX =
        `maths1to9:skills:${SKILL_STORAGE_VERSION}`;
    const USER_KEY = 'maths1to9:user-id';

    const progressApi = window.Maths1to9Progress ?? null;

    function readRecords(prefix) {
        const records = [];

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
            /* localStorage unavailable: leave cards untouched. */
        }

        return records;
    }

    function isSecure(record) {
        return progressApi.meetsSecureThresholds(record);
    }

    function normalisePath(pathname) {
        return decodeURIComponent(pathname)
            .replace(/index\.php$/, '')
            .replace(/\/+$/, '/');
    }

    function annotate() {
        if (
            !progressApi ||
            typeof progressApi.getSkillStatus !== 'function' ||
            typeof progressApi.meetsSecureThresholds !== 'function'
        ) {
            /* progress.js did not load: leave the homepage untouched. */
            return;
        }

        let userId = '';

        try {
            userId = window.localStorage.getItem(USER_KEY) ?? '';
        } catch {
            return;
        }

        const records = userId === ''
            ? []
            : readRecords(`${KEY_PREFIX}:${userId}:`)
                .filter(
                    (record) => typeof record.pathname === 'string'
                );
        const skillRecords = userId === ''
            ? []
            : readRecords(`${SKILL_KEY_PREFIX}:${userId}:`);

        const byPath = new Map(
            records.map((record) => [
                normalisePath(record.pathname),
                record
            ])
        );
        const bySkill = new Map(
            skillRecords
                .filter(
                    (record) => typeof record.skillId === 'string'
                )
                .map((record) => [record.skillId, record])
        );

        for (const card of document.querySelectorAll('.lesson-card')) {
            const record = byPath.get(
                normalisePath(new URL(card.href).pathname)
            );
            const skillIds = (card.dataset.skills ?? '')
                .split(',')
                .map((skillId) => skillId.trim())
                .filter(Boolean);
            const assessedSkills = skillIds
                .map((skillId) => bySkill.get(skillId))
                .filter(Boolean);

            if (
                !record &&
                assessedSkills.length === 0 &&
                skillIds.length === 0
            ) {
                continue;
            }

            const badge = document.createElement('span');

            badge.className = 'lesson-card__progress';

            if (assessedSkills.length > 0) {
                const secureCount = skillIds.filter(
                    (skillId) => isSecure(bySkill.get(skillId))
                ).length;

                if (
                    skillIds.length > 0 &&
                    secureCount === skillIds.length
                ) {
                    badge.classList.add('is-complete');
                    badge.textContent = 'Secure ✓';
                } else {
                    badge.textContent =
                        `In progress · ${secureCount} of ` +
                        `${skillIds.length} skills secure`;
                }
            } else if (record?.finished === true) {
                badge.classList.add('is-complete');
                badge.textContent = 'Completed ✓';
            } else if (
                Number.isInteger(record?.currentSectionIndex) &&
                Number.isInteger(record?.totalSections) &&
                record.totalSections > 0
            ) {
                badge.textContent =
                    'Continue · section ' +
                    (record.currentSectionIndex + 1) +
                    ' of ' +
                    record.totalSections;
            } else if (skillIds.length > 0 && !record) {
                badge.textContent = 'Not started';
            } else {
                badge.textContent = 'Continue';
            }

            const meta = card.querySelector('.lesson-card__meta');

            if (meta) {
                meta.prepend(badge);
            } else {
                const wrapper = document.createElement('span');

                wrapper.className = 'lesson-card__meta';
                wrapper.append(badge);
                card.append(wrapper);
            }
        }

        renderDailyReview(bySkill);
    }

    /* ------------------------------------------------------------------ *
     * Daily Review
     *
     * Lists the existing lesson cards that contain at least one
     * review-due skill. Several due skills in one lesson collapse to
     * one card, which links to that same lesson.
     * ------------------------------------------------------------------ */

    function renderDailyReview(bySkill) {
        const section = document.querySelector('[data-daily-review]');

        if (!section) {
            return;
        }

        const list = section.querySelector('[data-daily-review-list]');
        const empty = section.querySelector('[data-daily-review-empty]');

        if (!list || !empty) {
            return;
        }

        const now = new Date();
        let dueLessons = 0;

        for (const card of document.querySelectorAll(
            '.lesson-catalogue .lesson-card'
        )) {
            const dueCount = (card.dataset.skills ?? '')
                .split(',')
                .map((skillId) => skillId.trim())
                .filter(Boolean)
                .filter(
                    (skillId) =>
                        progressApi.getSkillStatus(
                            bySkill.get(skillId),
                            now
                        ) === 'review-due'
                ).length;

            if (dueCount === 0) {
                continue;
            }

            dueLessons += 1;
            list.append(buildReviewCard(card, dueCount));
        }

        section.hidden = false;
        list.hidden = dueLessons === 0;
        empty.hidden = dueLessons !== 0;
    }

    function buildReviewCard(sourceCard, dueCount) {
        const clone = sourceCard.cloneNode(true);

        clone.removeAttribute('id');
        clone.classList.add('lesson-card--review');

        /* Drop any progress badge copied from the catalogue card. */
        clone
            .querySelectorAll('.lesson-card__progress')
            .forEach((node) => node.remove());

        const badge = document.createElement('span');

        badge.className =
            'lesson-card__progress lesson-card__progress--review';
        badge.textContent =
            dueCount === 1
                ? '1 skill due for review'
                : `${dueCount} skills due for review`;

        let meta = clone.querySelector('.lesson-card__meta');

        if (!meta) {
            meta = document.createElement('span');
            meta.className = 'lesson-card__meta';
            clone.append(meta);
        }

        meta.prepend(badge);

        return clone;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', annotate);
    } else {
        annotate();
    }
})();
