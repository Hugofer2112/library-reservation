module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./jest.setup.js'], // Ajustamos la ruta si es necesario
    transformIgnorePatterns: [
      "/node_modules/",
      "^.+\\.css$"
    ],
    collectCoverage: true,
    collectCoverageFrom: [
      "**/*.{js,jsx}",
    "!**/node_modules/**",
    "!**/vendor/**",
    "!**/coverage/**",
    "!**/server.js"
    ],
    coverageReporters: ['json', 'lcov', 'text', 'html'], // Agregamos 'html' aquí
    coverageDirectory: 'coverage',
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    reporters: ['default'],
    testResultsProcessor: 'jest-junit',
  };
  