import ts from "typescript";

export class ControllersAstScanner {
  private readonly _typeChecker: ts.TypeChecker;

  constructor(private readonly _program: ts.Program) {
    this._typeChecker = _program.getTypeChecker();
  }

  getControllerDeclarations(): ts.ClassDeclaration[] {
    const foundDeclarations: ts.ClassDeclaration[] = [];

    this._program.getSourceFiles().forEach((sourceFile) => {
      ts.forEachChild(sourceFile, (node) => {
        if (!ts.isClassDeclaration(node)) {
          return;
        }

        const decorators = ts.getDecorators(node) ?? [];
        if (!decorators.some(this._isControllerDecorator.bind(this))) {
          return;
        }

        foundDeclarations.push(node);
      });
    });

    return foundDeclarations;
  }

  private _isControllerDecorator(decorator: ts.Decorator): boolean {
    return this._isSOCDecorator(decorator, "Controller");
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

    const name = declaration.propertyName ?? declaration.name;
    if (!name || !ts.isIdentifier(name)) {
      return false;
    }

    return name.getText() === expectedName;
  }
}
