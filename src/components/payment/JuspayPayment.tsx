import { $, component$, useSignal, useStore, useVisibleTask$ } from '@qwik.dev/core';
import {
	getJuspayPaymentLink,
	getJuspayPaymentMethods,
	getJuspayStoredCards,
	verifyVpa,
} from '~/providers/shop/payments/juspay';

interface PaymentMethod {
	payment_method_type: string;
	enabled: boolean;
	[key: string]: any;
}

interface StoredCard {
	token: string;
	last4?: string | null;
	brand?: string | null;
	expiryMonth?: string | null;
	expiryYear?: string | null;
	nickname?: string | null;
}

interface JuspayPaymentProps {
	orderCode: string;
	amount: number;
	customerId?: string;
}

export default component$<JuspayPaymentProps>(
	({ orderCode, amount, customerId }: JuspayPaymentProps) => {
		const state = useStore({
			selectedMethod: '',
			selectedCard: null as StoredCard | null,
			upiId: '',
			upiVerified: false,
			isProcessing: false,
			error: '',
			showSavedCards: false,
		});

		const paymentMethods = useSignal<PaymentMethod[]>([]);
		const savedCards = useSignal<StoredCard[]>([]);
		const isLoadingMethods = useSignal(true);
		const isVerifyingVpa = useSignal(false);

		// Load payment methods and saved cards
		useVisibleTask$(async () => {
			try {
				const methods = await getJuspayPaymentMethods(customerId);
				if (methods?.payment_methods) {
					paymentMethods.value = methods.payment_methods.filter((m: PaymentMethod) => m.enabled);
				}

				if (customerId) {
					const cards = await getJuspayStoredCards(customerId);
					if (cards && cards.length > 0) {
						savedCards.value = cards;
						state.showSavedCards = true;
					}
				}
			} catch (error) {
				console.error('Failed to load payment methods:', error);
				state.error = 'Failed to load payment methods. Please try again.';
			} finally {
				isLoadingMethods.value = false;
			}
		});

		const handleVpaVerification = $(async () => {
			if (!state.upiId || !state.upiId.includes('@')) {
				state.error = 'Please enter a valid UPI ID (format: username@bank)';
				return;
			}

			isVerifyingVpa.value = true;
			state.error = '';

			try {
				const result = await verifyVpa(state.upiId);

				if (result?.status === 'VALID') {
					state.upiVerified = true;
					state.error = '';
				} else {
					state.upiVerified = false;
					state.error = 'Invalid UPI ID. Please check and try again.';
				}
			} catch (error) {
				console.error('VPA verification error:', error);
				state.error = 'Failed to verify UPI ID. Please try again.';
				state.upiVerified = false;
			} finally {
				isVerifyingVpa.value = false;
			}
		});

		const handlePayment = $(async () => {
			state.isProcessing = true;
			state.error = '';

			try {
				// Validation
				if (!state.selectedMethod) {
					throw new Error('Please select a payment method');
				}

				if (state.selectedMethod === 'UPI' && !state.upiVerified) {
					throw new Error('Please verify your UPI ID');
				}

				// Get payment link
				const paymentLink = await getJuspayPaymentLink(orderCode);

				if (!paymentLink) {
					throw new Error('Failed to create payment link');
				}

				// Store context for return handler
				if (typeof window !== 'undefined') {
					sessionStorage.setItem('juspay_order_code', orderCode);
					sessionStorage.setItem('juspay_amount', amount.toString());
					if (state.selectedMethod === 'UPI') {
						sessionStorage.setItem('juspay_payment_method', 'UPI');
						sessionStorage.setItem('juspay_vpa', state.upiId);
					}
				}

				// Redirect to Juspay payment page
				window.location.href = paymentLink;
			} catch (error: any) {
				console.error('Payment initiation error:', error);
				state.error = error.message || 'Failed to initiate payment. Please try again.';
				state.isProcessing = false;
			}
		});

		const selectMethod = $((methodType: string) => {
			state.selectedMethod = methodType;
			state.selectedCard = null;
			state.upiId = '';
			state.upiVerified = false;
			state.error = '';
		});

		const selectCard = $((card: StoredCard) => {
			state.selectedCard = card;
			state.selectedMethod = 'CARD';
			state.error = '';
		});

		// Loading state
		if (isLoadingMethods.value) {
			return (
				<div class="flex items-center justify-center p-8">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
					<span class="ml-3 text-gray-600">Loading payment methods...</span>
				</div>
			);
		}

		// Main component
		return (
			<div class="juspay-payment-container max-w-2xl mx-auto space-y-6">
				<h2 class="text-2xl font-bold text-gray-900">Complete Your Payment</h2>

				{/* Error Alert */}
				{state.error && (
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<p class="text-red-800 text-sm font-medium">{state.error}</p>
					</div>
				)}

				{/* Saved Cards Section */}
				{state.showSavedCards && savedCards.value.length > 0 && (
					<div class="saved-cards-section border-b pb-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">Saved Cards</h3>
						<div class="grid gap-3">
							{savedCards.value.map((card: StoredCard) => (
								<button
									key={card.token}
									onClick$={() => selectCard(card)}
									class={[
										'flex items-center justify-between p-4 border-2 rounded-lg transition-all text-left',
										state.selectedCard?.token === card.token
											? 'border-primary-600 bg-primary-50 shadow-md'
											: 'border-gray-200 hover:border-gray-300',
									]}
								>
									<div class="flex items-center space-x-4">
										<div class="flex items-center justify-center w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded text-white font-bold text-sm">
											{card.brand?.slice(0, 2)}
										</div>
										<div>
											<div class="font-medium text-gray-900">
												{card.brand} •••• {card.last4}
											</div>
											{card.nickname && <div class="text-sm text-gray-500">{card.nickname}</div>}
										</div>
									</div>
									{state.selectedCard?.token === card.token && (
										<div class="flex items-center justify-center w-5 h-5 bg-primary-600 rounded-full">
											<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
												<path
													fill-rule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clip-rule="evenodd"
												/>
											</svg>
										</div>
									)}
								</button>
							))}
						</div>
					</div>
				)}

				{/* Payment Methods Grid */}
				{(!state.showSavedCards || savedCards.value.length === 0) && (
					<div class="payment-methods-grid">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">Payment Methods</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
							{paymentMethods.value.map((method: PaymentMethod) => (
								<button
									key={method.payment_method_type}
									onClick$={() => selectMethod(method.payment_method_type)}
									class={[
										'flex flex-col items-center justify-center p-6 border-2 rounded-lg transition-all',
										state.selectedMethod === method.payment_method_type
											? 'border-primary-600 bg-primary-50 shadow-md'
											: 'border-gray-200 hover:border-gray-300 hover:shadow',
									]}
								>
									<div class="text-2xl mb-2">
										{method.payment_method_type === 'CARD' && '💳'}
										{method.payment_method_type === 'UPI' && '📱'}
										{method.payment_method_type === 'NETBANKING' && '🏦'}
										{method.payment_method_type === 'WALLET' && '👛'}
									</div>
									<h4 class="font-medium text-gray-900 text-center text-sm">
										{method.payment_method_type}
									</h4>
								</button>
							))}
						</div>
					</div>
				)}

				{/* UPI Input */}
				{state.selectedMethod === 'UPI' && (
					<div class="upi-section bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
						<label class="block text-sm font-medium text-gray-700">Enter UPI ID</label>
						<div class="relative">
							<input
								type="text"
								placeholder="yourname@bankname"
								value={state.upiId}
								onInput$={(e) => {
									state.upiId = (e.target as HTMLInputElement).value;
									state.upiVerified = false;
								}}
								onBlur$={handleVpaVerification}
								class={[
									'w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition',
									state.upiVerified
										? 'border-green-500 focus:ring-green-500 bg-green-50'
										: 'border-gray-300 focus:ring-primary-500',
								]}
							/>
							{isVerifyingVpa.value && (
								<div class="absolute right-3 top-3">
									<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
								</div>
							)}
						</div>
						{state.upiVerified && (
							<p class="text-sm text-green-600 flex items-center gap-2">
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
								UPI ID verified successfully
							</p>
						)}
					</div>
				)}

				{/* Amount Summary */}
				<div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 flex justify-between items-center border border-gray-200">
					<div>
						<p class="text-gray-600 text-sm">Total Amount</p>
						<p class="text-sm text-gray-500">Including all taxes</p>
					</div>
					<div class="text-3xl font-bold text-gray-900">₹{(amount / 100).toFixed(2)}</div>
				</div>

				{/* Pay Button */}
				<button
					onClick$={handlePayment}
					disabled={
						state.isProcessing ||
						!state.selectedMethod ||
						(state.selectedMethod === 'UPI' && !state.upiVerified)
					}
					class={[
						'w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all',
						state.isProcessing ||
						!state.selectedMethod ||
						(state.selectedMethod === 'UPI' && !state.upiVerified)
							? 'bg-gray-300 text-gray-500 cursor-not-allowed'
							: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl',
					]}
				>
					{state.isProcessing ? (
						<span class="flex items-center justify-center gap-2">
							<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
							Processing...
						</span>
					) : (
						`Pay ₹${(amount / 100).toFixed(2)}`
					)}
				</button>

				{/* Security Badge */}
				<div class="flex items-center justify-center gap-2 text-sm text-gray-500">
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>Secured by Juspay • 256-bit SSL Encryption</span>
				</div>
			</div>
		);
	}
);
