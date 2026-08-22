import { getUserById, updateUserBalanceById, upsertCurrencyByTransactionId } from './airtable';
export type {
	Currency,
	CurrencyRecordFields,
	CurrencyListResponse,
	NewCurrencyRequest,
	AuthorizeCurrencyRequest,
	ProcessCurrencyRequest,
	ProcessCurrencyResult,
	CurrencySuccessResponse,
	CurrencyErrorResponse,
	CurrencyActionResult
} from '../../../../common/currency';
import type { Currency, ProcessCurrencyResult } from '../../../../common/currency';

export async function processCurrency(currency: Currency): Promise<ProcessCurrencyResult> {
	// Require authentication
	if (currency.needsAuth && !currency.authorized) {
		return { success: false, error: 'Transaction needs authentication' };
	}

	// Ensure transaction wasn't already processed
	if (currency.processed) {
		return { success: false, error: 'Transaction was already processed' };
	}

	// Ensure from user has enough currency
	const fromUser = await getUserById(currency.fromId);
	if (!fromUser) {
		return { success: false, error: 'From user not found' };
	}

	const fromBalance = fromUser.Currency ?? 0;
	if (fromBalance < currency.amount) {
		return { success: false, error: 'From user does not have enough currency' };
	}

	const toUser = await getUserById(currency.toId);
	if (!toUser) {
		return { success: false, error: 'To user not found' };
	}
	const toBalance = toUser.Currency ?? 0;

	// Perform the transaction
	await updateUserBalanceById(currency.fromId, fromBalance - currency.amount);
	await updateUserBalanceById(currency.toId, toBalance + currency.amount);

	// Upsert currency
	await upsertCurrencyByTransactionId({
		...currency,
		processed: true
	});

	return { success: true };
}
