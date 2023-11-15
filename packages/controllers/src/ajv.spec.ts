import { SchemaObject } from "openapi3-ts/oas31";

import { createOpenAPIAjv } from "./ajv";
import "jest-extended";

describe("createOpenAPIAjv", function () {
  it("allows example properties", function () {
    const schema: SchemaObject = {
      type: "number",
      example: 12,
    };

    const test = () => createOpenAPIAjv().compile(schema);

    expect(test).not.toThrow();
  });
});
