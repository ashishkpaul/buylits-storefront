import { $, component$, useSignal, useTask$ } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import { fetchSearchSuggestions } from '~/providers/shop/products/useSearchSuggestions';
import { _ } from 'compiled-i18n';

export default component$(() => {
	const navigate = useNavigate();
	const searchTerm = useSignal('');
	const suggestions = useSignal<any[]>([]);
	const showSuggestions = useSignal(false);
	const debounceTimer = useSignal<NodeJS.Timeout>();

	useTask$(({ track }) => {
		track(() => searchTerm.value);

		if (debounceTimer.value) clearTimeout(debounceTimer.value);
		if (searchTerm.value.length < 2) {
			suggestions.value = [];
			showSuggestions.value = false;
			return;
		}

		debounceTimer.value = setTimeout(async () => {
			try {
				const result = await fetchSearchSuggestions(searchTerm.value, 8);
				suggestions.value = result.suggestions || [];
				showSuggestions.value = true;
			} catch (error) {
				console.error('Suggestions error:', error);
				suggestions.value = [];
			}
		}, 300);
	});

	// Generic search navigation for plain text terms
	const handleSearch = $((term: string) => {
		if (term.trim()) {
			navigate(`/search?q=${encodeURIComponent(term)}`);
			showSuggestions.value = false;
			searchTerm.value = '';
		}
	});

	// Specialized handler for suggestion objects
	const handleSuggestionSelect = $((s: any) => {
		// CATEGORY suggestions should navigate to the collection page
		if (s.type === 'CATEGORY' && s.categorySlug) {
			navigate(`/collections/${encodeURIComponent(s.categorySlug)}`);
			showSuggestions.value = false;
			searchTerm.value = '';
			return;
		}
		// PRODUCT / COMPLETION / BRAND fallback to search by text
		handleSearch(s.text);
	});

	const handleSubmit = $((e: Event) => {
		e.preventDefault();
		handleSearch(searchTerm.value);
	});

	return (
		<form action="/search" class="relative" onSubmit$={handleSubmit}>
			<input
				type="search"
				name="q"
				value={searchTerm.value}
				onInput$={(_, el) => (searchTerm.value = el.value)}
				placeholder={_`Search`}
				autoComplete="off"
				class="block w-full rounded-md border-gray-300"
			/>

			{showSuggestions.value && suggestions.value.length > 0 && (
				<ul class="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg mt-1 z-50">
					{suggestions.value.map((s, idx) => (
						<li key={idx}>
							<button
								type="button"
								onClick$={() => handleSuggestionSelect(s)}
								class="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex justify-between items-center"
							>
								<span>
									{s.highlighted || s.text}
									{s.productCount && (
										<span class="text-gray-400 text-xs ml-2">({s.productCount})</span>
									)}
								</span>
								<span class="text-[10px] uppercase tracking-wide text-gray-400 ml-2">
									{s.type === 'CATEGORY' && 'Category'}
									{s.type === 'PRODUCT' && 'Product'}
									{s.type === 'BRAND' && 'Brand'}
									{s.type === 'COMPLETION' && 'Suggestion'}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</form>
	);
});
