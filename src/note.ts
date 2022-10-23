import {genSha256FromStr} from "./utils";

export class AnkiConnectNote {
	deckName: string
	modelName: string
	fields: {
		Front: string,
		Back: string
	}
	options: {
		allowDuplicate: boolean,
		duplicateScope: string
	}
	tags: Array<string>

	constructor(
		deckName: string,
		fieldsFront: string,
		fieldsBack: string,
		tags: Array<string>
	) {
		this.deckName = deckName
		this.modelName = 'Basic'
		this.fields = {
			Front: fieldsFront,
			Back: fieldsBack
		}
		this.tags = tags
		this.options = {
			allowDuplicate: false,
			duplicateScope: "deck"
		}
	}
}

export class AnkiConnectNoteExt {
	note: AnkiConnectNote
	idSha256: string
	filePath: string

	constructor(
		deckName: string,
		fieldsFront: string,
		fieldsBack: string,
		tags: Array<string>,
		filePath: string,
	) {
		this.note = new AnkiConnectNote(
			deckName,
			fieldsFront,
			fieldsBack,
			tags
		)

		this.filePath = filePath
		// to evict cache when deck name changed
		this.idSha256 = genSha256FromStr(this.note.deckName + this.note.fields.Front)
		const idTag = "idsha256" + this.idSha256
		if (!this.note.tags.includes(idTag)) {
			this.note.tags.push(idTag)
		}
	}
}
