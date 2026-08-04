/* Meant to run at spawn on a Command Computer.
Top: Chat Box
Bottom: Player Detector
Back: Advanced Monitor (MOTD xlTwo)
Right: Advanced Monitor (MOTD xlOne)
*/

import { BlitData } from '@common/prettyText';
import { SERVER_URL } from '@shared/const';
import { displayMOTD } from '@shared/motd';

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

	// Send a chat to each new player
	for (const player of newPlayers) {
		chatBox.sendMessageToPlayer('Welcome to the server, ' + player + '!', player);
	}

	sleep(1);
}
