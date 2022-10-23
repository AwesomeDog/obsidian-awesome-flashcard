import {describe, expect, test} from '@jest/globals';
import {
	batchDelNotesBySha256,
	batchModNotes,
	clearUnusedTags,
	ensureDecksExist,
	getAnkiNoteHashes,
	mediaFileExists
} from "../src/anki";
import {AnkiConnectNoteExt} from "../src/note";

describe('test anki module', () => {

	test('test getAnkiNoteHashes', async () => {
		await expect(getAnkiNoteHashes()).resolves
			.toBeInstanceOf(Array);
	});

	test('test batchDelNotesBySha256', async () => {
		await expect(batchDelNotesBySha256([])).resolves
			.toBeUndefined();
	});

	test('test clearUnusedTags', async () => {
		await expect(clearUnusedTags()).resolves
			.toBeUndefined();
	});

	test('test ensureDecksExist', async () => {
		await expect(ensureDecksExist(["a", "b", "c"])).resolves
			.toBeUndefined();
	});

	test('test batchModNotes', async () => {
		const note = new AnkiConnectNoteExt(
			"Default",
			"F",
			"B",
			["tag1", "tag2"],
			"a/b.md"
		)
		await expect(batchModNotes([note])).resolves
			.toBeUndefined();
	});

	test('test mediaFileExists', async () => {
		await expect(mediaFileExists('a.png')).resolves
			.toBeFalsy();
	});
});
