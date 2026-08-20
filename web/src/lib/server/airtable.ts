import {
	AIRTABLE_API_KEY,
	AIRTABLE_BASE,
	AIRTABLE_TABLE_COMPUTERS,
	AIRTABLE_TABLE_USERS,
	AIRTABLE_TABLE_CURRENCY
} from '$env/static/private';
import Airtable, { type FieldSet, type Record as AirtableRecord, type Records } from 'airtable';

const airtable = new Airtable({
	apiKey: AIRTABLE_API_KEY
});

const base = airtable.base(AIRTABLE_BASE);

export interface UserFields extends FieldSet {
	'Slack ID'?: string;
	Email?: string;
	Name?: string;
	'Verification Status'?: string;
	'YSWS Eligible'?: boolean;
	Currency?: number;
}

export interface ComputerFields extends FieldSet {
	'Client ID': string;
	'Master Key': string;
	Owner: string[];
	'Slack ID (from Owner)'?: string[];
}

export interface CurrencyRecordFields extends FieldSet {
	'Transaction ID': string;
	Note?: string;
	From: string[];
	To: string[];
	Amount: number;
	'Needs Auth'?: boolean;
	Authorized?: boolean;
	Processed?: boolean;
	'Slack ID (from From)'?: string[];
	'Slack ID (from To)'?: string[];
}

export type UserRecord = AirtableRecord<UserFields>;
export type ComputerRecord = AirtableRecord<ComputerFields>;
export type CurrencyRecord = AirtableRecord<CurrencyRecordFields>;

export interface UserData extends UserFields {
	id: string;
}

export const users = base.table<UserFields>(AIRTABLE_TABLE_USERS);
export const computers = base.table<ComputerFields>(AIRTABLE_TABLE_COMPUTERS);
export const currency = base.table<CurrencyRecordFields>(AIRTABLE_TABLE_CURRENCY);

interface UserProfileSync {
	slackId: string;
	verificationStatus: string;
	yswsEligible: boolean;
	email: string;
	name: string;
}

export async function getUserBySlackID(slackId: string): Promise<UserData | null> {
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

export async function getUserById(id: string): Promise<UserData | null> {
	try {
		const user = await users.find(id);
		return {
			...user.fields,
			id: user.id
		};
	} catch {
		return null;
	}
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

export async function updateUserBalanceById(userId: string, amount: number): Promise<void> {
	await users.update(userId, {
		Currency: amount
	});
}

export async function getComputerByClientID(clientId: string): Promise<ComputerRecord | null> {
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

export async function getComputersByOwnerSlackID(
	ownerSlackId: string
): Promise<Records<ComputerFields>> {
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

export async function getCurrencyByUserSlackID(
	userSlackId: string
): Promise<Records<CurrencyRecordFields>> {
	const results = await currency
		.select({
			filterByFormula: `OR({Slack ID (from From)} = "${userSlackId}", {Slack ID (from To)} = "${userSlackId}")`
		})
		.all();
	return results;
}

export interface Currency {
	transactionId: string;
	note: string;
	fromId: string; // Airtable User ID
	toId: string; // Airtable User ID
	amount: number;
	needsAuth: boolean;
	authorized: boolean;
	processed: boolean;
}

export async function createCurrency(currencyData: Currency): Promise<void> {
	await currency.create({
		'Transaction ID': currencyData.transactionId,
		Note: currencyData.note,
		From: [currencyData.fromId],
		To: [currencyData.toId],
		Amount: currencyData.amount,
		'Needs Auth': currencyData.needsAuth,
		Authorized: currencyData.authorized,
		Processed: currencyData.processed
	});
}

export async function getCurrencyByTransactionId(transactionId: string): Promise<CurrencyRecord | null> {
	const results = await currency
		.select({
			maxRecords: 1,
			filterByFormula: `{Transaction ID} = "${transactionId}"`
		})
		.firstPage();
	if (results.length === 0) {
		return null;
	}
	return results[0];
}

export async function upsertCurrencyByTransactionId(currencyData: Currency): Promise<void> {
	const existingCurrency = await getCurrencyByTransactionId(currencyData.transactionId);
	if (existingCurrency) {
		await currency.update(existingCurrency.id, {
			'Transaction ID': currencyData.transactionId,
			Note: currencyData.note,
			From: [currencyData.fromId],
			To: [currencyData.toId],
			Amount: currencyData.amount,
			'Needs Auth': currencyData.needsAuth,
			Authorized: currencyData.authorized,
			Processed: currencyData.processed
		});
	} else {
		await createCurrency(currencyData);
	}
}

export async function updateCurrencyByTransactionId(
	transactionId: string,
	fields: Partial<CurrencyRecordFields>
): Promise<void> {
	const currencyRecord = await getCurrencyByTransactionId(transactionId);
	if (!currencyRecord) {
		throw new Error(`Currency record with transaction ID ${transactionId} not found`);
	}

	await currency.update(currencyRecord.id, fields);
}
