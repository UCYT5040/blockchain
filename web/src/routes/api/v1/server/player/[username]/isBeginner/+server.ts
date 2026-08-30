import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SERVER_TOKEN } from '$env/static/private';
import { getPlayerByUsername, upsertPlayerByUsername } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ params, request }) => {
	const username = params.username;

	// Ensure valid token
	const token = request.headers.get('Authorization');
	if (token !== `Bearer ${SERVER_TOKEN}`) {
		return json({ error: 'Invalid token' }, { status: 401 });
	}

	// Fetch player from Airtable
	const player = await getPlayerByUsername(username);
	if (player && player.fields['Got Beginner Gift']) {
		return json({ isBeginner: false });
	}

	await upsertPlayerByUsername(username, {
		'Got Beginner Gift': true
	});
	return json({ isBeginner: true });
};
