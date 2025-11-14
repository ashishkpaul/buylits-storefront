import { requester } from '~/utils/api';
import { getEnhancedSdk } from '~/generated/graphql-shop-enhanced';
import { buildFacetValueFilters, type SelectedFacets } from '~/utils/buildFacetValueFilters';

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
	const facetValueFilters = buildFacetValueFilters(selectedFacets);

	const input: any = {
		term,
		take,
		skip,
		groupByProduct: true,
		facetValueFilters,
		collectionSlug,
		sellerPostalCode,
	};

	const sdk = getEnhancedSdk(requester as any);
	const { search } = await sdk.searchExtended({ input });
	return search;
}
