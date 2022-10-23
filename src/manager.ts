import {App, Notice, TFile} from "obsidian";
import {genSha256FromArrayBuf, getTagsFromRaw, unionRecords} from "./utils";
import AwesomeFlashcardPlugin from "./main";
import {
	batchDelNotesBySha256,
	batchModNotes,
	clearUnusedTags,
	ensureDecksExist,
	getAnkiNoteHashes,
	invoke
} from './anki'
import {AnkiConnectNoteExt} from "./note";
import {FilePath, NOTICE_TIMEOUT, Sha256, TIMEOUT_LIKE_INFINITY} from "./constants";
import {mdToHtml} from "./markdown";

async function isAnkiConnected(): Promise<boolean> {
	console.info("Checking connection to Anki...")
	try {
		await invoke('modelNames')
	} catch (e) {
		new Notice("Error, couldn't connect to Anki! Check console for error message.")
		return false
	}
	new Notice("Successfully connected to Anki! This could take a few minutes - please don't close Anki until the plugin is finished")
	return true
}

export async function scanVault(plugin: AwesomeFlashcardPlugin) {
	const app: App = plugin.app

	// ensure anki working
	new Notice('Scanning vault, check console for details...');
	if (!(await isAnkiConnected())) {
		return
	}

	const notice = new Notice(
		`Awesome Flashcard: \nScanning vault... `,
		TIMEOUT_LIKE_INFINITY
	);

	// list files and compare to cache
	const cachedFileHashes: Record<FilePath, Sha256> = plugin.settings.cachedFileHashes
	const newFileHashes: Record<FilePath, Sha256> = {}
	const files: TFile[] = app.vault.getMarkdownFiles()
	for (let file of files) {
		const fileData: ArrayBuffer = await app.vault.adapter.readBinary(file.path)
		newFileHashes[file.path] = genSha256FromArrayBuf(fileData)
	}

	const unchangedFiles: Array<FilePath> = []
	const changedFiles: Array<FilePath> = []
	for (let filePath of Object.keys(newFileHashes)) {
		if (cachedFileHashes.hasOwnProperty(filePath)
			&& cachedFileHashes[filePath] === newFileHashes[filePath]) {
			unchangedFiles.push(filePath)
		} else {
			changedFiles.push(filePath)
		}
	}

	console.log("changedFiles: ", changedFiles)
	const changedFileNotes: AnkiConnectNoteExt[] = []
	for (let filePath of changedFiles) {
		for (let note of await scanFile(filePath, plugin)) {
			changedFileNotes.push(note)
		}
	}

	// for notes in changedFiles, update anki regardless changed or not
	const unchangedFileNoteHashes: Record<FilePath, Sha256[]> = {}
	const changedFileNoteHashes: Record<FilePath, Sha256[]> = {}
	const cachedNoteHashes: Record<FilePath, Sha256[]> = plugin.settings.cachedNoteHashes
	for (let filePath of unchangedFiles) {
		if (cachedNoteHashes.hasOwnProperty(filePath)) {
			unchangedFileNoteHashes[filePath] = cachedNoteHashes[filePath]
		}
	}
	for (let note of changedFileNotes) {
		if (changedFileNoteHashes.hasOwnProperty(note.filePath)) {
			changedFileNoteHashes[note.filePath].push(note.idSha256)
		} else {
			changedFileNoteHashes[note.filePath] = [note.idSha256]
		}
	}

	const newNoteHashes: Record<FilePath, Sha256[]> = unionRecords(unchangedFileNoteHashes, changedFileNoteHashes)

	const newNoteHashArr: Array<string> = []
	for (let fp in newNoteHashes) {
		for (let sha of newNoteHashes[fp]) {
			newNoteHashArr.push(sha)
		}
	}

	// find notes to delete: either deleted or card front is changed
	const ankiNoteHashArr: Array<Sha256> = await getAnkiNoteHashes()
	console.log("ankiNoteHashArr: ", ankiNoteHashArr, "\nnewNoteHashArr: ", newNoteHashArr)
	const notesToDel: Array<Sha256> = ankiNoteHashArr.filter(oldSha => !newNoteHashArr.includes(oldSha))
	const notesToMod: AnkiConnectNoteExt[] = changedFileNotes

	if (notice) {
		notice.setMessage(
			`Awesome Flashcard: \nNotes processed, syncing anki... `,
		);
	}

	const newDeckNames = new Set<string>(plugin.settings.cachedDeckNames)
	notesToMod.forEach(v => newDeckNames.add(v.note.deckName))
	await ensureDecksExist(Array.from(newDeckNames))

	// executing anki crud
	console.log("notesToDel: ", notesToDel, "\nnotesToMod: ", notesToMod)
	await batchDelNotesBySha256(notesToDel)
	await batchModNotes(notesToMod)
	await clearUnusedTags()

	// update cache if success
	plugin.settings.cachedDeckNames = Array.from(newDeckNames)
	plugin.settings.cachedFileHashes = newFileHashes
	plugin.settings.cachedNoteHashes = newNoteHashes
	await plugin.saveSettings()

	console.log("scanVault finished")
	if (notice) {
		notice.setMessage(
			`Awesome Flashcard: \nscanVault finished `,
		);
		setTimeout(() => {
			notice.hide();
		}, NOTICE_TIMEOUT);
	}
}

export async function scanFile(filePath: string, plugin: AwesomeFlashcardPlugin): Promise<AnkiConnectNoteExt[]> {
	const file = plugin.app.vault.getAbstractFileByPath(filePath)
	if (!(file instanceof TFile)) {
		return []
	}

	const fileContent = await plugin.app.vault.cachedRead(file)

	let deckName = plugin.settings.defaultDeckName
	let globalTags: Array<string> = []
	const cache = plugin.app.metadataCache.getCache(filePath)
	if (cache?.frontmatter && cache.frontmatter['deckName']) {
		deckName = cache.frontmatter['deckName']
	}
	if (cache?.frontmatter && cache.frontmatter['tags']) {
		globalTags = getTagsFromRaw(cache.frontmatter['tags'])
	}

	const vaultName = plugin.app.vault.getName()
	return await parseNotes(plugin, fileContent, deckName, globalTags, filePath, vaultName)
}


export async function parseNotes(
	plugin: AwesomeFlashcardPlugin,
	content: string,
	deckName: string,
	globalTags: Array<string>,
	filePath: string,
	vaultName: string
): Promise<AnkiConnectNoteExt[]> {
	const res = []

	// const NOTE_REGEXP = /-{3}\n+?((?:(?!^---$)(?!#flashcard)[\s\S]\n?)+) #flashcard((?:[^\n])*)[\n]+?((?:(?!^---$)(?!#flashcard)[\s\S]\n?)+)-{3}/g
	content = content + "\n"
	const processedContent = content
		.split('---\n')
		.filter((e, i) => i < content.split("---\n").length - 1)
		.filter((e, i) => i > 0)
		.filter((s) => s.includes("#flashcard"))
		.map((s) => {
			const [front, ...rest] = s.split("#flashcard")
			const [tag, ...backArr] = rest.join().split("\n")
			const back = backArr.join("\n")
			return [front, tag, back]
		})
	console.log("parseNotes... filePath: ", filePath, " processedContent: ", processedContent)

	// const mdToHtml = isTestingWithJest() ? (async (s: string) => s) : ((await import('./markdown')).mdToHtml)

	for (let noteMatch of processedContent) {
		let [rawFront, rawTag, rawBack]: [string, string, string] = [noteMatch[0], noteMatch[1], noteMatch[2]]

		const front: string = await mdToHtml(plugin, rawFront)
		let back: string = await mdToHtml(plugin, rawBack)
		back = back + addSrcLink(vaultName, filePath)

		const tags = getTagsFromRaw(rawTag)
			.concat(globalTags)
			.filter((a) => a)

		const note = new AnkiConnectNoteExt(
			deckName,
			front,
			back,
			tags,
			filePath
		)
		console.log(JSON.stringify(note, null, 2))
		res.push(note)
	}
	return res
}

function addSrcLink(vaultName: string, filePath: string): string {
	// ob link: obsidian://open?vault=a&file=b.md
	return `<div style="text-align: left;"><br><br><a href="obsidian://open?vault=${
		encodeURIComponent(vaultName)}&file=${
		encodeURIComponent(filePath)}" style="font-size:xx-small;">Source</a></div>`
}
