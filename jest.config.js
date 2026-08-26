/** @type {import('jest').Config} */
module.exports = {
	clearMocks: true,
	moduleFileExtensions: ["js", "ts"],
	moduleNameMapper: {"\\.(css|txt)$": "<rootDir>/tests/asset-stub.js"},
	restoreMocks: true,
	testEnvironment: "jsdom",
	transform: {
		"^.+\\.tsx?$": ["@swc/jest", {
			jsc: {parser: {syntax: "typescript"}, target: "es2022"},
			module: {type: "commonjs"}
		}],
	}
};
