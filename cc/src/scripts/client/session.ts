export interface SessionEntry {
	sessionKey: string;
	expiresAt?: number;
}

export class SessionManager {
	// Maps peer ID to SessionEntry
	private sessions = new Map<string, SessionEntry>();

	public setSessionKey(peerId: string, sessionKey: string, ttlMs?: number): void {
		const expiresAt = ttlMs ? os.epoch('utc') + ttlMs : undefined;
		this.sessions.set(peerId, { sessionKey, expiresAt });
	}

	public getSessionKey(peerId: string): string | null {
		const entry = this.sessions.get(peerId);
		if (!entry) return null;
		if (entry.expiresAt && os.epoch('utc') >= entry.expiresAt) {
			this.sessions.delete(peerId);
			return null;
		}
		return entry.sessionKey;
	}

	public hasSession(peerId: string): boolean {
		return this.getSessionKey(peerId) !== null;
	}

	public isExpired(peerId: string): boolean {
		const entry = this.sessions.get(peerId);
		if (!entry) return true;
		return entry.expiresAt !== undefined && os.epoch('utc') >= entry.expiresAt;
	}

	public removeSession(peerId: string): void {
		this.sessions.delete(peerId);
	}
}
