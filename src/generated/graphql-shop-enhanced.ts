import gql from 'graphql-tag';
import type { Requester } from '~/generated/graphql-shop';

export const SellerProductMappingsFragment = gql`
	fragment SellerProductMappings on SearchResult {
		customProductMappings {
			sellerNames
			sellerPostalCodes
		}
		customProductVariantMappings {
			sellerName
			sellerPostalCode
			variantMRP
			releaseDate
		}
	}
`;

export const SearchPriceDataFragment = gql`
	fragment SearchPriceData on SearchResponsePriceData {
		rangeWithTax {
			min
			max
		}
		range {
			min
			max
		}
		bucketsWithTax {
			to
			count
		}
		buckets {
			to
			count
		}
	}
`;

export const ListedProductEnhancedFragment = gql`
	fragment ListedProductEnhanced on SearchResult {
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

export const SearchExtendedDocument = gql`
	query searchExtended($input: SearchInput!) {
		search(input: $input) {
			totalItems
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
			collections {
				count
				collection {
					id
					name
					slug
					parent {
						id
					}
				}
			}
			prices {
				...SearchPriceData
			}
			items {
				...ListedProductEnhanced
				...SellerProductMappings
			}
		}
	}
	${SearchPriceDataFragment}
	${ListedProductEnhancedFragment}
	${SellerProductMappingsFragment}
`;

export const SearchSuggestionsDocument = gql`
	query searchSuggestions($input: SearchSuggestionsInput!) {
		searchSuggestions(input: $input) {
			totalCount
			executionTimeMs
			suggestions {
				text
				type
				highlighted
				score
				productId
				productName
				brandName
				categorySlug
				categoryName
				productCount
			}
		}
	}
`;

export function getEnhancedSdk<C>(requester: Requester<C>) {
	return {
		searchExtended(vars: { input: any }, options?: C) {
			return requester<any, { input: any }>(SearchExtendedDocument, vars, options);
		},
		searchSuggestions(vars: { input: any }, options?: C) {
			return requester<any, { input: any }>(SearchSuggestionsDocument, vars, options);
		},
	};
}
