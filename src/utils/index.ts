import {
	DEFAULT_METADATA_DESCRIPTION,
	DEFAULT_METADATA_IMAGE,
	DEFAULT_METADATA_TITLE,
	DEFAULT_METADATA_URL,
} from '~/constants';
import { ENV_VARIABLES } from '~/env';
import { SearchResponse } from '~/generated/graphql-shop';
import { ActiveCustomer, FacetWithValues, ShippingAddress } from '~/types';

export const getRandomInt = (max: number) => Math.floor(Math.random() * max);

export function formatPrice(value = 0, currency: any) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(value / 100);
}

export const groupFacetValues = (
	search: SearchResponse,
	activeFacetValueIds: string[]
): FacetWithValues[] => {
	if (!search) {
		return [];
	}

	console.log('🔍 [GROUP-FACETS] Total items in search:', search.totalItems);
	console.log('🔍 [GROUP-FACETS] Total facet values received:', search.facetValues?.length);
	console.log('🔍 [GROUP-FACETS] Active facet IDs:', activeFacetValueIds);

	const facetMap = new Map<string, FacetWithValues>();
	let skippedAll = 0;
	let skippedZero = 0;
	let included = 0;

	for (const {
		facetValue: { id, name, facet },
		count,
	} of search.facetValues) {
		console.log('🔍 [GROUP-FACETS] Processing:', {
			facetName: facet.name,
			valueName: name,
			count,
			totalItems: search.totalItems,
		});

		// Skip facets that apply to all items (not useful for filtering)
		if (count === search.totalItems) {
			console.log('  ❌ Skipped (applies to all items)');
			skippedAll++;
			continue;
		}
		// Skip facets that don't appear in any search results
		if (count === 0) {
			console.log('  ❌ Skipped (count is 0)');
			skippedZero++;
			continue;
		}

		console.log('  ✅ Included');
		included++;

		const facetFromMap = facetMap.get(facet.id);
		const selected = (activeFacetValueIds || []).includes(id);
		if (facetFromMap) {
			facetFromMap.values.push({ id, name, selected });
		} else {
			facetMap.set(facet.id, {
				id: facet.id,
				name: facet.name,
				open: true,
				values: [{ id, name, selected }],
			});
		}
	}

	const result = Array.from(facetMap.values());
	console.log('🔍 [GROUP-FACETS] Summary:', {
		skippedAll,
		skippedZero,
		included,
		facetGroups: result.length,
		facetGroupNames: result.map((f) => f.name),
	});

	return result;
};

export const enableDisableFacetValues = (_facedValues: FacetWithValues[], ids: string[]) => {
	const facetValueIds: string[] = [];
	const facedValues = _facedValues.map((facet) => {
		facet.values = facet.values.map((value) => {
			if (ids.includes(value.id)) {
				facetValueIds.push(value.id);
				value.selected = true;
			} else {
				value.selected = false;
			}
			return value;
		});
		return facet;
	});
	return { facedValues, facetValueIds };
};

export const changeUrlParamsWithoutRefresh = (term: string, facetValueIds: string[]) => {
	const f = facetValueIds.join('-');
	return window.history.pushState(
		'',
		'',
		`${window.location.origin}${window.location.pathname}?q=${term}${f ? `&f=${f}` : ''}`
	);
};

export const setCookie = (name: string, value: string, days: number) => {
	let expires = '';
	if (days) {
		const date = new Date();
		date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
		expires = '; expires=' + date.toUTCString();
	}
	const secureCookie = isEnvVariableEnabled('VITE_SECURE_COOKIE')
		? ' Secure; SameSite=Strict;'
		: '';
	document.cookie = name + '=' + (value || '') + expires + `;${secureCookie} path=/`;
};

export const getCookie = (name: string) => {
	const keyValues = document.cookie.split(';');
	let result = '';
	keyValues.forEach((item) => {
		const [key, value] = item.split('=');
		if (key.trim() === name) {
			result = value;
		}
	});
	return result;
};

export const cleanUpParams = (params: Record<string, string>) => {
	if ('slug' in params && params.slug[params.slug.length - 1] === '/') {
		params.slug = params.slug.slice(0, params.slug.length - 1);
	}
	return params;
};

export const isEnvVariableEnabled = (envVariable: keyof typeof ENV_VARIABLES) =>
	ENV_VARIABLES[envVariable] === 'true';

export const isShippingAddressValid = (orderAddress: ShippingAddress): boolean =>
	!!(
		!!orderAddress &&
		orderAddress.fullName &&
		orderAddress.streetLine1 &&
		orderAddress.city &&
		orderAddress.province &&
		orderAddress.postalCode &&
		orderAddress.countryCode &&
		orderAddress.phoneNumber
	);

export const isActiveCustomerValid = (activeCustomer: ActiveCustomer): boolean =>
	!!(
		!!activeCustomer &&
		activeCustomer.emailAddress &&
		activeCustomer.firstName &&
		activeCustomer.lastName
	);

export const fullNameWithTitle = ({
	title,
	firstName,
	lastName,
}: Pick<ActiveCustomer, 'title' | 'firstName' | 'lastName'>): string => {
	return [title, firstName, lastName].filter((x) => !!x).join(' ');
};

export const formatDateTime = (dateToConvert: Date) => {
	const result = new Date(dateToConvert).toISOString();
	const [date, time] = result.split('T');
	const [hour, minutes] = time.split(':');
	const orderedDate = date.split('-').reverse().join('-');
	return `${orderedDate} ${hour}:${minutes}`;
};

export const isCheckoutPage = (url: string) => url.indexOf('/checkout/') >= 0;

export const generateDocumentHead = (
	url = DEFAULT_METADATA_URL,
	title = DEFAULT_METADATA_TITLE,
	description = DEFAULT_METADATA_DESCRIPTION,
	image = DEFAULT_METADATA_IMAGE
) => {
	const OG_METATAGS = [
		{ property: 'og:type', content: 'website' },
		{ property: 'og:url', content: url },
		{ property: 'og:title', content: title },
		{
			property: 'og:description',
			content: description,
		},
		{
			property: 'og:image',
			content: image ? image + '?w=800&h=800&format=webp' : undefined,
		},
	];
	const TWITTER_METATAGS = [
		{ property: 'twitter:card', content: 'summary_large_image' },
		{ property: 'twitter:url', content: url },
		{ property: 'twitter:title', content: title },
		{
			property: 'twitter:description',
			content: description,
		},
		{
			property: 'twitter:image',
			content: image ? image + '?w=800&h=800&format=webp' : undefined,
		},
	];
	return { title, meta: [...OG_METATAGS, ...TWITTER_METATAGS] };
};
