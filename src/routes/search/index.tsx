import { $, component$, useContext, useStore, useTask$ } from '@qwik.dev/core';
import { routeLoader$, useLocation } from '@qwik.dev/router';
import Filters from '~/components/facet-filter-controls/Filters';
import FiltersButton from '~/components/filters-button/FiltersButton';
import ProductCard from '~/components/products/ProductCard';
import { APP_STATE } from '~/constants';
import { SearchResponse } from '~/generated/graphql-shop';
import { useInfiniteScroll } from '~/hooks/useInfiniteScroll';
import {
	resetInfiniteScrollState,
	toggleFacetGroup,
	updateSearchResults,
	type PostalFilteredSearchState,
} from '~/hooks/usePostalFilteredSearch';
import { searchExtendedWithCustomerPostalCode } from '~/providers/shop/products/fetchProducts';
import { groupFacetValues } from '~/utils';
import { getActiveCustomerPostalCode } from '~/utils/customer-postal-code';

export const useSearchLoader = routeLoader$(async ({ query }) => {
	const term = query.get('q') || '';
	const facetParams =
		query
			.get('f')
			?.split('-')
			.filter((f) => f.length > 0) || [];
	return {
		__gated: true,
		search: { items: [], facetValues: [], totalItems: 0 },
		term,
		facetParams,
	};
});

export default component$(() => {
	const { url } = useLocation();

	const appState = useContext(APP_STATE);

	const term = url.searchParams.get('q') || '';
	const facetParams =
		url.searchParams
			.get('f')
			?.split('-')
			.filter((f) => f.length > 0) || [];

	const state = useStore<PostalFilteredSearchState>({
		showMenu: false,
		search: { items: [], facetValues: [], totalItems: 0 } as unknown as SearchResponse,
		facedValues: [],
		facetValueIds: facetParams,
		initialFetchDone: false,
	});

	// Track appState changes and log postal code derivation (wrapper handles injection)
	useTask$(({ track }) => {
		track(() => appState.addressBook.length);
		track(() => appState.shippingAddress.postalCode);
		const postalCode = getActiveCustomerPostalCode(appState);
		if (import.meta.env.DEV)
			console.log('🔍 [SEARCH] Customer postal code derived:', postalCode || '<none>');
	});
	const infiniteScroll = useInfiniteScroll({
		initialItems: [],
		pageSize: 20,
		loadMore$: $(async (page: number) => {
			const search = await searchExtendedWithCustomerPostalCode(appState, {
				term: term || undefined,
				page,
				take: 20,
				facetValueIds: state.facetValueIds,
			});
			return search?.items || [];
		}),
	});

	// Destructure signals to avoid referencing non-serializable functions on the container object inside tasks
	const {
		items: infItems,
		page: infPage,
		hasMore: infHasMore,
		error: infError,
		sentinelRef,
	} = infiniteScroll;

	useTask$(async ({ track }) => {
		track(() => url.searchParams.toString());

		const term = url.searchParams.get('q') || '';
		const facetParams =
			url.searchParams
				.get('f')
				?.split('-')
				.filter((f) => f.length > 0) || [];

		// Fetch search results (postal code will be applied if available)
		if (!state.initialFetchDone) {
			const search = await searchExtendedWithCustomerPostalCode(appState, {
				term: term || undefined,
				page: 1,
				take: 20,
				facetValueIds: facetParams,
			});
			updateSearchResults(state, search as SearchResponse);
			state.facetValueIds = facetParams;
			resetInfiniteScrollState(infPage, infHasMore, infError, infItems, state.search.items || []);
			state.initialFetchDone = true;
			if (import.meta.env.DEV) console.log('🔍 [SEARCH] Initial postal-filtered fetch complete');
		} else if (state.initialFetchDone) {
			const search = await searchExtendedWithCustomerPostalCode(appState, {
				term: term || undefined,
				page: 1,
				take: 20,
				facetValueIds: facetParams,
			});
			state.search = search as SearchResponse;
			state.facedValues = groupFacetValues(search as any, facetParams);
			state.facetValueIds = facetParams;
			infPage.value = 1;
			infHasMore.value = true;
			infError.value = null;
			infItems.value = search.items || [];
		} else {
			// waiting for postal code; ensure no items shown
			infItems.value = [];
		}
	});

	const onFilterChange = $(async (facetValueId: string) => {
		const newFacetIds = state.facetValueIds.includes(facetValueId)
			? state.facetValueIds.filter((f) => f !== facetValueId)
			: [...state.facetValueIds, facetValueId];

		const params = new URLSearchParams();
		const currentTerm = url.searchParams.get('q') || '';

		if (currentTerm) params.set('q', currentTerm);
		if (newFacetIds.length > 0) {
			params.set('f', newFacetIds.join('-'));
		}

		window.history.pushState(null, '', `?${params.toString()}`);

		// Fetch new search results with updated filters
		const search = await searchExtendedWithCustomerPostalCode(appState, {
			term: currentTerm || undefined,
			page: 1,
			take: 20,
			facetValueIds: newFacetIds,
		});

		state.facetValueIds = newFacetIds;
		updateSearchResults(state, search as SearchResponse);
		resetInfiniteScrollState(infPage, infHasMore, infError, infItems, state.search.items || []);
	});

	// Correct facet group toggle: groupFacetValues returns objects with shape { id, name, open, values }
	const onOpenCloseFilter = $((facetGroupId: string) => {
		state.facedValues = toggleFacetGroup(state.facedValues, facetGroupId);
	});

	return (
		<div class="max-w-6xl mx-auto px-4 py-10">
			<div class="flex justify-between items-center">
				<h1 class="text-2xl font-bold">
					{url.searchParams.get('q') ? `Search: ${url.searchParams.get('q')}` : 'All Products'}
				</h1>
				<FiltersButton
					onToggleMenu$={$(() => {
						state.showMenu = !state.showMenu;
					})}
				/>
			</div>

			<div class="grid grid-cols-4 gap-8 mt-8">
				<aside class="col-span-1">
					<Filters
						facetsWithValues={state.facedValues}
						onFilterChange$={onFilterChange}
						onOpenCloseFilter$={onOpenCloseFilter}
						showMenu={state.showMenu}
						onToggleMenu$={$(() => {
							state.showMenu = !state.showMenu;
						})}
					/>
				</aside>

				<div class="col-span-3">
					<p class="text-sm text-gray-500 mb-4">
						{state.search.totalItems} results
						{state.facetValueIds.length > 0 && ` (${state.facetValueIds.length} filters applied)`}
					</p>

					{!state.initialFetchDone ? (
						<div
							class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8"
							aria-label="Loading local products"
						>
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} class="animate-pulse border rounded p-4 h-64 bg-gray-50">
									<div class="h-32 bg-gray-200 rounded" />
									<div class="mt-4 h-4 bg-gray-200 rounded w-3/4" />
									<div class="mt-2 h-4 bg-gray-100 rounded w-1/2" />
								</div>
							))}
							<p class="col-span-full text-center text-sm text-gray-400 mt-4">
								Loading local products…
							</p>
						</div>
					) : infItems.value && infItems.value.length > 0 ? (
						<div class="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
							{infItems.value.map((item: any) => (
								<ProductCard
									key={item.productId}
									productAsset={item.productAsset}
									productName={item.productName}
									slug={item.slug}
									priceWithTax={item.priceWithTax}
									currencyCode={item.currencyCode}
									sellerNames={item.customProductMappings?.sellerNames}
								/>
							))}
						</div>
					) : (
						<div class="text-center py-12" aria-label="No local products">
							<p class="text-gray-600 font-medium">No local products found.</p>
							<p class="text-sm text-gray-400 mt-2">
								Try adjusting filters or check a different postal area.
							</p>
						</div>
					)}
					<div ref={(el) => (sentinelRef.value = el)} class="h-8"></div>
					{infiniteScroll.isLoading.value && (
						<div class="flex justify-center items-center py-6">
							<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
							<span class="ml-2 text-gray-600">Loading more...</span>
						</div>
					)}
					{!infHasMore.value && infItems.value.length > 0 && (
						<div class="text-center py-6 text-gray-500">No more products.</div>
					)}
					{infError.value && (
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
							{infError.value}
						</div>
					)}
				</div>
			</div>
		</div>
	);
});
