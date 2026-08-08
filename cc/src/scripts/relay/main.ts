/** @noSelfInFile */
import { writeLine } from '@shared/term';
import {
	NetworkAdapter,
	ProtocolEngine,
	ReplayFilter,
	PacketCategory,
	WirePacket,
	TestPacketPayload
} from 'protocol';

// Setup display monitor if available, fallback to computer terminal
const monitors = peripheral.find('monitor') as unknown as MonitorPeripheral[];
if (monitors.length > 0) {
	term.redirect(monitors[0]);
}

/** @noSelf */
interface RadioTowerPeripheral extends IPeripheral {
	broadcast(data: string): void;
	canBroadcast(): boolean;
	isValid(): boolean;
	setFrequency(frequency: number): void;
	getFrequency(): number;
	getHeight(): number;
}

const RELAY_ID = `RELAY_${os.computerID()}`;
const CHANNEL = 100;
const FREQUENCY = 100;

writeLine('Starting relay');

// 1. Initialize Modem
const modems = peripheral.find('modem') as unknown as ModemPeripheral[];
if (!modems || modems.length === 0) {
	error('Relay requires a modem peripheral.');
}

const modem = modems[0];
modem.open(CHANNEL);
writeLine(`Modem active on channel ${CHANNEL}`);

// 2. Initialize Optional Radio Tower
const radioTowers = peripheral.find('radio_tower') as unknown as RadioTowerPeripheral[];
let radioTower: RadioTowerPeripheral | null = null;

if (radioTowers && radioTowers.length > 0) {
	const tower = radioTowers[0];
	if (tower.isValid()) {
		radioTower = tower;
		radioTower.setFrequency(FREQUENCY);
		writeLine(
			`Radio tower active on freq ${FREQUENCY} (Height: ${tower.getHeight()}, Can Broadcast: ${tower.canBroadcast()})`
		);
	} else {
		writeLine(`Radio tower connected but reported invalid structure.`);
	}
} else {
	writeLine(`No radio tower detected (Operating in Modem-only mode)`);
}

// 3. Initialize Replay Filter & Protocol Engine
const replayFilter = new ReplayFilter(60000);
const protocol = new ProtocolEngine(RELAY_ID);

writeLine(`Initialization complete. Listening for network traffic...\n`);

function getCategoryName(category: PacketCategory): string {
	switch (category) {
		case PacketCategory.DATA:
			return 'DATA';
		case PacketCategory.REQUEST:
			return 'REQUEST';
		case PacketCategory.RESPONSE:
			return 'RESPONSE';
		case PacketCategory.SIGNAL:
			return 'SIGNAL';
		default:
			return 'UNKNOWN';
	}
}

// 4. Main Event Loop
while (true) {
	const eventData = os.pullEvent();
	const eventName = eventData[0] as string;

	let rawMessage: string | null = null;
	let sourceInterface = '';
	let distanceInfo = '';

	if (eventName === 'modem_message') {
		const [, , senderChannel, , message, distance] = eventData as unknown as [
			string,
			string,
			number,
			number,
			unknown,
			number | undefined
		];
		if (senderChannel !== CHANNEL) continue;
		if (typeof message !== 'string') continue;
		rawMessage = message;
		sourceInterface = 'MODEM';
		distanceInfo = distance ? ` (${distance}m)` : '';
	} else if (eventName === 'radio_message') {
		const [, , message, distance] = eventData as unknown as [
			string,
			string,
			string,
			number | undefined
		];
		if (typeof message !== 'string') continue;
		rawMessage = message;
		sourceInterface = 'RADIO';
		distanceInfo = distance ? ` (${distance}m)` : '';
	} else {
		continue;
	}

	if (!rawMessage) continue;

	let packet: WirePacket | null = null;
	let parseSuccess = false;
	try {
		packet = textutils.unserialiseJSON(rawMessage, { parse_null: true }) as WirePacket;
		parseSuccess = true;
	} catch {
		writeLine(`Ignored malformed frame from ${sourceInterface}`);
	}

	if (!parseSuccess || !packet || !packet.header || packet.header.v !== 1) {
		continue;
	}

	const header = packet.header;

	// Replay / Loop Prevention
	if (replayFilter.isReplayOrExpired(packet)) {
		// Silently drop duplicate packet to avoid broadcast storm
		continue;
	}

	// Hop Limit / TTL Verification
	if (header.ttl <= 1) {
		writeLine(
			`[${sourceInterface}${distanceInfo}] Dropped packet (TTL expired): ${header.src} -> ${header.dst} [nonce: ${header.nonce}]`
		);
		continue;
	}

	writeLine(
		`[${sourceInterface}${distanceInfo}] ${getCategoryName(header.category)} | ${header.src} -> ${header.dst} | TTL: ${header.ttl} -> ${header.ttl - 1}`
	);

	// Handle Test Packet Echoing
	if (
		header.category === PacketCategory.SIGNAL &&
		!header.enc &&
		(header.dst === RELAY_ID || header.dst === 'RELAY' || header.dst === 'BROADCAST')
	) {
		try {
			const testPayload = textutils.unserialiseJSON(packet.payload.ciphertext) as TestPacketPayload;
			if (testPayload && testPayload.data !== 'pong') {
				writeLine(`Replying to TEST ping from ${header.src} (seq: ${testPayload.seq})`);
				const responsePacket = protocol.createTestResponsePacket(packet, testPayload.seq);
				const responseJson = textutils.serialiseJSON(responsePacket);

				// Transmit response out via modem and radio
				modem.transmit(CHANNEL, CHANNEL, responseJson);
				if (radioTower && radioTower.isValid() && radioTower.canBroadcast()) {
					radioTower.broadcast(responseJson);
				}
			}
		} catch {
			// Ignore malformed test payloads
		}
	}

	// Decrement Hop Count
	header.ttl -= 1;
	const reencodedJson = textutils.serialiseJSON(packet);

	// Forward / Cross-Bridge Packet
	// Transmit over modem (mesh extension)
	modem.transmit(CHANNEL, CHANNEL, reencodedJson);

	// Transmit over radio tower (long-range extension) if available
	if (radioTower && radioTower.isValid() && radioTower.canBroadcast()) {
		radioTower.broadcast(reencodedJson);
	}
}
