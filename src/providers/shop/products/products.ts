import gql from 'graphql-tag';
import { Product, ProductQuery, SearchInput, SearchResponse } from '~/generated/graphql-shop';
import { shopSdk } from '~/graphql-wrapper';
import { getActiveCustomerPostalCode } from '~/utils/customer-postal-code';

export const search = async (searchInput: SearchInput) => {
	return await shopSdk
		.search({ input: { groupByProduct: true, take: 20, ...searchInput } })
		.then((res) => res.search as SearchResponse);
};

export const searchQueryWithCollectionSlug = async (
	collectionSlug: string,
	take: number = 20,
	skip: number = 0,
	sellerPostalCode?: string
) => search({ collectionSlug, take, skip, ...(sellerPostalCode && { sellerPostalCode }) });

export const searchQueryWithTerm = async (
	collectionSlug: string,
	term: string,
	facetValueIds: string[],
	take: number = 20,
	skip: number = 0,
	sellerPostalCode?: string
) =>
	search({
		collectionSlug,
		term,
		facetValueFilters: [{ or: facetValueIds }],
		take,
		skip,
		...(sellerPostalCode && { sellerPostalCode }),
	});

export const getProductBySlug = async (slug: string) => {
	return shopSdk.product({ slug }).then((res: ProductQuery) => res.product as Product);
};

export const detailedProductFragment = gql`
	fragment DetailedProduct on Product {
		id
		name
		description
		collections {
			id
			slug
			name
			breadcrumbs {
				id
				name
				slug
			}
		}
		facetValues {
			facet {
				id
				code
				name
			}
			id
			code
			name
		}
		featuredAsset {
			id
			preview
		}
		assets {
			id
			preview
		}
		variants {
			id
			name
			priceWithTax
			currencyCode
			sku
			stockLevel
			featuredAsset {
				id
				preview
			}
		}
	}
`;

gql`
	query product($slug: String, $id: ID) {
		product(slug: $slug, id: $id) {
			...DetailedProduct
		}
	}
`;

export const listedProductFragment = gql`
	fragment ListedProduct on SearchResult {
		productId
		productName
		slug
		productAsset {
			id
			preview
		}
		currencyCode
		priceWithTax {
			... on PriceRange {
				min
				max
			}
			... on SinglePrice {
				value
			}
		}
	}
`;

gql`
	query search($input: SearchInput!) {
		search(input: $input) {
			totalItems
			items {
				...ListedProduct
			}
			facetValues {
				count
				facetValue {
					id
					name
					facet {
						id
						name
					}
				}
			}
		}
	}
	${listedProductFragment}
`;

// Inject customer postal code if present
export const searchWithCustomerPostalCode = (
	appState: any,
	input: Omit<SearchInput, 'groupByProduct' | 'take'> & { take?: number }
) => {
	const sellerPostalCode = getActiveCustomerPostalCode(appState);
	if (!sellerPostalCode) {
		return Promise.resolve({ items: [], facetValues: [], totalItems: 0 } as any);
	}
	return search({
		...input,
		...(sellerPostalCode ? { sellerPostalCode } : {}),
	});
};
