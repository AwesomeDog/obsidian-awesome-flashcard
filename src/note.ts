import {genSha256FromStr} from "./utils";

type NoteFields = {Front: string; Back: string};
type NoteOptions = {allowDuplicate: boolean; duplicateScope: string};

export class AnkiConnectNote {
	modelName = "Basic";
	fields: NoteFields;
	options: NoteOptions = {allowDuplicate: false, duplicateScope: "deck"};

	constructor(
		public deckName: string,
		fieldsFront: string,
		fieldsBack: string,
		public tags: string[],
	) {
		this.fields = {Front: fieldsFront, Back: fieldsBack};
	}
}

export class AnkiConnectNoteExt {
	note: AnkiConnectNote;
	idSha256: string;

	constructor(
		deckName: string,
		fieldsFront: string,
		fieldsBack: string,
		tags: string[],
		public filePath: string,
	) {
		this.note = new AnkiConnectNote(deckName, fieldsFront, fieldsBack, tags);
		this.idSha256 = genSha256FromStr(deckName + fieldsFront);
		const idTag = `idsha256${this.idSha256}`;
		if (!tags.includes(idTag)) tags.push(idTag);
	}
}
