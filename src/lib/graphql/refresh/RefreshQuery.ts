import gql from 'graphql-tag';
import { REFRESH_MANGA_RESULT_FIELDS, REFRESH_MANGA_ERROR_FIELDS } from './RefreshFragments.ts';

export const GET_REFRESH_STATUS = gql`
    ${REFRESH_MANGA_RESULT_FIELDS}
    ${REFRESH_MANGA_ERROR_FIELDS}
    query GET_REFRESH_STATUS {
        refreshStatus {
            isRunning
            sourceId
            dateFrom
            dateTo
            totalManga
            refreshedManga
            totalRefreshed
            totalFailed
            refreshedMangaList {
                ...REFRESH_MANGA_RESULT_FIELDS
            }
            failedMangaList {
                ...REFRESH_MANGA_ERROR_FIELDS
            }
        }
    }
`;
