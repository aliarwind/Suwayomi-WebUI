import gql from 'graphql-tag';
import { SCAN_PROGRESS_FIELDS } from './ScanFragments.ts';

export const SCAN_PROGRESS_SUBSCRIPTION = gql`
    ${SCAN_PROGRESS_FIELDS}
    subscription SCAN_PROGRESS_SUBSCRIPTION {
        scanProgressChanged {
            ...SCAN_PROGRESS_FIELDS
        }
    }
`;
