import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { messagesOfTheDay } from '$lib/motd';

export const GET: RequestHandler = ({ params, url }) => {
	const motdData = messagesOfTheDay[params.message as keyof typeof messagesOfTheDay];

	const isCC = url.searchParams.get('format') === 'cc';

	if (isCC) {
		const rawText = JSON.stringify(motdData);

		const bytes = new Uint8Array(rawText.length);
		for (let i = 0; i < rawText.length; i++) {
			bytes[i] = rawText.charCodeAt(i) & 0xff;
		}

		return new Response(bytes, {
			headers: {
				'Content-Type': 'application/json; charset=iso-8859-1'
			}
		});
	} else {
		return json(motdData);
	}
};
