import seedrandom from 'seedrandom';

export interface RgbaBuffer {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

export interface BlobifyOptions {
	melt: number; // 0..1 (default 0.62)
	colorMerge: number; // 0..1 (default 0.42)
	maxColors: number; // 2..16 (default 6)
	jumpiness: number; // 0..1 (default 0.5)
	seed: string; // default 'blob'
	frameCount?: number; // default 6
	fps?: number; // default 6
	highDetail?: boolean; // default false
}

export interface ConnectedBlob {
	id: number;
	colorIndex: number;
	pixels: number[]; // flat indices wy * workW + wx
	cx: number; // centroid x in working grid coords
	cy: number; // centroid y in working grid coords
	area: number;
	enclosingBlobId: number | null;
	enclosedByColor: number | null;
}

export interface PreparedSource {
	workW: number;
	workH: number;
	contentW: number;
	contentH: number;
	pad: number;
	outW: number;
	outH: number;
	highDetail: boolean;
	palette: [number, number, number][];
	blobs: ConnectedBlob[];
}

export interface BlobAnimation {
	frames: RgbaBuffer[];
	width: number;
	height: number;
	fps: number;
	palette: [number, number, number][];
}

const MAX_WORK_DIM = 96;
const TARGET_CONTENT = 240;
const PAD_RATIO = 0.15;
const HIGH_DETAIL_MAX_WORK_DIM = 480;
const HIGH_DETAIL_TARGET_CONTENT = 512;

function clamp(v: number, lo: number, hi: number): number {
	return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
	if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
	const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

function srgbToLinear(c: number): number {
	const v = c / 255;
	return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
	const lr = srgbToLinear(r);
	const lg = srgbToLinear(g);
	const lb = srgbToLinear(b);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

function oklabDistSq(a: [number, number, number], b: [number, number, number]): number {
	const dl = a[0] - b[0];
	const da = a[1] - b[1];
	const db = a[2] - b[2];
	return dl * dl + da * da + db * db;
}

/**
 * Downsample source with premultiplied area averaging when larger than maxWorkDim.
 */
function normalizeWorkingBuffer(source: RgbaBuffer, maxWorkDim = MAX_WORK_DIM): RgbaBuffer {
	const { width: srcW, height: srcH, data: srcData } = source;
	if (srcW <= 0 || srcH <= 0) {
		return { width: 1, height: 1, data: new Uint8ClampedArray(4) };
	}

	const maxSide = Math.max(srcW, srcH);
	if (maxSide <= maxWorkDim) {
		return source;
	}

	const scale = maxWorkDim / maxSide;
	const workW = Math.max(1, Math.round(srcW * scale));
	const workH = Math.max(1, Math.round(srcH * scale));
	const out = new Uint8ClampedArray(workW * workH * 4);

	for (let wy = 0; wy < workH; wy++) {
		const sy0 = (wy * srcH) / workH;
		const sy1 = ((wy + 1) * srcH) / workH;
		const iy0 = Math.floor(sy0);
		const iy1 = Math.min(srcH - 1, Math.floor(sy1 - 1e-9));

		for (let wx = 0; wx < workW; wx++) {
			const sx0 = (wx * srcW) / workW;
			const sx1 = ((wx + 1) * srcW) / workW;
			const ix0 = Math.floor(sx0);
			const ix1 = Math.min(srcW - 1, Math.floor(sx1 - 1e-9));

			let wSum = 0;
			let aSum = 0;
			let rSum = 0;
			let gSum = 0;
			let bSum = 0;

			for (let sy = iy0; sy <= iy1; sy++) {
				const overlapY = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
				if (overlapY <= 0) continue;

				for (let sx = ix0; sx <= ix1; sx++) {
					const overlapX = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
					if (overlapX <= 0) continue;

					const weight = overlapX * overlapY;
					const idx = (sy * srcW + sx) * 4;
					const alpha = srcData[idx + 3] / 255;

					wSum += weight;
					aSum += weight * srcData[idx + 3];
					rSum += weight * alpha * srcData[idx];
					gSum += weight * alpha * srcData[idx + 1];
					bSum += weight * alpha * srcData[idx + 2];
				}
			}

			const outIdx = (wy * workW + wx) * 4;
			if (wSum > 0 && aSum > 0) {
				const meanA = aSum / wSum;
				const alphaFactor = meanA / 255;
				out[outIdx] = Math.round(rSum / (wSum * alphaFactor));
				out[outIdx + 1] = Math.round(gSum / (wSum * alphaFactor));
				out[outIdx + 2] = Math.round(bSum / (wSum * alphaFactor));
				out[outIdx + 3] = Math.round(meanA);
			}
		}
	}

	return { width: workW, height: workH, data: out };
}

interface ColorCluster {
	sumR: number;
	sumG: number;
	sumB: number;
	count: number;
	rgb: [number, number, number];
	lab: [number, number, number];
}

function makeCluster(sumR: number, sumG: number, sumB: number, count: number): ColorCluster {
	const r = Math.round(sumR / count);
	const g = Math.round(sumG / count);
	const b = Math.round(sumB / count);
	return {
		sumR,
		sumG,
		sumB,
		count,
		rgb: [r, g, b],
		lab: rgbToOklab(r, g, b)
	};
}

function bucketOpaqueColors(
	data: Uint8ClampedArray,
	totalPixels: number,
	shift: number
): ColorCluster[] {
	const map = new Map<number, { sumR: number; sumG: number; sumB: number; count: number }>();
	for (let p = 0; p < totalPixels; p++) {
		const idx = p * 4;
		if (data[idx + 3] < 128) continue;
		const r = data[idx];
		const g = data[idx + 1];
		const b = data[idx + 2];
		const key = ((r >> shift) << 16) | ((g >> shift) << 8) | (b >> shift);
		const entry = map.get(key);
		if (entry) {
			entry.sumR += r;
			entry.sumG += g;
			entry.sumB += b;
			entry.count++;
		} else {
			map.set(key, { sumR: r, sumG: g, sumB: b, count: 1 });
		}
	}
	const clusters: ColorCluster[] = [];
	for (const entry of map.values()) {
		clusters.push(makeCluster(entry.sumR, entry.sumG, entry.sumB, entry.count));
	}
	return clusters;
}

function consolidateColors(
	work: RgbaBuffer,
	colorMerge: number,
	maxColors: number
): { palette: [number, number, number][]; labels: Int32Array } {
	const totalPixels = work.width * work.height;
	const labels = new Int32Array(totalPixels).fill(-1);

	let clusters = bucketOpaqueColors(work.data, totalPixels, 0);
	if (clusters.length === 0) {
		return { palette: [], labels };
	}

	// Keep initial cluster count bounded for noisy high-color photos
	for (const shift of [3, 4, 5]) {
		if (clusters.length <= 256) break;
		clusters = bucketOpaqueColors(work.data, totalPixels, shift);
	}

	const mergeDist = 0.01 + clamp(colorMerge, 0, 1) * 0.14;
	const mergeDistSq = mergeDist * mergeDist;
	const cap = Math.max(1, Math.round(clamp(maxColors, 2, 16)));

	while (clusters.length > 1) {
		let bestI = 0;
		let bestJ = 1;
		let minDistSq = Infinity;

		for (let i = 0; i < clusters.length; i++) {
			const labI = clusters[i].lab;
			for (let j = i + 1; j < clusters.length; j++) {
				const dSq = oklabDistSq(labI, clusters[j].lab);
				if (dSq < minDistSq) {
					minDistSq = dSq;
					bestI = i;
					bestJ = j;
				}
			}
		}

		if (minDistSq > mergeDistSq && clusters.length <= cap) {
			break;
		}

		// When forcing reduction above cap after similar colors are merged, prefer merging smaller regions
		if (minDistSq > mergeDistSq && clusters.length > cap) {
			let bestWeighted = Infinity;
			for (let i = 0; i < clusters.length; i++) {
				const ci = clusters[i];
				for (let j = i + 1; j < clusters.length; j++) {
					const cj = clusters[j];
					const ward =
						((ci.count * cj.count) / (ci.count + cj.count)) * oklabDistSq(ci.lab, cj.lab);
					if (ward < bestWeighted) {
						bestWeighted = ward;
						bestI = i;
						bestJ = j;
					}
				}
			}
		}

		const a = clusters[bestI];
		const b = clusters[bestJ];
		clusters[bestI] = makeCluster(
			a.sumR + b.sumR,
			a.sumG + b.sumG,
			a.sumB + b.sumB,
			a.count + b.count
		);
		clusters[bestJ] = clusters[clusters.length - 1];
		clusters.pop();
	}

	clusters.sort((a, b) => {
		if (b.count !== a.count) return b.count - a.count;
		const keyA = (a.rgb[0] << 16) | (a.rgb[1] << 8) | a.rgb[2];
		const keyB = (b.rgb[0] << 16) | (b.rgb[1] << 8) | b.rgb[2];
		return keyA - keyB;
	});

	const palette = clusters.map((c) => c.rgb);
	const paletteLab = clusters.map((c) => c.lab);

	// Cache exact RGB -> palette index for fast lookup
	const exactCache = new Map<number, number>();
	for (let p = 0; p < totalPixels; p++) {
		const idx = p * 4;
		if (work.data[idx + 3] < 128) continue;
		const r = work.data[idx];
		const g = work.data[idx + 1];
		const b = work.data[idx + 2];
		const rgbKey = (r << 16) | (g << 8) | b;
		let best = exactCache.get(rgbKey);
		if (best === undefined) {
			const lab = rgbToOklab(r, g, b);
			best = 0;
			let bestD = Infinity;
			for (let c = 0; c < paletteLab.length; c++) {
				const d = oklabDistSq(lab, paletteLab[c]);
				if (d < bestD) {
					bestD = d;
					best = c;
				}
			}
			exactCache.set(rgbKey, best);
		}
		labels[p] = best;
	}

	return { palette, labels };
}

function extractConnectedBlobs(workW: number, workH: number, labels: Int32Array): ConnectedBlob[] {
	const total = workW * workH;
	const visited = new Uint8Array(total);
	const blobIdGrid = new Int32Array(total).fill(-1);
	const blobs: ConnectedBlob[] = [];
	const queue = new Int32Array(total);

	for (let start = 0; start < total; start++) {
		const colorIndex = labels[start];
		if (colorIndex < 0 || visited[start]) continue;

		const blobId = blobs.length;
		visited[start] = 1;
		let head = 0;
		let tail = 0;
		queue[tail++] = start;

		const pixels: number[] = [];
		let sumX = 0;
		let sumY = 0;

		while (head < tail) {
			const cur = queue[head++];
			pixels.push(cur);
			blobIdGrid[cur] = blobId;
			const cx = cur % workW;
			const cy = (cur - cx) / workW;
			sumX += cx + 0.5;
			sumY += cy + 0.5;

			for (let dy = -1; dy <= 1; dy++) {
				const ny = cy + dy;
				if (ny < 0 || ny >= workH) continue;
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0) continue;
					const nx = cx + dx;
					if (nx < 0 || nx >= workW) continue;
					const nIdx = ny * workW + nx;
					if (!visited[nIdx] && labels[nIdx] === colorIndex) {
						visited[nIdx] = 1;
						queue[tail++] = nIdx;
					}
				}
			}
		}

		const area = pixels.length;
		blobs.push({
			id: blobId,
			colorIndex,
			pixels,
			cx: sumX / area,
			cy: sumY / area,
			area,
			enclosingBlobId: null,
			enclosedByColor: null
		});
	}

	// Identify blobs completely enclosed by a parent blob (leaf peeling handles blobs that themselves contain holes, e.g. 'O', 'B', '8')
	const neighborSets = Array.from({ length: blobs.length }, () => new Set<number>());
	const touchesOutside = new Uint8Array(blobs.length);

	for (const blob of blobs) {
		const nSet = neighborSets[blob.id];
		for (const pIdx of blob.pixels) {
			const wx = pIdx % workW;
			const wy = (pIdx - wx) / workW;
			if (wx === 0 || wx === workW - 1 || wy === 0 || wy === workH - 1) {
				touchesOutside[blob.id] = 1;
				break;
			}

			const neighbors = [pIdx - 1, pIdx + 1, pIdx - workW, pIdx + workW];
			for (const nIdx of neighbors) {
				const nBlobId = blobIdGrid[nIdx];
				if (nBlobId === blob.id) continue;
				if (nBlobId < 0) {
					touchesOutside[blob.id] = 1;
					break;
				}
				nSet.add(nBlobId);
			}
			if (touchesOutside[blob.id]) break;
		}
	}

	const leafQueue: number[] = [];
	const peeled = new Uint8Array(blobs.length);
	for (let id = 0; id < blobs.length; id++) {
		if (!touchesOutside[id] && neighborSets[id].size === 1) {
			leafQueue.push(id);
			peeled[id] = 1;
		}
	}

	let qHead = 0;
	while (qHead < leafQueue.length) {
		const id = leafQueue[qHead++];
		const iter = neighborSets[id].values().next();
		if (iter.done) continue;
		const parentId = iter.value;
		blobs[id].enclosingBlobId = parentId;
		blobs[id].enclosedByColor = blobs[parentId].colorIndex;

		neighborSets[parentId].delete(id);
		if (!touchesOutside[parentId] && !peeled[parentId] && neighborSets[parentId].size === 1) {
			peeled[parentId] = 1;
			leafQueue.push(parentId);
		}
	}

	return blobs;
}

export function prepareSource(
	source: RgbaBuffer,
	colorMerge: number,
	maxColors: number,
	highDetail = false
): PreparedSource {
	const maxWorkDim = highDetail ? HIGH_DETAIL_MAX_WORK_DIM : MAX_WORK_DIM;
	const targetContent = highDetail ? HIGH_DETAIL_TARGET_CONTENT : TARGET_CONTENT;

	const work = normalizeWorkingBuffer(source, maxWorkDim);
	const workW = work.width;
	const workH = work.height;
	const scale = targetContent / Math.max(workW, workH);
	const contentW = Math.max(1, Math.round(workW * scale));
	const contentH = Math.max(1, Math.round(workH * scale));
	const pad = highDetail
		? Math.round(clamp(Math.min(contentW, contentH) * 0.18, 24, 42))
		: Math.round(TARGET_CONTENT * PAD_RATIO);
	const outW = contentW + pad * 2;
	const outH = contentH + pad * 2;

	const { palette, labels } = consolidateColors(work, colorMerge, maxColors);
	const blobs = extractConnectedBlobs(workW, workH, labels);

	return {
		workW,
		workH,
		contentW,
		contentH,
		pad,
		outW,
		outH,
		highDetail,
		palette,
		blobs
	};
}

function computeBoxRadii(sigma: number): [number, number, number] {
	if (sigma < 0.4) return [0, 0, 0];
	const n = 3;
	const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
	let wl = Math.floor(wIdeal);
	if (wl % 2 === 0) wl--;
	wl = Math.max(1, wl);
	const wu = wl + 2;
	const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
	const rLow = (wl - 1) / 2;
	const rHigh = (wu - 1) / 2;
	return [0 < m ? rLow : rHigh, 1 < m ? rLow : rHigh, 2 < m ? rLow : rHigh];
}

function boxBlurHorizontal(
	src: Float32Array,
	dst: Float32Array,
	w: number,
	h: number,
	r: number
): void {
	if (r <= 0) {
		dst.set(src);
		return;
	}
	const invD = 1 / (2 * r + 1);
	for (let y = 0; y < h; y++) {
		const row = y * w;
		let sum = 0; // float64 accumulator
		for (let k = 0; k <= r && k < w; k++) {
			sum += src[row + k];
		}
		dst[row] = sum * invD;
		for (let x = 1; x < w; x++) {
			const right = x + r;
			if (right < w) sum += src[row + right];
			const left = x - r - 1;
			if (left >= 0) sum -= src[row + left];
			dst[row + x] = sum * invD;
		}
	}
}

function boxBlurVertical(
	src: Float32Array,
	dst: Float32Array,
	w: number,
	h: number,
	r: number
): void {
	if (r <= 0) {
		dst.set(src);
		return;
	}
	const invD = 1 / (2 * r + 1);
	for (let x = 0; x < w; x++) {
		let sum = 0; // float64 accumulator
		for (let k = 0; k <= r && k < h; k++) {
			sum += src[k * w + x];
		}
		dst[x] = sum * invD;
		for (let y = 1; y < h; y++) {
			const bottom = y + r;
			if (bottom < h) sum += src[bottom * w + x];
			const top = y - r - 1;
			if (top >= 0) sum -= src[top * w + x];
			dst[y * w + x] = sum * invD;
		}
	}
}

function gaussianBlurField(
	src: Float32Array,
	dst: Float32Array,
	scratchA: Float32Array,
	scratchB: Float32Array,
	w: number,
	h: number,
	radii: [number, number, number]
): void {
	boxBlurHorizontal(src, scratchA, w, h, radii[0]);
	boxBlurVertical(scratchA, scratchB, w, h, radii[0]);
	boxBlurHorizontal(scratchB, scratchA, w, h, radii[1]);
	boxBlurVertical(scratchA, scratchB, w, h, radii[1]);
	boxBlurHorizontal(scratchB, scratchA, w, h, radii[2]);
	boxBlurVertical(scratchA, dst, w, h, radii[2]);
}

function sampleBilinearZeroPad(
	field: Float32Array,
	w: number,
	h: number,
	sx: number,
	sy: number
): number {
	const x0 = Math.floor(sx);
	const y0 = Math.floor(sy);
	const x1 = x0 + 1;
	const y1 = y0 + 1;
	const fx = sx - x0;
	const fy = sy - y0;

	let v00 = 0;
	let v10 = 0;
	let v01 = 0;
	let v11 = 0;

	if (y0 >= 0 && y0 < h) {
		const row0 = y0 * w;
		if (x0 >= 0 && x0 < w) v00 = field[row0 + x0];
		if (x1 >= 0 && x1 < w) v10 = field[row0 + x1];
	}
	if (y1 >= 0 && y1 < h) {
		const row1 = y1 * w;
		if (x0 >= 0 && x0 < w) v01 = field[row1 + x0];
		if (x1 >= 0 && x1 < w) v11 = field[row1 + x1];
	}

	const top = v00 + (v10 - v00) * fx;
	const bot = v01 + (v11 - v01) * fx;
	return top + (bot - top) * fy;
}

interface BoilWave {
	kx: number;
	ky: number;
	phaseX: number;
	phaseY: number;
	amp: number;
}

interface BlobTransform {
	dx: number;
	dy: number;
	scale: number;
	cx: number;
	cy: number;
	weight: number;
}

function rasterizeBlobPixels(
	pixels: number[],
	workW: number,
	scaleX: number,
	scaleY: number,
	pad: number,
	outW: number,
	outH: number,
	tx: BlobTransform,
	targetField: Float32Array,
	maskField: Float32Array,
	clearField: Float32Array | null
): void {
	for (const pIdx of pixels) {
		const wx = pIdx % workW;
		const wy = (pIdx - wx) / workW;

		const gx0 = tx.cx + (wx - tx.cx) * tx.scale;
		const gx1 = tx.cx + (wx + 1 - tx.cx) * tx.scale;
		const gy0 = tx.cy + (wy - tx.cy) * tx.scale;
		const gy1 = tx.cy + (wy + 1 - tx.cy) * tx.scale;

		const ox0 = Math.max(0, Math.floor(pad + gx0 * scaleX + tx.dx - 0.5));
		const ox1 = Math.min(outW - 1, Math.ceil(pad + gx1 * scaleX + tx.dx + 0.5) - 1);
		const oy0 = Math.max(0, Math.floor(pad + gy0 * scaleY + tx.dy - 0.5));
		const oy1 = Math.min(outH - 1, Math.ceil(pad + gy1 * scaleY + tx.dy + 0.5) - 1);

		for (let oy = oy0; oy <= oy1; oy++) {
			const row = oy * outW;
			for (let ox = ox0; ox <= ox1; ox++) {
				const idx = row + ox;
				if (tx.weight > targetField[idx]) targetField[idx] = tx.weight;
				maskField[idx] = 1;
				if (clearField) clearField[idx] = 0;
			}
		}
	}
}

export function renderBlobFrame(
	prepared: PreparedSource,
	options: BlobifyOptions,
	frameIndex: number
): RgbaBuffer {
	const { workW, workH, contentW, contentH, pad, outW, outH, highDetail, palette, blobs } =
		prepared;
	const outData = new Uint8ClampedArray(outW * outH * 4);
	if (palette.length === 0 || blobs.length === 0) {
		return { width: outW, height: outH, data: outData };
	}

	const melt = clamp(options.melt, 0, 1);
	const jumpiness = clamp(options.jumpiness, 0, 1);
	const scaleX = contentW / workW;
	const scaleY = contentH / workH;
	const pxSize = Math.min(scaleX, scaleY);

	// Outer silhouette gets strong liquid rounding at higher melt while allowing crisp edges at melt = 0
	const sigmaOuter = 0.5 + Math.pow(melt, 1.35) * 24.0;
	const sigmaColor = highDetail
		? Math.min(sigmaOuter, 0.5 + Math.pow(melt, 1.45) * 14.0)
		: workW <= 32 && workH <= 32
			? Math.min(sigmaOuter, 0.5 + Math.pow(melt, 1.3) * Math.max(8.5, pxSize * 0.72))
			: Math.min(sigmaOuter, 0.5 + Math.pow(melt, 1.35) * 14.5);
	const radiiOuter = computeBoxRadii(sigmaOuter);
	const radiiColor = computeBoxRadii(sigmaColor);

	const rng = seedrandom(`${options.seed}:frame:${frameIndex}`);
	const totalOut = outW * outH;
	const numColors = palette.length;

	const maskField = new Float32Array(totalOut);
	const colorFields = Array.from({ length: numColors }, () => new Float32Array(totalOut));

	const globalDx = (rng() * 2 - 1) * jumpiness * (highDetail ? 3.0 : 4.5);
	const globalDy = (rng() * 2 - 1) * jumpiness * (highDetail ? 3.0 : 4.5);
	const localHopMax = highDetail
		? jumpiness * Math.min(7.5, Math.max(2.2, 2.0 + sigmaColor * 0.6))
		: jumpiness * Math.min(10, Math.max(3.0, sigmaColor * 0.85));

	// Small-blob boost prevents tiny 1-3px accents (eyes, '>' cursor, LEDs) from being drowned by surrounding background fields
	const smallBoostThreshold = Math.max(1, (sigmaColor / Math.max(pxSize, 1)) * 4.5);

	const counterHoleFlags = blobs.map((blob) => {
		if (blob.enclosingBlobId === null) return false;
		const parent = blobs[blob.enclosingBlobId];
		if (parent.enclosingBlobId === null) return false;
		const grandParent = blobs[parent.enclosingBlobId];
		return (
			blob.colorIndex === grandParent.colorIndex &&
			grandParent.area > parent.area &&
			parent.area > blob.area
		);
	});

	// Compute deterministic seeded transforms for all non-counter-hole blobs first
	const transforms: BlobTransform[] = new Array(blobs.length);
	for (let i = 0; i < blobs.length; i++) {
		if (counterHoleFlags[i]) continue;
		const blob = blobs[i];
		const dx = globalDx + (rng() * 2 - 1) * localHopMax;
		const dy = globalDy + (rng() * 2 - 1) * localHopMax;
		const blobScale = 1 + (rng() * 2 - 1) * (highDetail ? 0.06 : 0.1) * jumpiness;
		const smallBoost = !highDetail && blob.area < smallBoostThreshold ? 1.25 : 1.0;
		const weight = smallBoost * (1 + (rng() * 2 - 1) * 0.2 * jumpiness);
		transforms[i] = { dx, dy, scale: blobScale, cx: blob.cx, cy: blob.cy, weight };
	}

	// Counter-holes inherit their parent letter/shape transform so holes move in lockstep
	for (let i = 0; i < blobs.length; i++) {
		if (!counterHoleFlags[i]) continue;
		const parentIdx = blobs[i].enclosingBlobId!;
		const parentTx = transforms[parentIdx];
		transforms[i] = {
			dx: parentTx.dx,
			dy: parentTx.dy,
			scale: parentTx.scale,
			cx: parentTx.cx,
			cy: parentTx.cy,
			weight: parentTx.weight + 0.15
		};
	}

	// Order blobs by nesting depth so parents render before enclosed children
	const depths = new Int32Array(blobs.length);
	for (let i = 0; i < blobs.length; i++) {
		let d = 0;
		let p = blobs[i].enclosingBlobId;
		while (p !== null && d < blobs.length) {
			d++;
			p = blobs[p].enclosingBlobId;
		}
		depths[i] = d;
	}
	const order = blobs.map((_, i) => i).sort((a, b) => depths[a] - depths[b]);

	// Pass A: Rasterize top-level blobs and backfill parent color under enclosed children (prevents background cracks)
	for (const i of order) {
		const blob = blobs[i];
		if (blob.enclosingBlobId === null) {
			rasterizeBlobPixels(
				blob.pixels,
				workW,
				scaleX,
				scaleY,
				pad,
				outW,
				outH,
				transforms[i],
				colorFields[blob.colorIndex],
				maskField,
				null
			);
			continue;
		}
		if (counterHoleFlags[i]) {
			const parent = blobs[blob.enclosingBlobId];
			const grandId = parent.enclosingBlobId!;
			const grand = blobs[grandId];
			rasterizeBlobPixels(
				blob.pixels,
				workW,
				scaleX,
				scaleY,
				pad,
				outW,
				outH,
				transforms[grandId],
				colorFields[grand.colorIndex],
				maskField,
				null
			);
		} else {
			const parentId = blob.enclosingBlobId;
			const parent = blobs[parentId];
			rasterizeBlobPixels(
				blob.pixels,
				workW,
				scaleX,
				scaleY,
				pad,
				outW,
				outH,
				transforms[parentId],
				colorFields[parent.colorIndex],
				maskField,
				null
			);
		}
	}

	// Pass B: Rasterize enclosed non-counter-hole blobs (clearing enclosing parent directly underneath)
	for (const i of order) {
		const blob = blobs[i];
		if (blob.enclosingBlobId === null || counterHoleFlags[i]) continue;
		const parentColor = blobs[blob.enclosingBlobId].colorIndex;
		rasterizeBlobPixels(
			blob.pixels,
			workW,
			scaleX,
			scaleY,
			pad,
			outW,
			outH,
			transforms[i],
			colorFields[blob.colorIndex],
			maskField,
			colorFields[parentColor]
		);
	}

	// Pass C: Rasterize counter-holes last so they punch cleanly through their parent stroke
	for (const i of order) {
		if (!counterHoleFlags[i]) continue;
		const blob = blobs[i];
		const parentColor = blobs[blob.enclosingBlobId!].colorIndex;
		rasterizeBlobPixels(
			blob.pixels,
			workW,
			scaleX,
			scaleY,
			pad,
			outW,
			outH,
			transforms[i],
			colorFields[blob.colorIndex],
			maskField,
			colorFields[parentColor]
		);
	}

	// 2. Separable Gaussian approximation blur for silhouette and each color field
	const scratchA = new Float32Array(totalOut);
	const scratchB = new Float32Array(totalOut);
	const blurredMask = new Float32Array(totalOut);
	gaussianBlurField(maskField, blurredMask, scratchA, scratchB, outW, outH, radiiOuter);

	const blurredColors = colorFields.map((src) => {
		const dst = new Float32Array(totalOut);
		gaussianBlurField(src, dst, scratchA, scratchB, outW, outH, radiiColor);
		return dst;
	});

	// 3. Seeded low-frequency liquid boil warp
	const waves: BoilWave[] = [];
	if (jumpiness > 0) {
		const maxWarp = highDetail
			? jumpiness * Math.min(5.5, 1.4 + sigmaOuter * 0.25)
			: jumpiness * Math.min(7.5, 2.5 + sigmaOuter * 0.35);
		const waveScale = Math.max(contentW, contentH);
		const ampPerWave = maxWarp / 2.2;
		for (let k = 0; k < 4; k++) {
			const wavelength = (0.35 + rng() * 0.5) * waveScale;
			const freq = (2 * Math.PI) / wavelength;
			const angle = rng() * 2 * Math.PI;
			waves.push({
				kx: Math.cos(angle) * freq,
				ky: Math.sin(angle) * freq,
				phaseX: rng() * 2 * Math.PI,
				phaseY: rng() * 2 * Math.PI,
				amp: ampPerWave
			});
		}
	}

	// 4. Crisp screen-space gradient anti-aliased winner-take-all compositing
	const hasWarp = waves.length > 0;

	for (let y = 0; y < outH; y++) {
		const row = y * outW;
		for (let x = 0; x < outW; x++) {
			let sx = x;
			let sy = y;
			if (hasWarp) {
				let wx = 0;
				let wy = 0;
				for (let k = 0; k < 4; k++) {
					const wv = waves[k];
					const arg = wv.kx * x + wv.ky * y;
					wx += Math.sin(arg + wv.phaseX) * wv.amp;
					wy += Math.cos(arg + wv.phaseY) * wv.amp;
				}
				sx = x + wx;
				sy = y + wy;
			}

			const mVal = hasWarp
				? sampleBilinearZeroPad(blurredMask, outW, outH, sx, sy)
				: blurredMask[row + x];
			if (mVal < 0.3) continue;

			const mRight = hasWarp
				? sampleBilinearZeroPad(blurredMask, outW, outH, sx + 1, sy)
				: x + 1 < outW
					? blurredMask[row + x + 1]
					: 0;
			const mDown = hasWarp
				? sampleBilinearZeroPad(blurredMask, outW, outH, sx, sy + 1)
				: y + 1 < outH
					? blurredMask[row + outW + x]
					: 0;
			const mGrad = Math.hypot(mRight - mVal, mDown - mVal);
			const aaOuter = Math.max(mGrad * 1.15, 0.002);

			if (mVal <= 0.5 - aaOuter) continue;

			const alpha = Math.round(255 * smoothstep(0.5 - aaOuter, 0.5 + aaOuter, mVal));
			if (alpha <= 0) continue;

			let c1 = 0;
			let v1 = -Infinity;
			let c2 = 0;
			let v2 = -Infinity;

			for (let c = 0; c < numColors; c++) {
				const field = blurredColors[c];
				const v = hasWarp ? sampleBilinearZeroPad(field, outW, outH, sx, sy) : field[row + x];
				if (v > v1) {
					v2 = v1;
					c2 = c1;
					v1 = v;
					c1 = c;
				} else if (v > v2) {
					v2 = v;
					c2 = c;
				}
			}

			const col1 = palette[c1];
			let r = col1[0];
			let g = col1[1];
			let b = col1[2];

			if (numColors > 1) {
				const diff = v1 - v2;
				const f1 = blurredColors[c1];
				const f2 = blurredColors[c2];
				const diffRight = hasWarp
					? sampleBilinearZeroPad(f1, outW, outH, sx + 1, sy) -
						sampleBilinearZeroPad(f2, outW, outH, sx + 1, sy)
					: x + 1 < outW
						? f1[row + x + 1] - f2[row + x + 1]
						: 0;
				const diffDown = hasWarp
					? sampleBilinearZeroPad(f1, outW, outH, sx, sy + 1) -
						sampleBilinearZeroPad(f2, outW, outH, sx, sy + 1)
					: y + 1 < outH
						? f1[row + outW + x] - f2[row + outW + x]
						: 0;
				const aaInner = Math.max(Math.hypot(diffRight - diff, diffDown - diff) * 1.1, 0.001);

				if (diff < aaInner) {
					const col2 = palette[c2];
					const w1 = 0.5 + 0.5 * smoothstep(0, aaInner, diff);
					const w2 = 1 - w1;
					r = Math.round(col1[0] * w1 + col2[0] * w2);
					g = Math.round(col1[1] * w1 + col2[1] * w2);
					b = Math.round(col1[2] * w1 + col2[2] * w2);
				}
			}

			const outIdx = (row + x) * 4;
			outData[outIdx] = r;
			outData[outIdx + 1] = g;
			outData[outIdx + 2] = b;
			outData[outIdx + 3] = alpha;
		}
	}

	return { width: outW, height: outH, data: outData };
}

export function renderBlobAnimation(source: RgbaBuffer, options: BlobifyOptions): BlobAnimation {
	const prepared = prepareSource(
		source,
		options.colorMerge,
		options.maxColors,
		Boolean(options.highDetail)
	);
	const frameCount = Math.max(1, Math.round(options.frameCount ?? 6));
	const fps = Math.max(1, options.fps ?? 6);
	const frames: RgbaBuffer[] = [];

	for (let i = 0; i < frameCount; i++) {
		frames.push(renderBlobFrame(prepared, options, i));
	}

	return {
		frames,
		width: prepared.outW,
		height: prepared.outH,
		fps,
		palette: prepared.palette
	};
}
