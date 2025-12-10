import gql from 'graphql-tag';
import { shopSdk } from '~/graphql-wrapper';
import { parseJuspayError, trackErrorAnalytics } from '~/utils/juspay-errors';
import { retryPaymentOperation } from '~/utils/retry-logic';

// GraphQL Query Definitions (for code generator)
gql`
	query GetJuspayPaymentLink($orderCode: String!) {
		getJuspayPaymentLink(orderCode: $orderCode)
	}
`;

gql`
	query GetJuspayPaymentMethods($customerId: String) {
		getJuspayPaymentMethods(customerId: $customerId)
	}
`;

gql`
	query VerifyVpa($vpa: String!) {
		verifyVpa(vpa: $vpa)
	}
`;

gql`
	query GetJuspayStoredCards($customerId: String!) {
		getJuspayStoredCards(customerId: $customerId) {
			token
			last4
			brand
			expiryMonth
			expiryYear
			nickname
		}
	}
`;

gql`
	mutation DeleteJuspayStoredCard($cardToken: String!) {
		deleteJuspayStoredCard(cardToken: $cardToken) {
			success
			message
		}
	}
`;

gql`
	mutation UpdateJuspayCardNickname($cardToken: String!, $nickname: String!) {
		updateJuspayCardNickname(cardToken: $cardToken, nickname: $nickname) {
			success
			message
			card {
				token
				nickname
			}
		}
	}
`;

// Provider functions using GraphQL SDK
export const getJuspayPaymentLink = async (orderCode: string) => {
	try {
		const result = await retryPaymentOperation(() => shopSdk.GetJuspayPaymentLink({ orderCode }));
		return result.getJuspayPaymentLink;
	} catch (error) {
		const errorDetails = parseJuspayError(error);
		trackErrorAnalytics(errorDetails, { orderId: orderCode });
		console.error('Failed to get Juspay payment link:', errorDetails);
		throw errorDetails;
	}
};

export const getJuspayPaymentMethods = async (customerId?: string) => {
	try {
		const result = await retryPaymentOperation(() =>
			shopSdk.GetJuspayPaymentMethods({
				customerId: customerId || undefined,
			})
		);
		const methods = result.getJuspayPaymentMethods;
		// Ensure we return payment_methods array, handle both direct array and nested structure
		if (Array.isArray(methods)) {
			return methods;
		}
		if (methods && Array.isArray(methods.payment_methods)) {
			return methods.payment_methods;
		}
		return [];
	} catch (error) {
		const errorDetails = parseJuspayError(error);
		trackErrorAnalytics(errorDetails, { customerId });
		console.error('Failed to get payment methods:', errorDetails);
		// Return empty array for non-critical errors to allow fallback
		return [];
	}
};

export const verifyVpa = async (vpa: string) => {
	try {
		const result = await retryPaymentOperation(() => shopSdk.VerifyVpa({ vpa }));
		return result.verifyVpa;
	} catch (error) {
		const errorDetails = parseJuspayError(error);
		trackErrorAnalytics(errorDetails, { paymentMethod: 'UPI' });
		console.error('Failed to verify VPA:', errorDetails);
		throw errorDetails;
	}
};

export const getJuspayStoredCards = async (customerId: string) => {
	try {
		const result = await retryPaymentOperation(() => shopSdk.GetJuspayStoredCards({ customerId }));
		return result.getJuspayStoredCards || [];
	} catch (error) {
		const errorDetails = parseJuspayError(error);
		trackErrorAnalytics(errorDetails, { customerId });
		console.error('Failed to get stored cards:', errorDetails);
		// Return empty array for non-critical errors
		return [];
	}
};

export const deleteJuspayStoredCard = async (cardToken: string) => {
	try {
		const result = await retryPaymentOperation(() => shopSdk.DeleteJuspayStoredCard({ cardToken }));
		return result.deleteJuspayStoredCard;
	} catch (error) {
		const errorDetails = parseJuspayError(error);
		trackErrorAnalytics(errorDetails, { paymentMethod: 'CARD' });
		console.error('Failed to delete card:', errorDetails);
		throw errorDetails;
	}
};

export const updateJuspayCardNickname = async (cardToken: string, nickname: string) => {
	try {
		const result = await retryPaymentOperation(() =>
			shopSdk.UpdateJuspayCardNickname({ cardToken, nickname })
		);
		return result.updateJuspayCardNickname;
	} catch (error) {
		const errorDetails = parseJuspayError(error);
		trackErrorAnalytics(errorDetails, { paymentMethod: 'CARD' });
		console.error('Failed to update card nickname:', errorDetails);
		throw errorDetails;
	}
};
