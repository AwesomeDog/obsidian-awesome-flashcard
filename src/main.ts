import {addIcon, Notice, Plugin, PluginSettingTab, Setting} from "obsidian";
import type {App} from "obsidian";
import {ANKI_ICON} from "./constants";
import type {FilePath, Sha256} from "./constants";
import {scanVault} from "./manager";

interface AwesomeFlashcardPluginSettings {
	defaultDeckName: string;
	cachedDeckNames: string[];
	cachedFileHashes: Record<FilePath, Sha256>;
	cachedNoteHashes: Record<FilePath, Sha256[]>;
}

const DEFAULT_SETTINGS = {
	defaultDeckName: "obsidian",
	cachedDeckNames: [],
	cachedFileHashes: {},
	cachedNoteHashes: {},
} satisfies AwesomeFlashcardPluginSettings;

export default class AwesomeFlashcardPlugin extends Plugin {
	declare settings: AwesomeFlashcardPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		addIcon("anki", ANKI_ICON);
		this.addRibbonIcon("anki", "Awesome flashcard - Scan Vault", () => scanVault(this));
		this.addCommand({
			id: "process-flashcards-all",
			name: "Process flashcards for all your notes",
			callback: () => scanVault(this),
		});
		this.addCommand({
			id: "clear-all-cache",
			name: "Clear all cached data",
			callback: () => this.clearCache(),
		});
		this.addSettingTab(new AwesomeFlashcardSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = {...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<AwesomeFlashcardPluginSettings>)};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async clearCache(): Promise<void> {
		Object.assign(this.settings, {
			cachedDeckNames: [],
			cachedFileHashes: {},
			cachedNoteHashes: {},
		});
		await this.saveSettings();
	}
}

class AwesomeFlashcardSettingTab extends PluginSettingTab {
	constructor(app: App, public plugin: AwesomeFlashcardPlugin) {
		super(app, plugin);
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		containerEl.createEl("h2", {text: "Awesome Flashcard Setting"});

		new Setting(containerEl)
			.setName("Default deck name")
			.setDesc("Use this as default deck name if 'deckName' not present in YAML header")
			.addText((text) => text
				.setValue(this.plugin.settings.defaultDeckName)
				.onChange(async (value) => {
					this.plugin.settings.defaultDeckName = value;
					await this.plugin.clearCache();
				}));

		new Setting(containerEl)
			.setName("Clear all cache")
			.setDesc("Clear the cached data. Absolutely safe but may slow down the next scan for once")
			.addButton((button) => button
				.setButtonText("Clear")
				.setClass("mod-cta")
				.onClick(async () => {
					await this.plugin.clearCache();
					new Notice("Cache cleared successfully!");
				}));
	}
}
