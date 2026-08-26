import {MarkdownRenderer} from "obsidian";
import {basename} from "node:path";
import type {App} from "obsidian";
import type AwesomeFlashcardPlugin from "./main";
import {mediaFileExists, storeMediaFile} from "./anki";
import {genSha256FromArrayBuf} from "./utils";

const MEDIA_PATTERNS: ReadonlyArray<[RegExp, (path: string) => string]> = [
	[/(<div src="(.+?\.(gif|jpe?g|tiff?|png|webp|bmp))" class="internal-embed"><\/div>)/gi, (path) => `<img alt="" src="${path}">`],
	[/(<div src="(.+?\.(wav|mp3|mid|oga|weba|flac))" class="internal-embed"><\/div>)/gi, (path) => `<audio controls autoplay="true" src="${path}">`],
	[/(<div src="(.+?\.(mp4|mov|wmv|mkv|flv|avi|webm))" class="internal-embed"><\/div>)/gi, (path) => `<video controls autoplay="true" src="${path}">`],
];

function toBase64(data: ArrayBuffer): string {
	const bytes = new Uint8Array(data);
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return btoa(binary);
}

export async function mdToHtml(plugin: AwesomeFlashcardPlugin, content: string): Promise<string> {
	const element = createDiv();
	await MarkdownRenderer.render(plugin.app, content, element, ".", plugin);

	let html = element.innerHTML;
	for (const [regex, tagGenerator] of MEDIA_PATTERNS) {
		html = await replaceAndUploadMedia(html, regex, tagGenerator, plugin);
	}
	return `<style>@import url("_obsidian_card.css");</style><div class="obsidian-card">${html}</div>`;
}

async function replaceAndUploadMedia(
	html: string,
	regex: RegExp,
	tagGenerator: (path: string) => string,
	plugin: AwesomeFlashcardPlugin,
): Promise<string> {
	for (const {mediaTag, mediaPath} of extractMediaFromHtml(html, regex)) {
		console.log("mediaTag is: ", mediaTag, " mediaPath is: ", mediaPath);
		const mediaFullPath = getLinkFullPath(plugin.app, mediaPath);
		if (!mediaFullPath) continue;

		const mediaData = await plugin.app.vault.adapter.readBinary(mediaFullPath);
		const mediaSha256 = genSha256FromArrayBuf(mediaData);
		const mediaBase64 = toBase64(mediaData);
		const mediaExt = mediaFullPath.split(".").pop();
		const uploadedPath = `${mediaSha256}.${mediaExt}`;
		if (!(await mediaFileExists(uploadedPath))) await storeMediaFile(uploadedPath, mediaBase64);
		html = html.replace(mediaTag, tagGenerator(uploadedPath));
	}
	return html;
}

export function getLinkFullPath(app: App, link: string): string | null {
	const linkName = basename(link);
	return Object.values(app.metadataCache.resolvedLinks)
		.flatMap((links) => Object.keys(links))
		.find((candidate) => basename(candidate) === linkName && candidate.includes(link)) ?? null;
}

type MediaMatch = {mediaTag: string; mediaPath: string};

export function extractMediaFromHtml(content: string, regex: RegExp): MediaMatch[] {
	return [...content.matchAll(regex)].map(([mediaTag, mediaPath]) => ({mediaTag, mediaPath}));
}
