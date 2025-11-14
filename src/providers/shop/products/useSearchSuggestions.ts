import { getSdk } from '~/generated/graphql-shop';
import { requester } from '~/graphql-wrapper';

const sdk = getSdk(requester);

export async function fetchSearchSuggestions(term: string, limit = 8) {
	if (!term || term.trim().length < 2) {
		return { suggestions: [], totalCount: 0, executionTimeMs: 0 };
	}
	const { searchSuggestions } = await sdk.searchSuggestions({ term, limit });
	return searchSuggestions;
}
