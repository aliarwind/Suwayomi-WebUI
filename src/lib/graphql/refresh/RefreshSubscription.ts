import gql from 'graphql-tag';
import { REFRESH_MANGA_RESULT_FIELDS, REFRESH_MANGA_ERROR_FIELDS } from './RefreshFragments.ts';

export const REFRESH_PROGRESS_SUBSCRIPTION = gql`
    ${REFRESH_MANGA_RESULT_FIELDS}
    ${REFRESH_MANGA_ERROR_FIELDS}
    subscription REFRESH_PROGRESS_SUBSCRIPTION {
        refreshProgressChanged {
            type
            totalManga
            refreshedManga
            currentMangaTitle
            mangaResult {
                ...REFRESH_MANGA_RESULT_FIELDS
            }
            mangaError {
                ...REFRESH_MANGA_ERROR_FIELDS
            }
            totalRefreshed
            totalFailed
        }
    }
`;
