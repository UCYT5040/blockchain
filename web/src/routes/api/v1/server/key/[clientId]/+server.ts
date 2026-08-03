import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import { demoMasterKeyCache } from '$lib/demoCache';

export const GET: RequestHandler = ({ params, request }) => {
    const clientId = params.clientId;

    // Ensure valid token
    const token = request.headers.get('Authorization');
    if (token !== `Bearer ${SERVER_TOKEN}`) {
        return json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check cache for key
    const key = demoMasterKeyCache[clientId];

    if (!key) {
        return json({ error: 'Not found' }, { status: 404 });
    }

    // Return key
    return json({ masterKey: key });
};