import {AnkiConnectNoteExt} from "./note";

const ANKI_PORT: number = 8765

export function invoke(action: string, params = {}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.addEventListener('error', () => reject('failed to issue request'));
		xhr.addEventListener('load', () => {
			try {
				const response = JSON.parse(xhr.responseText);
				if (Object.getOwnPropertyNames(response).length != 2) {
					return reject(Error('response has an unexpected number of fields'));
				}
				if (!response.hasOwnProperty('error')) {
					return reject(Error('response is missing required error field'));
				}
				if (!response.hasOwnProperty('result')) {
					return reject(Error('response is missing required result field'));
				}
				if (response.error) {
					return reject(response.error);
				}
				resolve(response.result);
			} catch (e) {
				reject(e);
			}
		});

		xhr.open('POST', 'http://127.0.0.1:' + ANKI_PORT.toString());
		xhr.send(JSON.stringify({action, version: 6, params}));
	});
}

export async function getAnkiNoteHashes(): Promise<string[]> {
	const tags = await invoke('getTags') as string[]
	console.log("getAnkiNoteHashes tag list: ", tags)
	return tags.filter((a) => a.startsWith('idsha256'))
		.map((a) => a.slice(8))
		.filter((a) => a.length === 64)
}

export async function batchDelNotesBySha256(shaArr: Array<string>) {
	let allNoteIds: Array<string> = []
	for (let sha of shaArr) {
		const noteIds: Array<string> = await findNotesBySha256(sha)
		allNoteIds = allNoteIds.concat(noteIds)
	}
	console.log("Requesting batchDelNotesBySha256, shaArr: ", shaArr, " allNoteIds: ", allNoteIds)
	if (!allNoteIds) {
		return
	}
	await invoke("deleteNotes", {"notes": allNoteIds})
}

export async function findNotesBySha256(sha: string): Promise<Array<string>> {
	const tag = "idsha256" + sha
	return await invoke("findNotes", {"query": "tag:" + tag}) as Array<string>
}

export async function ensureDecksExist(deckNames: Array<string>) {
	for (let deckName of deckNames) {
		await invoke("createDeck", {"deck": deckName})
	}
}

export async function clearUnusedTags() {
	console.info("Requesting clearUnusedTags...")
	await invoke("clearUnusedTags",)
}

export async function mediaFileExists(filename: string) {
	console.info("Requesting mediaFileExists...")
	const files = await invoke("getMediaFilesNames", {"pattern": filename}) as string[]
	console.log('files: ', files)
	return files.length > 0
}

export async function storeMediaFile(filename: string, data: string) {
	console.info("Requesting storeMediaFile...")
	await invoke("storeMediaFile", {
		filename: filename,
		data: data
	})
}

export async function batchModNotes(notes: AnkiConnectNoteExt[]) {
	for (let note of notes) {
		try {
			await invoke("addNote", {"note": note.note})
		} catch (err) {
			if (err === "cannot create note because it is a duplicate") {
				const curNoteIds: Array<string> = await findNotesBySha256(note.idSha256)
				// if(!curNoteIds){
				// 	console.log("Updating note error, target note not found: ", note)
				// 	continue
				// }
				const modNote = {
					"id": curNoteIds[0],
					...note.note
				}
				console.log("batchModNotes-->Updating note: ", modNote)
				// update fields
				await invoke("updateNoteFields", {"note": modNote})
				// update tags
				await syncTags(curNoteIds[0], note)
			} else {
				throw err
			}
		}
	}
}

async function syncTags(noteId: string, note: AnkiConnectNoteExt) {
	const ankiNote = await invoke("notesInfo", {"notes": [noteId]})
	// @ts-ignore
	const oldTags: Array<string> = ankiNote[0].tags
	const newTags: Array<string> = note.note.tags

	const tagsToDel = oldTags.filter(e => !newTags.includes(e))
	const tagsToAdd = newTags.filter(e => !oldTags.includes(e))

	await invoke("removeTags", {"notes": [noteId], "tags": tagsToDel.join(" ")})
	await invoke("addTags", {"notes": [noteId], "tags": tagsToAdd.join(" ")})
}
