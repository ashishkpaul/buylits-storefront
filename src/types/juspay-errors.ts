/**
 * Juspay Error Types
 * Type definitions for comprehensive error handling in Juspay payment integration
 */

/**
 * Error categories matching backend implementation
 */
export enum ErrorCategory {
	USER_ERROR = 'USER_ERROR',
	BUSINESS_ERROR = 'BUSINESS_ERROR',
	TECHNICAL_ERROR = 'TECHNICAL_ERROR',
	USER_DROPPED = 'USER_DROPPED',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * User actions to resolve errors
 */
export enum ErrorAction {
	RETRY = 'RETRY',
	RE_ENTER_DETAILS = 'RE_ENTER_DETAILS',
	CONTACT_SUPPORT = 'CONTACT_SUPPORT',
	TRY_ANOTHER_METHOD = 'TRY_ANOTHER_METHOD',
	CHECK_BALANCE = 'CHECK_BALANCE',
	CONTACT_BANK = 'CONTACT_BANK',
	NONE = 'NONE',
}

/**
 * Structured error details from Juspay
 */
export interface JuspayErrorDetails {
	errorCode: string;
	errorCategory: ErrorCategory;
	errorMessage: string;
	userMessage: string;
	suggestedAction: ErrorAction;
	retryable: boolean;
	retryCount?: number;
	technicalDetails?: string;
	gatewayResponseCode?: string;
	gatewayResponseMessage?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
	maxAttempts: number;
	baseDelay: number; // milliseconds
	maxDelay: number; // milliseconds
	backoffMultiplier: number;
}

/**
 * Error analytics event
 */
export interface ErrorAnalytics {
	errorCode: string;
	errorCategory: ErrorCategory;
	orderId?: string;
	customerId?: string;
	paymentMethod?: string;
	timestamp: string;
	retryCount?: number;
	resolved?: boolean;
}

/**
 * Payment error response from GraphQL
 */
export interface PaymentErrorResponse {
	message: string;
	extensions?: {
		code?: string;
		juspayErrorCode?: string;
		juspayResponseCode?: string;
		juspayResponseMessage?: string;
		category?: string;
		[key: string]: any;
	};
}
