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

	// Logged-in customer
	if (
		appState.customer &&
		appState.customer.id &&
		appState.customer.id !== 'CUSTOMER_NOT_DEFINED_ID'
	) {
		// Always prefer shippingAddress.postalCode if present
		if (appState.shippingAddress && appState.shippingAddress.postalCode) {
			return normalize(appState.shippingAddress.postalCode);
		}

		// If logged-in, fallback to addressBook
		// Prefer default shipping address
		const defaultShipping = appState.addressBook.find((a) => a.defaultShippingAddress);
		if (defaultShipping && defaultShipping.postalCode) {
			return normalize(defaultShipping.postalCode);
		}
		// Then default billing address
		const defaultBilling = appState.addressBook.find((a) => a.defaultBillingAddress);
		if (defaultBilling && defaultBilling.postalCode) {
			return normalize(defaultBilling.postalCode);
		}
		// Then first address
		if (appState.addressBook.length > 0 && appState.addressBook[0].postalCode) {
			return normalize(appState.addressBook[0].postalCode);
		}
	}
	// Guest: use checkout shipping address
	if (appState.shippingAddress && appState.shippingAddress.postalCode) {
		return normalize(appState.shippingAddress.postalCode);
	}
	return '';
}

// (Optional) Future: add geolocation integration for guests
// export async function getPostalCodeFromGeolocation(): Promise<string> { ... }
