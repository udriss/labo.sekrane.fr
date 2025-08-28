import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
    testPathIgnorePatterns: ['<rootDir>/e2e/'],
    setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1'
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.json'
        }]
    }
};

export default config;
