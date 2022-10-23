import {describe, expect, test} from '@jest/globals';
import {genSha256FromStr, getTagsFromRaw} from '../src/utils';

describe('test utils module', () => {
	// https://emn178.github.io/online-tools/sha256.html
	test('test genSha256FromStr', () => {
		expect(genSha256FromStr('aaa'))
			.toBe('9834876dcfb05cb167a5c24953eba58c4ac89b1adf57f28f2f9d09af107ee8f0');
	});

	test('test getTagsFromRaw Array input', () => {
		expect(getTagsFromRaw(['a', 'b']))
			.toStrictEqual(['a', 'b']);
	});

	test('test getTagsFromRaw string input 1', () => {
		expect(getTagsFromRaw('Economics added'))
			.toStrictEqual(['Economics', 'added']);
	});

	test('test getTagsFromRaw string input 2', () => {
		expect(getTagsFromRaw(' #Economics #added#tag'))
			.toStrictEqual(['Economics', 'added', 'tag']);
	});

});
