import { BlitData } from '@common/prettyText';
import { SERVER_URL } from '@shared/const';
import { get } from './http';

interface CachedKey {
	masterKey: string;
	expiresAt: number; // Timestamp (ms)
}

export class ServerKeyCache {
	private cache = new Map<string, CachedKey>();
	private readonly ttlMs: number;
	private readonly serverToken: string;

	constructor(serverToken: string, ttlMinutes?: number) {
		this.serverToken = serverToken;
		this.ttlMs = 1000 * 60 * (ttlMinutes || 10);
	}

	/**
	 * Gets a client's master key from the web server
	 * @returns The client's master key
	 */
	public getMasterKey(clientId: string): string | null {
		const now = os.epoch('utc');

		if (this.cache.has(clientId)) {
			const entry = this.cache.get(clientId);
			if (entry && entry.expiresAt > now) {
				return entry.masterKey;
			} else {
				this.cache.delete(clientId);
			}
		}

		const raw = get(`server/key/${clientId}`);
		if (!raw) {
			print('[ServerKeyCache] Failed to get key');
			return null;
		}

		let keyData: { masterKey?: string } | undefined;
		try {
			keyData = textutils.unserialiseJSON(raw) as { masterKey?: string };
		} catch {
			print(`[ServerKeyCache] Failed to parse JSON for ${clientId}: ${raw}`);
			return null;
		}

		if (!keyData || !keyData.masterKey) {
			print(`[ServerKeyCache] No masterKey returned for ${clientId}: ${raw}`);
			return null;
		}

		this.cache.set(clientId, {
			masterKey: keyData.masterKey,
			expiresAt: now + this.ttlMs
		});

		return keyData.masterKey;
	}

	public evict(clientId: string): void {
		this.cache.delete(clientId);
	}

	public evictAll(): void {
		this.cache.clear();
	}
}

export class MOTDCache {
	private motd: BlitData[];
	private expiresAt: number;
	private readonly ttlMs: number;

	constructor(ttlMinutes?: number) {
		this.ttlMs = 1000 * 60 * (ttlMinutes || 10);
		this.motd = [];
		this.expiresAt = 0;
	}

	/**
	 * Gets the server's MOTD from the web server
	 * @returns The server's MOTD
	 */
	public getMOTD(): BlitData[] | null {
		const now = os.epoch('utc');

		if (this.motd && this.expiresAt > now) {
			return this.motd;
		} else {
			this.motd = [];
			this.expiresAt = 0;
		}

		const [res, reason] = http.get(`${SERVER_URL}/motd/small?format=cc`);
		if (!res) {
			print(`[MOTDCache] http.get failed: ${reason}`);
			return null;
		}
		const raw = res.readAll() as string;
		res.close();

		let motdData: BlitData[] | undefined;
		try {
			motdData = textutils.unserialiseJSON(raw) as BlitData[];
		} catch {
			print(`[MOTDCache] Failed to parse JSON: ${raw}`);
			return null;
		}

		if (!motdData) {
			print(`[MOTDCache] No motd returned: ${raw}`);
			return null;
		}

		this.motd = motdData;
		this.expiresAt = now + this.ttlMs;

		return this.motd;
	}

	public evict(): void {
		this.motd = [];
		this.expiresAt = 0;
	}
}
