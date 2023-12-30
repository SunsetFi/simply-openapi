import { ControllerDeclaration } from "../types";

export function expectDeclarationMatches(
  declarations: ControllerDeclaration[],
  declaration: Partial<ControllerDeclaration>,
): void {
  expect(declarations).toEqual(
    expect.arrayContaining([expect.objectContaining(declaration)]),
  );
}
