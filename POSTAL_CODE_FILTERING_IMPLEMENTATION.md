# Postal Code Filtering Implementation

## Goal

Filter product search results by matching seller postal codes against the customer's address postal code (exact normalized match), using the existing `sellerPostalCode` field in `SearchInput`.

## Implementation Summary

### 1. Customer Postal Code Helper (`src/utils/customer-postal-code.ts`)

Created a utility function `getActiveCustomerPostalCode(appState)` that:

- **Prioritizes** `appState.shippingAddress.postalCode` for all users (logged-in and guests)
- **Falls back** to address book for logged-in users:
  - Default shipping address
  - Default billing address
  - First address in address book
- **Normalizes** postal codes: trim, uppercase, remove spaces

### 2. Updated Product Search Functions (`src/providers/shop/products/products.ts`)

Modified search helper functions to accept optional `sellerPostalCode` parameter:

- `searchQueryWithCollectionSlug(collectionSlug, take, skip, sellerPostalCode?)`
- `searchQueryWithTerm(collectionSlug, term, facetValueIds, take, skip, sellerPostalCode?)`

Both functions pass the postal code to the backend search API when provided.

### 3. Search Route Integration (`src/routes/search/index.tsx`)

- Imports `APP_STATE` context and `getActiveCustomerPostalCode` helper
- Auto-derives customer postal code using `getActiveCustomerPostalCode(appState)`
- Passes postal code to all search queries:
  - Initial search loader
  - Filter changes
  - Infinite scroll pagination

### 4. Collections Route Integration (`src/routes/collections/[...slug]/index.tsx`)

- Imports `APP_STATE` context and `getActiveCustomerPostalCode` helper
- Auto-derives customer postal code using `getActiveCustomerPostalCode(appState)`
- Passes postal code to all collection searches:
  - Initial collection loader
  - Filter changes
  - Infinite scroll pagination

## Behavior

### For Logged-In Customers

1. Uses `shippingAddress.postalCode` if present
2. Falls back to default shipping address from address book
3. Falls back to default billing address
4. Falls back to first address in address book
5. If none available, no postal code filter is applied (shows all products)

### For Guest Customers

1. Uses `shippingAddress.postalCode` if entered during checkout or via geolocation
2. If not available, no postal code filter is applied (shows all products)

## Future Enhancements

1. **Geolocation Integration**: Add browser geolocation or Google Maps API to auto-detect guest postal codes
2. **UI Indicator**: Show a banner or badge when region-based filtering is active
3. **Manual Postal Code Entry**: Add a UI control for guests to manually enter their postal code before browsing
4. **Cache Invalidation**: Invalidate search cache when customer address changes

## Files Modified

- `src/utils/customer-postal-code.ts` (new file)
- `src/providers/shop/products/products.ts`
- `src/routes/search/index.tsx`
- `src/routes/collections/[...slug]/index.tsx`

## Testing

1. Verify logged-in customers with saved addresses see products filtered by their postal code
2. Verify guests without postal codes see all products
3. Verify filter changes and pagination maintain postal code filtering
4. Verify cache behavior with postal code changes
