import { getSdk } from '~/generated/graphql-shop';
import { requester } from '~/graphql-wrapper';
import { buildFacetValueFilters, type SelectedFacets } from '~/utils/buildFacetValueFilters';

const sdk = getSdk(requester);

export async function searchExtendedProducts(params: {
	term?: string;
	page?: number;
	take?: number;
	selectedFacets?: SelectedFacets;
	facetValueIds?: string[];
	collectionSlug?: string;
	sellerPostalCode?: string;
}) {
	const {
		term,
		page = 1,
		take = 20,
		selectedFacets = {},
		facetValueIds,
		collectionSlug,
		sellerPostalCode,
	} = params;

	const skip = (page - 1) * take;

	// Build facet value filters - this converts { "facet1": ["fv_1", "fv_2"], "facet2": ["fv_3"] }
	// into the format expected by Elasticsearch
	// OR use simple facetValueIds array if provided
	const facetValueFilters =
		facetValueIds && facetValueIds.length > 0
			? [{ or: facetValueIds }]
			: buildFacetValueFilters(selectedFacets);

	if (import.meta.env.DEV) {
		console.log('🔍 [STOREFRONT] Search params:', {
			term,
			facetValueFilters,
			collectionSlug,
			sellerPostalCode,
		});
	}

	const input: any = {
		term: term || '',
		take,
		skip,
		groupByProduct: true,
		...(facetValueFilters.length > 0 && { facetValueFilters }),
		...(collectionSlug && { collectionSlug }),
		...(sellerPostalCode && { sellerPostalCode }),
	};

	try {
		const response = await sdk.searchExtended({ input });

		if (import.meta.env.DEV) {
			console.log('🔍 [STOREFRONT] Search response:', {
				totalItems: response.search?.totalItems,
				facetValues: response.search?.facetValues?.length,
				items: response.search?.items?.length,
			});
		}

		return response.search;
	} catch (error) {
		console.error('❌ Search error:', error);
		throw error;
	}
}
