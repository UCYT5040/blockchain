import {
	AIRTABLE_API_KEY,
	AIRTABLE_BASE,
	AIRTABLE_TABLE_COMPUTERS,
	AIRTABLE_TABLE_USERS,
	AIRTABLE_TABLE_CURRENCY
} from '$env/static/private';
import Airtable from 'airtable';

const airtable = new Airtable({
	apiKey: AIRTABLE_API_KEY
});

const base = airtable.base(AIRTABLE_BASE);

export const users = base.table(AIRTABLE_TABLE_USERS);

export const computers = base.table(AIRTABLE_TABLE_COMPUTERS);

export const currency = base.table(AIRTABLE_TABLE_CURRENCY);

interface UserProfileSync {
	slackId: string;
	verificationStatus: string;
	yswsEligible: boolean;
	email: string;
	name: string;
}

interface UserAirtableData {
	id: string;
	[key: string]: unknown;
}

export async function getUserBySlackID(slackId: string): Promise<UserAirtableData | null> {
	const existingUsers = await users
		.select({
			maxRecords: 1,
			filterByFormula: `{Slack ID} = "${slackId}"`
		})
		.firstPage();
	if (existingUsers.length === 0) {
		return null;
	}
	return {
		...existingUsers[0].fields,
		id: existingUsers[0].id
	};
}

export async function upsertUser(data: UserProfileSync): Promise<void> {
	const existingUser = await getUserBySlackID(data.slackId);

	const airtableData = {
		'Slack ID': data.slackId,
		Email: data.email,
		Name: data.name,
		'Verification Status': data.verificationStatus,
		'YSWS Eligible': data.yswsEligible
	};

	if (existingUser) {
		await users.update(existingUser.id, airtableData);
	} else {
		await users.create(airtableData);
	}
}

export async function getComputerByClientID(clientId: string) {
	const computerResults = await computers
		.select({
			maxRecords: 1,
			filterByFormula: `{Client ID} = "${clientId}"`
		})
		.firstPage();
	if (computerResults.length === 0) {
		return null;
	}
	return computerResults[0];
}

/**
 * @param ownerSlackId Slack ID of the owner
 * @param clientId Client ID of the computer (must be unique, this function will not check for duplicates)
 * @param masterKey Master key of the computer
 */
export async function addComputer(
	ownerSlackId: string,
	clientId: string,
	masterKey: string
): Promise<void> {
	const owner = await getUserBySlackID(ownerSlackId);
	if (!owner) {
		throw new Error(`No user with Slack ID ${ownerSlackId} found`);
	}

	await computers.create({
		'Client ID': clientId,
		'Master Key': masterKey,
		Owner: [owner.id]
	});
}

export async function getComputersByOwnerSlackID(ownerSlackId: string) {
	const computerResults = await computers
		.select({
			filterByFormula: `{Slack ID (from Owner)} = "${ownerSlackId}"`
		})
		.all();
	return computerResults;
}

/**
 * @param id The Airtable record ID (not to be confused with the Client ID)
 */
export async function deleteComputerByID(id: string): Promise<void> {
	await computers.destroy(id);
}

export async function getCurrencyByUserSlackID(userSlackId: string) {
	const results = await currency
		.select({
			filterByFormula: `OR({Slack ID (from From)} = "${userSlackId}", {Slack ID (from To)} = "${userSlackId}")`
		})
		.all();
	return results;
}
