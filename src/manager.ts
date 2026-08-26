import {Notice, TFile} from "obsidian";
import type {App} from "obsidian";
import {
	batchDelNotesBySha256,
	batchModNotes,
	clearUnusedTags,
	ensureDecksExist,
	getAnkiNoteHashes,
	invoke,
	storeMediaFile,
} from "./anki";
import type AwesomeFlashcardPlugin from "./main";
import {mdToHtml} from "./markdown";
import {AnkiConnectNoteExt} from "./note";
import {NOTICE_TIMEOUT, TIMEOUT_LIKE_INFINITY} from "./constants";
import type {FilePath, Sha256} from "./constants";
import {genSha256FromArrayBuf, getTagsFromRaw, unionRecords} from "./utils";
import obStyle from "./_obsidian_card.txt";

async function isAnkiConnected(): Promise<boolean> {
	console.info("Checking connection to Anki...");
	try {
		await invoke("modelNames");
	} catch {
		new Notice("Error, couldn't connect to Anki! Check console for error message.");
		return false;
	}
	new Notice("Successfully connected to Anki! This could take a few minutes - please don't close Anki until the plugin is finished");
	return true;
}

export async function scanVault(plugin: AwesomeFlashcardPlugin): Promise<void> {
	const app: App = plugin.app;
	new Notice("Scanning vault, check console for details...");
	if (!(await isAnkiConnected())) return;

	await storeMediaFile("_obsidian_card.css", btoa(unescape(encodeURIComponent(obStyle))));
	const notice = new Notice("Awesome Flashcard: \nScanning vault... ", TIMEOUT_LIKE_INFINITY);
	const newFileHashes: Record<FilePath, Sha256> = {};
	for (const file of app.vault.getMarkdownFiles()) {
		newFileHashes[file.path] = genSha256FromArrayBuf(await app.vault.adapter.readBinary(file.path));
	}

	const unchangedFiles: FilePath[] = [];
	const changedFiles: FilePath[] = [];
	for (const [filePath, hash] of Object.entries(newFileHashes)) {
		(Object.hasOwn(plugin.settings.cachedFileHashes, filePath)
			&& plugin.settings.cachedFileHashes[filePath] === hash ? unchangedFiles : changedFiles).push(filePath);
	}

	console.log("changedFiles: ", changedFiles);
	const changedFileNotes: AnkiConnectNoteExt[] = [];
	for (const filePath of changedFiles) changedFileNotes.push(...await scanFile(filePath, plugin));

	const unchangedFileNoteHashes: Record<FilePath, Sha256[]> = {};
	for (const filePath of unchangedFiles) {
		if (Object.hasOwn(plugin.settings.cachedNoteHashes, filePath)) {
			unchangedFileNoteHashes[filePath] = plugin.settings.cachedNoteHashes[filePath];
		}
	}
	const changedFileNoteHashes: Record<FilePath, Sha256[]> = {};
	for (const note of changedFileNotes) (changedFileNoteHashes[note.filePath] ??= []).push(note.idSha256);

	const newNoteHashes = unionRecords(unchangedFileNoteHashes, changedFileNoteHashes);
	const newNoteHashArr = Object.values(newNoteHashes).flat();
	const ankiNoteHashArr = await getAnkiNoteHashes();
	console.log("ankiNoteHashArr: ", ankiNoteHashArr, "\nnewNoteHashArr: ", newNoteHashArr);
	const notesToDel = ankiNoteHashArr.filter((hash) => !newNoteHashArr.includes(hash));
	const notesToMod = changedFileNotes;

	notice.setMessage("Awesome Flashcard: \nNotes processed, syncing anki... ");
	const newDeckNames = new Set([
		...plugin.settings.cachedDeckNames,
		...notesToMod.map(({note}) => note.deckName),
	]);
	await ensureDecksExist([...newDeckNames]);

	console.log("notesToDel: ", notesToDel, "\nnotesToMod: ", notesToMod);
	await batchDelNotesBySha256(notesToDel);
	await batchModNotes(notesToMod);
	await clearUnusedTags();

	Object.assign(plugin.settings, {
		cachedDeckNames: [...newDeckNames],
		cachedFileHashes: newFileHashes,
		cachedNoteHashes: newNoteHashes,
	});
	await plugin.saveSettings();

	console.log("scanVault finished");
	notice.setMessage("Awesome Flashcard: \nscanVault finished ");
	setTimeout(() => notice.hide(), NOTICE_TIMEOUT);
}

export async function scanFile(filePath: string, plugin: AwesomeFlashcardPlugin): Promise<AnkiConnectNoteExt[]> {
	const file = plugin.app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) return [];

	const content = await plugin.app.vault.cachedRead(file);
	const frontmatter = plugin.app.metadataCache.getCache(filePath)?.frontmatter;
	const deckName = frontmatter?.deckName || plugin.settings.defaultDeckName;
	const globalTags = frontmatter?.tags ? getTagsFromRaw(frontmatter.tags) : [];
	return parseNotes(plugin, content, deckName, globalTags, filePath, plugin.app.vault.getName());
}

export async function parseNotes(
	plugin: AwesomeFlashcardPlugin,
	content: string,
	deckName: string,
	globalTags: string[],
	filePath: string,
	vaultName: string,
): Promise<AnkiConnectNoteExt[]> {
	const sections = `${content}\n`.split("---\n").slice(1, -1);
	const noteParts = sections
		.filter((section) => section.includes("#flashcard"))
		.map((section) => {
			const [front, ...rest] = section.split("#flashcard");
			const [tag, ...back] = rest.join().split("\n");
			return [front, tag, back.join("\n")] as const;
		});
	console.log("parseNotes... filePath: ", filePath, " processedContent: ", noteParts);

	const notes: AnkiConnectNoteExt[] = [];
	for (const [rawFront, rawTag, rawBack] of noteParts) {
		const front = await mdToHtml(plugin, rawFront);
		const back = `${await mdToHtml(plugin, rawBack)}${addSrcLink(vaultName, filePath)}`;
		const tags = [...getTagsFromRaw(rawTag), ...globalTags].filter(Boolean);
		notes.push(new AnkiConnectNoteExt(deckName, front, back, tags, filePath));
	}
	return notes;
}

function addSrcLink(vaultName: string, filePath: string): string {
	return `<div style="text-align: left;"><br><br><a href="obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}" style="font-size:xx-small;">Source</a></div>`;
}
