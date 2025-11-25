import {
	$,
	component$,
	useContext,
	useSignal,
	useStore,
	useTask$,
	useVisibleTask$,
} from '@qwik.dev/core';
import { DocumentHead, routeLoader$, useLocation } from '@qwik.dev/router';
import Breadcrumbs from '~/components/breadcrumbs/Breadcrumbs';
import CollectionCard from '~/components/collection-card/CollectionCard';
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
import { getCollectionBySlug } from '~/providers/shop/collections/collections';
import {
	searchQueryWithCollectionSlug,
	searchQueryWithTerm,
} from '~/providers/shop/products/products';
import {
	changeUrlParamsWithoutRefresh,
	cleanUpParams,
	enableDisableFacetValues,
	generateDocumentHead,
} from '~/utils';
import { getActiveCustomerPostalCode } from '~/utils/customer-postal-code';

export const useCollectionLoader = routeLoader$(async ({ params }) => {
	return await getCollectionBySlug(params.slug);
});

export const useSearchLoader = routeLoader$(async ({ params: p, url }) => {
	const params = cleanUpParams(p);
	const activeFacetValueIds: string[] = url.searchParams.get('f')?.split('-') || [];
	return {
		__gated: true,
		items: [],
		facetValues: [],
		totalItems: 0,
		activeFacetValueIds,
		collectionSlug: params.slug,
	};
});

export default component$(() => {
	const { params: p, url } = useLocation();
	const params = cleanUpParams(p);
	const activeFacetValueIds: string[] = url.searchParams.get('f')?.split('-') || [];

	const collectionSignal = useCollectionLoader();
	useSearchLoader(); // Trigger loader for routing
	const appState = useContext(APP_STATE);

	// Use signal to store customer postal code (derived on client)
	const customerPostalCode = useSignal('');
	const lastAppliedPostalCode = useSignal('');

	const state = useStore<PostalFilteredSearchState>({
		showMenu: false,
		search: { items: [], facetValues: [], totalItems: 0 } as unknown as SearchResponse,
		facedValues: [],
		facetValueIds: activeFacetValueIds,
		initialFetchDone: false,
	});

	// Derive customer postal code reactively when address book updates (CLIENT ONLY)
	useVisibleTask$(({ track }) => {
		track(() => appState.addressBook.length);
		track(() => appState.shippingAddress.postalCode);
		const postalCode = getActiveCustomerPostalCode(appState);
		customerPostalCode.value = postalCode;
		if (import.meta.env.DEV) {
			console.log('🏪 [COLLECTION] Customer postal code derived (client-side):', postalCode);
		}
	});

	// Infinite scroll hook for collections
	const infiniteScroll = useInfiniteScroll({
		initialItems: [],
		pageSize: 20,
		loadMore$: $(async (page: number) => {
			const search = state.facetValueIds.length
				? await searchQueryWithTerm(
						params.slug,
						'',
						state.facetValueIds,
						20,
						(page - 1) * 20,
						customerPostalCode.value || undefined
					)
				: await searchQueryWithCollectionSlug(
						params.slug,
						20,
						(page - 1) * 20,
						customerPostalCode.value || undefined
					);
			return search.items || [];
		}),
	});

	// Destructure signals to avoid lexical scope issues
	const {
		items: infItems,
		page: infPage,
		hasMore: infHasMore,
		error: infError,
		sentinelRef,
	} = infiniteScroll;

	useTask$(async ({ track }) => {
		track(() => collectionSignal.value.slug);
		track(() => customerPostalCode.value);
		track(() => url.searchParams.get('f'));

		params.slug = cleanUpParams(p).slug;
		state.facetValueIds = url.searchParams.get('f')?.split('-') || [];

		const postalReady = customerPostalCode.value !== '' || appState.addressBook.length > 0;
		const shouldRefetch =
			customerPostalCode.value !== '' && lastAppliedPostalCode.value !== customerPostalCode.value;

		if ((true || shouldRefetch) && postalReady && !state.initialFetchDone) {
			state.search = state.facetValueIds.length
				? await searchQueryWithTerm(
						params.slug,
						'',
						state.facetValueIds,
						20,
						0,
						customerPostalCode.value || undefined
					)
				: await searchQueryWithCollectionSlug(
						params.slug,
						20,
						0,
						customerPostalCode.value || undefined
					);
			updateSearchResults(state, state.search);
			resetInfiniteScrollState(infPage, infHasMore, infError, infItems, state.search.items || []);
			state.initialFetchDone = true;
			if (import.meta.env.DEV) {
				console.log('🏪 [COLLECTION] Initial postal-filtered fetch complete');
			}
		}
		if (shouldRefetch && state.initialFetchDone) {
			lastAppliedPostalCode.value = customerPostalCode.value;
			if (import.meta.env.DEV) {
				console.log('🏪 [COLLECTION] Refetched with postal code:', customerPostalCode.value);
			}
		}
		if (!state.initialFetchDone && infItems.value.length) {
			infItems.value = [];
		}
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
		changeUrlParamsWithoutRefresh('', facetValueIds);

		state.search = facetValueIds.length
			? await searchQueryWithTerm(
					params.slug,
					'',
					state.facetValueIds,
					20,
					0,
					customerPostalCode.value || undefined
				)
			: await searchQueryWithCollectionSlug(
					params.slug,
					20,
					0,
					customerPostalCode.value || undefined
				);
		resetInfiniteScrollState(infPage, infHasMore, infError, infItems, state.search.items || []);
	});

	const onOpenCloseFilter = $((id: string) => {
		state.facedValues = toggleFacetGroup(state.facedValues, id);
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
					{collectionSignal.value.name}
				</h2>
				<div>
					{!!state.facedValues.length && (
						<FiltersButton
							onToggleMenu$={async () => {
								state.showMenu = !state.showMenu;
							}}
						/>
					)}
				</div>
			</div>
			<div>
				<Breadcrumbs items={collectionSignal.value.breadcrumbs || []}></Breadcrumbs>
				{!!collectionSignal.value.children?.length && (
					<div class="max-w-2xl mx-auto py-16 sm:py-16 lg:max-w-none border-b mb-16">
						<h2 class="text-2xl font-light text-gray-900">Collections</h2>
						<div class="mt-6 grid max-w-xs sm:max-w-none mx-auto sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
							{collectionSignal.value.children.map((child) => (
								<CollectionCard key={child.id} collection={child}></CollectionCard>
							))}
						</div>
					</div>
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
					{!state.initialFetchDone ? (
						<div
							class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8"
							aria-label="Loading local collection products"
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
					) : (
						<div class="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
							{infItems.value.map((item: any) => (
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
					)}
					{/* Sentinel for infinite scroll */}
					<div ref={(el) => (sentinelRef.value = el)} class="h-8"></div>
					{/* Empty state when no local products after initial fetch */}
					{state.initialFetchDone &&
						!infiniteScroll.isLoading.value &&
						infItems.value.length === 0 && (
							<div class="text-center py-12" aria-label="No local collection products">
								<p class="text-gray-600 font-medium">No local products found in this collection.</p>
								<p class="text-sm text-gray-400 mt-2">
									Try different filters or browse other collections.
								</p>
							</div>
						)}
					{/* Loading indicator */}
					{infiniteScroll.isLoading.value && (
						<div class="flex justify-center items-center py-6">
							<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
							<span class="ml-2 text-gray-600">Loading more...</span>
						</div>
					)}
					{/* End of results */}
					{!infHasMore.value && infItems.value.length > 0 && (
						<div class="text-center py-6 text-gray-500">No more products.</div>
					)}
					{/* Error message */}
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

export const head: DocumentHead = ({ resolveValue, url }) => {
	const collection = resolveValue(useCollectionLoader);
	let image = collection.children?.[0]?.featuredAsset?.preview || undefined;
	if (!image) {
		const search = resolveValue(useSearchLoader) as any;
		// Handle gated loader case - no items available during SSR
		if (!search.__gated && search.items?.[0]) {
			image = search.items[0].productAsset?.preview || undefined;
		}
	}
	return generateDocumentHead(url.href, collection.name, undefined, image);
};
