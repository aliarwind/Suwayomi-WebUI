/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Link as RouterLink } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { SpinnerImage } from '@/base/components/SpinnerImage.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import { MANGA_COVER_ASPECT_RATIO } from '@/features/manga/Manga.constants.ts';
import { useMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';

/** How many ranked hits the strip asks for; every one costs prompt tokens on the server. */
const LLM_STRIP_LIMIT = 8;

const CARD_WIDTH = 132;

interface LlmSearchStripProps {
    query: string;
    /** Keep the ranking inside the category the user is looking at; undefined means the whole library. */
    categoryId?: number;
}

/**
 * "AI picks" strip shown above the library grid when the server has the AI search enabled.
 *
 * It is purely additive: the grid keeps its normal server side search and pagination, the strip just
 * shows which books the model considers the best matches and why. When the feature is off, the model
 * fails, the strip is disabled in the library settings or nothing matches, the query returns no hits and
 * nothing is rendered.
 */
export function LlmSearchStrip({ query, categoryId }: LlmSearchStripProps) {
    const { t } = useLingui();

    const {
        settings: { llmSearchStripEnabled },
    } = useMetadataServerSettings();

    // Passing undefined skips the request instead of firing it and hiding the result.
    const { data } = requestManager.useLlmSearch(
        llmSearchStripEnabled ? query : undefined,
        LLM_STRIP_LIMIT,
        categoryId,
    );

    const hits = data?.llmSearch.hits ?? STABLE_EMPTY_ARRAY;
    if (!llmSearchStripEnabled || hits.length === 0) {
        return null;
    }

    return (
        <Paper variant="outlined" sx={{ m: 1, mb: 0, p: 1 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, px: 0.5 }}>
                <AutoAwesomeIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2">{t`AI picks`}</Typography>
                <Typography variant="caption" color="text.secondary">
                    {t`Ranked by the model, with the reason it matched`}
                </Typography>
            </Stack>
            <Stack direction="row" sx={{ gap: 1, p: 0.5, overflowX: 'auto' }}>
                {hits.map(({ manga, reason }) => (
                    <Box
                        key={manga.id}
                        component={RouterLink}
                        to={AppRoutes.manga.path(manga.id)}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ width: CARD_WIDTH, flex: '0 0 auto', textDecoration: 'none', color: 'inherit' }}
                    >
                        <Box sx={{ aspectRatio: MANGA_COVER_ASPECT_RATIO, overflow: 'hidden', borderRadius: 1 }}>
                            <SpinnerImage
                                alt={manga.title}
                                src={Mangas.getThumbnailUrl(manga)}
                                imgStyle={{ height: '100%', width: '100%', objectFit: 'cover' }}
                            />
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }} noWrap>
                            {manga.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                            {reason}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
}
