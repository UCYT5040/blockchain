/* Meant to run at spawn on a Command Computer.
Top: Chat Box
Bottom: Player Detector
Back: Advanced Monitor (MOTD xlTwo)
Right: Advanced Monitor (MOTD xlOne)
*/

import { BlitData } from "@common/prettyText";
import { SERVER_URL } from "@shared/const";

// Get MOTDs

const monitor1 = peripheral.wrap("right") as MonitorPeripheral;
const monitor2 = peripheral.wrap("back") as MonitorPeripheral;

function displayMOTD(monitor: MonitorPeripheral, motd: string) {
    const [res, reason] = http.get(`${SERVER_URL}/motd/${motd}?format=cc`);
    if (!res) {
        monitor.write("Error fetching MOTD: " + reason);
        return;
    }

    const raw = res.readAll() as string;
    const motdData = textutils.unserialiseJSON(raw) as BlitData[];

    monitor.clear();

    let cursorY = 1;
    for (const line of motdData) {
        monitor.setCursorPos(1, cursorY);
        monitor.blit(line.text, line.textColor, line.backgroundColor);
        cursorY += 1;
    }
}

displayMOTD(monitor1, "xlOne");
displayMOTD(monitor2, "xlTwo");

/** @noSelf */
interface PlayerDetector extends IPeripheral {
    getPlayersInRange(range: number): string[];
}

/** @noSelf */
interface ChatBox extends IPeripheral {
    sendMessageToPlayer(message: string, username: string, prefix?: string, brackets?: string, bracketColor?: string, range?: number, utf8Support?: boolean): LuaMultiReturn<[true | null, string]>
}

const playerCache: string[] = [];
const playerDetector = peripheral.wrap("bottom") as PlayerDetector;
const chatBox = peripheral.wrap("top") as ChatBox;

while (true) {
    const players = playerDetector.getPlayersInRange(8);

    // Check only new players
    const newPlayers = players.filter(player => !playerCache.includes(player));

    // Add new players to cache
    playerCache.push(...newPlayers);

    // Send a chat to each new player
    for (const player of newPlayers) {
        chatBox.sendMessageToPlayer("Welcome to the server, " + player + "!", player);
    }

    sleep(1);
}
