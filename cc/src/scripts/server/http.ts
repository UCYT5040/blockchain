import { SERVER_TOKEN } from './const';
import { SERVER_URL } from '@shared/const';

const headers = new LuaMap<string, string>();
headers['Authorization'] = `Bearer ${SERVER_TOKEN}`;

export function get(path: string) {
	const [res, reason] = http.get(`${SERVER_URL}/${path}`, headers);
	if (!res) {
		print(`[HTTP] GET failed: ${reason}`);
		return null;
	}
	const raw = res.readAll() as string;
	res.close();

	return raw;
}

export function post(path: string, body: string, mimeType?: string) {
    headers['Content-Type'] = mimeType || 'text/plain';

	const [res, reason] = http.post(`${SERVER_URL}/${path}`, body, headers);
	
    // Remove Content-Type header
    headers.delete('Content-Type');
    
    if (!res) {
		print(`[HTTP] POST failed: ${reason}`);
		return null;
	}
	const raw = res.readAll() as string;
	res.close();

	return raw;
}