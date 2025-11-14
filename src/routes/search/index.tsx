import { $, component$, useStore, useTask$ } from '@qwik.dev/core';
import { routeLoader$, useLocation } from '@qwik.dev/router';
import { searchExtendedProducts } from '~/providers/shop/products/fetchProducts';
import Filters from '~/components/facet-filter-controls/Filters';
import FiltersButton from '~/components/filters-button/FiltersButton';
import ProductCard from '~/components/products/ProductCard';
import { SearchResponse } from '~/generated/graphql-shop';
import { groupFacetValues } from '~/utils';

export const useSearchLoader = routeLoader$(async ({ query }) => {
	const term = query.get('q') || '';
	const facetParams = query.get('f')?.split('-') || [];
	const sellerPostalCode = query.get('seller') || '';

	// Parse facetIds into facet filters grouped by facet code
	// This is KEY - we need to map individual facet value IDs to their facet groups
	const selectedFacets: Record<string, string[]> = {};

	// For now, collect all facet IDs under a generic key
	// In production, you'd need the mapping of facetId -> facetCode
	if (facetParams.length > 0) {
		selectedFacets['facets'] = facetParams;
	}

	const search = await searchExtendedProducts({
		term: term || undefined,
		selectedFacets,
		sellerPostalCode: sellerPostalCode || undefined,
	});

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
	const facetParams = url.searchParams.get('f')?.split('-') || [];
	const sellerPostalCode = url.searchParams.get('seller') || '';

	const state = useStore<{
		showMenu: boolean;
		search: SearchResponse;
		facedValues: any[];
		facetValueIds: Set<string>;
		selectedFacetValueIds: Map<string, Set<string>>;
	}>({
		showMenu: false,
		search: searchLoader.value.search as SearchResponse,
		facedValues: groupFacetValues(searchLoader.value.search as any, facetParams),
		facetValueIds: new Set(facetParams),
		selectedFacetValueIds: new Map(), // Track by facet code
	});

	useTask$(async ({ track }) => {
		track(() => url.searchParams.toString());

		const term = url.searchParams.get('q') || '';
		const facetParams = url.searchParams.get('f')?.split('-') || [];
		const sellerPostalCode = url.searchParams.get('seller') || '';

		// Build facet filters grouped by facet code
		const selectedFacets: Record<string, string[]> = {};

		// Map facet value IDs to their parent facet codes
		const facetValues = searchLoader.value.search.facetValues || [];
		facetParams.forEach((facetValueId) => {
			const facetValue = facetValues.find((fv: any) => fv.facetValue?.id === facetValueId);
			if (facetValue) {
				const facetCode = facetValue.facetValue?.facet?.id || 'facet';
				if (!selectedFacets[facetCode]) {
					selectedFacets[facetCode] = [];
				}
				selectedFacets[facetCode].push(facetValueId);
			}
		});

		const search = await searchExtendedProducts({
			term: term || undefined,
			selectedFacets: Object.keys(selectedFacets).length > 0 ? selectedFacets : undefined,
			sellerPostalCode: sellerPostalCode || undefined,
		});

		state.search = search as SearchResponse;
		state.facedValues = groupFacetValues(search as any, facetParams);
		state.facetValueIds = new Set(facetParams);
	});

	const onFilterChange = $(async (facetValueId: string) => {
		const newFacetIds = new Set(state.facetValueIds);
		if (newFacetIds.has(facetValueId)) {
			newFacetIds.delete(facetValueId);
		} else {
			newFacetIds.add(facetValueId);
		}

		const params = new URLSearchParams();
		if (term) params.set('q', term);
		if (newFacetIds.size > 0) {
			params.set('f', Array.from(newFacetIds).join('-'));
		}
		if (sellerPostalCode) params.set('seller', sellerPostalCode);

		window.history.pushState(null, '', `?${params.toString()}`);
		state.facetValueIds = newFacetIds;
	});

	const onOpenCloseFilter = $((facetId: string) => {
		state.facedValues = state.facedValues.map((f) => {
			if (f.facetValue?.facet?.id === facetId) {
				f.open = !f.open;
			}
			return f;
		});
	});

	return (
		<div class="max-w-6xl mx-auto px-4 py-10">
			<div class="flex justify-between items-center">
				<h1 class="text-2xl font-bold">{term ? `Search: ${term}` : 'All Products'}</h1>
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
						{state.facetValueIds.size > 0 && ` (${state.facetValueIds.size} filters applied)`}
					</p>

					{state.search.items && state.search.items.length > 0 ? (
						<div class="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
							{state.search.items.map((item) => (
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
				</div>
			</div>
		</div>
	);
});
