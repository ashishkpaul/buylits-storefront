import { useSignal, useVisibleTask$, QRL, $ } from '@qwik.dev/core';

export interface UseInfiniteScrollOptions<T = any> {
	pageSize?: number; // number of items per page
	thresholdPx?: number; // distance from bottom when using scroll-container strategy (fallback)
	loadMore$: QRL<(page: number) => Promise<T[]>>; // function to fetch next page
	initialItems: T[]; // initial page items
}

export interface UseInfiniteScrollReturn<T = any> {
	items: ReturnType<typeof useSignal<T[]>>;
	isLoading: ReturnType<typeof useSignal<boolean>>;
	error: ReturnType<typeof useSignal<string | null>>;
	hasMore: ReturnType<typeof useSignal<boolean>>;
	page: ReturnType<typeof useSignal<number>>;
	sentinelRef: ReturnType<typeof useSignal<HTMLElement | undefined>>;
}

/**
 * useInfiniteScroll - Qwik hook providing intersection-observer based infinite scrolling.
 * Strategy:
 *  - Maintains page counter; loads next page when sentinel enters viewport.
 *  - Uses IntersectionObserver inside useVisibleTask$ (client only).
 *  - Provides fallback scroll distance check for legacy situations.
 */
export const useInfiniteScroll = <T = any>(
	opts: UseInfiniteScrollOptions<T>
): UseInfiniteScrollReturn<T> => {
	const { pageSize = 20, thresholdPx = 400, loadMore$, initialItems } = opts;

	const items = useSignal<T[]>(initialItems || []);
	const page = useSignal<number>(1);
	const isLoading = useSignal<boolean>(false);
	const error = useSignal<string | null>(null);
	const hasMore = useSignal<boolean>(true);
	const sentinelRef = useSignal<HTMLElement | undefined>(undefined);

	// Wrapped in $ so it becomes a QRL and is serializable when referenced inside tasks
	const loadNextPage = $(async () => {
		if (isLoading.value || !hasMore.value) return;
		isLoading.value = true;
		error.value = null;
		try {
			const nextPage = page.value + 1;
			const newItems = await loadMore$(nextPage);
			if (newItems.length === 0) {
				hasMore.value = false;
			} else {
				items.value = [...items.value, ...newItems];
				page.value = nextPage;
				if (newItems.length < pageSize) {
					hasMore.value = false; // last page
				}
			}
		} catch (e: any) {
			error.value = e?.message || 'Failed to load more items';
		} finally {
			isLoading.value = false;
		}
	});

	useVisibleTask$(({ track, cleanup }) => {
		track(() => sentinelRef.value);
		const el = sentinelRef.value;
		if (!el) return;

		// IntersectionObserver approach
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						void loadNextPage();
					}
				});
			},
			{
				root: null,
				rootMargin: '0px',
				threshold: 0.1,
			}
		);

		observer.observe(el);

		// Fallback scroll distance check for parent scrollable container (optional)
		const scrollParent = el.closest('[data-scroll-container]') as HTMLElement | null;
		const onScroll = () => {
			if (!scrollParent || isLoading.value || !hasMore.value) return;
			const distanceFromBottom =
				scrollParent.scrollHeight - (scrollParent.scrollTop + scrollParent.clientHeight);
			if (distanceFromBottom < thresholdPx) {
				void loadNextPage();
			}
		};
		if (scrollParent) {
			scrollParent.addEventListener('scroll', onScroll);
		}

		cleanup(() => {
			observer.disconnect();
			if (scrollParent) scrollParent.removeEventListener('scroll', onScroll);
		});
	});

	return {
		items,
		isLoading,
		error,
		hasMore,
		page,
		sentinelRef,
	};
};
