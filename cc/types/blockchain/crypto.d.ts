/** @noResolution @noSelf */
declare module 'crypto' {
	export function stringToBytes(str: string): number[];
	export function bytesToString(bytes: number[]): string;
	export function bytesToHex(bytes: number[]): string;
	export function hexToBytes(hex: string): number[];
	export function constantTimeCompare(a: string, b: string): boolean;
	export function generateRandomHex(byteCount: number): string;
	export function speckCTR(dataBytes: number[], keyHex: string, ivHex: string): number[];
	export function blake2s(inputStrOrBytes: string | number[], keyHex?: string): string;
	export function deriveKey(passphrase: string, saltHex: string, rounds?: number): string;
	export function encryptText(plaintext: string, keyHex: string, ivHex: string): string;
	export function decryptText(ciphertextHex: string, keyHex: string, ivHex: string): string;
}
