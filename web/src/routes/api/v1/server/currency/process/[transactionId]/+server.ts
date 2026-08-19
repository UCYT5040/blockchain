import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import { getComputerByClientID, getCurrencyByTransactionId } from '$lib/server/airtable';
import { processCurrency } from '$lib/server/currency';


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

    /* These conditions are already check by processCurrency
    if (transaction['Needs Auth'] && !transaction['Authorized']) {
        return json({ error: 'Transaction needs to be authorized before it can be processed' }, { status: 400 });
    }

    if (transaction['Processed']) {
        return json({ error: 'Transaction has already been processed' }, { status: 400 });
    }
    */

    // Fetch the user's computer
    const computer = await getComputerByClientID(clientId);

    if (!computer) {
        return json({ error: 'Computer not found' }, { status: 404 });
    }

    // TODO: Fix typing
    const txSlackIdTo = (transaction.fields['Slack ID (from To)'] as string[])?.[0];
    const computerSlackId = (computer.fields['Slack ID (from Owner)'] as string[])?.[0];

    if (txSlackIdTo !== computerSlackId) {
        return json({ error: 'Computer does not belong to the receiving user' }, { status: 403 });
    }

    // Process the transaction
    const result = await processCurrency({
        transactionId: transaction.fields['Transaction ID'] as string,
        note: transaction.fields['Note'] as string,
        fromId: (transaction.fields['From'] as string[])[0],
        toId: (transaction.fields['To'] as string[])[0],
        amount: transaction.fields['Amount'] as number,
        needsAuth: transaction.fields['Needs Auth'] as boolean,
        authorized: transaction.fields['Authorized'] as boolean,
        processed: transaction.fields['Processed'] as boolean
    });
    
    return json(result);
};
