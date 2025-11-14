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
	collectionId?: string;
	sellerPostalCode?: string;
	inStock?: boolean;
	sort?: { field: 'name' | 'price'; direction: 'ASC' | 'DESC' };
	groupByProduct?: boolean;
}) {
	const {
		term,
		page = 1,
		take = 24,
		selectedFacets = {},
		collectionSlug,
		collectionId,
		sellerPostalCode,
		inStock,
		sort,
		groupByProduct = true,
	} = params;

	const skip = (page - 1) * take;
	const facetValueFilters = buildFacetValueFilters(selectedFacets);
	const sortInput = sort ? [{ [sort.field]: sort.direction }] : undefined;

	const input: any = {
		term,
		take,
		skip,
		groupByProduct,
		facetValueFilters,
		collectionSlug,
		collectionId,
		sellerPostalCode,
		inStock,
		sort: sortInput,
	};

	const { search } = await sdk.searchExtended({ input });
	return search;
}
