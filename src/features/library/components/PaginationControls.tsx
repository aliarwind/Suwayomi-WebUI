/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useLingui } from '@lingui/react/macro';
import { useState, useCallback, useEffect } from 'react';

const PAGE_SIZE_OPTIONS = [10, 20, 30];
const CUSTOM_PAGE_SIZE = -1;

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export const PaginationControls = ({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
}: PaginationControlsProps) => {
    const { t } = useLingui();
    const [showCustomInput, setShowCustomInput] = useState(!PAGE_SIZE_OPTIONS.includes(pageSize));
    const [customValue, setCustomValue] = useState(
        PAGE_SIZE_OPTIONS.includes(pageSize) ? '' : String(pageSize),
    );

    // --- Jump-to-page state ---
    const displayPage = currentPage + 1; // human-readable (1-based)
    const [jumpInput, setJumpInput] = useState(String(displayPage));

    // Keep jump input in sync when currentPage changes externally (e.g. prev/next buttons)
    useEffect(() => {
        setJumpInput(String(displayPage));
    }, [displayPage]);

    const handleJump = useCallback(() => {
        const parsed = parseInt(jumpInput, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
            onPageChange(parsed - 1); // convert to 0-based
        } else {
            // Reset to current page on invalid input
            setJumpInput(String(displayPage));
        }
    }, [jumpInput, totalPages, onPageChange, displayPage]);

    const handlePageSizeSelect = useCallback(
        (value: number | typeof CUSTOM_PAGE_SIZE) => {
            if (value === CUSTOM_PAGE_SIZE) {
                setShowCustomInput(true);
            } else {
                setShowCustomInput(false);
                onPageSizeChange(value);
            }
        },
        [onPageSizeChange],
    );

    const handleCustomSizeBlur = useCallback(() => {
        const num = parseInt(customValue, 10);
        if (num > 0) {
            onPageSizeChange(num);
        } else {
            setCustomValue(String(pageSize));
            setShowCustomInput(false);
        }
    }, [customValue, pageSize, onPageSizeChange]);

    const resolvedPageSize = PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : CUSTOM_PAGE_SIZE;

    if (totalPages <= 0) {
        return null;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                py: 2,
                px: 1,
            }}
        >
            <IconButton
                size="small"
                disabled={currentPage <= 0}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Previous page"
            >
                <ChevronLeftIcon />
            </IconButton>

            <Typography variant="body2" component="span" sx={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {t`Page`}
                <TextField
                    size="small"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onBlur={handleJump}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleJump();
                        }
                    }}
                    slotProps={{
                        htmlInput: {
                            min: 1,
                            max: totalPages,
                            style: { width: 50, textAlign: 'center', padding: '4px 4px' },
                        },
                    }}
                    sx={{ width: 60 }}
                />
                {`/ ${totalPages}`}
            </Typography>

            <IconButton
                size="small"
                disabled={currentPage >= totalPages - 1}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Next page"
            >
                <ChevronRightIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <Typography variant="body2">{t`Per page`}</Typography>
                <Select
                    size="small"
                    value={resolvedPageSize}
                    sx={{ minWidth: 70 }}
                    onChange={(e) => handlePageSizeSelect(e.target.value as number)}
                >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                        <MenuItem key={size} value={size}>
                            {size}
                        </MenuItem>
                    ))}
                    <MenuItem value={CUSTOM_PAGE_SIZE}>{t`Custom`}</MenuItem>
                </Select>
                {showCustomInput && (
                    <TextField
                        size="small"
                        type="number"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        onBlur={handleCustomSizeBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleCustomSizeBlur();
                            }
                        }}
                        slotProps={{ htmlInput: { min: 1, style: { width: 60 } } }}
                    />
                )}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {t`${totalItems} total`}
            </Typography>
        </Box>
    );
};
