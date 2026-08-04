/** @noSelfInFile */
import {
	NetworkAdapter,
	ProtocolEngine,
	PacketCategory,
	type RPCResponsePayload,
	type RPCRequestPayload,
	type DirectMessagePayload,
	type TicketResponseBody,
	type P2PHandshakePayload,
	type P2PTicket
} from 'protocol';
import { SessionManager } from './session';
import { decryptText } from 'crypto';

export class ClientAPI {
	private network: NetworkAdapter;
	private protocol: ProtocolEngine;
	private masterKey: string;
	private clientId: string;
	private serverId: string;
	private sessionManager = new SessionManager();

	private p2pRequestHandler?: (
		this: void,
		src: string,
		action: string,
		params: Record<string, unknown>
	) => Promise<unknown> | unknown;
	private p2pMessageHandler?: (this: void, src: string, payload: DirectMessagePayload) => void;

	constructor(clientId: string, masterKey: string, serverId = 'SERVER') {
		this.network = new NetworkAdapter(100);
		this.protocol = new ProtocolEngine(clientId);
		this.clientId = clientId;
		this.masterKey = masterKey;
		this.serverId = serverId;
	}

	public getSessionManager(): SessionManager {
		return this.sessionManager;
	}

	/** Registers a handler function for incoming P2P RPC requests from peers */
	public onP2PRequest(
		handler: (
			this: void,
			src: string,
			action: string,
			params: Record<string, unknown>
		) => Promise<unknown> | unknown
	): void {
		this.p2pRequestHandler = handler;
	}

	/** Registers a handler function for incoming direct P2P data messages */
	public onP2PMessage(
		handler: (this: void, src: string, payload: DirectMessagePayload) => void
	): void {
		this.p2pMessageHandler = handler;
	}

	/**
	 * Requests a P2P ticket from the central KDC server and sends the handshake ticket to the target peer.
	 */
	public async establishP2PSession(peerId: string): Promise<string> {
		const res = (await this.request('ticket:get', { targetId: peerId })) as TicketResponseBody;
		if (!res || !res.sessionKey || !res.ticketForTarget) {
			throw new Error(`Failed to retrieve P2P ticket for peer '${peerId}'`);
		}

		// Store session key locally (1 hour default TTL)
		this.sessionManager.setSessionKey(peerId, res.sessionKey, 1000 * 60 * 60);

		// Deliver ticket handshake packet to target peer
		const handshakePacket = this.protocol.createHandshakePacket(
			peerId,
			res.ticketForTarget,
			res.ticketIv
		);
		this.network.sendPacket(handshakePacket);

		return res.sessionKey;
	}

	/**
	 * Continuously listens for incoming network packets and dispatches responses / P2P handlers.
	 * Runs in parallel with client operations using parallel.waitForAny / waitForAll.
	 */
	public listen(): void {
		while (true) {
			const packet = this.network.receivePacket();
			if (!packet) continue;
			if (packet.header.dst !== this.clientId && packet.header.dst !== 'BROADCAST') continue;

			const src = packet.header.src;
			const category = packet.header.category;

			if (src === this.serverId) {
				if (category === PacketCategory.RESPONSE) {
					const resData = this.protocol.unpackPayload<RPCResponsePayload>(packet, this.masterKey);
					if (resData) {
						this.protocol.handleResponse(resData);
					}
				}
			} else {
				// Handle peer P2P packets
				if (category === PacketCategory.SIGNAL) {
					// Process P2P ticket delivery handshake
					try {
						const handshake = textutils.unserialiseJSON(
							packet.payload.ciphertext
						) as P2PHandshakePayload;
						if (handshake && handshake.ticket && handshake.iv) {
							const rawTicketJson = decryptText(handshake.ticket, this.masterKey, handshake.iv);
							const p2pTicket = textutils.unserialiseJSON(rawTicketJson) as P2PTicket;
							if (p2pTicket && p2pTicket.sessionKey && p2pTicket.initiatorId) {
								this.sessionManager.setSessionKey(
									p2pTicket.initiatorId,
									p2pTicket.sessionKey,
									p2pTicket.ttl
								);
							}
						}
					} catch {
						// Ignore malformed signals
					}
				} else if (category === PacketCategory.RESPONSE) {
					const sessionKey = this.sessionManager.getSessionKey(src);
					if (sessionKey) {
						const resData = this.protocol.unpackPayload<RPCResponsePayload>(packet, sessionKey);
						if (resData) {
							this.protocol.handleResponse(resData);
						}
					}
				} else if (category === PacketCategory.REQUEST) {
					const sessionKey = this.sessionManager.getSessionKey(src);
					if (sessionKey) {
						const reqData = this.protocol.unpackPayload<RPCRequestPayload>(packet, sessionKey);
						if (reqData && this.p2pRequestHandler) {
							const replyToNonce = packet.header.nonce;
							Promise.resolve(this.p2pRequestHandler(src, reqData.action, reqData.params || {}))
								.then((result) => {
									const resPacket = this.protocol.createResponsePacket(
										src,
										replyToNonce,
										true,
										result,
										undefined,
										sessionKey
									);
									this.network.sendPacket(resPacket);
								})
								.catch((err) => {
									const resPacket = this.protocol.createResponsePacket(
										src,
										replyToNonce,
										false,
										undefined,
										err instanceof Error ? err.message : String(err),
										sessionKey
									);
									this.network.sendPacket(resPacket);
								});
						}
					}
				} else if (category === PacketCategory.DATA) {
					const sessionKey = this.sessionManager.getSessionKey(src);
					if (sessionKey) {
						const messageData = this.protocol.unpackPayload<DirectMessagePayload>(
							packet,
							sessionKey
						);
						if (messageData && this.p2pMessageHandler) {
							this.p2pMessageHandler(src, messageData);
						}
					}
				}
			}
		}
	}

	/**
	 * Issues an RPC request to the Server and returns a Promise for the response.
	 */
	public request(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
		const { packet, nonce } = this.protocol.createRequestPacket(
			this.serverId,
			action,
			params,
			this.masterKey
		);

		// Send packet to wire
		this.network.sendPacket(packet);

		// Register callback for matching response and return pending promise
		return new Promise((resolve, reject) => {
			this.protocol.registerPendingRequest(nonce, (res: RPCResponsePayload) => {
				if (res && res.success) {
					resolve(res.data);
				} else {
					reject(new Error((res && res.error) || 'RPC Request failed'));
				}
			});
		});
	}

	/**
	 * Issues an RPC request directly to a Peer computer using an encrypted P2P session key.
	 * Automatically requests a session key from the server if one is not yet established.
	 */
	public async requestP2P(
		peerId: string,
		action: string,
		params: Record<string, unknown> = {}
	): Promise<unknown> {
		let sessionKey = this.sessionManager.getSessionKey(peerId);
		if (!sessionKey) {
			sessionKey = await this.establishP2PSession(peerId);
		}

		const { packet, nonce } = this.protocol.createRequestPacket(peerId, action, params, sessionKey);

		this.network.sendPacket(packet);

		return new Promise((resolve, reject) => {
			this.protocol.registerPendingRequest(nonce, (res: RPCResponsePayload) => {
				if (res && res.success) {
					resolve(res.data);
				} else {
					reject(new Error((res && res.error) || 'P2P RPC Request failed'));
				}
			});
		});
	}

	/**
	 * Sends a direct encrypted message (chat/data) to a Peer computer using the shared P2P session key.
	 * Automatically requests a session key from the server if one is not yet established.
	 */
	public async sendP2P(peerId: string, content: string | DirectMessagePayload): Promise<void> {
		let sessionKey = this.sessionManager.getSessionKey(peerId);
		if (!sessionKey) {
			sessionKey = await this.establishP2PSession(peerId);
		}

		const payload: DirectMessagePayload =
			typeof content === 'string' ? { contentType: 'text', content } : content;

		const packet = this.protocol.createDataPacket(peerId, payload, sessionKey);
		this.network.sendPacket(packet);
	}
}
