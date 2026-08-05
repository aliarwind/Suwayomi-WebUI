import gql from 'graphql-tag';

export const START_REFRESH = gql`
    mutation START_REFRESH($input: StartRefreshInput!) {
        startRefresh(input: $input) {
            clientMutationId
            started
        }
    }
`;

export const STOP_REFRESH = gql`
    mutation STOP_REFRESH($input: StopRefreshInput!) {
        stopRefresh(input: $input) {
            clientMutationId
            stopped
        }
    }
`;

export const RETRY_REFRESH_MANGA = gql`
    mutation RETRY_REFRESH_MANGA($input: RetryRefreshMangaInput!) {
        retryRefreshManga(input: $input) {
            clientMutationId
            success
            mangaId
            mangaTitle
            error
        }
    }
`;
