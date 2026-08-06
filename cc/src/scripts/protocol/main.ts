/** @noSelfInFile */
import {
	PacketCategory,
	PacketHeader,
	WirePacket,
	EncryptedPayload,
	NetworkAdapter
} from './network';
import { encryptText, decryptText, blake2s, generateRandomHex, constantTimeCompare } from 'crypto';

export interface RPCRequestPayload {
	action: string; // Action identifier (e.g., "contacts:get", "kdc:get_ticket", "weather:fetch")
	params?: Record<string, unknown>; // Flexible parameter payload
}

export interface RPCResponsePayload {
	replyToNonce: string; // Matches the request's header.nonce
	success: boolean; // Operation status
	data?: unknown; // Return data payload
	error?: string; // Human-readable error message
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

export class ReplayFilter {
	private seenNonces = new Map<string, number>();
	private maxAgeMs: number;

	constructor(maxAgeMs = 60000) {
		this.maxAgeMs = maxAgeMs;
	}

	/**
	 * Checks if a packet is a replay or has an expired timestamp.
	 * Returns true if packet is invalid (replay or expired).
	 * If valid, records the nonce and returns false.
	 */
	public isReplayOrExpired(packet: WirePacket, now: number = os.epoch('utc')): boolean {
		if (!packet || !packet.header) return true;

		// Validate timestamp freshness
		const age = Math.abs(now - packet.header.ts);
		if (age > this.maxAgeMs) {
			return true;
		}

		// Perform cleanup of expired nonces
		this.cleanup(now);

		// Check nonce uniqueness
		if (this.seenNonces.has(packet.header.nonce)) {
			return true;
		}

		// Record nonce with expiry time
		this.seenNonces.set(packet.header.nonce, now + this.maxAgeMs);
		return false;
	}

	/** Purges nonces whose expiration timestamp has passed */
	public cleanup(now: number = os.epoch('utc')): void {
		this.seenNonces.forEach((expiresAt, nonce) => {
			if (now > expiresAt) {
				this.seenNonces.delete(nonce);
			}
		});
	}
}

export { NetworkAdapter, PacketCategory, PacketHeader, WirePacket, EncryptedPayload };

export class ProtocolEngine {
	private myId: string;
	private pendingRequests = new Map<string, (response: RPCResponsePayload) => void>();
	private replayFilter: ReplayFilter;

	constructor(myId: string, maxAgeMs = 60000) {
		this.myId = myId;
		this.replayFilter = new ReplayFilter(maxAgeMs);
	}

	/** Checks if an incoming packet is a duplicate replay or expired */
	public isReplayOrExpired(packet: WirePacket): boolean {
		return this.replayFilter.isReplayOrExpired(packet);
	}

	/** Returns the internal ReplayFilter instance */
	public getReplayFilter(): ReplayFilter {
		return this.replayFilter;
	}

	/**
	 * Packs an RPC Request into an Encrypted WirePacket envelope.
	 */
	public createRequestPacket(
		targetId: string,
		action: string,
		params: Record<string, unknown>,
		keyHex: string
	): { packet: WirePacket; nonce: string } {
		if (!keyHex) throw new Error('Encryption key required for packet creation.');

		const nonce = generateRandomHex(8);
		const header: PacketHeader = {
			v: 1,
			category: PacketCategory.REQUEST,
			src: this.myId,
			dst: targetId,
			nonce: nonce,
			ts: os.epoch('utc'),
			ttl: 5,
			enc: true
		};

		const innerPayload: RPCRequestPayload = { action, params };
		const rawJson = textutils.serialiseJSON(innerPayload);

		const iv = generateRandomHex(8);
		const ciphertext = encryptText(rawJson, keyHex, iv);
		const payloadEnvelope: EncryptedPayload = { ciphertext, iv };

		return {
			packet: { header, payload: payloadEnvelope },
			nonce
		};
	}

	/**
	 * Unpacks and decrypts an incoming packet's inner payload.
	 */
	public unpackPayload<T>(packet: WirePacket, keyHex: string): T | null {
		try {
			if (!keyHex) return null;
			const encPayload = packet.payload;
			if (!encPayload || !encPayload.ciphertext || !encPayload.iv) return null;

			const rawJson = decryptText(encPayload.ciphertext, keyHex, encPayload.iv);
			return textutils.unserialiseJSON(rawJson) as T;
		} catch {
			return null;
		}
	}

	/** Registers a callback listener for a specific request nonce */
	public registerPendingRequest(nonce: string, callback: (res: RPCResponsePayload) => void): void {
		this.pendingRequests.set(nonce, callback);
	}

	/** Resolves a pending RPC promise when a matching response arrives */
	public handleResponse(responsePayload: RPCResponsePayload): void {
		const callback = this.pendingRequests.get(responsePayload.replyToNonce);
		if (callback) {
			callback(responsePayload);
			this.pendingRequests.delete(responsePayload.replyToNonce);
		}
	}

	/**
	 * Constructs an encrypted Response WirePacket.
	 */
	public createResponsePacket(
		targetId: string,
		replyToNonce: string,
		success: boolean,
		data?: unknown,
		error?: string,
		keyHex?: string
	): WirePacket {
		if (!keyHex) throw new Error('Encryption key required for response creation.');

		const responsePayload: RPCResponsePayload = {
			replyToNonce,
			success,
			data,
			error
		};
		const rawJson = textutils.serialiseJSON(responsePayload);
		const iv = generateRandomHex(8);
		const payloadEnvelope: EncryptedPayload = {
			ciphertext: encryptText(rawJson, keyHex, iv),
			iv
		};

		return {
			header: {
				v: 1,
				category: PacketCategory.RESPONSE,
				src: this.myId,
				dst: targetId,
				nonce: generateRandomHex(8),
				ts: os.epoch('utc'),
				ttl: 5,
				enc: true
			},
			payload: payloadEnvelope
		};
	}

	/**
	 * Constructs an encrypted Data WirePacket (direct message / chat).
	 */
	public createDataPacket(
		targetId: string,
		payload: DirectMessagePayload,
		keyHex: string
	): WirePacket {
		if (!keyHex) throw new Error('Encryption key required for data packet creation.');

		const rawJson = textutils.serialiseJSON(payload);
		const iv = generateRandomHex(8);
		const payloadEnvelope: EncryptedPayload = {
			ciphertext: encryptText(rawJson, keyHex, iv),
			iv
		};

		return {
			header: {
				v: 1,
				category: PacketCategory.DATA,
				src: this.myId,
				dst: targetId,
				nonce: generateRandomHex(8),
				ts: os.epoch('utc'),
				ttl: 5,
				enc: true
			},
			payload: payloadEnvelope
		};
	}

	/**
	 * Constructs a P2P Ticket Handshake Signal WirePacket.
	 * Delivered to target peer so target can decrypt the ticket using their master key.
	 */
	public createHandshakePacket(targetId: string, ticket: string, ticketIv: string): WirePacket {
		const handshakePayload: P2PHandshakePayload = { ticket, iv: ticketIv };
		const rawJson = textutils.serialiseJSON(handshakePayload);

		// We send payload as JSON string in ciphertext field (unencrypted wrapper around pre-encrypted ticket payload)
		// or direct payload string since ticket ciphertext is already encrypted by server with target's master key.
		const payloadEnvelope: EncryptedPayload = {
			ciphertext: rawJson,
			iv: ticketIv
		};

		return {
			header: {
				v: 1,
				category: PacketCategory.SIGNAL,
				src: this.myId,
				dst: targetId,
				nonce: generateRandomHex(8),
				ts: os.epoch('utc'),
				ttl: 5,
				enc: false
			},
			payload: payloadEnvelope
		};
	}
}
