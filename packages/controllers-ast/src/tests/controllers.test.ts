import ts from "typescript";

import { ControllersAstScanner } from "../ControllersAstScanner";
import { ControllerDeclaration } from "../types";

import { createTsProgram } from "./ts-program";
import { expectDeclarationMatches } from "./expects";

describe("ControllersAstScanner.getControllerDeclarations", function () {
  let program: ts.Program;
  let scanner: ControllersAstScanner;
  let declarations: ControllerDeclaration[];

  beforeAll(() => {
    program = createTsProgram();
    scanner = new ControllersAstScanner(program);
    declarations = scanner.getControllerDeclarations();
  });

  it("finds a controller decorated with a basic Controller decorator", function () {
    expectDeclarationMatches(declarations, { name: "EmptyBasicController" });
  });

  it("finds a controller decorated with an aliased Controller decorator", function () {
    expectDeclarationMatches(declarations, {
      name: "EmptyAliasedImportController",
    });
  });

  it("extracts the controller path from the decorator", function () {
    expectDeclarationMatches(declarations, {
      name: "EmptyPathController",
      path: "/controller-path",
    });
  });
});
