import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUserBySlackID } from '$lib/server/airtable';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const userData = await getUserBySlackID(locals.user.slackId!);

	if (!userData || !userData['Is Admin']) {
		throw redirect(302, '/');
	}
};
