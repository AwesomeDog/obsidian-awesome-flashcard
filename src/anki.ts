import type {AnkiConnectNoteExt} from "./note";

const ANKI_URL = "http://127.0.0.1:8765";
const DUPLICATE_NOTE_ERROR = "cannot create note because it is a duplicate";
type Params = Record<string, unknown>;
type AnkiResponse = {error: unknown; result: unknown};
type NoteInfo = {tags: string[]};

function isTwoFieldObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && Object.getOwnPropertyNames(value).length === 2;
}

export async function invoke<T = unknown>(action: string, params: Params = {}): Promise<T> {
	let response: Response;
	try {
		response = await fetch(ANKI_URL, {
			method: "POST",
			body: JSON.stringify({action, version: 6, params}),
		});
	} catch {
		throw "failed to issue request";
	}

	const payload: unknown = JSON.parse(await response.text());
	if (!isTwoFieldObject(payload)) throw Error("response has an unexpected number of fields");
	if (!Object.hasOwn(payload, "error")) throw Error("response is missing required error field");
	if (!Object.hasOwn(payload, "result")) throw Error("response is missing required result field");
	const responseData = payload as AnkiResponse;
	if (responseData.error) throw responseData.error;
	return responseData.result as T;
}

export async function getAnkiNoteHashes(): Promise<string[]> {
	const tags = await invoke<string[]>("getTags");
	console.log("getAnkiNoteHashes tag list: ", tags);
	return tags.filter((tag) => tag.startsWith("idsha256")).map((tag) => tag.slice(8)).filter((hash) => hash.length === 64);
}

export async function batchDelNotesBySha256(hashes: string[]): Promise<void> {
	const noteIds: number[] = [];
	for (const hash of hashes) noteIds.push(...await findNotesBySha256(hash));
	console.log("Requesting batchDelNotesBySha256, shaArr: ", hashes, " allNoteIds: ", noteIds);
	await invoke("deleteNotes", {notes: noteIds});
}

export function findNotesBySha256(sha: string): Promise<number[]> {
	return invoke<number[]>("findNotes", {query: `tag:idsha256${sha}`});
}

export async function ensureDecksExist(deckNames: string[]): Promise<void> {
	for (const deck of deckNames) await invoke("createDeck", {deck});
}

export async function clearUnusedTags(): Promise<void> {
	console.info("Requesting clearUnusedTags...");
	await invoke("clearUnusedTags");
}

export async function mediaFileExists(filename: string): Promise<boolean> {
	console.info("Requesting mediaFileExists...");
	const files = await invoke<string[]>("getMediaFilesNames", {pattern: filename});
	console.log("files: ", files);
	return files.length > 0;
}

export async function storeMediaFile(filename: string, data: string): Promise<void> {
	console.info("Requesting storeMediaFile...");
	await invoke("storeMediaFile", {filename, data});
}

export async function batchModNotes(notes: AnkiConnectNoteExt[]): Promise<void> {
	for (const note of notes) {
		try {
			await invoke("addNote", {note: note.note});
		} catch (error) {
			if (error !== DUPLICATE_NOTE_ERROR) throw error;
			const [id] = await findNotesBySha256(note.idSha256);
			const updatedNote = {id, ...note.note};
			console.log("batchModNotes-->Updating note: ", updatedNote);
			await invoke("updateNoteFields", {note: updatedNote});
			await syncTags(id, note);
		}
	}
}

async function syncTags(noteId: number, note: AnkiConnectNoteExt): Promise<void> {
	const [{tags: oldTags}] = await invoke<NoteInfo[]>("notesInfo", {notes: [noteId]});
	const {tags: newTags} = note.note;
	await invoke("removeTags", {notes: [noteId], tags: oldTags.filter((tag) => !newTags.includes(tag)).join(" ")});
	await invoke("addTags", {notes: [noteId], tags: newTags.filter((tag) => !oldTags.includes(tag)).join(" ")});
}
