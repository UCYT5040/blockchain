import { getCurrencyByUserSlackID, getUserBySlackID } from '$lib/server/airtable';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.user.slackId) {
		return error(401, 'Unauthorized');
	}

	const user = await getUserBySlackID(event.locals.user.slackId);
	if (!user) {
		return error(401, 'Unauthorized');
	}

	const transactions = await getCurrencyByUserSlackID(event.locals.user.slackId);

	return {
		balance: user.Currency ?? 0,
		transactions: transactions.map((transaction) => transaction.fields)
	};
};
