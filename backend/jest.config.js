module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^tslib$': 'tslib'
  },
  moduleDirectories: ['node_modules', 'src'],
  verbose: true,
  testTimeout: 15000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
