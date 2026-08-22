import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import { createCurrency, getComputerByClientID } from '$lib/server/airtable';
import { customAlphabet } from 'nanoid';
import { processCurrency, type NewCurrencyRequest } from '$lib/server/currency';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

const generateTransactionId = customAlphabet(alphabet, 10);

export const POST: RequestHandler = async ({ request }) => {
	const { fromClientId, toClientId, amount, createdBy, note }: NewCurrencyRequest =
		await request.json();

	// Ensure valid token
	const token = request.headers.get('Authorization');
	if (token !== `Bearer ${SERVER_TOKEN}`) {
		return json({ error: 'Invalid token' }, { status: 401 });
	}

	// TODO: Perform async operations in parallel

	// Obtain Airtable user IDs based on the client IDs
	const fromComputer = await getComputerByClientID(fromClientId);
	const toComputer = await getComputerByClientID(toClientId);

	if (!fromComputer || !toComputer) {
		return json({ error: 'Computers not found' }, { status: 404 });
	}

	// These are Airtable user IDs (not Slack IDs)
	// TODO: Should we be getting the first item from a list here?
	const fromOwner = fromComputer.fields.Owner[0];
	const toOwner = toComputer.fields.Owner[0];

	// Ensure computers belong to different owners
	if (fromOwner === toOwner) {
		return json({ error: 'Computers must belong to different owners' }, { status: 403 });
	}

	// Determine whether this transaction is authorized
	const isAuthorized = fromClientId === createdBy;

	if (isAuthorized) {
		const result = await processCurrency({
			transactionId: generateTransactionId(),
			note,
			fromId: fromOwner,
			toId: toOwner,
			amount,
			needsAuth: false,
			authorized: true,
			processed: false
		});
		return json(result);
	} else {
		await createCurrency({
			transactionId: generateTransactionId(),
			note,
			fromId: fromOwner,
			toId: toOwner,
			amount,
			needsAuth: true,
			authorized: false,
			processed: false
		});
	}

	return json({ success: true });
};
