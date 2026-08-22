import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import {
	getComputerByClientID,
	getCurrencyByTransactionId,
	updateCurrencyByTransactionId
} from '$lib/server/airtable';
import type { AuthorizeCurrencyRequest } from '$lib/server/currency';

export const POST: RequestHandler = async ({ params, request }) => {
	const { clientId }: AuthorizeCurrencyRequest = await request.json();
	const transactionId = params.transactionId;

	// Ensure valid token
	const token = request.headers.get('Authorization');
	if (token !== `Bearer ${SERVER_TOKEN}`) {
		return json({ error: 'Invalid token' }, { status: 401 });
	}

	// Get the transaction
	const transaction = await getCurrencyByTransactionId(transactionId);
	if (!transaction) {
		return json({ error: 'Transaction not found' }, { status: 404 });
	}

	// Validate transaction state
	if (!transaction.fields['Needs Auth']) {
		return json({ error: 'Transaction does not need authentication' }, { status: 400 });
	}

	if (transaction.fields['Processed']) {
		return json({ error: 'Transaction has already been processed' }, { status: 400 });
	}

	if (transaction.fields['Authorized']) {
		return json({ error: 'Transaction has already been authorized' }, { status: 400 });
	}

	// Fetch the user's computer
	const computer = await getComputerByClientID(clientId);

	if (!computer) {
		return json({ error: 'Computer not found' }, { status: 404 });
	}

	const txSlackIdFrom = transaction.fields['Slack ID (from From)']?.[0];
	const computerSlackId = computer.fields['Slack ID (from Owner)']?.[0];

	if (!txSlackIdFrom || txSlackIdFrom !== computerSlackId) {
		return json({ error: 'Computer does not belong to the from user' }, { status: 403 });
	}

	// Update currency
	await updateCurrencyByTransactionId(transactionId, {
		Authorized: true
	});

	return json({ success: true });
};
