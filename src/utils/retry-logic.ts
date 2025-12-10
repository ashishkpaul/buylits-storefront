/**
 * Smart Retry Logic
 * Exponential backoff retry wrapper for handling transient failures
 */

import { RetryConfig } from '~/types/juspay-errors';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
	backoffMultiplier: 2,
};

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(
	attempt: number,
	baseDelay: number,
	maxDelay: number,
	multiplier: number
): number {
	const delay = baseDelay * Math.pow(multiplier, attempt - 1);
	return Math.min(delay, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param config Retry configuration
 * @param shouldRetry Optional function to determine if error is retryable
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	config: Partial<RetryConfig> = {},
	shouldRetry?: (error: any, attempt: number) => boolean
): Promise<T> {
	const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
	let lastError: any;

	for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Check if we should retry this error
			const shouldRetryError = shouldRetry ? shouldRetry(error, attempt) : true;

			// Don't retry if we've exhausted attempts or error is not retryable
			if (attempt >= retryConfig.maxAttempts || !shouldRetryError) {
				throw error;
			}

			// Calculate backoff delay
			const delay = calculateBackoffDelay(
				attempt,
				retryConfig.baseDelay,
				retryConfig.maxDelay,
				retryConfig.backoffMultiplier
			);

			console.log(`Retry attempt ${attempt}/${retryConfig.maxAttempts} after ${delay}ms`);

			// Wait before retrying
			await sleep(delay);
		}
	}

	// Should never reach here, but TypeScript needs it
	throw lastError;
}

/**
 * Retry wrapper specifically for payment operations
 * Includes built-in logic for determining retryable errors
 */
export async function retryPaymentOperation<T>(
	fn: () => Promise<T>,
	config: Partial<RetryConfig> = {}
): Promise<T> {
	return retryWithBackoff(fn, config, (error) => {
		// Don't retry if error explicitly says not to
		if (error?.retryable === false) {
			return false;
		}

		// Retry technical errors
		if (error?.errorCategory === 'TECHNICAL_ERROR' || error?.category === 'TECHNICAL_ERROR') {
			return true;
		}

		// Retry network errors
		if (error?.networkError || error?.message?.includes('network')) {
			return true;
		}

		// Retry timeout errors
		if (error?.message?.toLowerCase().includes('timeout')) {
			return true;
		}

		// Retry 5xx errors
		if (error?.statusCode >= 500 && error?.statusCode < 600) {
			return true;
		}

		// Don't retry other errors
		return false;
	});
}

/**
 * Create a retryable version of a function
 * Useful for wrapping API calls
 */
export function makeRetryable<T extends any[], R>(
	fn: (...args: T) => Promise<R>,
	config: Partial<RetryConfig> = {}
): (...args: T) => Promise<R> {
	return async (...args: T): Promise<R> => {
		return retryPaymentOperation(() => fn(...args), config);
	};
}

/**
 * Retry state tracker for UI
 */
export class RetryTracker {
	private attempts: Map<string, number> = new Map();
	private lastAttemptTime: Map<string, number> = new Map();

	/**
	 * Record an attempt
	 */
	recordAttempt(operationId: string): number {
		const current = this.attempts.get(operationId) || 0;
		const newCount = current + 1;
		this.attempts.set(operationId, newCount);
		this.lastAttemptTime.set(operationId, Date.now());
		return newCount;
	}

	/**
	 * Get attempt count
	 */
	getAttemptCount(operationId: string): number {
		return this.attempts.get(operationId) || 0;
	}

	/**
	 * Check if should show alternative payment methods
	 */
	shouldShowAlternatives(operationId: string, threshold: number = 3): boolean {
		return this.getAttemptCount(operationId) >= threshold;
	}

	/**
	 * Reset attempts for an operation
	 */
	reset(operationId: string): void {
		this.attempts.delete(operationId);
		this.lastAttemptTime.delete(operationId);
	}

	/**
	 * Clear all attempts
	 */
	clear(): void {
		this.attempts.clear();
		this.lastAttemptTime.clear();
	}

	/**
	 * Check if enough time has passed since last attempt
	 */
	shouldAllowRetry(operationId: string, minDelayMs: number = 1000): boolean {
		const lastTime = this.lastAttemptTime.get(operationId);
		if (!lastTime) return true;
		return Date.now() - lastTime >= minDelayMs;
	}
}
