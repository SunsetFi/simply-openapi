import ts from "typescript";

export interface ControllerMetadata {
  name?: string;
  path?: string;
}

export interface ControllerDeclaration extends ControllerMetadata {
  declaration: ts.ClassDeclaration;
}

export interface ControllerDecoratorMetadata {
  path: string | undefined;
}

export interface ControllerDecoratorDeclaration
  extends ControllerDecoratorMetadata {
  decorator: ts.Decorator;
}
