import {
	$,
	Slot,
	component$,
	useContextProvider,
	useOn,
	useStore,
	useVisibleTask$,
} from '@qwik.dev/core';
import { RequestHandler, routeLoader$ } from '@qwik.dev/router';
import { guessLocale } from 'compiled-i18n';
import { ImageTransformerProps, useImageProvider } from '~/components/image/image';
import Menu from '~/components/menu/Menu';
import { APP_STATE, CUSTOMER_NOT_DEFINED_ID, IMAGE_RESOLUTIONS } from '~/constants';
import { Address, Order } from '~/generated/graphql-shop';
import { getAvailableCountriesQuery } from '~/providers/shop/checkout/checkout';
import { getCollections } from '~/providers/shop/collections/collections';
import { getActiveCustomerAddressesQuery } from '~/providers/shop/customer/customer';
import { getActiveOrderQuery } from '~/providers/shop/orders/order';
import { ActiveCustomer, AppState, ShippingAddress } from '~/types';
import Cart from '../components/cart/Cart';
import Footer from '../components/footer/footer';
import Header from '../components/header/header';

export const onGet: RequestHandler = async ({ cacheControl }) => {
	cacheControl({ staleWhileRevalidate: 60 * 60 * 24 * 7, maxAge: 5 });
};

export const useCollectionsLoader = routeLoader$(async () => {
	return await getCollections();
});

export const useAvailableCountriesLoader = routeLoader$(async () => {
	return await getAvailableCountriesQuery();
});

export const onRequest: RequestHandler = ({ request, query, locale }) => {
	const lang = query.get('lang') || request.headers.get('accept-language');
	const guessedLocale = guessLocale(lang);
	locale(guessedLocale);
};

export default component$(() => {
	const imageTransformer$ = $(({ src, width, height }: ImageTransformerProps): string => {
		return `${src}?w=${width}&h=${height}&format=webp`;
	});

	// Provide your default options
	useImageProvider({
		imageTransformer$,
		resolutions: IMAGE_RESOLUTIONS,
	});

	const collectionsSignal = useCollectionsLoader();
	const availableCountriesSignal = useAvailableCountriesLoader();

	const state = useStore<AppState>({
		showCart: false,
		showMenu: false,
		customer: { id: CUSTOMER_NOT_DEFINED_ID, firstName: '', lastName: '' } as ActiveCustomer,
		activeOrder: {} as Order,
		collections: collectionsSignal.value || [],
		availableCountries: availableCountriesSignal.value || [],
		shippingAddress: {
			id: '',
			city: '',
			company: '',
			countryCode:
				availableCountriesSignal.value && availableCountriesSignal.value.length > 0
					? availableCountriesSignal.value[0].code
					: '',
			fullName: '',
			phoneNumber: '',
			postalCode: '',
			province: '',
			streetLine1: '',
			streetLine2: '',
		},
		addressBook: [],
	});

	useContextProvider(APP_STATE, state);

	useVisibleTask$(async () => {
		if (import.meta.env.DEV)
			console.log('🔄 [LAYOUT] Loading active order and customer addresses...');
		state.activeOrder = await getActiveOrderQuery();
		if (import.meta.env.DEV) console.log('✅ [LAYOUT] Active order loaded');

		// Load customer addresses for postal code filtering
		try {
			// ALWAYS log to diagnose issue
			console.log('🔄 [LAYOUT] Fetching customer addresses...');
			const activeCustomer = await getActiveCustomerAddressesQuery();
			console.log('📦 [LAYOUT] Customer query result:', {
				hasCustomer: !!activeCustomer,
				customerId: activeCustomer?.id,
				hasAddresses: !!activeCustomer?.addresses,
				addressCount: activeCustomer?.addresses?.length || 0,
				rawResponse: activeCustomer,
			});

			if (activeCustomer?.addresses) {
				const shippingAddresses: ShippingAddress[] = (activeCustomer.addresses as Address[]).map(
					(address: Address) => {
						if (import.meta.env.DEV)
							console.log('📍 [LAYOUT] Processing address:', {
								id: address.id,
								postalCode: address.postalCode,
								defaultShipping: address.defaultShippingAddress,
								defaultBilling: address.defaultBillingAddress,
							});
						return {
							id: address.id,
							fullName: address.fullName,
							streetLine1: address.streetLine1,
							streetLine2: address.streetLine2,
							company: address.company,
							city: address.city,
							province: address.province,
							postalCode: address.postalCode,
							countryCode: address.country.code,
							phoneNumber: address.phoneNumber,
							defaultShippingAddress: address.defaultShippingAddress,
							defaultBillingAddress: address.defaultBillingAddress,
						} as ShippingAddress;
					}
				);
				state.addressBook = shippingAddresses;
				if (import.meta.env.DEV)
					console.log('✅ [LAYOUT] Address book populated:', {
						count: state.addressBook.length,
						postalCodes: state.addressBook.map((a) => a.postalCode),
					});
			} else {
				if (import.meta.env.DEV) console.log('⚠️ [LAYOUT] No addresses found for customer');
			}
		} catch (error) {
			// Customer not logged in or error fetching addresses
			if (import.meta.env.DEV) console.log('❌ [LAYOUT] Could not load customer addresses:', error);
		}
	});

	useVisibleTask$(({ track }) => {
		track(() => state.showCart);
		track(() => state.showMenu);

		state.showCart || state.showMenu
			? document.body.classList.add('overflow-hidden')
			: document.body.classList.remove('overflow-hidden');
	});

	useOn(
		'keydown',
		$((event: unknown) => {
			if ((event as KeyboardEvent).key === 'Escape') {
				state.showCart = false;
				state.showMenu = false;
			}
		})
	);

	return (
		<div>
			<Header />
			<Cart />
			<Menu />
			<main class="pb-12 bg-gray-50">
				<Slot />
			</main>
			<Footer />
		</div>
	);
});
