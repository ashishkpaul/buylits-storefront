import { SearchResponse } from '~/generated/graphql-shop';
import { FacetWithValues } from '~/types';
import { groupFacetValues } from '~/utils';

export interface PostalFilteredSearchState {
	showMenu: boolean;
	search: SearchResponse;
	facedValues: FacetWithValues[];
	facetValueIds: string[];
	initialFetchDone: boolean;
}

/**
 * Helper to update search results and facet values
 */
export function updateSearchResults(
	state: PostalFilteredSearchState,
	searchResponse: SearchResponse | undefined
): void {
	if (searchResponse) {
		state.search = searchResponse as SearchResponse;
		state.facedValues = groupFacetValues(state.search as SearchResponse, state.facetValueIds);
	}
}

/**
 * Helper to reset infinite scroll state with new items
 */
export function resetInfiniteScrollState(
	infPage: { value: number },
	infHasMore: { value: boolean },
	infError: { value: string | null },
	infItems: { value: any[] },
	newItems: any[]
): void {
	infPage.value = 1;
	infHasMore.value = true;
	infError.value = null;
	infItems.value = newItems;
}

/**
 * Helper to determine if postal code is ready
 */
export function isPostalCodeReady(customerPostalCode: string, addressBookLength: number): boolean {
	return customerPostalCode !== '' || addressBookLength > 0;
}

/**
 * Helper to track postal code changes and determine if refetch needed
 */
export function shouldRefetchForPostalCode(
	customerPostalCode: string,
	lastAppliedPostalCode: string
): boolean {
	return customerPostalCode !== '' && lastAppliedPostalCode !== customerPostalCode;
}

/**
 * Helper to create filter toggle handler logic
 */
export function toggleFacetGroup(
	facedValues: FacetWithValues[],
	groupId: string
): FacetWithValues[] {
	return facedValues.map((f) => {
		if (f.id === groupId) {
			return { ...f, open: !f.open };
		}
		return f;
	});
}
