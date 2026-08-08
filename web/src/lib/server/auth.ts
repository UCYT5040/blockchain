import { getRequestEvent } from '$app/server';
import { HACKCLUB_AUTH_CLIENT_ID, HACKCLUB_AUTH_CLIENT_SECRET } from '$env/static/private';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { genericOAuth } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { upsertUserToAirtable } from './airtable';

export const auth = betterAuth({
	baseURL: 'http://localhost:5173', // TODO: Update or use env var or perhaps some Vite utility?
	user: {
		additionalFields: {
			slackId: {
				type: 'string',
				required: false
			},
			verificationStatus: {
				type: 'string',
				required: false
			},
			yswsEligible: {
				type: 'boolean',
				required: false
			}
		}
	},
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			if (ctx.path.startsWith('/oauth2/callback/')) {
				const user = ctx.context.newSession?.user;

				await upsertUserToAirtable({
					slackId: user!.slackId as string,
					email: user!.email as string,
					name: user!.name as string,
					verificationStatus: user!.verificationStatus as string,
					yswsEligible: user!.yswsEligible as boolean
				});
			}
		})
	},
	plugins: [
		genericOAuth({
			config: [
				{
					providerId: 'hackclub',
					discoveryUrl: 'https://auth.hackclub.com/.well-known/openid-configuration',
					clientId: HACKCLUB_AUTH_CLIENT_ID,
					clientSecret: HACKCLUB_AUTH_CLIENT_SECRET,
					scopes: ['openid', 'profile', 'email', 'verification_status', 'slack_id'],

					mapProfileToUser: async (profile) => {
						return {
							slackId: profile.slack_id,
							verificationStatus: profile.verification_status,
							yswsEligible: profile.ysws_eligible
						} as unknown as Record<string, unknown>;
					}
				}
			]
		}),
		sveltekitCookies(getRequestEvent)
	]
});
