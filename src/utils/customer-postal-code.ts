// Utility to get postal code for filtering local products
// Handles both logged-in and guest customers
// For guests, can use manual entry or geolocation (to be integrated)

import { AppState } from '~/types';

/**
 * Returns normalized postal code for current user (logged-in or guest).
 * - If logged in: prefers default shipping, then billing, then first address in addressBook.
 * - If guest: uses appState.shippingAddress.postalCode (manual or geolocated).
 * Returns empty string if not found.
 */
export function getActiveCustomerPostalCode(appState: AppState): string {
	// Helper to normalize postal code
	const normalize = (code?: string) => (code ? code.trim().replace(/\s+/g, '').toUpperCase() : '');

	if (import.meta.env.DEV) {
		console.log('🏠 [POSTAL-CODE] === Checking customer postal code ===');
		console.log('🏠 [POSTAL-CODE] Customer ID:', appState.customer?.id);
		console.log(
			'🏠 [POSTAL-CODE] Customer Name:',
			appState.customer?.firstName,
			appState.customer?.lastName
		);
		console.log(
			'🏠 [POSTAL-CODE] Shipping Address Postal Code:',
			appState.shippingAddress?.postalCode
		);
		console.log('🏠 [POSTAL-CODE] Address Book Count:', appState.addressBook?.length || 0);
		if (appState.addressBook && appState.addressBook.length > 0) {
			console.log(
				'🏠 [POSTAL-CODE] Address Book Details:',
				appState.addressBook.map((a) => ({
					id: a.id,
					postalCode: a.postalCode,
					defaultShipping: a.defaultShippingAddress,
					defaultBilling: a.defaultBillingAddress,
					city: a.city,
				}))
			);
		}
	}

	// Logged-in customer
	if (
		appState.customer &&
		appState.customer.id &&
		appState.customer.id !== 'CUSTOMER_NOT_DEFINED_ID'
	) {
		// Always prefer shippingAddress.postalCode if present
		if (appState.shippingAddress && appState.shippingAddress.postalCode) {
			const code = normalize(appState.shippingAddress.postalCode);
			if (import.meta.env.DEV) {
				console.log('🏠 [POSTAL-CODE] Using shippingAddress:', code);
			}
			return code;
		}

		// If logged-in, fallback to addressBook
		// Prefer default shipping address
		const defaultShipping = appState.addressBook.find((a) => a.defaultShippingAddress);
		if (defaultShipping && defaultShipping.postalCode) {
			const code = normalize(defaultShipping.postalCode);
			if (import.meta.env.DEV) {
				console.log('🏠 [POSTAL-CODE] Using default shipping address:', code);
			}
			return code;
		}
		// Then default billing address
		const defaultBilling = appState.addressBook.find((a) => a.defaultBillingAddress);
		if (defaultBilling && defaultBilling.postalCode) {
			const code = normalize(defaultBilling.postalCode);
			if (import.meta.env.DEV) {
				console.log('🏠 [POSTAL-CODE] Using default billing address:', code);
			}
			return code;
		}
		// Then first address
		if (appState.addressBook.length > 0 && appState.addressBook[0].postalCode) {
			const code = normalize(appState.addressBook[0].postalCode);
			if (import.meta.env.DEV) {
				console.log('🏠 [POSTAL-CODE] Using first address:', code);
			}
			return code;
		}
	}
	// Guest: use checkout shipping address
	if (appState.shippingAddress && appState.shippingAddress.postalCode) {
		const code = normalize(appState.shippingAddress.postalCode);
		if (import.meta.env.DEV) {
			console.log('🏠 [POSTAL-CODE] Guest using shippingAddress:', code);
		}
		return code;
	}

	if (import.meta.env.DEV) {
		console.log('🏠 [POSTAL-CODE] No postal code found');
	}
	return '';
}

// (Optional) Future: add geolocation integration for guests
// export async function getPostalCodeFromGeolocation(): Promise<string> { ... }
