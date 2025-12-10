# Juspay Error Handling Implementation

## Overview

This document describes the comprehensive error handling system implemented for the Qwik storefront's Juspay payment integration. The implementation follows the patterns documented in `ERROR_CODE_INTEGRATION.md` and provides a sophisticated, user-friendly error experience.

## Implementation Summary

### Files Created

1. **`src/types/juspay-errors.ts`** (68 lines)
   - TypeScript type definitions for error handling
   - Enums for error categories and actions
   - Interfaces for error details, retry configuration, and analytics

2. **`src/utils/juspay-errors.ts`** (415 lines)
   - Core error parsing and categorization logic
   - 20+ mapped error codes with user-friendly messages
   - Progressive error messaging for repeated failures
   - Analytics tracking utilities
   - Error summary generation for UI

3. **`src/utils/retry-logic.ts`** (181 lines)
   - Exponential backoff retry wrapper
   - Smart retry logic for payment operations
   - Retry tracker for UI state management
   - Configurable retry parameters

### Files Modified

1. **`src/providers/shop/payments/juspay.ts`**
   - Added structured error handling to all provider functions
   - Integrated automatic retry for API calls
   - Error code extraction from GraphQL responses
   - Analytics tracking on errors

2. **`src/components/payment/JuspayPayment.tsx`**
   - Enhanced component state with structured error object
   - Category-based error display with color coding
   - Action buttons based on error type
   - Progressive error messages
   - Alternative payment method suggestions after multiple failures
   - Automatic retry for technical errors

## Key Features

### 1. Error Categorization

Five error categories with specific handling:

- **USER_ERROR**: Input validation issues (invalid card, CVV, UPI ID)
  - Yellow warning style
  - Prompts user to re-enter details
- **BUSINESS_ERROR**: Business logic failures (insufficient funds, declined)
  - Red error style
  - Suggests alternative payment methods or bank contact
- **TECHNICAL_ERROR**: System/network issues (timeouts, gateway errors)
  - Red error style
  - Automatic retry with exponential backoff
  - Manual retry button
- **USER_DROPPED**: User-initiated cancellations (cancelled payment, session expired)
  - Blue info style
  - Simple retry option
- **VALIDATION_ERROR**: System validation failures (invalid order, amount)
  - Red error style
  - Contact support suggestion

### 2. Smart Retry Logic

**Automatic Retry:**

- Technical errors retry automatically (up to 2 times)
- Exponential backoff: 1s, 2s delays
- Only for transient failures (network, timeout, 5xx)

**Manual Retry:**

- User-triggered retry button
- Progressive messaging on repeated failures
- Attempt counter display (e.g., "Attempt 2 of 3")

**Retry Tracker:**

- Tracks attempts per order
- Shows alternative payment methods after 3 failures
- Resets on payment method change

### 3. Progressive Error Messages

Errors become more helpful with repeated failures:

1. **First attempt**: Standard error message
2. **Second attempt**: Message + "This is your second attempt"
3. **Third attempt**: Escalated message suggesting alternatives or support

### 4. User-Friendly Error Display

**Error UI Components:**

- Category-based color coding (yellow/red/blue)
- Icon indicators
- Clear error titles and descriptions
- Action buttons with specific guidance
- Attempt counter
- Alternative payment method suggestions

**Action Buttons:**

- "Try Again" - for retryable errors
- "Re-enter Details" - for validation errors
- "Choose Another Payment Method" - for business errors
- "Contact Bank" - for declined transactions
- "Contact Support" - for system errors

### 5. Error Analytics

All errors are tracked with:

- Error code and category
- Order ID and customer ID
- Payment method
- Retry count
- Timestamp

Ready for integration with analytics services (Google Analytics, Mixpanel, etc.)

## Error Code Mapping

### User Errors

- `INVALID_CARD_NUMBER` - Card number validation failed
- `INVALID_CVV` - Incorrect CVV/security code
- `CARD_EXPIRED` - Expired card
- `INVALID_EXPIRY_DATE` - Invalid expiry date
- `INVALID_VPA` - Invalid UPI ID

### Business Errors

- `INSUFFICIENT_FUNDS` - Account has insufficient balance
- `TRANSACTION_LIMIT_EXCEEDED` - Exceeds transaction limit
- `CARD_NOT_SUPPORTED` - Card type not supported
- `PAYMENT_METHOD_NOT_ENABLED` - Payment method unavailable
- `BANK_DECLINED` - Bank declined transaction

### Technical Errors

- `GATEWAY_TIMEOUT` - Payment gateway timeout
- `GATEWAY_ERROR` - Gateway technical error
- `NETWORK_ERROR` - Network connectivity issue
- `SERVICE_UNAVAILABLE` - Service temporarily down

### User Dropped

- `TRANSACTION_CANCELLED` - User cancelled payment
- `SESSION_EXPIRED` - Payment session expired

### Validation Errors

- `INVALID_ORDER` - Order validation failed
- `INVALID_AMOUNT` - Amount validation failed

## Usage Example

### Provider Layer

```typescript
export const getJuspayPaymentLink = async (orderCode: string) => {
	try {
		const result = await retryPaymentOperation(() => shopSdk.GetJuspayPaymentLink({ orderCode }));
		return result.getJuspayPaymentLink;
	} catch (error) {
		const errorDetails = parseJuspayError(error);
		trackErrorAnalytics(errorDetails, { orderId: orderCode });
		throw errorDetails;
	}
};
```

### Component Layer

```typescript
try {
	const paymentLink = await getJuspayPaymentLink(orderCode);
	window.location.href = paymentLink;
} catch (error: any) {
	const errorDetails = error.errorCode
		? (error as JuspayErrorDetails)
		: parseJuspayError(error, attemptCount);

	const progressiveMessage = getProgressiveErrorMessage(errorDetails, attemptCount);

	state.error = { ...errorDetails, userMessage: progressiveMessage };

	// Auto-retry for technical errors
	if (shouldAutoRetry(errorDetails)) {
		setTimeout(() => handlePayment(), 2000);
	}
}
```

### UI Layer

```tsx
{
	state.error && (
		<div
			class={[
				'border-2 rounded-lg p-4',
				errorCategory === ErrorCategory.USER_ERROR
					? 'bg-yellow-50 border-yellow-300'
					: 'bg-red-50 border-red-300',
			]}
		>
			<h3>{createErrorSummary(state.error).title}</h3>
			<p>{state.error.userMessage}</p>

			{state.error.retryable && (
				<button onClick$={handleRetry}>{getActionButtonText(state.error.suggestedAction)}</button>
			)}
		</div>
	);
}
```

## Configuration

### Retry Configuration

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
	backoffMultiplier: 2,
};
```

### Auto-Retry Criteria

- Only technical errors
- Maximum 2 automatic attempts
- 2-second delay between attempts

### Alternative Payment Threshold

- Show after 3 failed attempts
- Resets when payment method changes

## Testing Recommendations

1. **Error Category Testing**
   - Test each error category display
   - Verify color coding and icons
   - Check action button text

2. **Retry Logic Testing**
   - Simulate network failures
   - Verify exponential backoff delays
   - Test retry counter display
   - Confirm alternative payment suggestions

3. **Progressive Messaging**
   - Test first, second, and third attempt messages
   - Verify escalation logic

4. **Analytics Integration**
   - Verify error tracking calls
   - Check metadata accuracy

## Future Enhancements

1. **Payment Return Handler**
   - Handle errors from payment gateway callback
   - Display errors on confirmation page
   - Retry from confirmation page

2. **Localization**
   - Translate error messages
   - Locale-specific formatting

3. **Advanced Analytics**
   - Error funnel analysis
   - Success rate by error recovery
   - A/B testing on error messages

4. **Error Recovery Flows**
   - Partial refunds on errors
   - One-click retry from email
   - Save error context for support

## Integration with Backend

The frontend error handling is designed to work seamlessly with the backend's comprehensive error system documented in `ERROR_CODE_INTEGRATION.md`:

- Backend returns error codes in GraphQL extensions
- Frontend parses and categorizes these codes
- Both systems use the same error code constants
- Consistent error handling across stack

## Benefits

1. **Better User Experience**
   - Clear, actionable error messages
   - Automatic error recovery
   - Reduced support burden

2. **Higher Conversion Rates**
   - Users don't abandon on transient failures
   - Progressive guidance helps resolve issues
   - Alternative payment methods offered

3. **Better Monitoring**
   - Comprehensive error analytics
   - Identify problematic payment flows
   - Track error recovery success rates

4. **Developer-Friendly**
   - Type-safe error handling
   - Reusable utilities
   - Well-documented patterns

## Conclusion

This implementation brings sophisticated, production-ready error handling to the Juspay payment integration. It provides users with clear guidance, automatic error recovery, and progressive assistance, while giving developers comprehensive error tracking and monitoring capabilities.
