import { useLingui } from '@lingui/react/macro';
import Box from '@mui/material/Box';
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
import type { ScanProgress } from '@/features/scan/Scan.types.ts';

export const ScanProgressView = ({
    progress,
    fixedChapters,
    errors,
}: {
    progress: ScanProgress | null;
    fixedChapters: ScanProgress['chapterFixed'][];
    errors: ScanProgress['chapterError'][];
}) => {
    const { t } = useLingui();

    if (!progress || progress.type === 'STARTED') {
        return null;
    }

    const isDone = progress.type === 'COMPLETED';
    const progressPercent =
        progress.totalManga > 0 ? Math.round((progress.scannedManga / progress.totalManga) * 100) : 0;
    const currentMangaTitle = progress.mangaTitle ?? '';

    return (
        <Box sx={{ mt: 3 }}>
            {/* Stats */}
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip label={t`漫画总数: ${progress.totalManga}`} variant="outlined" size="small" />
                <Chip label={t`已扫描: ${progress.scannedManga}`} color="primary" size="small" />
                <Chip label={t`已修复: ${progress.totalChaptersFixed}`} color="success" size="small" />
                {progress.chaptersAlreadyCorrect > 0 && (
                    <Chip
                        label={t`已正确: ${progress.chaptersAlreadyCorrect}`}
                        variant="outlined"
                        size="small"
                    />
                )}
            </Stack>

            {/* Progress bar */}
            {!isDone && (
                <Box sx={{ mb: 2 }}>
                    <LinearProgress variant="determinate" value={progressPercent} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {t`${progressPercent}% — 当前扫描: ${currentMangaTitle} (${progress.scannedManga}/${progress.totalManga})`}
                    </Typography>
                </Box>
            )}

            {isDone && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {t`扫描完成！共扫描 ${progress.totalManga} 部漫画，${progress.totalChaptersScanned} 个章节，修复 ${progress.totalChaptersFixed} 个。`}
                </Alert>
            )}

            {/* Fixed chapters list */}
            {fixedChapters.length > 0 && (
                <List
                    dense
                    subheader={
                        <ListSubheader component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleIcon fontSize="small" color="success" />
                            {t`修复记录`}
                        </ListSubheader>
                    }
                    sx={{ maxHeight: 300, overflow: 'auto' }}
                >
                    {fixedChapters
                        .filter(Boolean)
                        .map((chapter, index) => {
                            if (!chapter) return null;
                            const title = `${chapter.mangaTitle} > ${chapter.chapterName}`;
                            const pages = chapter.pageCountFound;
                            const marked = chapter.wasMarkedDownloaded;
                            const countWrong = chapter.wasPageCountWrong;
                            const parts: string[] = [];
                            if (pages) parts.push(t`${pages} 页`);
                            if (marked) parts.push(t`已标记下载`);
                            if (countWrong) parts.push(t`页数修正`);

                            return (
                                <ListItem key={`${chapter.chapterId}-${index}`}>
                                    <ListItemText primary={title} secondary={parts.join(' · ')} />
                                </ListItem>
                            );
                        })}
                </List>
            )}

            {/* Errors list */}
            {errors.length > 0 && (
                <List
                    dense
                    subheader={
                        <ListSubheader component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ErrorIcon fontSize="small" color="error" />
                            {t`错误`}
                        </ListSubheader>
                    }
                    sx={{ maxHeight: 200, overflow: 'auto' }}
                >
                    {errors
                        .filter(Boolean)
                        .map((err, index) => {
                            if (!err) return null;
                            return (
                                <ListItem key={`${err.chapterId ?? 'unknown'}-${index}`}>
                                    <ListItemText
                                        primary={err.mangaTitle ?? t`未知漫画`}
                                        secondary={err.error}
                                    />
                                </ListItem>
                            );
                        })}
                </List>
            )}
        </Box>
    );
};
