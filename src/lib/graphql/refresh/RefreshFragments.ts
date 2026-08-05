import gql from 'graphql-tag';

export const REFRESH_MANGA_RESULT_FIELDS = gql`
    fragment REFRESH_MANGA_RESULT_FIELDS on MangaRefreshResultType {
        mangaId
        mangaTitle
    }
`;

export const REFRESH_MANGA_ERROR_FIELDS = gql`
    fragment REFRESH_MANGA_ERROR_FIELDS on MangaRefreshErrorType {
        mangaId
        mangaTitle
        error
    }
`;
