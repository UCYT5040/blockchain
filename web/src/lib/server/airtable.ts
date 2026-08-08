import {
	AIRTABLE_API_KEY,
	AIRTABLE_BASE,
	AIRTABLE_TABLE_COMPUTERS,
	AIRTABLE_TABLE_USERS
} from '$env/static/private';
import Airtable from 'airtable';

const airtable = new Airtable({
	apiKey: AIRTABLE_API_KEY
});

const base = airtable.base(AIRTABLE_BASE);

export const users = base.table(AIRTABLE_TABLE_USERS);

export const computers = base.table(AIRTABLE_TABLE_COMPUTERS);

interface UserProfileSync {
	slackId: string;
	verificationStatus: string;
	yswsEligible: boolean;
	email: string;
	name: string;
}

export async function upsertUserToAirtable(data: UserProfileSync): Promise<void> {
	const existingUsers = await users
		.select({
			maxRecords: 1,
			filterByFormula: `{Slack ID} = "${data.slackId}"`
		})
		.firstPage();

	const airtableData = {
		'Slack ID': data.slackId,
		Email: data.email,
		Name: data.name,
		'Verification Status': data.verificationStatus,
		'YSWS Eligible': data.yswsEligible
	};

	if (existingUsers.length === 0) {
		await users.create(airtableData);
	} else {
		await users.update(existingUsers[0].id, airtableData);
	}
}
