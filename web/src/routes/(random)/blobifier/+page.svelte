<script lang="ts">
	import { onMount } from 'svelte';
	import { prepareSource, renderBlobFrame, type PreparedSource, type RgbaBuffer } from './engine';
	import { buildPngSequenceZip, encodeAnimatedGif, triggerDownload } from './export';

	interface Preset {
		id: string;
		label: string;
		src: string;
	}

	const PRESETS: Preset[] = [
		{ id: 'turtle-advanced', label: 'Adv. Turtle', src: '/blobifier/examples/turtle-advanced.png' },
		{ id: 'turtle-normal', label: 'Turtle', src: '/blobifier/examples/turtle-normal.png' },
		{
			id: 'computer-advanced',
			label: 'Adv. Computer',
			src: '/blobifier/examples/computer-advanced.png'
		},
		{ id: 'computer-normal', label: 'Computer', src: '/blobifier/examples/computer-normal.png' },
		{ id: 'pocket-computer', label: 'Pocket PC', src: '/blobifier/examples/pocket-computer.png' },
		{ id: 'wireless-modem', label: 'Modem', src: '/blobifier/examples/wireless-modem.png' }
	];

	const FRAME_COUNT = 6;
	const FPS = 6;

	type InputMode = 'image' | 'text';
	type FontChoice = 'mojangles' | 'rounded' | 'sans';

	let mode = $state<InputMode>('image');
	let highDetail = $state(false);
	let melt = $state(0.62);
	let colorMerge = $state(0.42);
	let maxColors = $state(6);
	let jumpiness = $state(0.5);
	let seed = $state('blob');
	let playing = $state(true);
	let dragging = $state(false);
	let activePresetId = $state<string | null>(PRESETS[0].id);
	let sourceName = $state(PRESETS[0].label);
	let loadError = $state<string | null>(null);
	let exporting = $state<'png' | 'gif' | null>(null);
	let palette = $state<[number, number, number][]>([]);

	// Text mode state
	let textValue = $state('BLOB!');
	let textFont = $state<FontChoice>('mojangles');
	let textColor = $state('#ffffff');
	let bgEnabled = $state(false);
	let bgColor = $state('#1b2238');

	let imagePrefs = { melt: 0.62, jumpiness: 0.5, maxColors: 6, highDetail: false };
	let textPrefs = { melt: 0.16, jumpiness: 0.4, maxColors: 2, highDetail: true };

	let sourceBuffer = $state<RgbaBuffer | null>(null);
	let blobCanvas: HTMLCanvasElement | undefined = $state();
	let fileInput: HTMLInputElement | undefined = $state();

	let cachedSourceRef: RgbaBuffer | null = null;
	let cachedColorMerge = -1;
	let cachedMaxColors = -1;
	let cachedHighDetail = false;
	let cachedPrepared: PreparedSource | null = null;

	let rawFrames: RgbaBuffer[] = [];
	let frames: ImageData[] = [];
	let currentFrameIdx = 0;
	let renderGen = 0;
	let loadGen = 0;
	let textGen = 0;
	let pendingRaf = 0;

	function toImageData(buf: RgbaBuffer): ImageData {
		return new ImageData(new Uint8ClampedArray(buf.data), buf.width, buf.height);
	}

	function drawFrame(frame: ImageData) {
		if (!blobCanvas) return;
		if (blobCanvas.width !== frame.width || blobCanvas.height !== frame.height) {
			blobCanvas.width = frame.width;
			blobCanvas.height = frame.height;
		}
		const ctx = blobCanvas.getContext('2d');
		if (!ctx) return;
		ctx.putImageData(frame, 0, 0);
	}

	function getPrepared(
		src: RgbaBuffer,
		merge: number,
		cap: number,
		detail: boolean
	): PreparedSource {
		if (
			cachedPrepared &&
			cachedSourceRef === src &&
			cachedColorMerge === merge &&
			cachedMaxColors === cap &&
			cachedHighDetail === detail
		) {
			return cachedPrepared;
		}
		const prepared = prepareSource(src, merge, cap, detail);
		cachedSourceRef = src;
		cachedColorMerge = merge;
		cachedMaxColors = cap;
		cachedHighDetail = detail;
		cachedPrepared = prepared;
		return prepared;
	}

	function scheduleRender() {
		const src = sourceBuffer;
		if (!src || !blobCanvas) return;

		if (pendingRaf) {
			cancelAnimationFrame(pendingRaf);
			pendingRaf = 0;
		}

		const gen = ++renderGen;
		const options = {
			melt,
			colorMerge,
			maxColors,
			jumpiness,
			seed: seed || 'blob',
			frameCount: FRAME_COUNT,
			fps: FPS,
			highDetail
		};

		const prepared = getPrepared(src, options.colorMerge, options.maxColors, options.highDetail);
		palette = prepared.palette;

		const raw0 = renderBlobFrame(prepared, options, 0);
		const frame0 = toImageData(raw0);
		rawFrames = [raw0];
		frames = [frame0];
		if (currentFrameIdx >= FRAME_COUNT) currentFrameIdx = 0;
		drawFrame(frame0);

		let nextIdx = 1;
		const renderNext = () => {
			if (gen !== renderGen) return;
			if (nextIdx >= FRAME_COUNT) {
				pendingRaf = 0;
				return;
			}
			const raw = renderBlobFrame(prepared, options, nextIdx);
			const img = toImageData(raw);
			rawFrames[nextIdx] = raw;
			frames[nextIdx] = img;
			if (nextIdx === currentFrameIdx) {
				drawFrame(img);
			}
			nextIdx++;
			pendingRaf = requestAnimationFrame(renderNext);
		};

		if (FRAME_COUNT > 1) {
			pendingRaf = requestAnimationFrame(renderNext);
		}
	}

	function ensureAllFrames(): {
		frames: RgbaBuffer[];
		palette: [number, number, number][];
	} | null {
		const src = sourceBuffer;
		if (!src) return null;

		const options = {
			melt,
			colorMerge,
			maxColors,
			jumpiness,
			seed: seed || 'blob',
			frameCount: FRAME_COUNT,
			fps: FPS,
			highDetail
		};
		const prepared = getPrepared(src, options.colorMerge, options.maxColors, options.highDetail);
		for (let i = 0; i < FRAME_COUNT; i++) {
			if (!rawFrames[i]) {
				const raw = renderBlobFrame(prepared, options, i);
				rawFrames[i] = raw;
				frames[i] = toImageData(raw);
			}
		}
		return { frames: rawFrames.slice(0, FRAME_COUNT), palette: prepared.palette };
	}

	function slugifyName(name: string): string {
		const base = name
			.replace(/\.[^.]+$/, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-');
		return base.replace(/^-+|-+$/g, '') || 'blob';
	}

	async function exportPngSequence() {
		if (!sourceBuffer || exporting) return;
		exporting = 'png';
		loadError = null;
		try {
			const ready = ensureAllFrames();
			if (!ready) return;
			const slug = slugifyName(sourceName);
			const zipBytes = await buildPngSequenceZip(ready.frames, slug);
			triggerDownload(zipBytes, `${slug}-blob-frames.zip`, 'application/zip');
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to export PNG sequence.';
		} finally {
			exporting = null;
		}
	}

	function exportGif() {
		if (!sourceBuffer || exporting) return;
		exporting = 'gif';
		loadError = null;
		try {
			const ready = ensureAllFrames();
			if (!ready) return;
			const slug = slugifyName(sourceName);
			const gifBytes = encodeAnimatedGif(ready.frames, FPS, ready.palette);
			triggerDownload(gifBytes, `${slug}-blob.gif`, 'image/gif');
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to export GIF.';
		} finally {
			exporting = null;
		}
	}

	function extractImageBuffer(img: HTMLImageElement): RgbaBuffer | null {
		const width = img.naturalWidth || img.width;
		const height = img.naturalHeight || img.height;
		if (!width || !height) return null;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		ctx.clearRect(0, 0, width, height);
		ctx.drawImage(img, 0, 0);
		const imageData = ctx.getImageData(0, 0, width, height);
		return {
			width: imageData.width,
			height: imageData.height,
			data: imageData.data
		};
	}

	function loadFromUrl(url: string, name: string, presetId: string | null, revoke = false) {
		const gen = ++loadGen;
		loadError = null;
		const img = new Image();
		img.onload = () => {
			if (revoke) URL.revokeObjectURL(url);
			if (gen !== loadGen) return;
			const buf = extractImageBuffer(img);
			if (!buf) {
				loadError = 'Could not read image pixels.';
				return;
			}
			activePresetId = presetId;
			sourceName = name;
			currentFrameIdx = 0;
			sourceBuffer = buf;
		};
		img.onerror = () => {
			if (revoke) URL.revokeObjectURL(url);
			if (gen !== loadGen) return;
			loadError = `Failed to load ${name}.`;
		};
		img.src = url;
	}

	function loadFile(file: File) {
		if (!file.type.startsWith('image/')) {
			loadError = 'Please drop or choose an image file.';
			return;
		}
		if (mode === 'text') {
			textPrefs = { melt, jumpiness, maxColors, highDetail };
			mode = 'image';
			maxColors = imagePrefs.maxColors;
		}
		const objectUrl = URL.createObjectURL(file);
		loadFromUrl(objectUrl, file.name || 'Uploaded image', null, true);
	}

	function selectPreset(preset: Preset) {
		if (mode === 'text') {
			textPrefs = { melt, jumpiness, maxColors, highDetail };
			mode = 'image';
			melt = imagePrefs.melt;
			jumpiness = imagePrefs.jumpiness;
			maxColors = imagePrefs.maxColors;
			highDetail = imagePrefs.highDetail;
		} else if (activePresetId !== null) {
			highDetail = false;
			melt = 0.62;
			jumpiness = 0.5;
			maxColors = 6;
		}
		loadFromUrl(preset.src, preset.label, preset.id, false);
	}

	function switchToTextMode() {
		if (mode === 'text') return;
		imagePrefs = { melt, jumpiness, maxColors, highDetail };
		mode = 'text';
		activePresetId = null;
		melt = textPrefs.melt;
		jumpiness = textPrefs.jumpiness;
		maxColors = textPrefs.maxColors;
		highDetail = textPrefs.highDetail;
	}

	function resolveFontString(choice: FontChoice, sizePx: number): string {
		if (choice === 'mojangles') return `700 ${sizePx}px 'Mojangles', sans-serif`;
		if (choice === 'rounded')
			return `900 ${sizePx}px ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif`;
		return `900 ${sizePx}px system-ui, -apple-system, sans-serif`;
	}

	async function rasterizeText(
		value: string,
		fontChoice: FontChoice,
		fg: string,
		useBg: boolean,
		bg: string
	) {
		const gen = ++textGen;
		loadError = null;

		const lines = value.split(/\r?\n/);
		const longest = Math.max(...lines.map((l) => l.length), 1);
		const fontSize = Math.round(Math.min(88, Math.max(44, 88 - Math.max(0, longest - 7) * 3.5)));
		const tracking = Math.round(fontSize * 0.08);
		const lineHeight = Math.round(fontSize * 1.25);

		if (typeof document !== 'undefined' && document.fonts) {
			if (fontChoice === 'mojangles') {
				await document.fonts.load(`700 ${fontSize}px Mojangles`).catch(() => {});
			}
			await document.fonts.ready.catch(() => {});
		}
		if (gen !== textGen || mode !== 'text') return;

		const measureCanvas = document.createElement('canvas');
		const mCtx = measureCanvas.getContext('2d');
		if (!mCtx) return;

		const fontStr = resolveFontString(fontChoice, fontSize);
		mCtx.font = fontStr;

		const lineWidths = lines.map((line) => {
			const chars = Array.from(line);
			if (chars.length === 0) return 0;
			let w = 0;
			for (let c = 0; c < chars.length; c++) {
				w += mCtx.measureText(chars[c]).width;
				if (c < chars.length - 1) w += tracking;
			}
			return w;
		});

		const maxLineW = Math.max(...lineWidths, fontSize);
		const scratchW = Math.ceil(maxLineW + fontSize * 2);
		const scratchH = Math.ceil(lines.length * lineHeight + fontSize * 1.5);

		const scratch = document.createElement('canvas');
		scratch.width = scratchW;
		scratch.height = scratchH;
		const sCtx = scratch.getContext('2d');
		if (!sCtx) return;

		sCtx.font = fontStr;
		sCtx.fillStyle = fg;
		sCtx.textBaseline = 'top';
		sCtx.textAlign = 'left';

		for (let i = 0; i < lines.length; i++) {
			const chars = Array.from(lines[i]);
			let curX = (scratchW - lineWidths[i]) / 2;
			const curY = fontSize * 0.5 + i * lineHeight;
			for (let c = 0; c < chars.length; c++) {
				sCtx.fillText(chars[c], curX, curY);
				curX += sCtx.measureText(chars[c]).width + tracking;
			}
		}

		// Crop to exact inked bounds so Mojangles/system font metrics stay perfectly centered
		const rawImg = sCtx.getImageData(0, 0, scratchW, scratchH);
		const d = rawImg.data;
		let minX = scratchW;
		let minY = scratchH;
		let maxX = -1;
		let maxY = -1;

		for (let y = 0; y < scratchH; y++) {
			for (let x = 0; x < scratchW; x++) {
				if (d[(y * scratchW + x) * 4 + 3] > 0) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}

		const snippet = value.trim().slice(0, 20) || 'text';
		if (maxX < minX || maxY < minY) {
			sourceName = snippet;
			currentFrameIdx = 0;
			sourceBuffer = { width: 16, height: 16, data: new Uint8ClampedArray(16 * 16 * 4) };
			return;
		}

		const inkW = maxX - minX + 1;
		const inkH = maxY - minY + 1;
		const padX = useBg ? Math.round(fontSize * 0.45) : 4;
		const padY = useBg ? Math.round(fontSize * 0.35) : 4;
		const finalW = inkW + padX * 2;
		const finalH = inkH + padY * 2;

		const outCanvas = document.createElement('canvas');
		outCanvas.width = finalW;
		outCanvas.height = finalH;
		const oCtx = outCanvas.getContext('2d');
		if (!oCtx) return;

		if (useBg) {
			oCtx.fillStyle = bg;
			oCtx.fillRect(0, 0, finalW, finalH);
		}
		oCtx.drawImage(scratch, minX, minY, inkW, inkH, padX, padY, inkW, inkH);

		const finalImg = oCtx.getImageData(0, 0, finalW, finalH);
		sourceName = snippet;
		currentFrameIdx = 0;
		sourceBuffer = {
			width: finalImg.width,
			height: finalImg.height,
			data: finalImg.data
		};
	}

	function handleFileChange() {
		const file = fileInput?.files?.[0];
		if (file) {
			loadFile(file);
			if (fileInput) fileInput.value = '';
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		if (e.relatedTarget === null) {
			dragging = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) loadFile(file);
	}

	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					loadFile(file);
					return;
				}
			}
		}
	}

	function randomizeSeed() {
		seed = Math.random().toString(36).slice(2, 8);
	}

	$effect(() => {
		if (mode !== 'text') return;
		void rasterizeText(textValue, textFont, textColor, bgEnabled, bgColor);
	});

	$effect(() => {
		// Read reactive dependencies explicitly
		void sourceBuffer;
		void blobCanvas;
		void melt;
		void colorMerge;
		void maxColors;
		void jumpiness;
		void seed;
		void highDetail;
		scheduleRender();
	});

	$effect(() => {
		if (!playing) return;
		const interval = setInterval(() => {
			if (frames.length === 0) return;
			currentFrameIdx = (currentFrameIdx + 1) % FRAME_COUNT;
			const frame = frames[currentFrameIdx] ?? frames[0];
			if (frame) drawFrame(frame);
		}, 1000 / FPS);

		return () => clearInterval(interval);
	});

	onMount(() => {
		selectPreset(PRESETS[0]);
		return () => {
			if (pendingRaf) cancelAnimationFrame(pendingRaf);
		};
	});
</script>

<svelte:head>
	<title>Blobifier</title>
</svelte:head>

<svelte:window
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	onpaste={handlePaste}
/>

<main class="page">
	<header class="header">
		<h1>Blobifier</h1>
		<p class="subtitle">Drop, paste, upload, or pick a ComputerCraft sprite to melt into blobs.</p>
	</header>

	<section class="presets" aria-label="Example presets">
		{#each PRESETS as preset (preset.id)}
			<button
				type="button"
				class="preset-btn"
				class:active={activePresetId === preset.id}
				onclick={() => selectPreset(preset)}
				title={preset.label}
			>
				<img src={preset.src} alt={preset.label} />
				<span>{preset.label}</span>
			</button>
		{/each}

		<label class="upload-btn">
			<input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} />
			<span>Upload…</span>
		</label>

		<button
			type="button"
			class="preset-btn text-mode-btn"
			class:active={mode === 'text'}
			onclick={switchToTextMode}
		>
			<span>Text…</span>
		</button>
	</section>

	{#if mode === 'text'}
		<section class="text-bar" aria-label="Text generator options">
			<textarea
				class="text-input"
				rows="2"
				bind:value={textValue}
				placeholder="Type text to blobify…"
				aria-label="Text to blobify"></textarea>

			<div class="text-options">
				<label class="text-field">
					<span>Font</span>
					<select bind:value={textFont}>
						<option value="mojangles">Mojangles</option>
						<option value="rounded">Rounded</option>
						<option value="sans">Bold Sans</option>
					</select>
				</label>

				<label class="text-field">
					<span>Text</span>
					<input type="color" bind:value={textColor} />
				</label>

				<div class="text-field">
					<label class="bg-toggle">
						<input type="checkbox" bind:checked={bgEnabled} />
						<span>Background</span>
					</label>
					<input
						type="color"
						bind:value={bgColor}
						class:muted-color={!bgEnabled}
						onclick={() => (bgEnabled = true)}
						oninput={() => (bgEnabled = true)}
						aria-label="Background color"
					/>
				</div>
			</div>
		</section>
	{/if}

	{#if loadError}
		<p class="error" role="alert">{loadError}</p>
	{/if}

	<section class="workspace">
		<div class="stage" class:dragging>
			<div class="stage-bar">
				<span class="source-name">{sourceName}</span>
				<div class="stage-meta">
					{#if palette.length > 0}
						<div class="swatches" aria-label="Consolidated colors">
							{#each palette as [r, g, b], i (i)}
								<span class="swatch" style="background: rgb({r}, {g}, {b})"></span>
							{/each}
						</div>
					{/if}
					<button
						type="button"
						class="play-btn"
						onclick={() => (playing = !playing)}
						aria-label={playing ? 'Pause animation' : 'Play animation'}
					>
						{playing ? 'Pause' : 'Play'}
					</button>
				</div>
			</div>

			<div class="checkerboard">
				<canvas bind:this={blobCanvas} width="312" height="312"></canvas>
			</div>

			{#if dragging}
				<div class="drop-overlay">Drop image to blobify</div>
			{/if}
		</div>

		<div class="controls">
			<label class="control">
				<div class="control-head">
					<span>Melt</span>
					<span class="value">{melt.toFixed(2)}</span>
				</div>
				<input type="range" min="0" max="1" step="0.01" bind:value={melt} />
			</label>

			<label class="control">
				<div class="control-head">
					<span>Color Merge</span>
					<span class="value">{colorMerge.toFixed(2)}</span>
				</div>
				<input type="range" min="0" max="1" step="0.01" bind:value={colorMerge} />
			</label>

			<label class="control">
				<div class="control-head">
					<span>Max Colors</span>
					<span class="value">{maxColors}</span>
				</div>
				<input type="range" min="2" max="16" step="1" bind:value={maxColors} />
			</label>

			<label class="control">
				<div class="control-head">
					<span>Jumpiness</span>
					<span class="value">{jumpiness.toFixed(2)}</span>
				</div>
				<input type="range" min="0" max="1" step="0.01" bind:value={jumpiness} />
			</label>

			<label class="toggle-control">
				<span class="toggle-label">
					<span>High Detail</span>
					<span class="hint">for text</span>
				</span>
				<input type="checkbox" bind:checked={highDetail} />
			</label>

			<div class="control">
				<div class="control-head">
					<label for="seed-input">Seed</label>
				</div>
				<div class="seed-row">
					<input id="seed-input" type="text" bind:value={seed} placeholder="blob" />
					<button type="button" class="random-btn" onclick={randomizeSeed}>Random</button>
				</div>
			</div>

			<div class="export-row">
				<button
					type="button"
					class="export-btn"
					disabled={!sourceBuffer || exporting !== null}
					onclick={exportPngSequence}
				>
					{exporting === 'png' ? 'Zipping…' : 'PNG Seq (.zip)'}
				</button>
				<button
					type="button"
					class="export-btn"
					disabled={!sourceBuffer || exporting !== null}
					onclick={exportGif}
				>
					{exporting === 'gif' ? 'Encoding…' : 'GIF'}
				</button>
			</div>
		</div>
	</section>
</main>

<style>
	.page {
		max-width: 780px;
		margin: 0 auto;
		padding: 1.75rem 1.25rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.header h1 {
		margin: 0 0 0.25rem;
		font-size: 2rem;
	}

	.subtitle {
		margin: 0;
		font-size: 0.85rem;
		color: #9e9e9e;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.preset-btn,
	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--border-color);
		background: var(--background-color);
		color: #e2e2e2;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.75rem;
		transition:
			border-color 0.12s ease,
			background-color 0.12s ease;
	}

	.preset-btn:hover,
	.upload-btn:hover {
		border-color: #4c99b2;
	}

	.preset-btn.active {
		border-color: #7fcc19;
		background: #1a2211;
		color: #ffffff;
	}

	.preset-btn img {
		width: 24px;
		height: 24px;
		image-rendering: pixelated;
		object-fit: contain;
	}

	.upload-btn input {
		display: none;
	}

	.text-bar {
		background: var(--background-color);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.text-input {
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		padding: 0.45rem 0.6rem;
		border: 1px solid #353535;
		background: #0b0b0b;
		color: #f5f5f5;
		border-radius: 5px;
		font-family: inherit;
		font-size: 0.85rem;
	}

	.text-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: center;
		font-size: 0.76rem;
		color: #d4d4d4;
	}

	.text-field {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.text-field select {
		padding: 0.28rem 0.45rem;
		border: 1px solid #353535;
		background: #0b0b0b;
		color: #f0f0f0;
		border-radius: 5px;
		font-size: 0.75rem;
	}

	.text-field input[type='color'] {
		width: 28px;
		height: 24px;
		padding: 0;
		border: 1px solid #353535;
		background: transparent;
		border-radius: 4px;
		cursor: pointer;
	}

	.text-field input[type='color'].muted-color {
		opacity: 0.45;
	}

	.bg-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
	}

	.toggle-control {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.78rem;
		color: #d4d4d4;
		cursor: pointer;
	}

	.toggle-label {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.hint {
		font-size: 0.68rem;
		color: #888888;
	}

	.toggle-control input[type='checkbox'],
	.bg-toggle input[type='checkbox'] {
		accent-color: #7fcc19;
		cursor: pointer;
	}

	.error {
		margin: 0;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		background: #2b1414;
		border: 1px solid #8a2c2c;
		color: #ffb3b3;
		font-size: 0.8rem;
	}

	.workspace {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 250px;
		gap: 1.25rem;
		align-items: start;
	}

	.stage {
		position: relative;
		background: var(--background-color);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stage.dragging {
		border-color: #7fcc19;
	}

	.stage-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.78rem;
	}

	.source-name {
		color: #c8c8c8;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.stage-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.swatches {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.swatch {
		width: 11px;
		height: 11px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.25);
	}

	.play-btn,
	.random-btn,
	.export-btn {
		padding: 0.3rem 0.6rem;
		border: 1px solid #353535;
		background: #1b1b1b;
		color: #f0f0f0;
		border-radius: 5px;
		font-size: 0.72rem;
		cursor: pointer;
	}

	.play-btn:hover,
	.random-btn:hover,
	.export-btn:hover:not(:disabled) {
		border-color: #4c99b2;
	}

	.export-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.45rem;
		padding-top: 0.25rem;
		border-top: 1px solid var(--border-color);
	}

	.export-btn {
		padding: 0.42rem 0.5rem;
		text-align: center;
	}

	.export-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.checkerboard {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 330px;
		border-radius: 6px;
		overflow: hidden;
		background-color: #161616;
		background-image:
			linear-gradient(45deg, #1f1f1f 25%, transparent 25%),
			linear-gradient(-45deg, #1f1f1f 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #1f1f1f 75%),
			linear-gradient(-45deg, transparent 75%, #1f1f1f 75%);
		background-size: 20px 20px;
		background-position:
			0 0,
			0 10px,
			10px -10px,
			-10px 0;
	}

	canvas {
		max-width: 100%;
		height: auto;
		display: block;
	}

	.drop-overlay {
		position: absolute;
		inset: 0;
		border-radius: 8px;
		background: rgba(17, 17, 17, 0.85);
		border: 2px dashed #7fcc19;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.95rem;
		color: #7fcc19;
		pointer-events: none;
	}

	.controls {
		background: var(--background-color);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.78rem;
	}

	.control-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #d4d4d4;
	}

	.value {
		color: #7fcc19;
		font-variant-numeric: tabular-nums;
	}

	input[type='range'] {
		width: 100%;
		accent-color: #7fcc19;
		cursor: pointer;
	}

	.seed-row {
		display: flex;
		gap: 0.4rem;
	}

	#seed-input {
		flex: 1;
		min-width: 0;
		padding: 0.32rem 0.5rem;
		border: 1px solid #353535;
		background: #0b0b0b;
		color: #f0f0f0;
		border-radius: 5px;
		font-size: 0.78rem;
	}

	@media (max-width: 680px) {
		.workspace {
			grid-template-columns: 1fr;
		}
	}
</style>
