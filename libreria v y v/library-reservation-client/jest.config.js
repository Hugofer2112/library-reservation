module.exports = {
    preset: '@testing-library/react',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    testEnvironment: 'jsdom',
    collectCoverageFrom: [
      'src/**/*.{js,jsx}',
      
    ],
    coverageReporters: ['json', 'lcov', 'text'],
    coverageDirectory: 'coverage',
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    reporters: [
      'default',
      ['jest-junit', { outputDirectory: 'coverage', outputName: 'jest-junit.xml' }],
    ],
    testResultsProcessor: 'jest-junit',
    transformIgnorePatterns: [
      "/node_modules/",
      "^.+\\.css$"
    ],
};
