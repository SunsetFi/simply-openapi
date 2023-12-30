import ts from "typescript";
import { first, isArrayLike } from "lodash";

import {
  ControllerDeclaration,
  ControllerDecoratorMetadata,
  ControllerMetadata,
} from "./types";

export interface ControllersAstScannerOpts {
  controllerResolver?(
    declaration: ts.ClassDeclaration,
  ): ControllerMetadata | null;
  controllerDecoratorResolver?(
    decorator: ts.Decorator,
  ): ControllerDecoratorMetadata | null;
}
export class ControllersAstScanner {
  private readonly _typeChecker: ts.TypeChecker;

  constructor(
    private readonly _program: ts.Program,
    private _opts?: ControllersAstScannerOpts,
  ) {
    this._typeChecker = _program.getTypeChecker();
  }

  getControllerDeclarations(): ControllerDeclaration[] {
    const foundDeclarations: ControllerDeclaration[] = [];

    this._program.getSourceFiles().forEach((sourceFile) => {
      foundDeclarations.push(
        ...this.getControllerDeclarationsFromFile(sourceFile),
      );
    });

    return foundDeclarations;
  }

  getControllerDeclarationsFromFile(
    sourceFile: ts.SourceFile,
  ): ControllerDeclaration[] {
    const foundDeclarations: ControllerDeclaration[] = [];
    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isClassDeclaration(node)) {
        return;
      }

      const metadata = this._tryResolveControllerMetadata(node);
      if (!metadata) {
        return;
      }

      foundDeclarations.push({
        ...metadata,
        declaration: node,
      });
    });

    return foundDeclarations;
  }

  private _tryResolveControllerMetadata(
    declaration: ts.ClassDeclaration,
  ): ControllerMetadata | null {
    const externalResolved = this._opts?.controllerResolver?.(declaration);
    if (externalResolved) {
      return externalResolved;
    }

    const decorators = ts.getDecorators(declaration) ?? [];
    const controllerDecorator =
      this._tryGetControllerDecoratorMetadata(decorators);
    if (!controllerDecorator) {
      return null;
    }

    return {
      name: declaration.name?.getText(),
      path: controllerDecorator.path,
    };
  }

  private _tryGetControllerDecoratorMetadata(
    decorators: readonly ts.Decorator[],
  ): ControllerDecoratorMetadata | null;
  private _tryGetControllerDecoratorMetadata(
    decorator: ts.Decorator,
  ): ControllerDecoratorMetadata | null;
  private _tryGetControllerDecoratorMetadata(
    decorator: ts.Decorator | readonly ts.Decorator[],
  ): ControllerDecoratorMetadata | null {
    // Note: Array.isArray and lodash isArray both dont like the readonly modifier.
    // This seems to work ok, and should return what we want.
    if (isArrayLike(decorator)) {
      return (
        first(
          decorator.map((x) => this._tryGetControllerDecoratorMetadata(x)),
        ) ?? null
      );
    }

    const externalResolved =
      this._opts?.controllerDecoratorResolver?.(decorator);
    if (externalResolved) {
      return externalResolved;
    }

    if (!this._isSOCDecorator(decorator, "Controller")) {
      return null;
    }

    const callExpression = decorator.expression;
    if (!ts.isCallExpression(callExpression)) {
      return null;
    }

    let path: string | undefined;
    const pathArg = callExpression.arguments[0];
    if (pathArg && ts.isStringLiteralLike(pathArg)) {
      path = pathArg.text;
    }

    return {
      path,
    };
  }

  private _isSOCDecorator(
    decorator: ts.Decorator,
    expectedName: string,
  ): boolean {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression)) {
      return false;
    }

    const identifier = expression.expression;
    if (!ts.isIdentifier(identifier)) {
      return false;
    }

    const symbol = this._typeChecker.getSymbolAtLocation(identifier);
    if (!symbol) {
      return false;
    }

    const declaration = (symbol.declarations ?? [])[0];
    if (!declaration || !ts.isImportSpecifier(declaration)) {
      return false;
    }

    // TODO: Check if this is an import from @simply-openapi/controllers

    const name = declaration.propertyName ?? declaration.name;
    if (!name || !ts.isIdentifier(name)) {
      return false;
    }

    return name.getText() === expectedName;
  }
}
