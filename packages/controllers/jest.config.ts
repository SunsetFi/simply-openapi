import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  roots: ["<rootDir>/src"],
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  setupFilesAfterEnv: ["reflect-metadata", "jest-extended/all"],
  coveragePathIgnorePatterns: ["src/tests/"],
};
export default config;
