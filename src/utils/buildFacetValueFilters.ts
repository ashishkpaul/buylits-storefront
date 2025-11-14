export type SelectedFacets = Record<string, string[]>;
// Example: { "size": ["fv_1","fv_2"], "brand": ["fv_9"] }

export function buildFacetValueFilters(selected: SelectedFacets) {
	const filters: Array<{ or?: string[] }> = [];
	for (const valueIds of Object.values(selected)) {
		if (!valueIds?.length) continue;
		// OR within same facet group, AND across groups
		filters.push({ or: valueIds });
	}
	return filters;
}
