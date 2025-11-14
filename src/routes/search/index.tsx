import { $, component$, useStore, useTask$ } from '@qwik.dev/core';
import { routeLoader$, useLocation } from '@qwik.dev/router';
import Filters from '~/components/facet-filter-controls/Filters';
import FiltersButton from '~/components/filters-button/FiltersButton';
import ProductCard from '~/components/products/ProductCard';
import { searchExtendedProducts } from '~/providers/shop/products/fetchProducts';
import { FacetWithValues } from '~/types';
import { changeUrlParamsWithoutRefresh, enableDisableFacetValues, groupFacetValues } from '~/utils';

export const useSearchLoader = routeLoader$(async ({ query }) => {
	const term = query.get('q') || '';
	const facetIds = query.get('f')?.split('-') || [];
	const sellerPostalCode = query.get('seller') || '';

	const search = await searchExtendedProducts({
		term: term || undefined,
		selectedFacets: {}, // parse facetIds from URL as needed
		sellerPostalCode: sellerPostalCode || undefined,
	});

	return { search, term, facetIds, sellerPostalCode };
});

export default component$(() => {
	const { url } = useLocation();
	const searchLoader = useSearchLoader();

	const term = url.searchParams.get('q') || '';
	const facetIds = url.searchParams.get('f')?.split('-') || [];
	const sellerPostalCode = url.searchParams.get('seller') || '';

	const state = useStore<{
		showMenu: boolean;
		search: any;
		facedValues: FacetWithValues[];
		facetValueIds: string[];
	}>({
		showMenu: false,
		search: searchLoader.value.search as any,
		facedValues: groupFacetValues(searchLoader.value.search as any, facetIds),
		facetValueIds: facetIds,
	});

	useTask$(async ({ track }) => {
		track(() => url.searchParams.toString());

		const term = url.searchParams.get('q') || '';
		const facetIds = url.searchParams.get('f')?.split('-') || [];
		const sellerPostalCode = url.searchParams.get('seller') || '';

		const search = await searchExtendedProducts({
			term: term || undefined,
			selectedFacets: {},
			sellerPostalCode: sellerPostalCode || undefined,
		});

		state.search = search as any;
		state.facedValues = groupFacetValues(search as any, facetIds);
		state.facetValueIds = facetIds;
	});

	const onFilterChange = $(async (id: string) => {
		const { facedValues, facetValueIds } = enableDisableFacetValues(
			state.facedValues,
			state.facetValueIds.includes(id)
				? state.facetValueIds.filter((f) => f !== id)
				: [...state.facetValueIds, id]
		);
		state.facedValues = facedValues;
		state.facetValueIds = facetValueIds;
		changeUrlParamsWithoutRefresh(term, facetValueIds);

		const search = await searchExtendedProducts({
			term: term || undefined,
			selectedFacets: {},
			sellerPostalCode: sellerPostalCode || undefined,
		});
		state.search = search as any;
	});

	const onOpenCloseFilter = $((id: string) => {
		state.facedValues = state.facedValues.map((f) => {
			if (f.id === id) {
				f.open = !f.open;
			}
			return f;
		});
	});

	return (
		<div
			class="max-w-6xl mx-auto px-4 py-10"
			onKeyDown$={(event: KeyboardEvent) => {
				if (event.key === 'Escape') {
					state.showMenu = false;
				}
			}}
		>
			<div class="flex justify-between items-center">
				<h2 class="text-3xl sm:text-5xl font-light tracking-tight text-gray-900 my-8">
					{term ? `Results for "${term}"` : 'All filtered results'}
				</h2>
				{!!state.facedValues.length && (
					<FiltersButton
						onToggleMenu$={async () => {
							state.showMenu = !state.showMenu;
						}}
					/>
				)}
			</div>

			<div class="mt-6 grid sm:grid-cols-5 gap-x-4">
				{!!state.facedValues.length && (
					<Filters
						showMenu={state.showMenu}
						facetsWithValues={state.facedValues}
						onToggleMenu$={async () => {
							state.showMenu = !state.showMenu;
						}}
						onFilterChange$={onFilterChange}
						onOpenCloseFilter$={onOpenCloseFilter}
					/>
				)}
				<div class="sm:col-span-5 lg:col-span-4">
					<div class="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
						{(state.search.items || []).map((item: any) => (
							<ProductCard
								key={item.productId}
								productAsset={item.productAsset}
								productName={item.productName}
								slug={item.slug}
								priceWithTax={item.priceWithTax}
								currencyCode={item.currencyCode}
							></ProductCard>
						))}
					</div>
				</div>
			</div>
		</div>
	);
});
