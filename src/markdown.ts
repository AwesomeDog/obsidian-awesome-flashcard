import {App, MarkdownRenderer} from "obsidian";
import path from "path";
import AwesomeFlashcardPlugin from "./main";
import {genSha256FromArrayBuf} from "./utils";
import {mediaFileExists, storeMediaFile} from "./anki";

export async function mdToHtml(plugin: AwesomeFlashcardPlugin, content: string): Promise<string> {
	// featured elements:
	// - code block
	// - latex
	// - media files

	const el: HTMLDivElement = createDiv();
	// @ts-ignore
	await MarkdownRenderer.renderMarkdown(content, el, '.', null)

	let html = el.innerHTML
	// process local image
	// no need to clean unused media files since anki will do it for you
	// ob gens: "<div src="assets/img/a/a/5/aa58a.png" class="internal-embed"></div>
	// anki wants: <img src="aa58a.png">
	html = await replaceAndUploadMedia(
		html,
		new RegExp('(<div src="(.+?\\.(gif|jpe?g|tiff?|png|webp|bmp))" class="internal-embed"></div>)', 'gi'),
		(s: string) => `<img alt="" src="${s}">`,
		plugin
	);

	// process local audio
	// ob gens: <div src="a.mp3" class="internal-embed"></div>
	// anki wants: <audio controls autoplay="true" src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg">
	html = await replaceAndUploadMedia(
		html,
		new RegExp('(<div src="(.+?\\.(wav|mp3|mid|oga|weba|flac))" class="internal-embed"></div>)', 'gi'),
		(s: string) => `<audio controls autoplay="true" src="${s}">`,
		plugin
	)

	// process local video
	// ob gens: <div src="b.mp4" class="internal-embed"></div>
	// anki wants: <video controls autoplay="true" src="https://en.wikipedia.org/wiki/File:How_to_make_video.webm">
	// anki windows does not support video tag yet, AnkiDroid does
	html = await replaceAndUploadMedia(
		html,
		new RegExp('(<div src="(.+?\\.(mp4|mov|wmv|mkv|flv|avi|webm))" class="internal-embed"></div>)', 'gi'),
		(s: string) => `<video controls autoplay="true" src="${s}">`,
		plugin
	);

	return `<style>@import url("_obsidian_card.css");</style><div class="obsidian-card">${html}</div>`
}

async function replaceAndUploadMedia(html: string, regex: RegExp, newTagGen: Function, plugin: AwesomeFlashcardPlugin) {
	for (let {mediaTag, mediaPath} of extractMediaFromHtml(html, regex)) {
		console.log("mediaTag is: ", mediaTag, " mediaPath is: ", mediaPath)
		const mediaFullPath = getLinkFullPath(plugin.app, mediaPath)
		if (!mediaFullPath) {
			continue
		}
		const mediaData = await plugin.app.vault.adapter.readBinary(mediaFullPath)

		const mediaSha256 = genSha256FromArrayBuf(mediaData)
		const mediaBase64 = btoa(new Uint8Array(mediaData).reduce(function (data, byte) {
			return data + String.fromCharCode(byte);
		}, ''));

		const mediaExt = mediaFullPath.split(".").pop()
		const newMediaFullPath = `${mediaSha256}.${mediaExt}`

		if (!(await mediaFileExists(newMediaFullPath))) {
			await storeMediaFile(newMediaFullPath, mediaBase64)
		}
		const newMediaTag = newTagGen(newMediaFullPath)
		html = html.replace(mediaTag, newMediaTag)
	}
	return html;
}

export function getLinkFullPath(app: App, link: string) {
	const resolvedLinks = app.metadataCache.resolvedLinks
	for (const noteFullPath in resolvedLinks) {
		for (const linkFullPath in resolvedLinks[noteFullPath]) {
			if (path.basename(linkFullPath) === path.basename(link) && linkFullPath.contains(link)) {
				return linkFullPath
			}
		}
	}
	return null;
}

type MediaMatch = {
	mediaTag: string
	mediaPath: string
}

export function extractMediaFromHtml(content: string, regex: RegExp): MediaMatch[] {
	const res: MediaMatch[] = []
	for (let match of content.matchAll(regex)) {
		const m = {mediaTag: match[1], mediaPath: match[2]}
		res.push(m)
	}
	return res
}
