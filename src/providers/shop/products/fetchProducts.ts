import { getSdk } from '~/generated/graphql-shop';
import { requester } from '~/graphql-wrapper';
import { buildFacetValueFilters, type SelectedFacets } from '~/utils/buildFacetValueFilters';

const sdk = getSdk(requester);

export async function searchExtendedProducts(params: {
	term?: string;
	page?: number;
	take?: number;
	selectedFacets?: SelectedFacets;
	collectionSlug?: string;
	sellerPostalCode?: string;
}) {
	const {
		term,
		page = 1,
		take = 24,
		selectedFacets = {},
		collectionSlug,
		sellerPostalCode,
	} = params;

	const skip = (page - 1) * take;

	// Build facet value filters - this converts { "facet1": ["fv_1", "fv_2"], "facet2": ["fv_3"] }
	// into the format expected by Elasticsearch
	const facetValueFilters = buildFacetValueFilters(selectedFacets);

	console.log('🔍 [STOREFRONT] Search params:', {
		term,
		facetValueFilters,
		collectionSlug,
		sellerPostalCode,
	});

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

		console.log('🔍 [STOREFRONT] Search response:', {
			totalItems: response.search?.totalItems,
			facetValues: response.search?.facetValues?.length,
			items: response.search?.items?.length,
		});

		return response.search;
	} catch (error) {
		console.error('❌ Search error:', error);
		throw error;
	}
}
