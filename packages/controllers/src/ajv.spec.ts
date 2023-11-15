import { SchemaObject } from "openapi3-ts/oas31";

import { createOpenAPIAjv } from "./ajv";
import "jest-extended";

describe("createOpenAPIAjv", function () {
  it("allows example property", function () {
    const schema: SchemaObject = {
      type: "number",
      example: 12,
    };

    const test = () => createOpenAPIAjv().compile(schema);

    expect(test).not.toThrow();
  });

  it("allows examples property", function () {
    const schema: SchemaObject = {
      type: "number",
      examples: [12, 24],
    };

    const test = () => createOpenAPIAjv().compile(schema);

    expect(test).not.toThrow();
  });
});
