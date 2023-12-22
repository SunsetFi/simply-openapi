import { resolve as resolvePath } from "path";

import ts from "typescript";

const testAssetDir = resolvePath(__dirname + "/../../test-assets");

export function createTsProgram(): ts.Program {
  const configPath = ts.findConfigFile(
    testAssetDir,
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (!configPath) {
    throw new Error("Could not find tsconfig.json for test assets");
  }

  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);

  const { options, fileNames, errors } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    testAssetDir,
  );

  return ts.createProgram({
    options,
    rootNames: fileNames,
    configFileParsingDiagnostics: errors,
  });
}
