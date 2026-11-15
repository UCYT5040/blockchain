import { getBountyBoardData } from '$lib/server/bounty';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const bountyBoardData = await getBountyBoardData();

	return {
		bounties: bountyBoardData
	};
};
