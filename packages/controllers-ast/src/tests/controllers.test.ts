import ts from "typescript";

import { ControllersAstScanner } from "../ControllersAstScanner";

import { createTsProgram } from "./ts-program";
import { expectDeclarationsContainClassByName } from "./expects";

describe("ControllersAstScanner.getControllerDeclarations", function () {
  let program: ts.Program;
  let scanner: ControllersAstScanner;
  let declarations: ts.ClassDeclaration[];

  beforeAll(() => {
    program = createTsProgram();
    scanner = new ControllersAstScanner(program);
    declarations = scanner.getControllerDeclarations();
  });

  it("finds a controller decorated with a basic Controller decorator", function () {
    expectDeclarationsContainClassByName(declarations, "EmptyBasicController");
  });

  it("finds a controller decorated with an aliased Controller decorator", function () {
    expectDeclarationsContainClassByName(
      declarations,
      "EmptyAliasedImportController",
    );
  });
});
