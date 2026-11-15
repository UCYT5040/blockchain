import { WebClient } from '@slack/web-api';

import { SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, SLACK_SIGNING_SECRET } from '$env/static/private';
import { createHmac, timingSafeEqual } from 'node:crypto';

const slack = new WebClient(SLACK_BOT_TOKEN);

export interface SlackMember {
	id: string;
	displayName: string;
}

const MEMBER_BATCH_SIZE = 100;

export async function getChannelMembers() {
	const memberIds: string[] = [];

	for await (const page of slack.paginate('conversations.members', {
		channel: SLACK_CHANNEL_ID,
		limit: 1000
	})) {
		if ('members' in page) memberIds.push(...(page.members as string[]));
	}

	const members: SlackMember[] = [];

	for (let i = 0; i < memberIds.length; i += MEMBER_BATCH_SIZE) {
		const batchIds = memberIds.slice(i, i + MEMBER_BATCH_SIZE);
		const results = await Promise.all(
			batchIds.map((user) => slack.users.info({ user }).catch(() => null))
		);

		for (const result of results) {
			if (result && result.user) {
				if (
					result.user.is_bot ||
					result.user.deleted ||
					result.user.is_app_user ||
					result.user.id === 'USLACKBOT'
				) {
					continue; // Skip bots and deleted users
				}
				members.push({
					id: result.user.id!,
					displayName: result.user.profile?.display_name || result.user.real_name || ''
				});
			}
		}
	}

	return members;
}

export async function sendRSVPReminderDM(slackId: string) {
	const dm = await slack.conversations.open({ users: slackId });
	const channelId = dm.channel?.id;

	if (!channelId) {
		throw new Error(`Could not open DM with Slack ID: ${slackId}`);
	}

	await slack.chat.postMessage({
		channel: channelId,
		text: 'RSVP for BlockChain', // This should only be seen in notifications
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `:computercraft: Hi, sorry to bother you!

It looks like you joined <#${SLACK_CHANNEL_ID}>, but haven't <https://rsvp.soon.it/blockchain|RSVPed> yet.

If you are interested in joining, please RSVP! If not, feel free to ignore this message.`
				}
			},
			{
				type: 'actions',
				elements: [
					{
						type: 'button',
						text: { type: 'plain_text', text: 'Opt out of reminders' },
						style: 'danger',
						action_id: 'rsvp_opt_out',
						value: slackId
					}
				]
			}
		]
	});

	return true;
}

export function verifySlackSignature(
	rawBody: string,
	timestamp: string | null,
	signature: string | null
): boolean {
	if (!timestamp || !signature) {
		return false;
	}

	const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
	if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) {
		return false; // Request is too old or timestamp is invalid
	}

	const baseString = `v0:${timestamp}:${rawBody}`;
	const expected = `v0=${createHmac('sha256', SLACK_SIGNING_SECRET).update(baseString).digest('hex')}`;

	const a = Buffer.from(expected, 'utf8');
	const b = Buffer.from(signature, 'utf8');

	if (a.length !== b.length) {
		return false;
	}

	if (!timingSafeEqual(a, b)) {
		return false;
	}

	return true;
}
