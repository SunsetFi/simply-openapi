import ts from "typescript";

export function expectDeclarationsContainClassByName(
  declarations: ts.ClassDeclaration[],
  name: string,
): void {
  expect(declarations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: expect.objectContaining({
          escapedText: name,
        }),
      }),
    ]),
  );
}
