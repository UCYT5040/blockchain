/** @noSelfInFile */

/** Rotate right (32-bit unsigned) */
function rotr32(x: number, n: number): number {
	return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/** Rotate left (32-bit unsigned) */
function rotl32(x: number, n: number): number {
	return ((x << n) | (x >>> (32 - n))) >>> 0;
}

/** Converts a UTF-8 string into an array of byte values (0-255) */
export function stringToBytes(str: string): number[] {
	const bytes: number[] = [];
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		if (code < 0x80) {
			bytes.push(code);
		} else if (code < 0x800) {
			bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else {
			bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		}
	}
	return bytes;
}

/** Converts an array of byte values (0-255) into a UTF-8 string */
export function bytesToString(bytes: number[]): string {
	let str = '';
	let i = 0;
	while (i < bytes.length) {
		const b = bytes[i++];
		if (b < 0x80) {
			str += String.fromCharCode(b);
		} else if (b < 0xe0) {
			str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
		} else {
			str += String.fromCharCode(
				((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)
			);
		}
	}
	return str;
}

/** Converts byte array to Hex string */
export function bytesToHex(bytes: number[]): string {
	let hex = '';
	for (let i = 0; i < bytes.length; i++) {
		const h = bytes[i].toString(16);
		hex += h.length === 1 ? '0' + h : h;
	}
	return hex;
}

/** Converts Hex string to byte array */
export function hexToBytes(hex: string): number[] {
	const bytes: number[] = [];
	for (let i = 0; i < hex.length; i += 2) {
		const val = parseInt(hex.substring(i, i + 2), 16);
		bytes.push(isNaN(val) ? 0 : val);
	}
	return bytes;
}

/** Compares two strings in constant time to prevent timing attacks */
export function constantTimeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/** Generates pseudo-random hex string of specified byte length */
export function generateRandomHex(byteCount: number): string {
	const bytes: number[] = [];
	for (let i = 0; i < byteCount; i++) {
		// In CC:T, math.random() provides pseudo-random numbers
		bytes.push(Math.floor(Math.random() * 256));
	}
	return bytesToHex(bytes);
}

/**
 * SPECK-64/128 key expansion algorithm.
 * Takes 128-bit key (4 x 32-bit words) and yields 27 round keys.
 */
function speckExpandKey(k: number[]): number[] {
	const roundKeys: number[] = [];
	let l0 = k[1],
		l1 = k[2],
		l2 = k[3];
	roundKeys[0] = k[0];

	for (let i = 0; i < 26; i++) {
		const lNext = ((rotr32(l0, 8) + roundKeys[i]) >>> 0) ^ i;
		roundKeys[i + 1] = (rotl32(roundKeys[i], 3) ^ lNext) >>> 0;
		l0 = l1;
		l1 = l2;
		l2 = lNext;
	}
	return roundKeys;
}

/** Encrypts a single 64-bit block (two 32-bit words x, y) using SPECK-64/128 */
function speckEncryptBlock(x: number, y: number, rk: number[]): [number, number] {
	for (let i = 0; i < 27; i++) {
		x = ((rotr32(x, 8) + y) >>> 0) ^ rk[i];
		y = rotl32(y, 3) ^ x;
	}
	return [x >>> 0, y >>> 0];
}

/**
 * SPECK-64/128 Counter (CTR) Mode Cipher.
 * Encrypts/Decrypts arbitrary data using 128-bit key and 64-bit IV.
 */
export function speckCTR(dataBytes: number[], keyHex: string, ivHex: string): number[] {
	const keyBytes = hexToBytes(keyHex);
	const ivBytes = hexToBytes(ivHex);

	if (keyBytes.length !== 16) throw new Error('SPECK-64/128 requires a 128-bit (16 byte) key.');
	if (ivBytes.length !== 8) throw new Error('SPECK-64/128 CTR requires an 8-byte IV.');

	// Parse 128-bit key into 4 x 32-bit words (Little Endian)
	const k = [
		(keyBytes[0] | (keyBytes[1] << 8) | (keyBytes[2] << 16) | (keyBytes[3] << 24)) >>> 0,
		(keyBytes[4] | (keyBytes[5] << 8) | (keyBytes[6] << 16) | (keyBytes[7] << 24)) >>> 0,
		(keyBytes[8] | (keyBytes[9] << 8) | (keyBytes[10] << 16) | (keyBytes[11] << 24)) >>> 0,
		(keyBytes[12] | (keyBytes[13] << 8) | (keyBytes[14] << 16) | (keyBytes[15] << 24)) >>> 0
	];

	const roundKeys = speckExpandKey(k);

	// Initial Counter State from 8-byte IV
	let counterHi = (ivBytes[0] | (ivBytes[1] << 8) | (ivBytes[2] << 16) | (ivBytes[3] << 24)) >>> 0;
	let counterLo = (ivBytes[4] | (ivBytes[5] << 8) | (ivBytes[6] << 16) | (ivBytes[7] << 24)) >>> 0;

	const result: number[] = [];

	for (let i = 0; i < dataBytes.length; i += 8) {
		// Generate 8 bytes of keystream by encrypting the current counter
		const [ksHi, ksLo] = speckEncryptBlock(counterHi, counterLo, roundKeys);

		const keystream = [
			ksHi & 0xff,
			(ksHi >> 8) & 0xff,
			(ksHi >> 16) & 0xff,
			(ksHi >> 24) & 0xff,
			ksLo & 0xff,
			(ksLo >> 8) & 0xff,
			(ksLo >> 16) & 0xff,
			(ksLo >> 24) & 0xff
		];

		// XOR input bytes with keystream
		for (let j = 0; j < 8 && i + j < dataBytes.length; j++) {
			result[i + j] = dataBytes[i + j] ^ keystream[j];
		}

		// Increment 64-bit counter
		counterLo = (counterLo + 1) >>> 0;
		if (counterLo === 0) counterHi = (counterHi + 1) >>> 0;
	}

	return result;
}

const BLAKE2S_IV = [
	0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

const SIGMA = [
	[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
	[14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
	[11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
	[7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
	[9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
	[2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
	[12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
	[13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
	[6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
	[10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]
];

function createZeroArray(length: number): number[] {
	const arr: number[] = [];
	for (let i = 0; i < length; i++) {
		arr[i] = 0;
	}
	return arr;
}

/** Computes BLAKE2s-256 hash or keyed MAC over arbitrary input */
export function blake2s(inputStrOrBytes: string | number[], keyHex?: string): string {
	const bytes =
		typeof inputStrOrBytes === 'string' ? stringToBytes(inputStrOrBytes) : inputStrOrBytes;
	const keyBytes = keyHex ? hexToBytes(keyHex) : [];

	const h = [...BLAKE2S_IV];
	h[0] ^= 0x01010000 ^ (keyBytes.length << 8) ^ 32; // 32-byte output digest

	let block: number[] = createZeroArray(64);
	let offset = 0;
	let byteCount = 0;

	if (keyBytes.length > 0) {
		for (let i = 0; i < keyBytes.length; i++) block[i] = keyBytes[i];
		byteCount += 64;
		compress(h, block, byteCount, false);
	}

	while (offset < bytes.length) {
		const chunkLen = Math.min(64, bytes.length - offset);
		block = createZeroArray(64);
		for (let i = 0; i < chunkLen; i++) block[i] = bytes[offset + i];

		offset += chunkLen;
		byteCount += chunkLen;
		const isLast = offset >= bytes.length;
		compress(h, block, byteCount, isLast);
	}

	// Convert state words to 32-byte Little Endian Hex output
	const outBytes: number[] = [];
	for (let i = 0; i < 8; i++) {
		outBytes.push(h[i] & 0xff, (h[i] >> 8) & 0xff, (h[i] >> 16) & 0xff, (h[i] >> 24) & 0xff);
	}
	return bytesToHex(outBytes);
}

function compress(ctx: number[], block: number[], counter: number, isLast: boolean): void {
	const v: number[] = [];
	const m: number[] = [];

	for (let i = 0; i < 8; i++) v[i] = ctx[i];
	for (let i = 0; i < 8; i++) v[i + 8] = BLAKE2S_IV[i];

	v[12] ^= counter & 0xffffffff;
	v[13] ^= (counter / 0x100000000) & 0xffffffff;
	if (isLast) v[14] ^= 0xffffffff;

	for (let i = 0; i < 16; i++) {
		m[i] =
			(block[i * 4] |
				(block[i * 4 + 1] << 8) |
				(block[i * 4 + 2] << 16) |
				(block[i * 4 + 3] << 24)) >>>
			0;
	}

	const g = (a: number, b: number, c: number, d: number, x: number, y: number) => {
		v[a] = (v[a] + v[b] + x) >>> 0;
		v[d] = rotr32(v[d] ^ v[a], 16);
		v[c] = (v[c] + v[d]) >>> 0;
		v[b] = rotr32(v[b] ^ v[c], 12);
		v[a] = (v[a] + v[b] + y) >>> 0;
		v[d] = rotr32(v[d] ^ v[a], 8);
		v[c] = (v[c] + v[d]) >>> 0;
		v[b] = rotr32(v[b] ^ v[c], 7);
	};

	for (let i = 0; i < 10; i++) {
		const s = SIGMA[i];
		g(0, 4, 8, 12, m[s[0]], m[s[1]]);
		g(1, 5, 9, 13, m[s[2]], m[s[3]]);
		g(2, 6, 10, 14, m[s[4]], m[s[5]]);
		g(3, 7, 11, 15, m[s[6]], m[s[7]]);
		g(0, 5, 10, 15, m[s[8]], m[s[9]]);
		g(1, 6, 11, 12, m[s[10]], m[s[11]]);
		g(2, 7, 8, 13, m[s[12]], m[s[13]]);
		g(3, 4, 9, 14, m[s[14]], m[s[15]]);
	}

	for (let i = 0; i < 8; i++) {
		ctx[i] = (ctx[i] ^ v[i] ^ v[i + 8]) >>> 0;
	}
}

/**
 * Derives a 128-bit Key Encryption Key (KEK) from a passphrase and salt.
 * Performs iterated BLAKE2s passes to slow down offline password cracking attempts.
 */
export function deriveKey(passphrase: string, saltHex: string, rounds = 500): string {
	let hash = blake2s(passphrase + saltHex);
	for (let i = 0; i < rounds; i++) {
		hash = blake2s(hash + saltHex);
	}
	return hash.substring(0, 32); // Returns 32 hex chars (128 bits)
}

/** Encrypts a text string with SPECK-64/128 CTR and returns a Hex string */
export function encryptText(plaintext: string, keyHex: string, ivHex: string): string {
	const plainBytes = stringToBytes(plaintext);
	const cipherBytes = speckCTR(plainBytes, keyHex, ivHex);
	return bytesToHex(cipherBytes);
}

/** Decrypts a Hex ciphertext string with SPECK-64/128 CTR and returns text */
export function decryptText(ciphertextHex: string, keyHex: string, ivHex: string): string {
	const cipherBytes = hexToBytes(ciphertextHex);
	const plainBytes = speckCTR(cipherBytes, keyHex, ivHex);
	return bytesToString(plainBytes);
}
