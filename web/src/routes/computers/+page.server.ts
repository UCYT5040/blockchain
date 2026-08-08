import {
	getComputerByClientID,
	addComputer,
	getComputersByOwnerSlackID,
	deleteComputerByID
} from '$lib/server/airtable';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { randomBytes } from 'crypto';

import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

const generateClientId = customAlphabet(alphabet, 10);

function generateMasterKey() {
	return randomBytes(16).toString('hex');
}

async function tryGenerateClientID(): Promise<string> {
	let clientId = generateClientId();
	while (await getComputerByClientID(clientId)) {
		clientId = generateClientId();
	}
	return clientId;
}

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.user.slackId) {
		return fail(401, 'Unauthorized');
	}

	const computers = await getComputersByOwnerSlackID(event.locals.user.slackId);

	const showMasterKeys = event.url.searchParams.get('showMasterKeys') === 'true';

	return {
		computers: computers.map((computer) => ({
			id: computer.id,
			clientId: computer.fields['Client ID'],
			masterKey: showMasterKeys ? computer.fields['Master Key'] : '(hidden)'
		})),
		showMasterKeys
	};
};

export const actions = {
	registerComputer: async (event) => {
		const clientId = await tryGenerateClientID();
		const masterKey = generateMasterKey();

		if (!event.locals.user || !event.locals.user.slackId) {
			return fail(401, 'Unauthorized');
		}

		await addComputer(event.locals.user.slackId, clientId, masterKey);

		return {
			success: true,
			action: 'registerComputer',
			computer: { clientId, masterKey }
		};
	},
	deleteComputer: async ({ request }) => {
		const data = await request.formData();
		const computerId = data.get('computerId') as string;
		if (!computerId) {
			return {
				success: false,
				error: 'Computer ID is required'
			};
		}
		await deleteComputerByID(computerId);
		return {
			success: true,
			action: 'deleteComputer'
		};
	}
} satisfies Actions;
