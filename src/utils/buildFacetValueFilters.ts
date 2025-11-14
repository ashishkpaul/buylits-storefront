export type SelectedFacets = Record<string, string[]>;
// Example: { "size": ["fv_1","fv_2"], "brand": ["fv_9"] }

export function buildFacetValueFilters(selected: SelectedFacets) {
	const filters: Array<{ or?: string[] }> = [];

	console.log('🔍 [FACET-BUILDER] Input facets:', selected);

	for (const [facetCode, valueIds] of Object.entries(selected)) {
		if (!valueIds?.length) continue;

		// OR within the same facet group; AND across different groups
		filters.push({ or: valueIds });

		console.log('🔍 [FACET-BUILDER] Added filter for', facetCode, ':', valueIds);
	}

	console.log('🔍 [FACET-BUILDER] Final filters:', filters);
	return filters;
}
