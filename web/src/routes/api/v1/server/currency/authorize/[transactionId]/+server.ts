import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import { createCurrency, getComputerByClientID, getCurrencyByTransactionId } from '$lib/server/airtable';


export const POST: RequestHandler = async ({ params, request }) => {
    const {
        clientId
    }: {
        clientId: string;
    } = await request.json();
    const transactionId = params.transactionId;

    // Ensure valid token
    const token = request.headers.get('Authorization');
    if (token !== `Bearer ${SERVER_TOKEN}`) {
        return json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get the transaction
    const transaction = await getCurrencyByTransactionId(transactionId)
    if (!transaction) {
        return json({ error: 'Transaction not found' }, { status: 404 });
    }

    // TODO: Fix typing

    if (!transaction['Needs Auth']) {
        return json({ error: 'Transaction does not need authentication' }, { status: 400 });
    }

    if (transaction['Processed']) {
        return json({ error: 'Transaction has already been processed' }, { status: 400 });
    }

    if (transaction['Authorized']) {
        return json({ error: 'Transaction has already been authorized' }, { status: 400 });
    }

    // Fetch the user's computer
    const computer = await getComputerByClientID(clientId);

    if (!computer) {
        return json({ error: 'Computer not found' }, { status: 404 });
    }

    if (transaction['Slack ID (from From)'] !== computer.fields["Slack ID (from Owner)"]) {
        return json({ error: 'Computer does not belong to the from user' }, { status: 403 });
    }

    // Update currency

    return json({ success: true });
};
