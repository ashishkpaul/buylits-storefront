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

	const handleSearch = $((term: string) => {
		if (term.trim()) {
			navigate(`/search?q=${encodeURIComponent(term)}`);
			showSuggestions.value = false;
			searchTerm.value = '';
		}
	});

	return (
		<form action="/search" class="relative">
			<input
				type="search"
				name="q"
				value={searchTerm.value}
				onInput$={(_, el) => (searchTerm.value = el.value)}
				onKeyDown$={(e) => e.key === 'Enter' && handleSearch(searchTerm.value)}
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
								onClick$={() => handleSearch(s.text)}
								class="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
							>
								{s.highlighted || s.text}
								{s.productCount && (
									<span class="text-gray-400 text-xs ml-2">({s.productCount})</span>
								)}
							</button>
						</li>
					))}
				</ul>
			)}
		</form>
	);
});
