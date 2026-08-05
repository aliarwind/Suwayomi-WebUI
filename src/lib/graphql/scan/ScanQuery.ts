import gql from 'graphql-tag';

export const GET_SCAN_STATUS = gql`
    query GET_SCAN_STATUS {
        scanStatus {
            isRunning
            type
            totalManga
            scannedManga
            mangaTitle
            totalChaptersScanned
            totalChaptersFixed
            chaptersAlreadyCorrect
            totalErrors
            fixedChapters {
                chapterId
                mangaId
                mangaTitle
                chapterName
                pageCountFound
                wasMarkedDownloaded
                wasPageCountWrong
            }
            errors {
                chapterId
                mangaId
                mangaTitle
                error
            }
        }
    }
`;
