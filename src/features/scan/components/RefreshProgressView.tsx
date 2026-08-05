import { useMemo } from 'react';
import { useLingui } from '@lingui/react/macro';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { RefreshProgress } from '@/features/scan/Scan.types.ts';

export const RefreshProgressView = ({
    progress,
    refreshedMangaList,
    failedMangaList,
    onRetry,
    retryingIds,
    selectedFailedIds,
    onSelectionChange,
    onRetrySelected,
    onRetryAll,
}: {
    progress: RefreshProgress | null;
    refreshedMangaList: RefreshProgress['mangaResult'][];
    failedMangaList: RefreshProgress['mangaError'][];
    onRetry?: (mangaId: number) => void;
    retryingIds?: Set<number>;
    selectedFailedIds?: Set<number>;
    onSelectionChange?: (ids: Set<number>) => void;
    onRetrySelected?: () => void;
    onRetryAll?: () => void;
}) => {
    const { t } = useLingui();

    // Failed items that have a valid mangaId (can be selected/retried)
    const selectableIds = useMemo(
        () => new Set(failedMangaList.filter((e) => e?.mangaId != null).map((e) => e!.mangaId!)),
        [failedMangaList],
    );
    const selectedCount = useMemo(
        () =>
            selectedFailedIds
                ? [...selectedFailedIds].filter((id) => selectableIds.has(id)).length
                : 0,
        [selectedFailedIds, selectableIds],
    );
    const allSelected = selectableIds.size > 0 && selectedCount === selectableIds.size;
    const someSelected = selectedCount > 0;

    const handleToggleAll = () => {
        if (!onSelectionChange) return;
        if (allSelected) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(selectableIds));
        }
    };

    const handleToggleOne = (mangaId: number) => {
        if (!onSelectionChange) return;
        const next = new Set(selectedFailedIds ?? []);
        if (next.has(mangaId)) {
            next.delete(mangaId);
        } else {
            next.add(mangaId);
        }
        onSelectionChange(next);
    };

    if (!progress || progress.type === 'STARTED') {
        return null;
    }

    const isDone = progress.type === 'COMPLETED';
    const isStopped = progress.type === 'STOPPED';
    const isActive = !isDone && !isStopped;
    const progressPercent =
        progress.totalManga > 0 ? Math.round((progress.refreshedManga / progress.totalManga) * 100) : 0;
    const currentMangaTitle = progress.currentMangaTitle ?? '';

    // Are any of the selected items currently being retried?
    const isBatchRetrying =
        someSelected && retryingIds ? [...selectedFailedIds!].some((id) => retryingIds.has(id)) : false;

    // Is the "retry all" operation in progress? (all selectable IDs are being retried)
    const isRetryingAll =
        selectableIds.size > 0 && retryingIds
            ? [...selectableIds].every((id) => retryingIds.has(id))
            : false;

    // Cap rendered list items to avoid DOM node explosion with large libraries.
    // The full counts are still shown in the chips; the lists show the most recent items.
    const MAX_VISIBLE_ITEMS = 500;
    const visibleRefreshed = refreshedMangaList.slice(-MAX_VISIBLE_ITEMS);
    const visibleFailed = failedMangaList.slice(-MAX_VISIBLE_ITEMS);
    const refreshedHidden = refreshedMangaList.length - MAX_VISIBLE_ITEMS;
    const failedHidden = failedMangaList.length - MAX_VISIBLE_ITEMS;

    return (
        <Box sx={{ mt: 3 }}>
            {/* Stats */}
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip label={t`目标总数: ${progress.totalManga}`} variant="outlined" size="small" />
                <Chip label={t`已处理: ${refreshedMangaList.length + failedMangaList.length}`} color="primary" size="small" />
                <Chip label={t`成功: ${refreshedMangaList.length}`} color="success" size="small" />
                {failedMangaList.length > 0 && (
                    <Chip label={t`失败: ${failedMangaList.length}`} color="error" size="small" />
                )}
            </Stack>

            {/* Progress bar */}
            {isActive && (
                <Box sx={{ mb: 2 }}>
                    <LinearProgress variant="determinate" value={progressPercent} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {currentMangaTitle
                            ? t`${progressPercent}% — 当前刷新: ${currentMangaTitle} (${progress.refreshedManga}/${progress.totalManga})`
                            : t`${progressPercent}% (${progress.refreshedManga}/${progress.totalManga})`}
                    </Typography>
                </Box>
            )}

            {isDone && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {t`刷新完成！共 ${progress.totalManga} 部漫画，成功 ${refreshedMangaList.length} 部，失败 ${failedMangaList.length} 部。`}
                </Alert>
            )}

            {isStopped && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t`刷新已停止。已刷新 ${refreshedMangaList.length + failedMangaList.length}/${progress.totalManga} 部漫画，成功 ${refreshedMangaList.length} 部，失败 ${failedMangaList.length} 部。`}
                </Alert>
            )}

            {/* Refreshed manga list */}
            {visibleRefreshed.length > 0 && (
                <List
                    dense
                    subheader={
                        <ListSubheader component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleIcon fontSize="small" color="success" />
                            {t`已刷新`}
                            {refreshedHidden > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    {t`（显示最近 ${MAX_VISIBLE_ITEMS} 条，隐藏 ${refreshedHidden} 条）`}
                                </Typography>
                            )}
                        </ListSubheader>
                    }
                    sx={{ maxHeight: 300, overflow: 'auto' }}
                >
                    {visibleRefreshed
                        .filter(Boolean)
                        .map((manga, index) => {
                            if (!manga) return null;
                            return (
                                <ListItem key={`${manga.mangaId}-${index}`}>
                                    <ListItemText primary={manga.mangaTitle} />
                                </ListItem>
                            );
                        })}
                </List>
            )}

            {/* Failed manga list */}
            {visibleFailed.length > 0 && (
                <>
                    {/* Batch actions bar */}
                    {onSelectionChange && onRetrySelected && (
                        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                            <Checkbox
                                size="small"
                                checked={allSelected}
                                indeterminate={someSelected && !allSelected}
                                onChange={handleToggleAll}
                            />
                            <Typography variant="body2" color="text.secondary">
                                {allSelected ? t`取消全选` : t`全选`}
                            </Typography>
                            {someSelected && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={
                                        isBatchRetrying ? (
                                            <CircularProgress size={16} />
                                        ) : (
                                            <RefreshIcon fontSize="small" />
                                        )
                                    }
                                    onClick={onRetrySelected}
                                    disabled={isBatchRetrying}
                                >
                                    {t`重试选中 (${selectedCount})`}
                                </Button>
                            )}
                            {onRetryAll && selectableIds.size > 0 && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={
                                        isRetryingAll ? (
                                            <CircularProgress size={16} />
                                        ) : (
                                            <RefreshIcon fontSize="small" />
                                        )
                                    }
                                    onClick={onRetryAll}
                                    disabled={isRetryingAll}
                                >
                                    {t`重试全部失败 (${selectableIds.size})`}
                                </Button>
                            )}
                        </Stack>
                    )}

                    <List
                        dense
                        subheader={
                            <ListSubheader component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ErrorIcon fontSize="small" color="error" />
                                {t`失败`}
                                {failedHidden > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        {t`（显示最近 ${MAX_VISIBLE_ITEMS} 条，隐藏 ${failedHidden} 条）`}
                                    </Typography>
                                )}
                            </ListSubheader>
                        }
                        sx={{ maxHeight: 200, overflow: 'auto' }}
                    >
                        {visibleFailed
                            .filter(Boolean)
                            .map((err, index) => {
                                if (!err) return null;
                                const mangaId = err.mangaId;
                                const isRetrying = mangaId != null && retryingIds?.has(mangaId);
                                const isSelected = mangaId != null && selectedFailedIds?.has(mangaId);
                                const canSelect = mangaId != null && onSelectionChange != null;

                                return (
                                    <ListItem
                                        key={`${mangaId ?? 'unknown'}-${index}`}
                                        secondaryAction={
                                            mangaId != null && onRetry ? (
                                                <IconButton
                                                    edge="end"
                                                    size="small"
                                                    onClick={() => onRetry(mangaId)}
                                                    disabled={isRetrying}
                                                >
                                                    {isRetrying ? (
                                                        <CircularProgress size={20} />
                                                    ) : (
                                                        <RefreshIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            ) : undefined
                                        }
                                    >
                                        {canSelect && (
                                            <Checkbox
                                                size="small"
                                                checked={isSelected ?? false}
                                                onChange={() => handleToggleOne(mangaId!)}
                                                sx={{ mr: 1 }}
                                            />
                                        )}
                                        <ListItemText
                                            primary={err.mangaTitle ?? t`未知漫画`}
                                            secondary={err.error}
                                        />
                                    </ListItem>
                                );
                            })}
                    </List>
                </>
            )}
        </Box>
    );
};
