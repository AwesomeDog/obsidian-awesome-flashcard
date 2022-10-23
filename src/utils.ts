import {createHash} from 'crypto';
import sha256 from "crypto-js/sha256";
import CryptoJS from "crypto-js/core";


export function genSha256FromStr(s: string): string {
	return createHash('sha256').update(s).digest('hex');
}

export function genSha256FromArrayBuf(data: ArrayBuffer) {
	return sha256(arrayBufferToWordArray(data)).toString().toLowerCase()
}

function arrayBufferToWordArray(ab: ArrayBuffer) {
	const i8a = new Uint8Array(ab);
	const a = [];
	for (let i = 0; i < i8a.length; i += 4) {
		a.push(i8a[i] << 24 | i8a[i + 1] << 16 | i8a[i + 2] << 8 | i8a[i + 3]);
	}
	return CryptoJS.lib.WordArray.create(a, i8a.length);
}

export function isTestingWithJest() {
	return process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test'
}

export function unionRecords(a: Record<any, any>, b: Record<any, any>): Record<any, any> {
	const ret: Record<any, any> = {}
	for (let k in a) {
		ret[k] = a[k]
	}
	for (let k in b) {
		ret[k] = b[k]
	}
	return ret
}

export function getTagsFromRaw(rawTag: any): Array<string> {
	let tags: Array<string>
	if (rawTag instanceof Array) {
		tags = rawTag
	} else {
		tags = ("" + rawTag)
			.replaceAll("#", " ")
			.split(" ")
			.filter(a => a)
	}
	return tags
}

