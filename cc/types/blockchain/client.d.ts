/** @noResolution @noSelfInFile */
declare module 'client' {
	import type { DirectMessagePayload } from 'protocol';
	import type { CurrencyListResponse, CurrencyActionResult } from '@common/currency';

	export interface SessionEntry {
		sessionKey: string;
		expiresAt?: number;
	}

	export class SessionManager {
		public setSessionKey(peerId: string, sessionKey: string, ttlMs?: number): void;
		public getSessionKey(peerId: string): string | null;
		public hasSession(peerId: string): boolean;
		public isExpired(peerId: string): boolean;
		public removeSession(peerId: string): void;
	}

	export interface StoredClientConfig {
		clientId: string;
		masterKeyEncrypted: string;
		serverAddress: string;
		salt: string;
		iv: string;
		mac: string;
	}

	export interface RuntimeClientConfig extends Omit<
		StoredClientConfig,
		'masterKeyEncrypted' | 'salt' | 'iv' | 'mac'
	> {
		masterKey: string;
		masterKeyEncrypted?: string;
		salt?: string;
		iv?: string;
		mac?: string;
	}

	export function loadConfig(): StoredClientConfig | null;
	export function saveConfig(config: StoredClientConfig): void;
	export function getRuntimeConfig(terminal?: ITerminal): RuntimeClientConfig | null;
	export function saveRuntimeConfig(config: RuntimeClientConfig, terminal?: ITerminal): void;

	export interface ChatMessage {
		sender: string;
		content: string;
		timestamp: number;
	}

	export class ChatStore {
		public setActivePeer(peerId: string | null): void;
		public getActivePeer(): string | null;
		public addMessage(peerId: string, sender: string, content: string): void;
		public getThread(peerId: string): ChatMessage[];
		public getActivePeers(): string[];
		public getUnreadCount(peerId: string): number;
		public clearUnread(peerId: string): void;
	}

	export const globalChatStore: ChatStore;

	export function initChatListener(client: ClientAPI): void;
	export function openChatMenu(client: ClientAPI): void;
	export function openChatThread(client: ClientAPI, peerId: string): void;

	export const client: ClientAPI;

	export class ClientAPI {
		/** Creates a new ClientAPI instance */
		constructor(clientId: string, masterKey: string, serverId?: string);

		public getSessionManager(): SessionManager;

		/** Registers a handler function for incoming P2P RPC requests from peers */
		public onP2PRequest(
			handler: (
				this: void,
				src: string,
				action: string,
				params: Record<string, unknown>
			) => Promise<unknown> | unknown
		): void;

		/** Registers a handler function for incoming direct P2P data messages */
		public onP2PMessage(
			handler: (this: void, src: string, payload: DirectMessagePayload) => void
		): void;

		/**
		 * Requests a P2P ticket from the central KDC server and sends the handshake ticket to the target peer.
		 */
		public establishP2PSession(peerId: string): Promise<string>;

		/**
		 * Continuously listens for incoming network packets and dispatches responses / P2P handlers.
		 */
		public listen(): void;

		/**
		 * Issues an RPC request to the Server and returns a Promise for the response.
		 */
		public request(action: string, params?: Record<string, unknown>): Promise<unknown>;

		/**
		 * Issues an RPC request directly to a Peer computer using an encrypted P2P session key.
		 */
		public requestP2P(
			peerId: string,
			action: string,
			params?: Record<string, unknown>
		): Promise<unknown>;

		/**
		 * Sends a direct encrypted message (chat/data) to a Peer computer using the shared P2P session key.
		 */
		public sendP2P(peerId: string, content: string | DirectMessagePayload): Promise<void>;

		/**
		 * Retrieves the balance and transaction list for this client from the server.
		 */
		public listCurrency(): Promise<CurrencyListResponse>;

		/**
		 * Retrieves the current currency balance for this client.
		 */
		public getBalance(): Promise<number>;

		/**
		 * Sends currency from this computer to a recipient computer.
		 */
		public transfer(
			toClientId: string,
			amount: number,
			note?: string
		): Promise<CurrencyActionResult>;

		/**
		 * Creates a currency transaction (direct transfer or payment request from another computer).
		 */
		public createTransaction(
			toClientId: string,
			amount: number,
			note?: string,
			fromClientId?: string
		): Promise<CurrencyActionResult>;

		/**
		 * Authorizes a pending currency transaction where this client is the sender/payer.
		 */
		public authorizeTransaction(transactionId: string): Promise<CurrencyActionResult>;

		/**
		 * Processes an authorized currency transaction where this client is the recipient.
		 */
		public processTransaction(transactionId: string): Promise<CurrencyActionResult>;
	}
}
