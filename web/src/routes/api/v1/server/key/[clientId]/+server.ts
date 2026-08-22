import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import { getComputerByClientID } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ params, request }) => {
	const clientId = params.clientId;

	// Ensure valid token
	const token = request.headers.get('Authorization');
	if (token !== `Bearer ${SERVER_TOKEN}`) {
		return json({ error: 'Invalid token' }, { status: 401 });
	}

	// Fetch computer from Airtable
	const computer = await getComputerByClientID(clientId);
	if (!computer) {
		return json({ error: 'Computer not found' }, { status: 404 });
	}

	const masterKey = computer.fields['Master Key'];
	if (!masterKey) {
		return json({ error: 'Master key not found' }, { status: 404 });
	}

	// Return key
	return json({ masterKey });
};

