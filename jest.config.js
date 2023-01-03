module.exports = {
	verbose: true,
	preset: 'ts-jest',
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	module: {
		rules: [
			{
				test: /\.txt/,
				type: 'asset/source',
			},
		]
	},
	testEnvironment: "jsdom",
	moduleFileExtensions: ['js', 'ts'],
};
