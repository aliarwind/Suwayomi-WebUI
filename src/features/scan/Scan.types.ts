export type ScanProgress = {
    type: 'STARTED' | 'SCANNING_MANGA' | 'CHAPTER_FIXED' | 'CHAPTER_ERROR' | 'COMPLETED';
    totalManga: number;
    scannedManga: number;
    mangaTitle: string | null;
    chapterFixed: {
        chapterId: number;
        mangaId: number;
        mangaTitle: string;
        chapterName: string;
        pageCountFound: number;
        wasMarkedDownloaded: boolean;
        wasPageCountWrong: boolean;
    } | null;
    chapterError: {
        chapterId: number | null;
        mangaId: number | null;
        mangaTitle: string | null;
        error: string;
    } | null;
    totalChaptersScanned: number;
    totalChaptersFixed: number;
    chaptersAlreadyCorrect: number;
    totalErrors: number;
};

/** Progress event for manga info refresh (subscription). */
export type RefreshProgress = {
    type: 'STARTED' | 'REFRESHING_MANGA' | 'MANGA_REFRESHED' | 'MANGA_FAILED' | 'STOPPED' | 'COMPLETED';
    totalManga: number;
    refreshedManga: number;
    currentMangaTitle: string | null;
    mangaResult: {
        mangaId: number;
        mangaTitle: string;
    } | null;
    mangaError: {
        mangaId: number | null;
        mangaTitle: string | null;
        error: string;
    } | null;
    totalRefreshed: number;
    totalFailed: number;
};

/** Full accumulated refresh status returned by the refreshStatus query. */
export type RefreshStatus = {
    isRunning: boolean;
    sourceId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    totalManga: number;
    refreshedManga: number;
    totalRefreshed: number;
    totalFailed: number;
    refreshedMangaList: Array<{
        mangaId: number;
        mangaTitle: string;
    }>;
    failedMangaList: Array<{
        mangaId: number | null;
        mangaTitle: string | null;
        error: string;
    }>;
};

/** Full accumulated scan status returned by the scanStatus query. */
export type ScanStatus = {
    isRunning: boolean;
    type: 'STARTED' | 'SCANNING_MANGA' | 'CHAPTER_FIXED' | 'CHAPTER_ERROR' | 'COMPLETED';
    totalManga: number;
    scannedManga: number;
    mangaTitle: string | null;
    totalChaptersScanned: number;
    totalChaptersFixed: number;
    chaptersAlreadyCorrect: number;
    totalErrors: number;
    fixedChapters: Array<{
        chapterId: number;
        mangaId: number;
        mangaTitle: string;
        chapterName: string;
        pageCountFound: number;
        wasMarkedDownloaded: boolean;
        wasPageCountWrong: boolean;
    }>;
    errors: Array<{
        chapterId: number | null;
        mangaId: number | null;
        mangaTitle: string | null;
        error: string;
    }>;
};
