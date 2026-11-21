/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { Notifications } from '@/base/notification/Notifications.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';

type Props = {
    mangaId: number;
    author?: string;
    artist?: string;
    open: boolean;
    onClose: () => void;
};

/**
 * Manual author/artist override.
 *
 * Sources derive both from the title, so a wrong value has to be correctable. The server keeps the
 * corrected value across refreshes (it marks the manga), which is why this dialog is the intended way to
 * fix an author instead of editing the database.
 */
export const MangaAuthorEditDialog = ({ mangaId, author, artist, open, onClose }: Props) => {
    const { t } = useLingui();

    const [authorValue, setAuthorValue] = useState(author ?? '');
    const [artistValue, setArtistValue] = useState(artist ?? '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setAuthorValue(author ?? '');
        setArtistValue(artist ?? '');
    }, [open, author, artist]);

    const save = () => {
        setSaving(true);
        requestManager
            .updateManga(mangaId, { updateManga: { author: authorValue, artist: artistValue } })
            .response.then(() => Notifications.success(t`Author updated`))
            .then(() => onClose())
            .catch((e) => Notifications.error(t`Could not update the author`, getErrorMessage(e)))
            .finally(() => setSaving(false));
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t`Edit author`}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ pb: 2 }}>
                    {t`Both fields are guessed from the title. A corrected value is kept when the entry is refreshed.`}
                </DialogContentText>
                <Stack sx={{ gap: 2, pt: 1 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label={t`Author`}
                        value={authorValue}
                        onChange={(e) => setAuthorValue(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        label={t`Artist`}
                        value={artistValue}
                        onChange={(e) => setArtistValue(e.target.value)}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    {t`Cancel`}
                </Button>
                <Button onClick={save} disabled={saving} variant="contained">
                    {t`Save`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
