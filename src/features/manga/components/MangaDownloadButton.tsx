/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useLingui } from '@lingui/react/macro';
import { memo, useCallback, useState, useRef } from 'react';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { Notifications } from '@/base/notification/Notifications.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { MUIUtil } from '@/lib/mui/MUI.util.ts';

type DownloadStatus = 'idle' | 'adding_to_library' | 'fetching_chapters' | 'enqueuing' | 'starting_downloader' | 'success' | 'error';

export const MangaDownloadButton = memo(
    ({
        mangaId,
        mangaTitle,
        inLibrary,
        visible = false,
    }: {
        mangaId: number;
        mangaTitle: string;
        inLibrary: boolean;
        visible?: boolean;
    }) => {
        const { t } = useLingui();
        const [status, setStatus] = useState<DownloadStatus>('idle');
        const mountedRef = useRef(true);

        const tooltipTitle = (() => {
            switch (status) {
                case 'idle':
                    return t`Download`;
                case 'adding_to_library':
                    return t`Adding to library…`;
                case 'fetching_chapters':
                    return t`Fetching chapters…`;
                case 'enqueuing':
                    return t`Enqueuing downloads…`;
                case 'starting_downloader':
                    return t`Starting downloader…`;
                case 'success':
                    return t`Download started`;
                case 'error':
                    return t`Download failed`;
            }
        })();

        const handleDownload = useCallback(
            async (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();

                if (status !== 'idle') {
                    return;
                }

                try {
                    // Step 1: Add to library if not already there
                    if (!inLibrary) {
                        setStatus('adding_to_library');
                        await requestManager
                            .updateManga(mangaId, { updateManga: { inLibrary: true } })
                            .response;
                    }

                    // Step 2: Fetch chapters from source
                    setStatus('fetching_chapters');
                    const refreshResult = await requestManager
                        .refreshManga(mangaId, { fetchManga: true, fetchChapters: true })
                        .response;

                    const chapters = refreshResult.data?.fetchMangaAndChapters?.chapters;
                    if (!chapters || chapters.length === 0) {
                        if (mountedRef.current) {
                            Notifications.warn(
                                t`No chapters available`,
                                t`"${mangaTitle}" has no chapters to download`,
                            );
                            setStatus('idle');
                        }
                        return;
                    }

                    const chapterIds = chapters.map((ch: { id: number }) => ch.id);

                    // Step 3: Enqueue all chapters for download
                    setStatus('enqueuing');
                    await requestManager.addChaptersToDownloadQueue(chapterIds).response;

                    // Step 4: Start downloader
                    setStatus('starting_downloader');
                    await requestManager.startDownloads().response;

                    // Success
                    if (mountedRef.current) {
                        setStatus('success');
                        Notifications.success(
                            t`Download started`,
                            t`"${mangaTitle}" download has been queued`,
                        );
                        setTimeout(() => {
                            if (mountedRef.current) {
                                setStatus('idle');
                            }
                        }, 2000);
                    }
                } catch (err) {
                    if (mountedRef.current) {
                        Notifications.error(
                            t`Download failed`,
                            t`"${mangaTitle}": ${getErrorMessage(err)}`,
                        );
                        setStatus('error');
                        setTimeout(() => {
                            if (mountedRef.current) {
                                setStatus('idle');
                            }
                        }, 3000);
                    }
                }
            },
            [mangaId, mangaTitle, inLibrary, status, t],
        );

        const isLoading = status !== 'idle' && status !== 'success' && status !== 'error';

        const icon = (() => {
            if (isLoading) {
                return <CircularProgress size={20} color="inherit" />;
            }
            if (status === 'success') {
                return <CheckCircleIcon color="success" />;
            }
            if (status === 'error') {
                return <ErrorIcon color="error" />;
            }
            return <DownloadIcon />;
        })();

        return (
            <CustomTooltip title={tooltipTitle}>
                <IconButton
                    {...MUIUtil.preventRippleProp()}
                    className="manga-download-button"
                    onClick={handleDownload}
                    disabled={isLoading}
                    sx={{
                        visibility: visible || status !== 'idle' ? 'visible' : 'hidden',
                        pointerEvents: visible || status !== 'idle' ? 'all' : 'none',
                        '@media not (pointer: fine)': {
                            visibility: 'hidden',
                            width: 0,
                            height: 0,
                            p: 0,
                            m: 0,
                        },
                    }}
                >
                    {icon}
                </IconButton>
            </CustomTooltip>
        );
    },
);
