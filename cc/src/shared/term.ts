export interface WriteOptions {
	/**
	 * Whether to perform word wrapping (defaults to true).
	 * If false, text is wrapped strictly by character length.
	 */
	wordWrap?: boolean;
}

function splitLines(text: string): string[] {
	const lines: string[] = [];
	let currentLine = '';
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char === '\r') {
			continue;
		}
		if (char === '\n') {
			lines.push(currentLine);
			currentLine = '';
		} else {
			currentLine += char;
		}
	}
	lines.push(currentLine);
	return lines;
}

function findLastSpace(text: string, maxIndex: number): number {
	const limit = Math.min(maxIndex, text.length - 1);
	for (let i = limit; i >= 0; i--) {
		if (text[i] === ' ') {
			return i;
		}
	}
	return -1;
}

/**
 * Writes text to a terminal, supporting newlines ('\n'), automatic line wrapping,
 * and automatic terminal scrolling as needed.
 *
 * @param termOrText Terminal instance or text string if using default terminal.
 * @param textOrOptions Text string or options if using default terminal.
 * @param options Optional configuration for wrapping.
 */
export function write(text: string): void;
export function write(terminal: ITerminal | undefined, text: string, options?: WriteOptions): void;
export function write(
	termOrText?: ITerminal | string,
	textOrOptions?: string | WriteOptions,
	options?: WriteOptions
): void {
	let terminal: ITerminal;
	let text: string;
	let opts: WriteOptions | undefined;

	if (typeof termOrText === 'string') {
		terminal = term;
		text = termOrText;
		opts = textOrOptions as WriteOptions;
	} else {
		terminal = termOrText ?? term;
		text = typeof textOrOptions === 'string' ? textOrOptions : '';
		opts = options;
	}

	if (!terminal || !text) {
		return;
	}

	const wordWrap = opts?.wordWrap ?? true;
	const [width, height] = terminal.getSize();

	let [x, y] = terminal.getCursorPos();

	const paragraphs = splitLines(text);

	for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
		// Handle newlines
		if (pIndex > 0) {
			x = 1;
			y += 1;
			if (y > height) {
				terminal.scroll(1);
				y = height;
			}
			terminal.setCursorPos(x, y);
		}

		let paragraph = paragraphs[pIndex];

		while (paragraph.length > 0) {
			// Check if cursor is past right edge before writing
			if (x > width) {
				x = 1;
				y += 1;
				if (y > height) {
					terminal.scroll(1);
					y = height;
				}
				terminal.setCursorPos(x, y);
			}

			const spaceRemaining = width - x + 1;

			if (paragraph.length <= spaceRemaining) {
				// Entire remaining paragraph fits on current line
				terminal.setCursorPos(x, y);
				terminal.write(paragraph);
				x += paragraph.length;
				paragraph = '';
			} else {
				// Paragraph length exceeds remaining space on current line
				let chunkLength = spaceRemaining;

				if (wordWrap && spaceRemaining < width) {
					const lastSpace = findLastSpace(paragraph, spaceRemaining);
					if (lastSpace > 0) {
						chunkLength = lastSpace;
					}
				}

				const chunk = paragraph.substring(0, chunkLength);

				terminal.setCursorPos(x, y);
				terminal.write(chunk);

				if (wordWrap && chunkLength < paragraph.length && paragraph[chunkLength] === ' ') {
					paragraph = paragraph.substring(chunkLength + 1);
				} else {
					paragraph = paragraph.substring(chunkLength);
				}

				x = 1;
				y += 1;
				if (y > height) {
					terminal.scroll(1);
					y = height;
				}
				terminal.setCursorPos(x, y);
			}
		}
	}

	terminal.setCursorPos(x, y);
}

/**
 * Writes text to a terminal followed by a newline, supporting automatic wrapping and scrolling.
 */
export function writeLine(text: string): void;
export function writeLine(
	terminal: ITerminal | undefined,
	text: string,
	options?: WriteOptions
): void;
export function writeLine(
	termOrText?: ITerminal | string,
	textOrOptions?: string | WriteOptions,
	options?: WriteOptions
): void {
	if (typeof termOrText === 'string') {
		write(term, termOrText + '\n', textOrOptions as WriteOptions);
	} else {
		write(termOrText, (typeof textOrOptions === 'string' ? textOrOptions : '') + '\n', options);
	}
}
