import type { Config } from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
  roots: ["<rootDir>/src"],
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/src/tsconfig.json" }],
  },
  setupFilesAfterEnv: ["reflect-metadata", "jest-extended/all"],
};
export default config;
