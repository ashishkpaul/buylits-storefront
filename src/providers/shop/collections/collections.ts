import gql from 'graphql-tag';
import { Collection, SearchInput, SearchResponse } from '~/generated/graphql-shop';
import { shopSdk } from '~/graphql-wrapper';

export const getCollections = async () => {
	return await shopSdk
		.collections()
		.then((res) => {
			return res?.collections?.items as Collection[];
		})
		.catch((error) => {
			console.error('Error fetching collections:', error);
			return [];
		});
};

export const getCollectionBySlug = async (slug: string) => {
	const res = await shopSdk.collection({ slug });
	return res?.collection as Collection;
};

// Fetch products from a collection using search API with pagination, optional facets & seller postal code
export const getCollectionProducts = async (
	collectionSlug: string,
	take: number = 20,
	skip: number = 0,
	facetValueIds: string[] = [],
	sellerPostalCode?: string,
	term?: string
): Promise<SearchResponse | undefined> => {
	const searchInput: SearchInput = {
		collectionSlug,
		take,
		skip,
		groupByProduct: false,
	};

	if (facetValueIds.length) {
		searchInput.facetValueFilters = [{ or: facetValueIds }];
	}
	if (sellerPostalCode) {
		searchInput.sellerPostalCode = sellerPostalCode;
	}
	if (term) {
		searchInput.term = term;
	}

	try {
		const res = await shopSdk.search({ input: searchInput });
		return res.search as SearchResponse;
	} catch (error) {
		console.error('Error fetching collection products:', {
			collectionSlug,
			take,
			skip,
			facetValueIds,
			sellerPostalCode,
			term,
			error,
		});
		return undefined;
	}
};

// GraphQL query for collections
gql`
	query collections {
		collections {
			items {
				id
				name
				slug
				parent {
					id
					slug
					name
				}
				featuredAsset {
					id
					preview
				}
			}
			totalItems
		}
	}
`;

// GraphQL query for a specific collection by slug
gql`
	query collection($slug: String, $id: ID) {
		collection(slug: $slug, id: $id) {
			id
			name
			slug
			breadcrumbs {
				id
				name
				slug
			}
			children {
				id
				name
				slug
				featuredAsset {
					id
					preview
				}
			}
		}
	}
`;
