import type { RgbaBuffer } from './engine';

export interface ZipEntry {
	name: string;
	data: Uint8Array;
}

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
})();

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < data.length; i++) {
		crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export function encodeZipStore(entries: ZipEntry[]): Uint8Array {
	const textEncoder = new TextEncoder();
	const prepared = entries.map((entry) => {
		const nameBytes = textEncoder.encode(entry.name);
		return {
			nameBytes,
			data: entry.data,
			crc: crc32(entry.data),
			offset: 0
		};
	});

	let totalLocal = 0;
	let totalCentral = 0;
	for (const item of prepared) {
		item.offset = totalLocal;
		totalLocal += 30 + item.nameBytes.length + item.data.length;
		totalCentral += 46 + item.nameBytes.length;
	}

	const out = new Uint8Array(totalLocal + totalCentral + 22);
	const view = new DataView(out.buffer);
	let pos = 0;

	// Local file headers + raw stored data
	for (const item of prepared) {
		view.setUint32(pos, 0x04034b50, true);
		view.setUint16(pos + 4, 20, true); // version needed
		view.setUint16(pos + 6, 0x0800, true); // UTF-8 filename flag
		view.setUint16(pos + 8, 0, true); // compression: STORE
		view.setUint16(pos + 10, 0, true);
		view.setUint16(pos + 12, 0, true);
		view.setUint32(pos + 14, item.crc, true);
		view.setUint32(pos + 18, item.data.length, true);
		view.setUint32(pos + 22, item.data.length, true);
		view.setUint16(pos + 26, item.nameBytes.length, true);
		view.setUint16(pos + 28, 0, true);
		pos += 30;
		out.set(item.nameBytes, pos);
		pos += item.nameBytes.length;
		out.set(item.data, pos);
		pos += item.data.length;
	}

	const cdOffset = pos;

	// Central directory headers
	for (const item of prepared) {
		view.setUint32(pos, 0x02014b50, true);
		view.setUint16(pos + 4, 20, true); // version made by
		view.setUint16(pos + 6, 20, true); // version needed
		view.setUint16(pos + 8, 0x0800, true); // UTF-8 filename flag
		view.setUint16(pos + 10, 0, true); // compression: STORE
		view.setUint16(pos + 12, 0, true);
		view.setUint16(pos + 14, 0, true);
		view.setUint32(pos + 16, item.crc, true);
		view.setUint32(pos + 20, item.data.length, true);
		view.setUint32(pos + 24, item.data.length, true);
		view.setUint16(pos + 28, item.nameBytes.length, true);
		view.setUint16(pos + 30, 0, true);
		view.setUint16(pos + 32, 0, true);
		view.setUint16(pos + 34, 0, true);
		view.setUint16(pos + 36, 0, true);
		view.setUint32(pos + 38, 0, true);
		view.setUint32(pos + 42, item.offset, true);
		pos += 46;
		out.set(item.nameBytes, pos);
		pos += item.nameBytes.length;
	}

	// End of central directory
	view.setUint32(pos, 0x06054b50, true);
	view.setUint16(pos + 4, 0, true);
	view.setUint16(pos + 6, 0, true);
	view.setUint16(pos + 8, prepared.length, true);
	view.setUint16(pos + 10, prepared.length, true);
	view.setUint32(pos + 12, totalCentral, true);
	view.setUint32(pos + 16, cdOffset, true);
	view.setUint16(pos + 20, 0, true);

	return out;
}

class ByteWriter {
	private buf = new Uint8Array(4096);
	private len = 0;

	private ensure(extra: number): void {
		if (this.len + extra <= this.buf.length) return;
		let nextCap = this.buf.length * 2;
		while (nextCap < this.len + extra) nextCap *= 2;
		const next = new Uint8Array(nextCap);
		next.set(this.buf.subarray(0, this.len));
		this.buf = next;
	}

	writeByte(b: number): void {
		this.ensure(1);
		this.buf[this.len++] = b & 0xff;
	}

	writeBytes(bytes: ArrayLike<number>): void {
		this.ensure(bytes.length);
		this.buf.set(bytes, this.len);
		this.len += bytes.length;
	}

	writeUint16LE(v: number): void {
		this.ensure(2);
		this.buf[this.len++] = v & 0xff;
		this.buf[this.len++] = (v >> 8) & 0xff;
	}

	writeAscii(str: string): void {
		this.ensure(str.length);
		for (let i = 0; i < str.length; i++) {
			this.buf[this.len++] = str.charCodeAt(i) & 0xff;
		}
	}

	toUint8Array(): Uint8Array {
		return this.buf.slice(0, this.len);
	}
}

function lzwEncodeIndices(indices: Uint8Array, minCodeSize: number): Uint8Array {
	const clearCode = 1 << minCodeSize;
	const eoiCode = clearCode + 1;
	const dict = new Map<number, number>();

	let nextCode = eoiCode + 1;
	let codeSize = minCodeSize + 1;
	let bitBuf = 0;
	let bitCount = 0;

	const rawBytes = new ByteWriter();
	const writeCode = (code: number, bits: number) => {
		bitBuf |= code << bitCount;
		bitCount += bits;
		while (bitCount >= 8) {
			rawBytes.writeByte(bitBuf & 0xff);
			bitBuf >>>= 8;
			bitCount -= 8;
		}
	};

	writeCode(clearCode, codeSize);

	if (indices.length > 0) {
		let prefix = indices[0];
		for (let i = 1; i < indices.length; i++) {
			const suffix = indices[i];
			const key = (prefix << 8) | suffix;
			const found = dict.get(key);
			if (found !== undefined) {
				prefix = found;
			} else {
				writeCode(prefix, codeSize);
				if (nextCode < 4096) {
					dict.set(key, nextCode++);
					if (nextCode > 1 << codeSize && codeSize < 12) {
						codeSize++;
					}
				} else {
					writeCode(clearCode, codeSize);
					dict.clear();
					nextCode = eoiCode + 1;
					codeSize = minCodeSize + 1;
				}
				prefix = suffix;
			}
		}
		writeCode(prefix, codeSize);
	}

	writeCode(eoiCode, codeSize);
	if (bitCount > 0) {
		rawBytes.writeByte(bitBuf & 0xff);
	}

	return rawBytes.toUint8Array();
}

export function encodeAnimatedGif(
	frames: RgbaBuffer[],
	fps: number,
	basePalette?: [number, number, number][]
): Uint8Array {
	if (frames.length === 0) {
		throw new Error('Cannot encode GIF with zero frames.');
	}
	const { width, height } = frames[0];
	if (width <= 0 || height <= 0) {
		throw new Error('GIF dimensions must be positive.');
	}
	for (let f = 1; f < frames.length; f++) {
		if (frames[f].width !== width || frames[f].height !== height) {
			throw new Error('All GIF frames must have matching dimensions.');
		}
	}

	// Index 0 is reserved for transparency
	const palette: [number, number, number][] = [[0, 0, 0]];
	const exactIndex = new Map<number, number>();

	if (basePalette) {
		for (const [r, g, b] of basePalette) {
			if (palette.length >= 256) break;
			const key = (r << 16) | (g << 8) | b;
			if (!exactIndex.has(key)) {
				exactIndex.set(key, palette.length);
				palette.push([r, g, b]);
			}
		}
	}

	// Fill remaining slots (up to 256) with most frequent opaque pixel colors across all frames
	const extraCounts = new Map<number, number>();
	for (const frame of frames) {
		const data = frame.data;
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] < 128) continue;
			const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
			if (!exactIndex.has(key)) {
				extraCounts.set(key, (extraCounts.get(key) ?? 0) + 1);
			}
		}
	}

	if (extraCounts.size > 0 && palette.length < 256) {
		const sorted = Array.from(extraCounts.entries()).sort((a, b) => b[1] - a[1]);
		for (const [key] of sorted) {
			if (palette.length >= 256) break;
			exactIndex.set(key, palette.length);
			palette.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]);
		}
	}

	let colorBits = 1;
	while (1 << colorBits < palette.length && colorBits < 8) {
		colorBits++;
	}
	const tableSize = 1 << colorBits;
	const minCodeSize = Math.max(2, colorBits);

	const out = new ByteWriter();
	out.writeAscii('GIF89a');

	// Logical Screen Descriptor
	out.writeUint16LE(width);
	out.writeUint16LE(height);
	const packedLsd = 0x80 | ((colorBits - 1) << 4) | (colorBits - 1);
	out.writeByte(packedLsd);
	out.writeByte(0); // background color index
	out.writeByte(0); // pixel aspect ratio

	// Global Color Table
	for (let i = 0; i < tableSize; i++) {
		if (i < palette.length) {
			out.writeByte(palette[i][0]);
			out.writeByte(palette[i][1]);
			out.writeByte(palette[i][2]);
		} else {
			out.writeByte(0);
			out.writeByte(0);
			out.writeByte(0);
		}
	}

	// Netscape 2.0 infinite loop extension
	out.writeBytes([0x21, 0xff, 0x0b]);
	out.writeAscii('NETSCAPE2.0');
	out.writeBytes([0x03, 0x01, 0x00, 0x00, 0x00]);

	const delayCs = Math.max(2, Math.round(100 / Math.max(1, fps)));
	const quantCache = new Map<number, number>(exactIndex);
	const opaqueCount = palette.length - 1;
	const pixelIndices = new Uint8Array(width * height);

	for (const frame of frames) {
		const data = frame.data;
		for (let p = 0; p < pixelIndices.length; p++) {
			const idx = p * 4;
			if (data[idx + 3] < 128 || opaqueCount === 0) {
				pixelIndices[p] = 0;
				continue;
			}
			const r = data[idx];
			const g = data[idx + 1];
			const b = data[idx + 2];
			const key = (r << 16) | (g << 8) | b;
			let colorIdx = quantCache.get(key);
			if (colorIdx === undefined) {
				colorIdx = 1;
				let bestDist = Infinity;
				for (let c = 1; c < palette.length; c++) {
					const dr = r - palette[c][0];
					const dg = g - palette[c][1];
					const db = b - palette[c][2];
					const dist = dr * dr + dg * dg + db * db;
					if (dist < bestDist) {
						bestDist = dist;
						colorIdx = c;
					}
				}
				quantCache.set(key, colorIdx);
			}
			pixelIndices[p] = colorIdx;
		}

		// Graphic Control Extension: disposal=2 (restore background), transparent=1, index=0
		out.writeBytes([0x21, 0xf9, 0x04, 0x09]);
		out.writeUint16LE(delayCs);
		out.writeBytes([0x00, 0x00]);

		// Image Descriptor
		out.writeByte(0x2c);
		out.writeUint16LE(0);
		out.writeUint16LE(0);
		out.writeUint16LE(width);
		out.writeUint16LE(height);
		out.writeByte(0x00);

		// LZW Image Data sub-blocks
		out.writeByte(minCodeSize);
		const lzw = lzwEncodeIndices(pixelIndices, minCodeSize);
		for (let offset = 0; offset < lzw.length; offset += 255) {
			const chunk = lzw.subarray(offset, Math.min(lzw.length, offset + 255));
			out.writeByte(chunk.length);
			out.writeBytes(chunk);
		}
		out.writeByte(0x00);
	}

	out.writeByte(0x3b);
	return out.toUint8Array();
}

export async function rgbaBufferToPngBytes(buf: RgbaBuffer): Promise<Uint8Array> {
	const canvas = document.createElement('canvas');
	canvas.width = buf.width;
	canvas.height = buf.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Could not acquire 2D context for PNG export.');
	}
	ctx.putImageData(new ImageData(new Uint8ClampedArray(buf.data), buf.width, buf.height), 0, 0);

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((b) => {
			if (b) resolve(b);
			else reject(new Error('Failed to encode PNG frame.'));
		}, 'image/png');
	});

	return new Uint8Array(await blob.arrayBuffer());
}

export async function buildPngSequenceZip(
	frames: RgbaBuffer[],
	baseName: string
): Promise<Uint8Array> {
	const entries: ZipEntry[] = await Promise.all(
		frames.map(async (frame, i) => ({
			name: `${baseName}_${String(i).padStart(2, '0')}.png`,
			data: await rgbaBufferToPngBytes(frame)
		}))
	);
	return encodeZipStore(entries);
}

export function triggerDownload(bytes: Uint8Array, filename: string, mimeType: string): void {
	const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
