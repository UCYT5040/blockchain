/** @noResolution @noSelf */
declare module 'crypto' {
	export const SPECK_KEY_BYTES: number;
	export const SPECK_IV_BYTES: number;
	export const SALT_BYTES: number;
	export const BLAKE2S_DIGEST_BYTES: number;
	export const DEFAULT_KEY_DERIVATION_ROUNDS: number;

	export function rotr32(x: number, n: number): number;
	export function rotl32(x: number, n: number): number;

	export function stringToBytes(str: string): number[];
	export function bytesToString(bytes: number[]): string;
	export function bytesToHex(bytes: number[]): string;
	export function hexToBytes(hex: string): number[];
	export function constantTimeCompare(a: string, b: string): boolean;
	export function generateRandomHex(byteCount: number): string;
	export function generateKey(): string;
	export function generateIV(): string;
	export function generateSalt(): string;

	export function speckExpandKey(k: number[]): number[];
	export function speckEncryptBlock(x: number, y: number, rk: number[]): [number, number];
	export function speckCTR(dataBytes: number[], keyHex: string, ivHex: string): number[];
	export function blake2s(inputStrOrBytes: string | number[], keyHex?: string): string;
	export function deriveKey(passphrase: string, saltHex: string, rounds?: number): string;
	export function encryptText(plaintext: string, keyHex: string, ivHex: string): string;
	export function decryptText(ciphertextHex: string, keyHex: string, ivHex: string): string;
}

