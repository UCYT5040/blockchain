import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import { getComputerByClientID, getCurrencyByUserSlackID, getUserById } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ params, request }) => {
    const clientId = params.clientId;

    // Ensure valid token
    const token = request.headers.get('Authorization');
    if (token !== `Bearer ${SERVER_TOKEN}`) {
        return json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user from computer from client ID
    const computer = await getComputerByClientID(clientId);
    if (!computer) {
        return json({ error: 'Computer not found' }, { status: 404 });
    }

    const user = await getUserById(computer.fields.Owner[0]);
    if (!user) {
        return json({ error: 'User not found' }, { status: 404 });
    }

    // List transactions
    const transactions = user['Slack ID'] ? await getCurrencyByUserSlackID(user['Slack ID']) : [];
    return json({
        balance: user.Currency ?? 0,
        transactions: transactions.map((transaction) => transaction.fields)
    });
};
