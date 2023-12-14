import { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";

import { createOpenAPIAjv } from "./ajv";
import "jest-extended";

describe("createOpenAPIAjv", function () {
  const spec: OpenAPIObject = {
    openapi: "3.1.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
  };

  it("allows example property", function () {
    const schema: SchemaObject = {
      type: "number",
      example: 12,
    };

    const test = () => createOpenAPIAjv(spec).compile(schema);

    expect(test).not.toThrow();
  });
});
