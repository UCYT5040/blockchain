/** @noSelfInFile */
import { ProtocolEngine, PacketCategory, WirePacket, TestPacketPayload } from 'protocol';

const computerId = os.computerID();
const TESTER_ID = `TESTER_${computerId}`;
const CHANNEL = 100;
const FREQUENCY = 100;
const INTERVAL = 1.0;
const WINDOW_SIZE = 10;

/** @noSelf */
interface RadioTowerPeripheral extends IPeripheral {
	broadcast(data: string): void;
	canBroadcast(): boolean;
	isValid(): boolean;
	setFrequency(frequency: number): void;
	getFrequency(): number;
	getHeight(): number;
}

write(`Network Tester
1. Modem
2. Radio
What would you like to test? `);

const modeInput = read();
const mode = modeInput === '2' ? 2 : 1;

let modem: ModemPeripheral | null = null;
let radioTower: RadioTowerPeripheral | null = null;

const modems = peripheral.find('modem') as unknown as ModemPeripheral[];
if (modems && modems.length > 0) {
	modem = modems[0];
	modem.open(CHANNEL);
}

if (mode === 1) {
	if (!modem) {
		error('Tester requires a modem peripheral for modem mode.');
	}
	print(`Running continuous modem test (Channel ${CHANNEL}, Interval: 1.0s)...\n`);
} else {
	const towers = peripheral.find('radio_tower') as unknown as RadioTowerPeripheral[];
	if (!towers || towers.length === 0 || !towers[0].isValid()) {
		error('Tester requires a valid radio tower peripheral for radio mode.');
	}
	radioTower = towers[0];
	radioTower.setFrequency(FREQUENCY);
	print(
		`Running continuous radio test (Freq ${FREQUENCY}, Height: ${radioTower.getHeight()}, Interval: 1.0s)...\n`
	);
}

const protocol = new ProtocolEngine(TESTER_ID);

interface PacketRecord {
	seq: number;
	sentAt: number;
	received: boolean;
	rtt?: number;
}

let totalSent = 0;
const history: PacketRecord[] = [];

function senderTask(): void {
	while (true) {
		totalSent++;
		const seq = totalSent;
		const now = os.epoch('utc');

		history.push({ seq, sentAt: now, received: false });
		if (history.length > WINDOW_SIZE) {
			history.shift();
		}

		const packet = protocol.createTestPacket('BROADCAST', seq, 'ping');
		const serializedJson = textutils.serialiseJSON(packet);

		if (mode === 1 && modem) {
			modem.transmit(CHANNEL, CHANNEL, serializedJson);
		} else if (mode === 2 && radioTower) {
			radioTower.broadcast(serializedJson);
		}

		print(`[Sent #${seq}] Transmitted ping over ${mode === 1 ? 'Modem' : 'Radio'}`);
		sleep(INTERVAL);
	}
}

function receiverTask(): void {
	while (true) {
		const eventData = os.pullEvent();
		const eventName = eventData[0] as string;

		let rawMessage: string | null = null;
		let sourceInterface = '';
		let distInfo = '';

		if (eventName === 'modem_message') {
			const [, , senderChannel, , message] = eventData as unknown as [
				string,
				string,
				number,
				number,
				unknown
			];
			if (senderChannel !== CHANNEL || typeof message !== 'string') continue;
			rawMessage = message;
			sourceInterface = 'Modem';
		} else if (eventName === 'radio_message') {
			const [, , message, distance] = eventData as unknown as [
				string,
				string,
				string,
				number | undefined
			];
			if (typeof message !== 'string') continue;
			rawMessage = message;
			sourceInterface = 'Radio';
			distInfo = distance ? ` (${distance}m)` : '';
		} else {
			continue;
		}

		let resPacket: WirePacket | null = null;
		let parseSuccess = false;
		try {
			resPacket = textutils.unserialiseJSON(rawMessage, { parse_null: true }) as WirePacket;
			parseSuccess = true;
		} catch {
			// Ignore malformed frame
		}

		if (
			parseSuccess &&
			resPacket &&
			resPacket.header &&
			resPacket.header.v === 1 &&
			resPacket.header.category === PacketCategory.SIGNAL &&
			!resPacket.header.enc
		) {
			try {
				const payload = textutils.unserialiseJSON(
					resPacket.payload.ciphertext
				) as TestPacketPayload;
				if (payload && payload.data === 'pong') {
					const seq = payload.seq;
					const record = history.find((r) => r.seq === seq);
					let rttStr = 'N/A';

					if (record && !record.received) {
						record.received = true;
						record.rtt = os.epoch('utc') - record.sentAt;
						rttStr = `${record.rtt}ms`;
					}

					const windowTotal = history.length;
					const windowReceived = history.filter((r) => r.received).length;
					const pct = windowTotal > 0 ? Math.floor((windowReceived / windowTotal) * 100) : 0;

					print(
						`[Recv #${seq}] From ${resPacket.header.src} via ${sourceInterface}${distInfo} | RTT: ${rttStr} | Score (last ${windowTotal}): ${windowReceived}/${windowTotal} (${pct}%)`
					);
				}
			} catch {
				// Ignore invalid payload format
			}
		}
	}
}

parallel.waitForAny(senderTask, receiverTask);
