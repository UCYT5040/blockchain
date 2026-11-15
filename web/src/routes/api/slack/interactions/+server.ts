import { setUsersRSVPOptOut } from '$lib/server/airtable';
import { verifySlackSignature } from '$lib/server/slack';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();
	const timestamp = request.headers.get('x-slack-request-timestamp');
	const signature = request.headers.get('x-slack-signature');

	if (!verifySlackSignature(rawBody, timestamp, signature)) {
		return new Response('Invalid signature', { status: 401 });
	}

	const payloadRaw = new URLSearchParams(rawBody).get('payload');
	if (!payloadRaw) {
		return new Response('Missing payload', { status: 400 });
	}

	const payload = JSON.parse(payloadRaw);
	const action = payload.actions?.[0];

	if (payload.type === 'block_actions' && action?.action_id === 'rsvp_opt_out') {
		const slackId = action.value;

		if (slackId) {
			await setUsersRSVPOptOut(slackId);
		}

		if (payload.response_url) {
			await fetch(payload.response_url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					replace_original: true,
					text: 'You have opted out of RSVP reminders.'
				})
			});
		}
	}

	return new Response(null, { status: 200 });
};
