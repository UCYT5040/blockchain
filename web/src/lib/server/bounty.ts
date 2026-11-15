import { type BountyRecord, getBounties } from './airtable';

export interface BountyBoardBounty {
	id: string;
	name: string;
	reward: number;
	requirements: string;
	claimed: boolean;
	claimedBy?: { slackId: string; name: string };
}

export interface BountyBoardData {
	availableBounties: BountyBoardBounty[];
	claimedBounties: BountyBoardBounty[];
}

function convertRecordToBounty(record: BountyRecord): BountyBoardBounty {
	let claimedBy;
	if (
		record.fields['Claimed By'] &&
		record.fields['Slack ID (from Claimed By)'] &&
		record.fields['Name (from Claimed By)']
	) {
		claimedBy = {
			slackId: record.fields['Slack ID (from Claimed By)'][0],
			name: record.fields['Name (from Claimed By)'][0]
		};
	}

	return {
		id: record.id,
		name: record.fields['Name'],
		reward: record.fields['Reward'],
		requirements: record.fields['Requirements'],
		claimed: record.fields['Claimed'],
		claimedBy
	};
}

export async function getBountyBoardData(): Promise<BountyBoardData> {
	const allBounties = await getBounties();

	// TODO: Double filtering is probably not efficient, so consider reworking that
	return {
		availableBounties: allBounties
			.filter((bounty) => !bounty.fields.Claimed)
			.map(convertRecordToBounty),
		claimedBounties: allBounties
			.filter((bounty) => bounty.fields.Claimed)
			.map(convertRecordToBounty)
	};
}
