import { SERVER_URL } from "@shared/const";

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
        const now = os.epoch("utc");

        if (this.cache.has(clientId)) {
            const entry = this.cache.get(clientId);
            if (entry && entry.expiresAt > now) {
                return entry.masterKey;
            } else {
                this.cache.delete(clientId);
            }
        }

        const headers = new LuaMap<string, string>();
        headers['Authorization'] = `Bearer ${this.serverToken}`;

        const [res, reason] = http.get(`${SERVER_URL}/server/key/${clientId}`, headers);
        if (!res) {
            print(`[ServerKeyCache] http.get failed for ${clientId}: ${reason}`);
            return null;
        }
        const raw = res.readAll() as string;
        res.close();

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
            expiresAt: now + this.ttlMs,
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