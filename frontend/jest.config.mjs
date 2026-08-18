import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Path to the Next.js app, used to load next.config.js/.env files.
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

// next/jest handles Next.js-specific transforms (SWC, CSS/asset stubs, env vars).
export default createJestConfig(config);
