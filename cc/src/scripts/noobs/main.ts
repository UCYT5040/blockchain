/* Meant to run at spawn on a Command Computer.
Top: Chat Box
Bottom: Player Detector
Back: Advanced Monitor (MOTD xlTwo)
Right: Advanced Monitor (MOTD xlOne)
*/

import { BlitData } from '@common/prettyText';
import { SERVER_URL } from '@shared/const';
import { displayMOTD } from '@shared/motd';
import { SERVER_TOKEN } from './const';

// Get MOTDs
function getAndDisplayMOTD(terminal: ITerminal, motd: string) {
	const [res, reason] = http.get(`${SERVER_URL}/motd/${motd}?format=cc`);
	if (!res) {
		terminal.write('Error fetching MOTD: ' + reason);
		return;
	}

	const raw = res.readAll() as string;
	const motdData = textutils.unserialiseJSON(raw) as BlitData[];

	displayMOTD(terminal, motdData);
}

const monitor1 = peripheral.wrap('right') as MonitorPeripheral;
const monitor2 = peripheral.wrap('back') as MonitorPeripheral;

getAndDisplayMOTD(monitor1, 'xlOne');
getAndDisplayMOTD(monitor2, 'xlTwo');

/** @noSelf */
interface PlayerDetector extends IPeripheral {
	getPlayersInRange(range: number): string[];
}

/** @noSelf */
interface ChatBox extends IPeripheral {
	sendMessageToPlayer(
		message: string,
		username: string,
		prefix?: string,
		brackets?: string,
		bracketColor?: string,
		range?: number,
		utf8Support?: boolean
	): LuaMultiReturn<[true | null, string]>;
}

const playerCache: string[] = [];
const playerDetector = peripheral.wrap('bottom') as PlayerDetector;
const chatBox = peripheral.wrap('top') as ChatBox;

while (true) {
	const players = playerDetector.getPlayersInRange(8);

	// Check only new players
	const newPlayers = players.filter((player) => !playerCache.includes(player));

	// Add new players to cache
	playerCache.push(...newPlayers);

	// Check whether each new player is a beginner
	for (const player of newPlayers) {
		const headers = new LuaMap<string, string>();
		headers['Authorization'] = `Bearer ${SERVER_TOKEN}`;

		const [res, reason] = http.get(`${SERVER_URL}/server/player/${player}/isBeginner`, headers);
		if (!res) {
			term.write('Error fetching player: ' + reason);
			continue;
		}

		const raw = res.readAll() as string;
		const data = textutils.unserialiseJSON(raw) as {isBeginner: boolean};

		if (data.isBeginner) {
			chatBox.sendMessageToPlayer(
				`Welcome to BlockChain, ${player}! Here's a free computer to get you started.`,
				player,
				'BlockChain',
				'<>',
				'&b'
			);
			commands.exec(`/give ${player} computercraft:computer_normal`);
			chatBox.sendMessageToPlayer(
				`Next steps: \n 1. read the info at spawn\n 2. claim some land\n 3. connect to the internet`,
				player,
				'BlockChain',
				'<>',
				'&b'
			);
		}
	}

	sleep(1);
}
