import gql from 'graphql-tag';

export const SCAN_PROGRESS_FIELDS = gql`
    fragment SCAN_PROGRESS_FIELDS on ScanProgressType {
        type
        totalManga
        scannedManga
        mangaTitle
        chapterFixed {
            chapterId
            mangaId
            mangaTitle
            chapterName
            pageCountFound
            wasMarkedDownloaded
            wasPageCountWrong
        }
        chapterError {
            chapterId
            mangaId
            mangaTitle
            error
        }
        totalChaptersScanned
        totalChaptersFixed
        chaptersAlreadyCorrect
        totalErrors
    }
`;
