/** Measures the rendered width of a string in the current font, in pixels. */
export type MeasureText = (text: string) => number;

/**
 * Greedy word wrap. Splits on spaces, keeps adding words to the current line
 * while they fit inside `maxWidth` and starts a new line when they do not. An
 * explicit newline in the input always forces a line break. A single word wider
 * than `maxWidth` gets its own line rather than being cut in half - the box is
 * expected to be wide enough for prose, not for one giant token.
 */
export function wrapText(text: string, maxWidth: number, measure: MeasureText): string[] {
	const lines: string[] = [];

	for (const paragraph of text.split("\n")) {
		const words = paragraph.split(/\s+/).filter((word) => word.length > 0);

		if (words.length === 0) {
			lines.push("");
			continue;
		}

		let current = "";

		for (const word of words) {
			const candidate = current.length === 0 ? word : `${current} ${word}`;

			if (current.length > 0 && measure(candidate) > maxWidth) {
				lines.push(current);
				current = word;
			} else {
				current = candidate;
			}
		}

		lines.push(current);
	}

	return lines;
}

/** Words in a wrapped page - the units the reveal counts in. Blank lines contribute nothing. */
export function countWords(lines: string[]): number {
	return lines.reduce((total, line) => total + splitWords(line).length, 0);
}

/** Words of one wrapped line, in order. */
export function splitWords(line: string): string[] {
	return line.split(/\s+/).filter((word) => word.length > 0);
}

/**
 * How many words of the current page should be visible, given how long the page
 * has been on screen. Words appear one at a time, `delay` milliseconds apart,
 * with the first one there from the start - so a 20 word page is fully shown
 * after `19 * delay`.
 */
export function revealedWordCount(elapsed: number, delay: number, totalWords: number): number {
	if (delay <= 0) {
		return totalWords;
	}

	const shown = 1 + Math.floor(elapsed / delay);
	return Math.min(totalWords, Math.max(1, shown));
}
