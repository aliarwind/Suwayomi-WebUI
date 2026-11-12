/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLingui } from '@lingui/react/macro';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useSubscription } from '@apollo/client/react';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { SCAN_PROGRESS_SUBSCRIPTION } from '@/lib/graphql/scan/ScanSubscription.ts';
import { REFRESH_PROGRESS_SUBSCRIPTION } from '@/lib/graphql/refresh/RefreshSubscription.ts';
import { ScanProgressView } from '@/features/scan/components/ScanProgressView.tsx';
import { RefreshProgressView } from '@/features/scan/components/RefreshProgressView.tsx';
import type { ScanProgress, ScanStatus, RefreshProgress, RefreshStatus } from '@/features/scan/Scan.types.ts';

// ---- Source Selector ----

type SourceOption = { id: string; label: string; sourceId: string };

const ALL_SOURCES: SourceOption = { id: '__all__', label: '全部插件', sourceId: '0' };

// ---- Scan (Download Mark Repair) Section ----

const DownloadMarkRepairSection = () => {
    const { t } = useLingui();

    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState<ScanProgress | null>(null);
    const [fixedChapters, setFixedChapters] = useState<ScanProgress['chapterFixed'][]>([]);
    const [errors, setErrors] = useState<ScanProgress['chapterError'][]>([]);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);

    const fixedRef = useRef<ScanProgress['chapterFixed'][]>([]);
    const errorsRef = useRef<ScanProgress['chapterError'][]>([]);
    const initializedRef = useRef(false);

    // Query current scan status on mount — survives page refresh
    const { data: statusData } = requestManager.useGetScanStatus({
        fetchPolicy: 'network-only',
    });

    const scanStatus = statusData?.scanStatus as ScanStatus | undefined;

    // Initialize state from query result (runs once on mount)
    useEffect(() => {
        if (initializedRef.current || !scanStatus) {
            return;
        }

        const fixed = (scanStatus.fixedChapters ?? []).map((fc) => ({ ...fc }));
        const errs = (scanStatus.errors ?? []).map((e) => ({ ...e }));

        if (scanStatus.isRunning) {
            initializedRef.current = true;
            fixedRef.current = fixed;
            errorsRef.current = errs;
            setFixedChapters(fixed);
            setErrors(errs);
            setProgress({
                type: scanStatus.type,
                totalManga: scanStatus.totalManga,
                scannedManga: scanStatus.scannedManga,
                mangaTitle: scanStatus.mangaTitle,
                chapterFixed: null,
                chapterError: null,
                totalChaptersScanned: scanStatus.totalChaptersScanned,
                totalChaptersFixed: scanStatus.totalChaptersFixed,
                chaptersAlreadyCorrect: scanStatus.chaptersAlreadyCorrect,
                totalErrors: scanStatus.totalErrors,
            });
            setScanning(true);
            setIsDone(false);
        } else if (scanStatus.type === 'COMPLETED' && scanStatus.totalManga > 0) {
            initializedRef.current = true;
            fixedRef.current = fixed;
            errorsRef.current = errs;
            setFixedChapters(fixed);
            setErrors(errs);
            setProgress({
                type: 'COMPLETED',
                totalManga: scanStatus.totalManga,
                scannedManga: scanStatus.scannedManga,
                mangaTitle: null,
                chapterFixed: null,
                chapterError: null,
                totalChaptersScanned: scanStatus.totalChaptersScanned,
                totalChaptersFixed: scanStatus.totalChaptersFixed,
                chaptersAlreadyCorrect: scanStatus.chaptersAlreadyCorrect,
                totalErrors: scanStatus.totalErrors,
            });
            setIsDone(true);
        }
    }, [scanStatus]);

    // Subscribe to scan progress (only when scanning)
    useSubscription<{ scanProgressChanged: ScanProgress | null }>(SCAN_PROGRESS_SUBSCRIPTION, {
        client: (requestManager as any).graphQLClient?.client,
        skip: !scanning,
        onData: ({ data }) => {
            const event = data?.data?.scanProgressChanged as ScanProgress | undefined;
            if (!event) {
                return;
            }

            setProgress(event);

            if (event.chapterFixed) {
                const alreadyExists = fixedRef.current.some((f) => f?.chapterId === event.chapterFixed!.chapterId);
                if (!alreadyExists) {
                    fixedRef.current = [...fixedRef.current, event.chapterFixed];
                    setFixedChapters([...fixedRef.current]);
                }
            }

            if (event.chapterError) {
                const alreadyExists = errorsRef.current.some(
                    (e) => e?.chapterId != null && e.chapterId === event.chapterError!.chapterId,
                );
                if (!alreadyExists) {
                    errorsRef.current = [...errorsRef.current, event.chapterError];
                    setErrors([...errorsRef.current]);
                }
            }

            if (event.type === 'COMPLETED') {
                setScanning(false);
                setIsDone(true);
            }
        },
        onError: (err: Error) => {
            setMutationError(err.message);
            setScanning(false);
        },
    });

    const handleStartScan = useCallback(async () => {
        setScanning(true);
        setIsDone(false);
        setMutationError(null);
        setProgress(null);
        fixedRef.current = [];
        errorsRef.current = [];
        setFixedChapters([]);
        setErrors([]);
        initializedRef.current = true;

        try {
            await requestManager.startScan().response;
        } catch (e: any) {
            setMutationError(e?.message ?? String(e));
            setScanning(false);
        }
    }, []);

    const isRunning = scanning && !isDone;

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                {t`修复下载标记`}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {t`检查书架上下载标记与实际文件的一致性。如果章节文件已存在但未标记为已下载，将自动修复。`}
            </Typography>

            <Button
                variant="contained"
                startIcon={isRunning ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleStartScan}
                disabled={isRunning}
                size="large"
            >
                {isRunning ? t`修复中...` : t`修复下载标记`}
            </Button>

            {mutationError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {mutationError}
                </Alert>
            )}

            {/* Progress display */}
            {(progress || isRunning) && (
                <ScanProgressView progress={progress} fixedChapters={fixedChapters} errors={errors} />
            )}
        </Paper>
    );
};

// ---- Manga Info Refresh Section ----

const MangaRefreshSection = () => {
    const { t } = useLingui();

    const [refreshing, setRefreshing] = useState(false);
    const [progress, setProgress] = useState<RefreshProgress | null>(null);
    const [refreshedMangaList, setRefreshedMangaList] = useState<RefreshProgress['mangaResult'][]>([]);
    const [failedMangaList, setFailedMangaList] = useState<RefreshProgress['mangaError'][]>([]);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);
    const [selectedSource, setSelectedSource] = useState<SourceOption>(ALL_SOURCES);
    const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
    const [dateTo, setDateTo] = useState<Dayjs | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(null);
    const [retryingIds, setRetryingIds] = useState<Set<number>>(new Set());
    const [selectedFailedIds, setSelectedFailedIds] = useState<Set<number>>(new Set());

    const refreshedRef = useRef<RefreshProgress['mangaResult'][]>([]);
    const failedRef = useRef<RefreshProgress['mangaError'][]>([]);
    const initializedRef = useRef(false);
    const lastProgressUpdateRef = useRef(0);

    // Fetch available sources for the selector
    const { data: sourcesData } = requestManager.useGetSourceList();
    const sources: SourceOption[] = [
        ALL_SOURCES,
        ...(sourcesData?.sources?.nodes ?? []).map(
            (s: { id: string; displayName: string; name: string; lang: string }) => ({
                id: s.id,
                label: `${s.displayName || s.name} (${s.lang})`,
                sourceId: s.id,
            }),
        ),
    ];

    // Query current refresh status on mount — survives page refresh
    const { data: statusData } = requestManager.useGetRefreshStatus({
        fetchPolicy: 'network-only',
    });

    const refreshStatus = statusData?.refreshStatus as RefreshStatus | undefined;

    // Initialize state from query result (runs once on mount)
    useEffect(() => {
        if (initializedRef.current || !refreshStatus) {
            return;
        }

        const refreshed = (refreshStatus.refreshedMangaList ?? []).map((r) => ({ ...r }));
        const failed = (refreshStatus.failedMangaList ?? []).map((e) => ({ ...e }));

        if (refreshStatus.isRunning) {
            initializedRef.current = true;
            refreshedRef.current = refreshed;
            failedRef.current = failed;
            setRefreshedMangaList(refreshed);
            setFailedMangaList(failed);
            setProgress({
                type: 'REFRESHING_MANGA',
                totalManga: refreshStatus.totalManga,
                refreshedManga: refreshStatus.refreshedManga,
                currentMangaTitle: null,
                mangaResult: null,
                mangaError: null,
                totalRefreshed: refreshStatus.totalRefreshed,
                totalFailed: refreshStatus.totalFailed,
            });
            setRefreshing(true);
            setIsDone(false);
        } else if (refreshStatus.totalManga > 0) {
            initializedRef.current = true;
            refreshedRef.current = refreshed;
            failedRef.current = failed;
            setRefreshedMangaList(refreshed);
            setFailedMangaList(failed);
            setProgress({
                type: 'COMPLETED',
                totalManga: refreshStatus.totalManga,
                refreshedManga: refreshStatus.refreshedManga,
                currentMangaTitle: null,
                mangaResult: null,
                mangaError: null,
                totalRefreshed: refreshStatus.totalRefreshed,
                totalFailed: refreshStatus.totalFailed,
            });
            setIsDone(true);
        }
    }, [refreshStatus]);

    // Subscribe to refresh progress (only when refreshing)
    useSubscription<{ refreshProgressChanged: RefreshProgress | null }>(REFRESH_PROGRESS_SUBSCRIPTION, {
        client: (requestManager as any).graphQLClient?.client,
        skip: !refreshing,
        onData: ({ data }) => {
            const event = data?.data?.refreshProgressChanged as RefreshProgress | undefined;
            if (!event) {
                return;
            }

            const isIntermediate = event.type === 'REFRESHING_MANGA';
            const isResult = event.type === 'MANGA_REFRESHED' || event.type === 'MANGA_FAILED';
            const isFinal = event.type === 'COMPLETED' || event.type === 'STOPPED';

            // Throttle intermediate progress updates to reduce re-renders.
            // Only update the progress bar at most every 500ms for REFRESHING_MANGA events.
            // Result and final events always update immediately.
            if (isIntermediate) {
                const now = Date.now();
                if (now - lastProgressUpdateRef.current < 500) {
                    return;
                }
                lastProgressUpdateRef.current = now;
                setProgress(event);
                return; // intermediate events don't carry result/error data
            }

            // Always update progress for meaningful events
            if (isFinal) {
                lastProgressUpdateRef.current = 0;
            }
            setProgress(event);

            if (isResult) {
                if (event.mangaResult) {
                    const alreadyExists = refreshedRef.current.some((r) => r?.mangaId === event.mangaResult!.mangaId);
                    if (!alreadyExists) {
                        refreshedRef.current = [...refreshedRef.current, event.mangaResult];
                        setRefreshedMangaList([...refreshedRef.current]);
                    }
                }
                if (event.mangaError) {
                    const alreadyExists = failedRef.current.some(
                        (e) => e?.mangaId != null && e.mangaId === event.mangaError!.mangaId,
                    );
                    if (!alreadyExists) {
                        failedRef.current = [...failedRef.current, event.mangaError];
                        setFailedMangaList([...failedRef.current]);
                    }
                }
            }

            if (isFinal) {
                setRefreshing(false);
                setIsDone(true);
            }
        },
        onError: (err: Error) => {
            setMutationError(err.message);
            setRefreshing(false);
        },
    });

    const handleStartRefresh = useCallback(async () => {
        setRefreshing(true);
        setIsDone(false);
        setMutationError(null);
        setProgress(null);
        refreshedRef.current = [];
        failedRef.current = [];
        setRefreshedMangaList([]);
        setFailedMangaList([]);
        setSelectedFailedIds(new Set());
        initializedRef.current = true;

        const sourceId = selectedSource.id === '__all__' ? null : selectedSource.sourceId;
        const dateFromStr = dateFrom ? Math.floor(dateFrom.startOf('day').valueOf() / 1000).toString() : null;
        const dateToStr = dateTo ? Math.floor(dateTo.endOf('day').valueOf() / 1000).toString() : null;

        try {
            await requestManager.startRefresh(sourceId, dateFromStr, dateToStr).response;
        } catch (e: any) {
            setMutationError(e?.message ?? String(e));
            setRefreshing(false);
        }
    }, [selectedSource, dateFrom, dateTo]);

    const handleStopRefresh = useCallback(async () => {
        try {
            await requestManager.stopRefresh().response;
        } catch (e: any) {
            setMutationError(e?.message ?? String(e));
        }
    }, []);

    const handleRetry = useCallback(async (mangaId: number) => {
        setRetryingIds((prev) => new Set(prev).add(mangaId));
        try {
            const result = await requestManager.retryRefreshManga(mangaId).response;
            const payload = result?.data?.retryRefreshManga;
            if (payload?.success) {
                // Move from failed to refreshed
                const failedItem = failedRef.current.find((e) => e?.mangaId === mangaId);
                failedRef.current = failedRef.current.filter((e) => e?.mangaId !== mangaId);
                setFailedMangaList([...failedRef.current]);
                if (failedItem) {
                    const refreshedItem = { mangaId, mangaTitle: failedItem.mangaTitle ?? String(mangaId) };
                    const alreadyExists = refreshedRef.current.some((r) => r?.mangaId === mangaId);
                    if (!alreadyExists) {
                        refreshedRef.current = [...refreshedRef.current, refreshedItem];
                        setRefreshedMangaList([...refreshedRef.current]);
                    }
                }
            } else {
                // Update error message
                const idx = failedRef.current.findIndex((e) => e?.mangaId === mangaId);
                if (idx !== -1) {
                    failedRef.current = failedRef.current.map((e, i) =>
                        i === idx ? { ...e!, error: payload?.error ?? e!.error } : e,
                    );
                    setFailedMangaList([...failedRef.current]);
                }
            }
        } catch (e: any) {
            // Network error — update the error message
            const idx = failedRef.current.findIndex((err) => err?.mangaId === mangaId);
            if (idx !== -1) {
                failedRef.current = failedRef.current.map((err, i) =>
                    i === idx ? { ...err!, error: e?.message ?? String(e) } : err,
                );
                setFailedMangaList([...failedRef.current]);
            }
        } finally {
            setRetryingIds((prev) => {
                const next = new Set(prev);
                next.delete(mangaId);
                return next;
            });
        }
    }, []);

    const handleRetrySelected = useCallback(async () => {
        const ids = [...selectedFailedIds];
        if (ids.length === 0) {
            return;
        }

        // Mark all selected as retrying
        setRetryingIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
        });

        // Process sequentially to avoid overwhelming the server
        for (const mangaId of ids) {
            try {
                // oxlint-disable-next-line no-await-in-loop
                const result = await requestManager.retryRefreshManga(mangaId).response;
                const payload = result?.data?.retryRefreshManga;
                if (payload?.success) {
                    const failedItem = failedRef.current.find((e) => e?.mangaId === mangaId);
                    failedRef.current = failedRef.current.filter((e) => e?.mangaId !== mangaId);
                    setFailedMangaList([...failedRef.current]);
                    if (failedItem) {
                        const refreshedItem = { mangaId, mangaTitle: failedItem.mangaTitle ?? String(mangaId) };
                        const alreadyExists = refreshedRef.current.some((r) => r?.mangaId === mangaId);
                        if (!alreadyExists) {
                            refreshedRef.current = [...refreshedRef.current, refreshedItem];
                            setRefreshedMangaList([...refreshedRef.current]);
                        }
                    }
                    // Remove from selection on success
                    setSelectedFailedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(mangaId);
                        return next;
                    });
                } else {
                    // Update error message
                    const idx = failedRef.current.findIndex((e) => e?.mangaId === mangaId);
                    if (idx !== -1) {
                        failedRef.current = failedRef.current.map((e, i) =>
                            i === idx ? { ...e!, error: payload?.error ?? e!.error } : e,
                        );
                        setFailedMangaList([...failedRef.current]);
                    }
                }
            } catch (e: any) {
                const idx = failedRef.current.findIndex((err) => err?.mangaId === mangaId);
                if (idx !== -1) {
                    failedRef.current = failedRef.current.map((err, i) =>
                        i === idx ? { ...err!, error: e?.message ?? String(e) } : err,
                    );
                    setFailedMangaList([...failedRef.current]);
                }
            } finally {
                setRetryingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(mangaId);
                    return next;
                });
            }
        }
    }, [selectedFailedIds]);

    const handleRetryAll = useCallback(async () => {
        // Collect all failed manga IDs (not just the visible/selected ones)
        const ids = failedRef.current.filter((e) => e?.mangaId != null).map((e) => e!.mangaId!);
        if (ids.length === 0) {
            return;
        }

        // Mark all as retrying
        setRetryingIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
        });

        // Process sequentially to avoid overwhelming the server
        for (const mangaId of ids) {
            try {
                // oxlint-disable-next-line no-await-in-loop
                const result = await requestManager.retryRefreshManga(mangaId).response;
                const payload = result?.data?.retryRefreshManga;
                if (payload?.success) {
                    const failedItem = failedRef.current.find((e) => e?.mangaId === mangaId);
                    failedRef.current = failedRef.current.filter((e) => e?.mangaId !== mangaId);
                    setFailedMangaList([...failedRef.current]);
                    if (failedItem) {
                        const refreshedItem = { mangaId, mangaTitle: failedItem.mangaTitle ?? String(mangaId) };
                        const alreadyExists = refreshedRef.current.some((r) => r?.mangaId === mangaId);
                        if (!alreadyExists) {
                            refreshedRef.current = [...refreshedRef.current, refreshedItem];
                            setRefreshedMangaList([...refreshedRef.current]);
                        }
                    }
                    // Also remove from selection on success
                    setSelectedFailedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(mangaId);
                        return next;
                    });
                } else {
                    const idx = failedRef.current.findIndex((e) => e?.mangaId === mangaId);
                    if (idx !== -1) {
                        failedRef.current = failedRef.current.map((e, i) =>
                            i === idx ? { ...e!, error: payload?.error ?? e!.error } : e,
                        );
                        setFailedMangaList([...failedRef.current]);
                    }
                }
            } catch (e: any) {
                const idx = failedRef.current.findIndex((err) => err?.mangaId === mangaId);
                if (idx !== -1) {
                    failedRef.current = failedRef.current.map((err, i) =>
                        i === idx ? { ...err!, error: e?.message ?? String(e) } : err,
                    );
                    setFailedMangaList([...failedRef.current]);
                }
            } finally {
                setRetryingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(mangaId);
                    return next;
                });
            }
        }
    }, []);

    const isRunning = refreshing && !isDone;

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                {t`漫画信息刷新`}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {t`从插件源重新获取漫画元数据和章节列表，失败时不修改已有数据。可选择仅刷新某个插件下的漫画，或按添加到书架的日期范围筛选。`}
            </Typography>

            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={dayjs.locale()}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                    <Autocomplete
                        options={sources}
                        value={selectedSource}
                        onChange={(_event, newValue) => {
                            if (newValue) {
                                setSelectedSource(newValue);
                            }
                        }}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        disableClearable
                        sx={{ minWidth: 260 }}
                        renderInput={(params) => <TextField {...params} label={t`选择插件`} size="small" />}
                    />

                    <DatePicker
                        label={t`选择月份`}
                        value={selectedMonth}
                        onChange={(newValue) => {
                            setSelectedMonth(newValue);
                            if (newValue) {
                                setDateFrom(newValue.startOf('month'));
                                setDateTo(newValue.endOf('month'));
                            } else {
                                setDateFrom(null);
                                setDateTo(null);
                            }
                        }}
                        views={['year', 'month']}
                        slotProps={{
                            textField: { size: 'small', sx: { minWidth: 160 } },
                            field: { clearable: true },
                        }}
                    />

                    <DatePicker
                        label={t`添加起始日期`}
                        value={dateFrom}
                        onChange={(newValue) => {
                            setDateFrom(newValue);
                            if (newValue) {
                                setSelectedMonth(null);
                            }
                        }}
                        slotProps={{
                            textField: { size: 'small', sx: { minWidth: 180 } },
                            field: { clearable: true },
                        }}
                    />

                    <Typography variant="body2" color="text.secondary">
                        {t`至`}
                    </Typography>

                    <DatePicker
                        label={t`添加结束日期`}
                        value={dateTo}
                        onChange={(newValue) => {
                            setDateTo(newValue);
                            if (newValue) {
                                setSelectedMonth(null);
                            }
                        }}
                        slotProps={{
                            textField: { size: 'small', sx: { minWidth: 180 } },
                            field: { clearable: true },
                        }}
                    />

                    {isRunning ? (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<StopIcon />}
                            onClick={handleStopRefresh}
                            size="large"
                        >
                            {t`停止刷新`}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            startIcon={<PlayArrowIcon />}
                            onClick={handleStartRefresh}
                            disabled={isRunning}
                            size="large"
                        >
                            {t`漫画信息刷新`}
                        </Button>
                    )}
                </Box>
            </LocalizationProvider>

            {mutationError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {mutationError}
                </Alert>
            )}

            {/* Progress display */}
            {(progress || isRunning) && (
                <RefreshProgressView
                    progress={progress}
                    refreshedMangaList={refreshedMangaList}
                    failedMangaList={failedMangaList}
                    onRetry={handleRetry}
                    retryingIds={retryingIds}
                    selectedFailedIds={selectedFailedIds}
                    onSelectionChange={setSelectedFailedIds}
                    onRetrySelected={handleRetrySelected}
                    onRetryAll={handleRetryAll}
                />
            )}
        </Paper>
    );
};

// ---- Page Wrapper ----

export const ScanCheck = () => {
    const { t } = useLingui();
    useAppTitle(t`扫描检查`);

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                {t`扫描检查`}
            </Typography>

            <DownloadMarkRepairSection />
            <MangaRefreshSection />
        </Box>
    );
};
