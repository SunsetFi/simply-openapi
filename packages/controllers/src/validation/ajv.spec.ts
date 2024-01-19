import { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";

import { createOpenAPIAjv, sliceAjvError } from "./ajv";
import "jest-extended";
import { ErrorObject } from "ajv";

describe("AJV", function () {
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

  describe("sliceAjvError", function () {
    it("removes the property name from the instancePath", function () {
      const errorObject: ErrorObject = {
        keyword: "required",
        schemaPath: "#/required",
        params: { missingProperty: "property" },
        instancePath: "/propertyName/property",
        data: { property: "value" },
      };

      const slicedError = sliceAjvError(errorObject, "propertyName");

      expect(slicedError.instancePath).toEqual("/property");
    });
  });
});
