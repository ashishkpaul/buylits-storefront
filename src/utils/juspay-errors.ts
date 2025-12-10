/**
 * Juspay Error Utilities
 * Comprehensive error handling utilities for Juspay payment integration
 * Based on ERROR_CODE_INTEGRATION.md patterns
 */

import {
	ErrorAction,
	ErrorAnalytics,
	ErrorCategory,
	JuspayErrorDetails,
} from '~/types/juspay-errors';

/**
 * Error code mapping based on backend implementation
 * Maps Juspay error codes to categories and suggested actions
 */
const ERROR_CODE_MAP: Record<
	string,
	{
		category: ErrorCategory;
		action: ErrorAction;
		retryable: boolean;
		userMessage: string;
	}
> = {
	// User Input Errors
	INVALID_CARD_NUMBER: {
		category: ErrorCategory.USER_ERROR,
		action: ErrorAction.RE_ENTER_DETAILS,
		retryable: true,
		userMessage: 'The card number you entered is invalid. Please check and try again.',
	},
	INVALID_CVV: {
		category: ErrorCategory.USER_ERROR,
		action: ErrorAction.RE_ENTER_DETAILS,
		retryable: true,
		userMessage: 'The CVV is incorrect. Please enter the 3-digit code from the back of your card.',
	},
	CARD_EXPIRED: {
		category: ErrorCategory.USER_ERROR,
		action: ErrorAction.TRY_ANOTHER_METHOD,
		retryable: false,
		userMessage: 'This card has expired. Please use a different card.',
	},
	INVALID_EXPIRY_DATE: {
		category: ErrorCategory.USER_ERROR,
		action: ErrorAction.RE_ENTER_DETAILS,
		retryable: true,
		userMessage: 'The expiry date is invalid. Please check the date on your card.',
	},
	INVALID_VPA: {
		category: ErrorCategory.USER_ERROR,
		action: ErrorAction.RE_ENTER_DETAILS,
		retryable: true,
		userMessage: 'The UPI ID you entered is invalid. Please check and try again.',
	},

	// Business Logic Errors
	INSUFFICIENT_FUNDS: {
		category: ErrorCategory.BUSINESS_ERROR,
		action: ErrorAction.CHECK_BALANCE,
		retryable: false,
		userMessage: 'Your account has insufficient funds. Please use a different payment method.',
	},
	TRANSACTION_LIMIT_EXCEEDED: {
		category: ErrorCategory.BUSINESS_ERROR,
		action: ErrorAction.CONTACT_BANK,
		retryable: false,
		userMessage: 'Transaction limit exceeded. Please contact your bank or try a different card.',
	},
	CARD_NOT_SUPPORTED: {
		category: ErrorCategory.BUSINESS_ERROR,
		action: ErrorAction.TRY_ANOTHER_METHOD,
		retryable: false,
		userMessage: 'This card is not supported. Please try a different payment method.',
	},
	PAYMENT_METHOD_NOT_ENABLED: {
		category: ErrorCategory.BUSINESS_ERROR,
		action: ErrorAction.TRY_ANOTHER_METHOD,
		retryable: false,
		userMessage: 'This payment method is not available. Please select another option.',
	},
	BANK_DECLINED: {
		category: ErrorCategory.BUSINESS_ERROR,
		action: ErrorAction.CONTACT_BANK,
		retryable: false,
		userMessage: 'Your bank has declined this transaction. Please contact your bank for details.',
	},

	// Technical Errors
	GATEWAY_TIMEOUT: {
		category: ErrorCategory.TECHNICAL_ERROR,
		action: ErrorAction.RETRY,
		retryable: true,
		userMessage: 'The payment gateway timed out. Please try again.',
	},
	GATEWAY_ERROR: {
		category: ErrorCategory.TECHNICAL_ERROR,
		action: ErrorAction.RETRY,
		retryable: true,
		userMessage: 'A technical error occurred. Please try again.',
	},
	NETWORK_ERROR: {
		category: ErrorCategory.TECHNICAL_ERROR,
		action: ErrorAction.RETRY,
		retryable: true,
		userMessage: 'Network connection failed. Please check your internet and try again.',
	},
	SERVICE_UNAVAILABLE: {
		category: ErrorCategory.TECHNICAL_ERROR,
		action: ErrorAction.RETRY,
		retryable: true,
		userMessage: 'Payment service is temporarily unavailable. Please try again in a moment.',
	},

	// User Dropped Errors
	TRANSACTION_CANCELLED: {
		category: ErrorCategory.USER_DROPPED,
		action: ErrorAction.NONE,
		retryable: true,
		userMessage: 'You cancelled the payment. Click pay again to retry.',
	},
	SESSION_EXPIRED: {
		category: ErrorCategory.USER_DROPPED,
		action: ErrorAction.RETRY,
		retryable: true,
		userMessage: 'Your session expired. Please try again.',
	},

	// Validation Errors
	INVALID_ORDER: {
		category: ErrorCategory.VALIDATION_ERROR,
		action: ErrorAction.CONTACT_SUPPORT,
		retryable: false,
		userMessage: 'Order validation failed. Please contact support.',
	},
	INVALID_AMOUNT: {
		category: ErrorCategory.VALIDATION_ERROR,
		action: ErrorAction.CONTACT_SUPPORT,
		retryable: false,
		userMessage: 'Invalid payment amount. Please contact support.',
	},
};

/**
 * Parse Juspay error from various sources
 * Handles GraphQL errors, API errors, and exception objects
 */
export function parseJuspayError(error: any, retryCount: number = 0): JuspayErrorDetails {
	// Default error details
	const defaultError: JuspayErrorDetails = {
		errorCode: 'UNKNOWN_ERROR',
		errorCategory: ErrorCategory.UNKNOWN_ERROR,
		errorMessage: 'An unexpected error occurred',
		userMessage: 'Something went wrong. Please try again or contact support.',
		suggestedAction: ErrorAction.RETRY,
		retryable: true,
		retryCount,
	};

	try {
		// Check if it's a GraphQL error with extensions
		const extensions = error?.extensions || error?.graphQLErrors?.[0]?.extensions;

		if (extensions) {
			const errorCode = extensions.juspayErrorCode || extensions.code || 'UNKNOWN_ERROR';
			const errorMapping = ERROR_CODE_MAP[errorCode];

			if (errorMapping) {
				return {
					errorCode,
					errorCategory: errorMapping.category,
					errorMessage: error.message || extensions.message || errorMapping.userMessage,
					userMessage: errorMapping.userMessage,
					suggestedAction: errorMapping.action,
					retryable: errorMapping.retryable,
					retryCount,
					technicalDetails: JSON.stringify(extensions, null, 2),
					gatewayResponseCode: extensions.juspayResponseCode,
					gatewayResponseMessage: extensions.juspayResponseMessage,
				};
			}
		}

		// Check for network errors
		if (error?.networkError || error?.message?.includes('network')) {
			return {
				...defaultError,
				errorCode: 'NETWORK_ERROR',
				errorCategory: ErrorCategory.TECHNICAL_ERROR,
				errorMessage: 'Network error occurred',
				userMessage: 'Network connection failed. Please check your internet and try again.',
				suggestedAction: ErrorAction.RETRY,
				retryable: true,
			};
		}

		// Check for timeout errors
		if (error?.message?.toLowerCase().includes('timeout')) {
			return {
				...defaultError,
				errorCode: 'GATEWAY_TIMEOUT',
				errorCategory: ErrorCategory.TECHNICAL_ERROR,
				errorMessage: 'Request timed out',
				userMessage: 'The request timed out. Please try again.',
				suggestedAction: ErrorAction.RETRY,
				retryable: true,
			};
		}

		// Use error message if available
		if (error?.message) {
			return {
				...defaultError,
				errorMessage: error.message,
				userMessage: getUserFriendlyMessage(error.message),
			};
		}

		return defaultError;
	} catch (parseError) {
		console.error('Error parsing Juspay error:', parseError);
		return defaultError;
	}
}

/**
 * Convert technical error messages to user-friendly messages
 */
function getUserFriendlyMessage(technicalMessage: string): string {
	const lowerMessage = technicalMessage.toLowerCase();

	if (lowerMessage.includes('invalid') && lowerMessage.includes('card')) {
		return 'Please check your card details and try again.';
	}
	if (lowerMessage.includes('declined')) {
		return 'Your payment was declined. Please contact your bank or try a different card.';
	}
	if (lowerMessage.includes('insufficient')) {
		return 'Insufficient funds. Please use a different payment method.';
	}
	if (lowerMessage.includes('expired')) {
		return 'This card has expired. Please use a different card.';
	}
	if (lowerMessage.includes('timeout')) {
		return 'The request timed out. Please try again.';
	}
	if (lowerMessage.includes('network')) {
		return 'Network error. Please check your connection and try again.';
	}

	// Return original message if no pattern matches
	return technicalMessage;
}

/**
 * Get action button text based on suggested action
 */
export function getActionButtonText(action: ErrorAction): string {
	switch (action) {
		case ErrorAction.RETRY:
			return 'Try Again';
		case ErrorAction.RE_ENTER_DETAILS:
			return 'Re-enter Details';
		case ErrorAction.TRY_ANOTHER_METHOD:
			return 'Choose Another Payment Method';
		case ErrorAction.CHECK_BALANCE:
			return 'Choose Another Payment Method';
		case ErrorAction.CONTACT_BANK:
			return 'Contact Bank';
		case ErrorAction.CONTACT_SUPPORT:
			return 'Contact Support';
		default:
			return 'Continue';
	}
}

/**
 * Get progressive error message for repeated failures
 */
export function getProgressiveErrorMessage(
	errorDetails: JuspayErrorDetails,
	failureCount: number
): string {
	if (failureCount <= 1) {
		return errorDetails.userMessage;
	}

	if (failureCount === 2) {
		return `${errorDetails.userMessage} This is your second attempt.`;
	}

	if (failureCount >= 3) {
		if (errorDetails.errorCategory === ErrorCategory.TECHNICAL_ERROR) {
			return `We're experiencing technical difficulties. Please try a different payment method or contact support.`;
		}
		return `Multiple attempts failed. Please try a different payment method or contact support for assistance.`;
	}

	return errorDetails.userMessage;
}

/**
 * Determine if automatic retry should be attempted
 */
export function shouldAutoRetry(errorDetails: JuspayErrorDetails): boolean {
	return (
		errorDetails.retryable &&
		errorDetails.errorCategory === ErrorCategory.TECHNICAL_ERROR &&
		(errorDetails.retryCount || 0) < 2
	);
}

/**
 * Track error analytics
 */
export function trackErrorAnalytics(
	errorDetails: JuspayErrorDetails,
	context: {
		orderId?: string;
		customerId?: string;
		paymentMethod?: string;
	}
): void {
	const analyticsEvent: ErrorAnalytics = {
		errorCode: errorDetails.errorCode,
		errorCategory: errorDetails.errorCategory,
		orderId: context.orderId,
		customerId: context.customerId,
		paymentMethod: context.paymentMethod,
		timestamp: new Date().toISOString(),
		retryCount: errorDetails.retryCount,
		resolved: false,
	};

	// Send to analytics service (implement based on your analytics setup)
	console.log('Error Analytics:', analyticsEvent);

	// You can integrate with services like:
	// - Google Analytics
	// - Mixpanel
	// - Custom analytics endpoint
	// Example: window.gtag?.('event', 'payment_error', analyticsEvent);
}

/**
 * Create a user-friendly error summary for display
 */
export function createErrorSummary(errorDetails: JuspayErrorDetails): {
	title: string;
	message: string;
	actionText: string;
	severity: 'error' | 'warning' | 'info';
} {
	let severity: 'error' | 'warning' | 'info' = 'error';
	let title = 'Payment Failed';

	switch (errorDetails.errorCategory) {
		case ErrorCategory.USER_ERROR:
			title = 'Please Check Your Details';
			severity = 'warning';
			break;
		case ErrorCategory.BUSINESS_ERROR:
			title = 'Payment Not Authorized';
			severity = 'error';
			break;
		case ErrorCategory.TECHNICAL_ERROR:
			title = 'Technical Error';
			severity = 'warning';
			break;
		case ErrorCategory.USER_DROPPED:
			title = 'Payment Cancelled';
			severity = 'info';
			break;
		case ErrorCategory.VALIDATION_ERROR:
			title = 'Validation Error';
			severity = 'error';
			break;
		default:
			title = 'Payment Error';
			severity = 'error';
	}

	return {
		title,
		message: errorDetails.userMessage,
		actionText: getActionButtonText(errorDetails.suggestedAction),
		severity,
	};
}
