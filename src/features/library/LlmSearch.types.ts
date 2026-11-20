/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MangaLibraryFieldsFragment } from '@/lib/graphql/generated/graphql.ts';

/**
 * Result of the optional AI library search (`llmSearch` query).
 *
 * `enabled` is false when the feature is switched off on the server, `degraded` is true when the model
 * answered unusably - both cases just hide the ranked strip, the normal library search is unaffected.
 */
export interface LlmSearchQuery {
    llmSearch: {
        enabled: boolean;
        degraded: boolean;
        parsed: boolean;
        candidates: number;
        tookMs: number;
        hits: {
            score: number;
            reason: string;
            manga: MangaLibraryFieldsFragment;
        }[];
    };
}

export interface LlmSearchQueryVariables {
    query: string;
    limit?: number;
    /** Restrict the ranking to one category (the tab the user is looking at). */
    categoryId?: number;
}
