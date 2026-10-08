/**
 * Konfigurasi Jest untuk evaluasi skripsi (Linux/VM atau Windows).
 * Sama dengan frontend/jest.config.js, tetapi memakai ts-jest (bukan SWC dari next/jest)
 * supaya dapat dijalankan tanpa biner native Next.js. Tidak mengubah konfigurasi produksi.
 */
const path = require('path');
const frontend = path.resolve(__dirname, '../../frontend');
module.exports = {
  rootDir: frontend,
  roots: [
    '<rootDir>/components/Modals/Transform/StringToWordVector',
    '<rootDir>/components/Modals/Analyze/Classify/naive-bayes',
    '<rootDir>/components/Modals/Analyze/Classify/apply-model',
    '<rootDir>/public/workers/TextAnalytics',
  ],
  cacheDirectory: process.env.JEST_CACHE_DIR || undefined,
  watchman: false,
  modulePathIgnorePatterns: ['<rootDir>/.next', '<rootDir>/.next-dev', '/rust/target/', '/rust/pkg/'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { isolatedModules: true, diagnostics: false, tsconfig: { jsx: 'react-jsx', esModuleInterop: true, allowJs: true, module: 'commonjs', target: 'es2020', resolveJsonModule: true } }],
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|scss|sass)$': path.resolve(__dirname, 'jest.style-mock.js'),
    '^d3$': '<rootDir>/__mocks__/d3.js',
    '^d3-(.*)$': '<rootDir>/__mocks__/d3-$1.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30000,
  maxWorkers: 2,
  testPathIgnorePatterns: ['/node_modules/', '/.next', '/dist/'],
};
