import {beforeEach, describe, expect, test} from "@jest/globals";
import {
	batchDelNotesBySha256,
	batchModNotes,
	clearUnusedTags,
	ensureDecksExist,
	getAnkiNoteHashes,
	invoke,
	mediaFileExists,
} from "../src/anki";
import {AnkiConnectNoteExt} from "../src/note";

const mockFetch = jest.fn();
const response = (result: unknown, error: unknown = null) =>
	({text: async () => JSON.stringify({result, error})} as Response);

beforeEach(() => {
	mockFetch.mockReset();
	mockFetch.mockImplementation(async (_input: unknown, init: RequestInit) => {
		const {action} = JSON.parse(String(init?.body)) as {action: string};
		const result = action === "getTags" || action === "getMediaFilesNames" || action === "findNotes"
			? []
			: action === "notesInfo" ? [{tags: []}] : null;
		return {text: async () => JSON.stringify({result, error: null})} as Response;
	});
	Object.defineProperty(globalThis, "fetch", {configurable: true, value: mockFetch, writable: true});
});

describe("Anki integration", () => {
	test("reads note hashes", async () => expect(getAnkiNoteHashes()).resolves.toEqual([]));
	test("handles an empty deletion batch", async () => expect(batchDelNotesBySha256([])).resolves.toBeUndefined());
	test("clears unused tags", async () => expect(clearUnusedTags()).resolves.toBeUndefined());
	test("creates requested decks", async () => expect(ensureDecksExist(["a", "b", "c"])).resolves.toBeUndefined());
	test("adds a note", async () => {
		const note = new AnkiConnectNoteExt("Default", "F", "B", ["tag1", "tag2"], "a/b.md");
		await expect(batchModNotes([note])).resolves.toBeUndefined();
	});
	test("updates duplicate notes and synchronizes tags", async () => {
		mockFetch
			.mockResolvedValueOnce(response(null, "cannot create note because it is a duplicate"))
			.mockResolvedValueOnce(response([7]))
			.mockResolvedValueOnce(response(null))
			.mockResolvedValueOnce(response([{tags: []}]))
			.mockResolvedValue(response(null));
		const note = new AnkiConnectNoteExt("Default", "F", "B", ["tag1"], "a/b.md");
		await expect(batchModNotes([note])).resolves.toBeUndefined();
		expect(mockFetch).toHaveBeenCalledTimes(6);
	});
	test("checks media files", async () => expect(mediaFileExists("a.png")).resolves.toBe(false));
	test("rejects malformed responses", async () => {
		mockFetch.mockResolvedValueOnce({text: async () => "{}"});
		await expect(invoke("modelNames")).rejects.toThrow("unexpected number of fields");
	});
});
