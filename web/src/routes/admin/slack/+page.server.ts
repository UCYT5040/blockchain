import { getChannelMembers, sendRSVPReminderDM, type SlackMember } from '$lib/server/slack';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserBySlackID } from '$lib/server/airtable';

/**
 *
 * @param slackIds
 * @returns True means DMs are OK, false means they are not
 */
async function getSlackDMPreference(slackIds: string[]): Promise<Record<string, boolean>> {
	const dmPreferences: Record<string, boolean> = {};
	for (const slackId of slackIds) {
		const user = getUserBySlackID(slackId);

		dmPreferences[slackId] = !((await user)?.['Slack RSVP Opt Out'] ?? false);
	}

	return dmPreferences;
}

export const load: PageServerLoad = async () => {
	const channelMembers: SlackMember[] = await getChannelMembers();
	const dmPreferences = getSlackDMPreference(channelMembers.map((member) => member.id));

	return {
		channelMembers,
		dmPreferences // Promise on purpose, so that the page can load while this is being fetched
	};
};

function decodeHTML(html: string): string {
	return html
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'")
		.replaceAll('&#x27;', "'");
}

export const actions = {
	rsvp: async ({ request }) => {
		const formData = await request.formData();

		const rawCookie = (formData.get('cookie') as string | null)?.trim();

		if (!rawCookie) {
			return fail(400, { error: 'Missing cookie' });
		}

		const sessionToken = rawCookie.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];

		const result = await fetch('https://rsvp.soon.it/blockchain/manage', {
			headers: {
				Cookie: `session=${sessionToken}`
			},
			redirect: 'manual'
		});

		if (result.status === 302 || result.status === 401 || result.status === 403) {
			return fail(400, { error: 'Invalid cookie' });
		}

		if (!result.ok) {
			return fail(500, { error: 'Failed to fetch RSVP data' });
		}

		const html = await result.text();
		const rsvpNames = [
			...html
				.matchAll(/<span class="flex-1 text-sm font-medium truncate">([^<]+)<\/span>/g)
				.map((match) => decodeHTML(match[1]))
		];

		return { rsvpNames };
	},
	sendDMs: async ({ request }) => {
		const formData = await request.formData();
		const sendDMs = formData.getAll('sendDMs') as string[];

		for (const slackId of sendDMs) {
			await sendRSVPReminderDM(slackId);
		}
	}
} satisfies Actions;
