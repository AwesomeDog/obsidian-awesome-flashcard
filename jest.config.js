module.exports = {
	verbose: true,
	preset: 'ts-jest',
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	testEnvironment: "jsdom",
	moduleFileExtensions: ['js', 'ts'],
};
