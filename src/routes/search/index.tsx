import { $, component$, useStore, useTask$ } from '@qwik.dev/core';
import { routeLoader$, useLocation } from '@qwik.dev/router';
import { searchExtendedProducts } from '~/providers/shop/products/fetchProducts';
import Filters from '~/components/facet-filter-controls/Filters';
import FiltersButton from '~/components/filters-button/FiltersButton';
import ProductCard from '~/components/products/ProductCard';
import { SearchResponse } from '~/generated/graphql-shop';
import { groupFacetValues } from '~/utils';
import { useInfiniteScroll } from '~/hooks/useInfiniteScroll';

export const useSearchLoader = routeLoader$(async ({ query }) => {
	const term = query.get('q') || '';
	const facetParams =
		query
			.get('f')
			?.split('-')
			.filter((f) => f.length > 0) || [];
	const sellerPostalCode = query.get('seller') || '';

	const search = await searchExtendedProducts({
		term: term || undefined,
		facetValueIds: facetParams,
		sellerPostalCode: sellerPostalCode || undefined,
	});

	if (term) {
		if (import.meta.env.DEV) {
			console.log('🔍 [SEARCH-LOADER] Term:', term, 'Total items:', search?.totalItems);
		}
	}

	return {
		search,
		term,
		facetParams,
		sellerPostalCode,
	};
});

export default component$(() => {
	const { url } = useLocation();
	const searchLoader = useSearchLoader();

	const term = url.searchParams.get('q') || '';
	const facetParams =
		url.searchParams
			.get('f')
			?.split('-')
			.filter((f) => f.length > 0) || [];
	const sellerPostalCode = url.searchParams.get('seller') || '';

	const state = useStore<{
		showMenu: boolean;
		search: SearchResponse;
		facedValues: any[];
		facetValueIds: string[];
	}>({
		showMenu: false,
		search: searchLoader.value.search as SearchResponse,
		facedValues: groupFacetValues(searchLoader.value.search as any, facetParams),
		facetValueIds: facetParams,
	}); // Infinite scroll hook initialization
	const infiniteScroll = useInfiniteScroll({
		initialItems: searchLoader.value.search.items || [],
		pageSize: 20,
		loadMore$: $(async (page: number) => {
			const search = await searchExtendedProducts({
				term: term || undefined,
				page,
				take: 20,
				facetValueIds: state.facetValueIds,
				sellerPostalCode: sellerPostalCode || undefined,
			});
			return search.items || [];
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
		const sellerPostalCode = url.searchParams.get('seller') || '';

		const search = await searchExtendedProducts({
			term: term || undefined,
			page: 1,
			take: 20,
			facetValueIds: facetParams,
			sellerPostalCode: sellerPostalCode || undefined,
		});

		state.search = search as SearchResponse;
		state.facedValues = groupFacetValues(search as any, facetParams);
		state.facetValueIds = facetParams;
		// Reinitialize infinite scroll manually (avoid non-serializable function reference)
		infPage.value = 1;
		infHasMore.value = true;
		infError.value = null;
		infItems.value = search.items || [];
	});

	const onFilterChange = $(async (facetValueId: string) => {
		const newFacetIds = state.facetValueIds.includes(facetValueId)
			? state.facetValueIds.filter((f) => f !== facetValueId)
			: [...state.facetValueIds, facetValueId];

		const params = new URLSearchParams();
		const currentTerm = url.searchParams.get('q') || '';
		const currentSeller = url.searchParams.get('seller') || '';

		if (currentTerm) params.set('q', currentTerm);
		if (newFacetIds.length > 0) {
			params.set('f', newFacetIds.join('-'));
		}
		if (currentSeller) params.set('seller', currentSeller);

		window.history.pushState(null, '', `?${params.toString()}`);

		// Fetch new search results with updated filters
		const search = await searchExtendedProducts({
			term: currentTerm || undefined,
			page: 1,
			take: 20,
			facetValueIds: newFacetIds,
			sellerPostalCode: currentSeller || undefined,
		});

		state.facetValueIds = newFacetIds;
		state.search = search as SearchResponse;
		state.facedValues = groupFacetValues(search as any, newFacetIds);

		// Reset infinite scroll
		infPage.value = 1;
		infHasMore.value = true;
		infError.value = null;
		infItems.value = search.items || [];
	});

	// Correct facet group toggle: groupFacetValues returns objects with shape { id, name, open, values }
	const onOpenCloseFilter = $((facetGroupId: string) => {
		state.facedValues = state.facedValues.map((group) => {
			if (group.id === facetGroupId) {
				group.open = !group.open;
			}
			return group;
		});
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

					{infItems.value && infItems.value.length > 0 ? (
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
						<div class="text-center py-12">
							<p class="text-gray-500">No products found matching your filters.</p>
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
