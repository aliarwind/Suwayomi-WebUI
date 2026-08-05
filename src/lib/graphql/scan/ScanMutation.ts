import gql from 'graphql-tag';

export const START_SCAN = gql`
    mutation START_SCAN($input: StartScanInput!) {
        startScan(input: $input) {
            clientMutationId
            started
        }
    }
`;
