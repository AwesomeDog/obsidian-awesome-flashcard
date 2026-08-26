import {createHash} from "node:crypto";

export function genSha256FromStr(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

export function genSha256FromArrayBuf(data: ArrayBuffer): string {
	return createHash("sha256").update(new Uint8Array(data)).digest("hex");
}

export const isTestingWithJest = (): boolean =>
	process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === "test";

export function unionRecords<T extends object, U extends object>(a: T, b: U): T & U {
	return {...a, ...b};
}

export function getTagsFromRaw(rawTag: unknown): string[] {
	if (Array.isArray(rawTag)) return rawTag as string[];
	return String(rawTag).replaceAll("#", " ").split(" ").filter(Boolean);
}
