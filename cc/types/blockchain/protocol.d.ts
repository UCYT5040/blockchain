/** @noResolution @noSelfInFile */
declare module 'protocol' {
	export enum PacketCategory {
		DATA = 0x01,
		REQUEST = 0x02,
		RESPONSE = 0x03,
		SIGNAL = 0x04
	}

	export interface PacketHeader {
		v: number;
		category: PacketCategory;
		src: string;
		dst: string;
		nonce: string;
		ts: number;
		ttl: number;
		enc: boolean;
	}

	export interface EncryptedPayload {
		ciphertext: string;
		iv: string;
	}

	export interface WirePacket {
		header: PacketHeader;
		payload: EncryptedPayload;
	}

	export interface RPCRequestPayload {
		action: string;
		params?: Record<string, unknown>;
	}

	export interface RPCResponsePayload {
		replyToNonce: string;
		success: boolean;
		data?: unknown;
		error?: string;
	}

	export interface DirectMessagePayload {
		contentType: 'text' | 'json' | 'binary';
		content: string;
	}

	export interface P2PTicket {
		sessionKey: string;
		initiatorId: string;
		timestamp: number;
		ttl: number;
	}

	export interface TicketResponseBody {
		targetId: string;
		sessionKey: string;
		ticketForTarget: string;
		ticketIv: string;
	}

	export interface P2PHandshakePayload {
		ticket: string;
		iv: string;
	}

	export interface TestPacketPayload {
		seq: number;
		data: string;
		ts: number;
	}

	export class ReplayFilter {
		constructor(maxAgeMs?: number);
		public isReplayOrExpired(packet: WirePacket, now?: number): boolean;
		public cleanup(now?: number): void;
	}

	export class NetworkAdapter {
		constructor(channel?: number);
		public sendPacket(packet: WirePacket): void;
		public receivePacket(): WirePacket | null;
	}

	export class ProtocolEngine {
		constructor(myId: string, maxAgeMs?: number);
		public isReplayOrExpired(packet: WirePacket): boolean;
		public getReplayFilter(): ReplayFilter;
		public createRequestPacket(
			targetId: string,
			action: string,
			params: Record<string, unknown>,
			keyHex: string
		): { packet: WirePacket; nonce: string };
		public unpackPayload<T>(packet: WirePacket, keyHex: string): T | null;
		public registerPendingRequest(nonce: string, callback: (res: RPCResponsePayload) => void): void;
		public handleResponse(responsePayload: RPCResponsePayload): void;
		public createResponsePacket(
			targetId: string,
			replyToNonce: string,
			success: boolean,
			data?: unknown,
			error?: string,
			keyHex?: string
		): WirePacket;
		public createDataPacket(
			targetId: string,
			payload: DirectMessagePayload,
			keyHex: string
		): WirePacket;
		public createHandshakePacket(targetId: string, ticket: string, ticketIv: string): WirePacket;
		public createTestPacket(targetId: string, seq?: number, data?: string): WirePacket;
		public createTestResponsePacket(requestPacket: WirePacket, seq?: number): WirePacket;
	}
}
