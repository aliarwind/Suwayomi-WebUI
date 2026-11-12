/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ChipProps } from '@mui/material/Chip';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryParam, NumberParam, StringParam } from 'use-query-params';
import { useLingui } from '@lingui/react/macro';
import { plural } from '@lingui/core/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { PaginationControls } from '@/features/library/components/PaginationControls.tsx';
import { LibraryToolbarMenu } from '@/features/library/components/LibraryToolbarMenu.tsx';
import { AppbarSearch } from '@/base/components/AppbarSearch.tsx';
import { UpdateChecker } from '@/features/updates/components/UpdateChecker.tsx';
import { useSelectableCollection } from '@/base/collection/hooks/useSelectableCollection.ts';
import { SelectableCollectionSelectMode } from '@/base/collection/components/SelectableCollectionSelectMode.tsx';
import { useGetVisibleLibraryMangas } from '@/features/library/hooks/useGetVisibleLibraryMangas.ts';
import { useGetCategoryMetadata } from '@/features/category/services/CategoryMetadata.ts';
import { useMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';
import { SelectionFAB } from '@/base/collection/components/SelectionFAB.tsx';
import { MangaActionMenuItems } from '@/features/manga/components/MangaActionMenuItems.tsx';
import { TabsMenu } from '@/base/components/tabs/TabsMenu.tsx';
import { TabsWrapper } from '@/base/components/tabs/TabsWrapper.tsx';
import { TabPanel } from '@/base/components/tabs/TabPanel.tsx';
import { MangaCard } from '@/features/manga/components/cards/MangaCard.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { updateMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useAppAction } from '@/features/navigation-bar/hooks/useAppAction.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import { MangaOrderBy, SortOrder, MangaStatus } from '@/lib/graphql/generated/graphql-base.types.ts';
import type { MangaIdInfo } from '@/features/manga/Manga.types.ts';
import type { MangaCardMode } from '@/features/manga/Manga.types.ts';
import type {
    GetCategoriesLibraryQuery,
    GetCategoriesLibraryQueryVariables,
    MangaChapterStatFieldsFragment,
} from '@/lib/graphql/generated/graphql.ts';
import { GET_CATEGORIES_LIBRARY } from '@/lib/graphql/category/CategoryQuery.ts';
import { MANGA_CHAPTER_STAT_FIELDS } from '@/lib/graphql/manga/MangaFragments.ts';

const TitleWithSizeTag = styled('span')({
    display: 'flex',
    alignItems: 'center',
});

const TitleSizeTag = ({ sx, ...props }: ChipProps) => (
    <Chip {...props} size="small" sx={{ ...sx, marginLeft: '5px' }} />
);

interface PaginatedLibraryViewProps {
    paginationSize: number;
    showTabSize: boolean;
}

export function PaginatedLibraryView({ paginationSize, showTabSize }: PaginatedLibraryViewProps) {
    const { t } = useLingui();

    // --- Categories / Tabs ---
    const {
        data: categoriesResponse,
        error: tabsError,
        loading: areCategoriesLoading,
        refetch: refetchCategories,
    } = requestManager.useGetCategories<GetCategoriesLibraryQuery, GetCategoriesLibraryQueryVariables>(
        GET_CATEGORIES_LIBRARY,
    );
    const tabsData = categoriesResponse?.categories?.nodes?.filter(
        (category) => category.id !== 0 || (category.id === 0 && category.mangas.totalCount),
    );
    const tabs = tabsData ?? STABLE_EMPTY_ARRAY;

    const [tabSearchParam, setTabSearchParam] = useQueryParam(SearchParam.TAB, NumberParam);
    const [query] = useQueryParam(SearchParam.QUERY, StringParam);
    const activeTab = tabs.find((tab) => tab.id === tabSearchParam) ?? tabs[0];

    // --- Pagination state ---
    const [currentPage, setCurrentPage] = useState(0);

    // Reset page when tab or search query changes
    useEffect(() => {
        setCurrentPage(0);
    }, [activeTab?.id, query]);

    const safeCurrentPage = currentPage;

    // --- Server-side search filter (searches across ALL manga, not just current page) ---
    // Matches the multi-field search behavior of useGetVisibleLibraryMangas/querySearchManga
    const searchFilter = query
        ? {
              or: [
                  { title: { includesInsensitive: query } },
                  { author: { includesInsensitive: query } },
                  { artist: { includesInsensitive: query } },
                  { description: { includesInsensitive: query } },
                  { genre: { includesInsensitive: query } },
              ],
          }
        : undefined;

    // --- Read category metadata (sort + status filter) and global settings (gridLayout) ---
    const categoryMeta = useGetCategoryMetadata(activeTab ?? { id: -1 });
    const {
        sortBy,
        sortDesc,
        hasStatus,
        hasDownloadedChapters,
        hasUnreadChapters,
        hasBookmarkedChapters,
        hasDuplicateChapters,
    } = categoryMeta;
    const {
        settings: { gridLayout },
    } = useMetadataServerSettings();

    // --- Server-side sort ---
    const SORT_MAP: Partial<Record<string, MangaOrderBy>> = {
        alphabetically: MangaOrderBy.Title,
        dateAdded: MangaOrderBy.InLibraryAt,
        latestFetchedChapter: MangaOrderBy.LastFetchedAt,
    };
    const serverOrder = useMemo(() => {
        if (!sortBy) return undefined;
        const by = SORT_MAP[sortBy];
        if (!by) return undefined;
        return [{ by, byType: sortDesc ? SortOrder.Desc : SortOrder.Asc }];
    }, [sortBy, sortDesc]);

    // --- Helper: triState boolean → server BooleanFilter ---
    const toBoolFilter = (v: boolean | null | undefined) =>
        v == null ? undefined : { equalTo: v };

    // --- Server-side status filter ---
    const statusFilter = useMemo(() => {
        if (!hasStatus) return undefined;
        const included = (Object.entries(hasStatus) as [string, boolean | null | undefined][])
            .filter(([, v]) => v === true)
            .map(([s]) => s as MangaStatus);
        const excluded = (Object.entries(hasStatus) as [string, boolean | null | undefined][])
            .filter(([, v]) => v === false)
            .map(([s]) => s as MangaStatus);

        if (included.length > 0) return { status: { in: included } };
        if (excluded.length > 0) return { status: { notIn: excluded } };
        return undefined;
    }, [hasStatus]);

    // --- Server-side chapter-level filters ---
    const downloadedFilter = useMemo(() => toBoolFilter(hasDownloadedChapters), [hasDownloadedChapters]);
    const unreadFilter = useMemo(() => toBoolFilter(hasUnreadChapters), [hasUnreadChapters]);
    const bookmarkedFilter = useMemo(() => toBoolFilter(hasBookmarkedChapters), [hasBookmarkedChapters]);
    const duplicateFilter = useMemo(() => toBoolFilter(hasDuplicateChapters), [hasDuplicateChapters]);

    // --- Combined server-side filter (search + status + chapter-level) ---
    const serverFilter = useMemo(() => {
        const filters: object[] = [];
        if (searchFilter) filters.push(searchFilter);
        if (statusFilter) filters.push(statusFilter);
        if (downloadedFilter) filters.push({ hasDownloadedChapters: downloadedFilter });
        if (unreadFilter) filters.push({ hasUnreadChapters: unreadFilter });
        if (bookmarkedFilter) filters.push({ hasBookmarkedChapters: bookmarkedFilter });
        if (duplicateFilter) filters.push({ hasDuplicateChapters: duplicateFilter });
        if (filters.length === 0) return undefined;
        if (filters.length === 1) return filters[0];
        return { and: filters };
    }, [searchFilter, statusFilter, downloadedFilter, unreadFilter, bookmarkedFilter, duplicateFilter]);

    // --- Reset page when sort or filter changes ---
    useEffect(() => {
        setCurrentPage(0);
    }, [sortBy, sortDesc, hasStatus, hasDownloadedChapters, hasUnreadChapters, hasBookmarkedChapters, hasDuplicateChapters]);

    // --- Fetch manga page ---
    const {
        data: categoryMangaResponse,
        error: mangaError,
        loading: mangaLoading,
        refetch: refetchCategoryMangas,
    } = requestManager.useGetCategoryMangas(
        activeTab?.id,
        activeTab?.isDefaultCategory,
        { skip: !activeTab, fetchPolicy: 'network-only' as const },
        paginationSize,
        safeCurrentPage * paginationSize,
        serverFilter,
        serverOrder,
    );
    const categoryMangas = categoryMangaResponse?.mangas.nodes ?? STABLE_EMPTY_ARRAY;
    const {
        visibleMangas: filteredMangas,
        showFilteredOutMessage,
        filterKey,
    } = useGetVisibleLibraryMangas(categoryMangas, activeTab);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(0);
    }, [filterKey]);

    const totalMangaCount = categoryMangaResponse?.mangas.totalCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalMangaCount / paginationSize));
    const mangas = filteredMangas;

    const handlePageChange = useCallback(
        (page: number) => setCurrentPage(Math.max(0, Math.min(page, totalPages - 1))),
        [totalPages],
    );

    const handlePageSizeChange = useCallback((size: number) => {
        setCurrentPage(0);
        updateMetadataServerSettings('paginationSize', size).catch(() => {});
    }, []);

    const retryFetchCategoryMangas = useCallback(
        () => refetchCategoryMangas().catch(defaultPromiseErrorHandler('PaginatedLibrary::refetch')),
        [refetchCategoryMangas],
    );

    // --- Selection ---
    const mangaIds = useMemo(() => mangas.map((manga) => manga.id), [mangas]);

    const [isSelectModeActive, setIsSelectModeActive] = useState(false);
    const {
        areNoItemsForKeySelected: areNoItemsSelected,
        areAllItemsForKeySelected: areAllItemsSelected,
        selectedItemIds,
        handleSelectAll,
        handleSelection,
        clearSelection,
    } = useSelectableCollection<MangaIdInfo['id'], string>(mangas.length, {
        itemIds: mangaIds,
        currentKey: activeTab?.id.toString(),
        initialState: undefined,
    });

    const handleSelect: typeof handleSelection = useCallback(
        (id, selected, selectOptions) => {
            setIsSelectModeActive(!!(selectedItemIds.length + (selected ? 1 : -1)));
            handleSelection(id, selected, selectOptions);
        },
        [setIsSelectModeActive, handleSelection],
    );

    const selectedMangas = useMemo(
        () =>
            selectedItemIds
                .map((id) =>
                    Mangas.getFromCache<MangaChapterStatFieldsFragment>(id, MANGA_CHAPTER_STAT_FIELDS, 'MANGA_CHAPTER_STAT_FIELDS'),
                )
                .filter((manga) => !!manga),
        [selectedItemIds.length, mangas],
    );

    const selectionFab = useMemo(() => {
        if (!isSelectModeActive) return null;
        return (
            <SelectionFAB title={plural(selectedItemIds.length, { one: '# manga', other: '# manga' })}>
                {(handleClose, setHideMenu) => (
                    <MangaActionMenuItems
                        selectedMangas={selectedMangas}
                        onClose={() => {
                            handleClose();
                            setIsSelectModeActive(false);
                            clearSelection();
                        }}
                        setHideMenu={setHideMenu}
                    />
                )}
            </SelectionFAB>
        );
    }, [isSelectModeActive, selectedMangas]);

    // --- Title & Actions ---
    useAppTitle(t`Library`);
    useAppAction(
        <>
            {!isSelectModeActive && activeTab && (
                <>
                    <AppbarSearch searchHistoryKey="library" />
                    <LibraryToolbarMenu category={activeTab} mangas={mangas} />
                    <UpdateChecker categoryId={activeTab?.id} />
                </>
            )}
            {!!mangas.length && (
                <SelectableCollectionSelectMode
                    isActive={isSelectModeActive}
                    areAllItemsSelected={areAllItemsSelected}
                    areNoItemsSelected={areNoItemsSelected}
                    onSelectAll={(selectAll) => handleSelectAll(selectAll, [...new Set(mangas.map((m) => m.id))])}
                    onModeChange={(checked) => {
                        setIsSelectModeActive(checked);
                        if (checked) handleSelectAll(true, [...new Set(mangas.map((m) => m.id))]);
                        else tabs.forEach((tab) => handleSelectAll(false, [], tab.id.toString()));
                    }}
                />
            )}
        </>,
        [isSelectModeActive, areNoItemsSelected, areAllItemsSelected, activeTab, mangas.length],
    );

    const handleTabChange = (newTab: number) => setTabSearchParam(newTab);

    // --- Loading / Error / Empty states ---
    if (tabsError != null) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={tabsError?.message}
                retry={() => refetchCategories().catch(defaultPromiseErrorHandler('PaginatedLibrary::refetchCategories'))}
            />
        );
    }

    if (areCategoriesLoading) {
        return <LoadingPlaceholder />;
    }

    if (tabs.length === 0) {
        return <EmptyViewAbsoluteCentered message={t`Your library is empty`} />;
    }

    const mode: MangaCardMode = 'source';

    const renderGrid = () => (
        <>
            {mangaLoading && mangas.length === 0 && <LoadingPlaceholder />}
            {!mangaLoading && mangas.length === 0 && !mangaError && (
                <EmptyViewAbsoluteCentered message={showFilteredOutMessage ? t`No manga matches this filter` : t`The category is empty`} />
            )}
            {mangaError && mangas.length === 0 && (
                <EmptyViewAbsoluteCentered
                    message={t`Could not load manga`}
                    messageExtra={mangaError?.message}
                    retry={retryFetchCategoryMangas}
                />
            )}
            {mangas.length > 0 && (
                <Grid container spacing={1} sx={{ p: 1 }}>
                    {mangas.map((manga) => (
                        <Grid key={manga.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                            <MangaCard
                                manga={manga}
                                gridLayout={gridLayout}
                                inLibraryIndicator
                                selected={selectedItemIds.includes(manga.id) || null}
                                handleSelection={handleSelect}
                                mode={mode}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
            <PaginationControls
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                pageSize={paginationSize}
                totalItems={totalMangaCount}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />
        </>
    );

    if (tabs.length === 1) {
        return (
            <>
                {renderGrid()}
                {selectionFab}
            </>
        );
    }

    return (
        <TabsWrapper>
            <TabsMenu value={activeTab.id} onChange={(e, newTab) => handleTabChange(newTab)}>
                {tabs.map((tab) => (
                    <Tab
                        sx={{ flexGrow: 1, maxWidth: 'unset' }}
                        key={tab.id}
                        label={
                            <TitleWithSizeTag>
                                {tab.name}
                                {showTabSize ? <TitleSizeTag label={tab.mangas.totalCount} /> : null}
                            </TitleWithSizeTag>
                        }
                        value={tab.id}
                    />
                ))}
            </TabsMenu>
            {tabs.map((tab) => (
                <TabPanel key={tab.order} index={tab.order} currentIndex={activeTab.order}>
                    {tab === activeTab && renderGrid()}
                </TabPanel>
            ))}
            {selectionFab}
        </TabsWrapper>
    );
}
