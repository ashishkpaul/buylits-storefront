import gql from 'graphql-tag';
import { shopSdk } from '~/graphql-wrapper';

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
		const result = await shopSdk.GetJuspayPaymentLink({ orderCode });
		return result.getJuspayPaymentLink;
	} catch (error) {
		console.error('Failed to get Juspay payment link:', error);
		throw error;
	}
};

export const getJuspayPaymentMethods = async (customerId?: string) => {
	try {
		const result = await shopSdk.GetJuspayPaymentMethods({
			customerId: customerId || undefined,
		});
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
		console.error('Failed to get payment methods:', error);
		return [];
	}
};

export const verifyVpa = async (vpa: string) => {
	try {
		const result = await shopSdk.VerifyVpa({ vpa });
		return result.verifyVpa;
	} catch (error) {
		console.error('Failed to verify VPA:', error);
		throw error;
	}
};

export const getJuspayStoredCards = async (customerId: string) => {
	try {
		const result = await shopSdk.GetJuspayStoredCards({ customerId });
		return result.getJuspayStoredCards || [];
	} catch (error) {
		console.error('Failed to get stored cards:', error);
		return [];
	}
};

export const deleteJuspayStoredCard = async (cardToken: string) => {
	try {
		const result = await shopSdk.DeleteJuspayStoredCard({ cardToken });
		return result.deleteJuspayStoredCard;
	} catch (error) {
		console.error('Failed to delete card:', error);
		throw error;
	}
};

export const updateJuspayCardNickname = async (cardToken: string, nickname: string) => {
	try {
		const result = await shopSdk.UpdateJuspayCardNickname({ cardToken, nickname });
		return result.updateJuspayCardNickname;
	} catch (error) {
		console.error('Failed to update card nickname:', error);
		throw error;
	}
};
