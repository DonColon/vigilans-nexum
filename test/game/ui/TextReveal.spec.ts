import { test, expect, suite } from "vitest";
import { countWords, revealedWordCount, splitWords, wrapText } from "@/game/ui/model/TextReveal";

/** Stand-in for canvas text measurement: every glyph is 10px wide. */
const measure = (text: string) => text.length * 10;

suite("Text Reveal Test Suite", () => {
	test("A short line is left as one line", () => {
		expect(wrapText("a short line", 1000, measure)).toStrictEqual(["a short line"]);
	});

	test("Words are wrapped greedily to the width", () => {
		// "one two" is 70px, "one two three" is 130px - so "three" starts a new line at 120px.
		expect(wrapText("one two three four", 120, measure)).toStrictEqual(["one two", "three four"]);
	});

	test("An explicit newline always breaks, empty lines are kept", () => {
		expect(wrapText("top\n\nbottom", 1000, measure)).toStrictEqual(["top", "", "bottom"]);
	});

	test("A word wider than the box gets its own line rather than being cut", () => {
		expect(wrapText("tiny enormouslylongword tiny", 60, measure)).toStrictEqual(["tiny", "enormouslylongword", "tiny"]);
	});

	test("Runs of whitespace collapse", () => {
		expect(wrapText("a   b\tc", 1000, measure)).toStrictEqual(["a b c"]);
	});

	test("Words are counted across every wrapped line, blank lines aside", () => {
		expect(countWords(["one two", "", "three four five"])).toBe(5);
		expect(splitWords("  the   guardians  ")).toStrictEqual(["the", "guardians"]);
	});

	test("The first word shows immediately, the rest one delay apart", () => {
		expect(revealedWordCount(0, 45, 10)).toBe(1);
		expect(revealedWordCount(44, 45, 10)).toBe(1);
		expect(revealedWordCount(45, 45, 10)).toBe(2);
		expect(revealedWordCount(405, 45, 10)).toBe(10);
		expect(revealedWordCount(5000, 45, 10)).toBe(10);
	});

	test("A zero delay reveals the whole page at once", () => {
		expect(revealedWordCount(0, 0, 12)).toBe(12);
	});
});
