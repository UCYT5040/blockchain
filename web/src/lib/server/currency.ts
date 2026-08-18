import {
	getUserById,
	updateUserBalanceById,
	upsertCurrencyByTransactionId,
	type Currency
} from './airtable';

export type ProcessCurrencyResult =
	| {
			success: true;
	  }
	| {
			success: false;
			error: string;
	  };

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

	// TODO: Fix typing
	if (fromUser['Currency'] < currency.amount) {
		return { success: false, error: 'From user does not have enough currency' };
	}

	const toUser = await getUserById(currency.toId);
	if (!toUser) {
		return { success: false, error: 'To user not found' };
	}

	// Perform the transaction
	// TODO: Fix typing
	await updateUserBalanceById(currency.fromId, fromUser['Currency'] - currency.amount);
	await updateUserBalanceById(currency.toId, toUser['Currency'] + currency.amount);

	// Upsert currency
	await upsertCurrencyByTransactionId({
		...currency,
		processed: true
	});

	return { success: true };
}
