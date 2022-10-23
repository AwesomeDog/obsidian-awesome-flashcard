import 'src/styles.css'
import {addIcon, App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {scanVault} from "./manager";
import {ANKI_ICON, FilePath, Sha256} from "./constants";

// Remember to rename these classes and interfaces!

interface AwesomeFlashcardPluginSettings {
	defaultDeckName: string
	cachedDeckNames: Array<string>
	cachedFileHashes: Record<FilePath, Sha256>
	cachedNoteHashes: Record<FilePath, Sha256[]>
}

const DEFAULT_SETTINGS: AwesomeFlashcardPluginSettings = {
	defaultDeckName: "obsidian",
	cachedDeckNames: [],
	cachedFileHashes: {},
	cachedNoteHashes: {}
}

export default class AwesomeFlashcardPlugin extends Plugin {
	settings: AwesomeFlashcardPluginSettings;

	async onload() {
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin

		addIcon('anki', ANKI_ICON)
		this.addRibbonIcon('anki', 'Awesome flashcard - Scan Vault', async () => {
			await scanVault(this);
		})

		this.addCommand({
			id: "process-flashcards-all",
			name: "Process flashcards for all your notes",
			callback: async () => {
				await scanVault(this);
			},
		});
		this.addCommand({
			id: "clear-all-cache",
			name: "Clear all cached data",
			callback: async () => {
				await this.clearCache();
			},
		});

		this.addSettingTab(new AwesomeFlashcardSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		console.log(this.settings)
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async clearCache() {
		this.settings.cachedDeckNames = [];
		this.settings.cachedFileHashes = {};
		this.settings.cachedNoteHashes = {};
		await this.saveSettings();
	}
}

class AwesomeFlashcardSettingTab extends PluginSettingTab {
	plugin: AwesomeFlashcardPlugin;

	constructor(app: App, plugin: AwesomeFlashcardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl("h2", {text: "Awesome Flashcard Setting"});

		new Setting(containerEl)
			.setName("Default deck name")
			.setDesc("Use this as default deck name if 'deckName' not present in YAML header")
			.addText((text) =>
				text.setValue(this.plugin.settings.defaultDeckName)
					.onChange(async (value) => {
						this.plugin.settings.defaultDeckName = value;
						// cache is no longer valid since deck name changed
						await this.plugin.clearCache();
					})
			);

		new Setting(containerEl)
			.setName("Clear all cache")
			.setDesc("Clear the cached data. Absolutely safe but may slow down the next scan for once")
			.addButton(button => {
					button.setButtonText("Clear")
						.setClass("mod-cta")
						.onClick(async () => {
							await this.plugin.clearCache();
							new Notice("Cache cleared successfully!")
						})
				}
			)
	}
}
